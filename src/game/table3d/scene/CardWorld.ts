/**
 * 테이블 위 카드 전부.
 *
 * settle() 이 GameState 를 읽어 모든 카드를 정답 자리에 둔다. 연출은 그 사이를
 * 잠깐 빌려 쓸 뿐이고, 배치가 끝나면 다시 settle 로 맞춘다. 그래서 연출이 끊겨도
 * 그림이 어긋나지 않는다.
 *
 * 숨은 정보: 앞면을 보이는 판단은 anchorFor 한 곳에서만 한다.
 */

import * as THREE from 'three';

import { CARD_DEFS } from '../../data/cards.base';
import type { CardId, EventCardId } from '../../data/types';
import { isHidden, kindOf, type GameState, type PlayerId } from '../../engine';
import { handsRevealed } from '../../engine/hooks';
import {
  equipmentOffset,
  FAN_CARD_SCALE,
  fanOffset,
  ROW_CARD_SCALE,
  SLOT_CARD_SCALE,
  storeSlot,
} from '../core/layout';
import { CARD_SIZE, EVENT_CARD_SCALE, type FxBudget, type TableLayout, type Vec3, type Zone } from '../core/types';
import {
  backMaterialShared,
  cardPlaneGeometry,
  eventMaterialFor,
  eventMaterialShared,
} from '../materials/card-materials';
import { stackEdgeTexture } from '../materials/textures';
import { BoardBullets } from './BoardBullets';
import { CardHandle, IDLE_POSE, type Pose } from './CardHandle';
import { OpponentFans } from './OpponentFans';
import { SeatCards } from './SeatCards';
import { TableGeometry } from './TableGeometry';

const T = CARD_SIZE.thickness;

export class CardWorld {
  readonly root = new THREE.Group();
  readonly table = new TableGeometry();
  readonly fans = new OpponentFans();
  readonly seatCards = new SeatCards();
  readonly bullets = new BoardBullets();
  layout: TableLayout | null = null;
  private state: GameState | null = null;
  private viewerIndex = 0;
  private readonly handles = new Map<CardId, CardHandle>();
  private readonly pool: CardHandle[] = [];
  private readonly cards = new THREE.Group();
  private readonly deckStack: THREE.Mesh;
  private readonly discardStack: THREE.Mesh;
  private readonly eventCard: THREE.Mesh;
  /** 지금 이벤트 카드 메시에 입혀 둔 이벤트 */
  private eventShown: EventCardId | null = null;

  constructor(readonly budget: FxBudget) {
    // 옆면은 카드 장수만큼 줄이 진 종이 결이다. 어두운 테이블 위에서도 두께가 보이게 밝게 둔다.
    // 덱은 뒷면 카드의 나무색 테두리를 따라 조금 더 짙게, 버린 더미는 앞면 종이색으로
    const deckSide = new THREE.MeshBasicMaterial({ map: stackEdgeTexture('#C8B48C', '#6E5132') });
    const paperSide = new THREE.MeshBasicMaterial({ map: stackEdgeTexture('#DCCBA4', '#9C845A') });
    const paperTop = new THREE.MeshBasicMaterial({ color: '#C9B48A' });
    const box = new THREE.BoxGeometry(CARD_SIZE.w, 1, CARD_SIZE.h);
    this.deckStack = new THREE.Mesh(box, [deckSide, deckSide, backMaterialShared(), deckSide, deckSide, deckSide]);
    this.discardStack = new THREE.Mesh(box, [paperSide, paperSide, paperTop, paperTop, paperSide, paperSide]);
    this.eventCard = new THREE.Mesh(cardPlaneGeometry(CARD_SIZE.w, CARD_SIZE.h), eventMaterialShared());
    this.eventCard.rotation.x = -Math.PI / 2;
    this.eventCard.scale.setScalar(EVENT_CARD_SCALE);
    this.eventCard.visible = false;
    this.root.add(
      this.table.root,
      this.bullets.root,
      this.seatCards.root,
      this.fans.mesh,
      this.deckStack,
      this.discardStack,
      this.eventCard,
      this.cards,
    );
  }

  setLayout(layout: TableLayout) {
    this.layout = layout;
    this.table.setLayout(layout);
    this.seatCards.setLayout(layout);
    this.eventCard.position.set(layout.event[0], 0.01, layout.event[2]);
    if (this.state) this.settle(this.state, this.viewerIndex, true);
  }

  seatIndexOf(pid: PlayerId): number {
    return this.state?.players.findIndex((p) => p.id === pid) ?? -1;
  }

  /** 화면을 보는 사람인가 (그 손은 3D 가 아니라 아래 손패 줄에 있다) */
  isViewer(pid: PlayerId): boolean {
    const i = this.seatIndexOf(pid);
    return i >= 0 && i === this.viewerIndex;
  }

  /** 카드 핸들을 얻는다. 없으면 풀에서 꺼내 만든다 */
  handle(card: CardId): CardHandle {
    let h = this.handles.get(card);
    if (h) return h;
    h = this.pool.pop() ?? this.newHandle();
    h.assign(card);
    h.driven = false;
    h.resident = false;
    h.show(true);
    h.snap(IDLE_POSE);
    this.handles.set(card, h);
    return h;
  }

  has(card: CardId): boolean {
    return this.handles.has(card);
  }

  release(card: CardId) {
    const h = this.handles.get(card);
    if (!h) return;
    h.show(false);
    h.driven = false;
    this.handles.delete(card);
    this.pool.push(h);
  }

  private newHandle(): CardHandle {
    const h = new CardHandle();
    this.cards.add(h.group);
    return h;
  }

  /**
   * 모든 카드를 정답 자리에. snap 이면 즉시, 아니면 감쇠로 붙는다.
   * reserved 인 카드는 큐에 든 연출이 옮길 것이므로 건드리지 않는다.
   */
  settle(state: GameState, viewerIndex: number, snap: boolean, reserved: (card: CardId) => boolean = () => false) {
    this.state = state;
    this.viewerIndex = viewerIndex;
    const layout = this.layout;
    if (!layout) return;

    for (const h of this.handles.values()) h.resident = false;

    const place = (card: CardId, pose: Pose) => {
      if (reserved(card)) {
        const existing = this.handles.get(card);
        if (existing) existing.resident = true;
        return;
      }
      const created = !this.handles.has(card);
      const h = this.handle(card);
      h.resident = true;
      if (h.driven) return;
      if (snap || created) h.snap(pose);
      else h.setTarget(pose);
    };

    // 장착 카드 (공개). 무기는 보드 오른쪽 칸, 나머지는 보드 너머 줄
    state.players.forEach((p, i) => {
      const seat = layout.seats[i];
      if (!seat) return;
      p.equipment.forEach((card, j) => place(card, this.equipmentPose(seat.index, j, p.equipment.length, card)));
    });

    // 보드 위 직업·캐릭터 카드와 목숨 총알
    this.seatCards.update(state, viewerIndex, snap);
    this.bullets.update(layout, state, snap);

    // 사카가웨이: 남의 손패를 앞면으로 펼친다. 새로 올라온 카드는 뒷면에서 제자리로 뒤집힌다
    const open = handsRevealed(state);
    if (open) {
      state.players.forEach((p, i) => {
        if (i === viewerIndex || !layout.seats[i]) return;
        const shown = p.hand.filter((c) => !isHidden(c));
        shown.forEach((card, j) => {
          const pose = this.handPose(i, j, shown.length);
          if (!snap && !this.handles.has(card) && !reserved(card)) {
            const h = this.handle(card);
            h.resident = true;
            h.snap({ ...pose, flip: Math.PI });
            h.setTarget(pose);
            return;
          }
          place(card, pose);
        });
      });
    }

    // 버린 더미 맨 위 (공개)
    const top = state.discard[state.discard.length - 1];
    if (top) place(top, this.discardPose(state.discard.length - 1));

    // 잡화점 카드는 바닥에 펼치지 않는다. 화면 가운데 창(PickSpotlight)에 크게 뜬다

    // 자리를 못 받은 카드는 치운다 (연출 중인 카드는 예외)
    for (const [card, h] of [...this.handles]) {
      if (!h.resident && !h.driven) this.release(card);
    }

    // 더미 높이
    this.stack(this.deckStack, layout.deck, state.deck.length);
    this.stack(this.discardStack, layout.discard, Math.max(0, state.discard.length - 1));

    // 상대 손패 부채
    const counts = state.players.map((p, i) =>
      i === viewerIndex ? 0 : open ? p.hand.filter(isHidden).length : p.hand.length,
    );
    this.fans.update(layout, counts);

    // 이벤트 카드. 새 이벤트가 공개되면 그 카드의 그림으로 갈아입는다
    const current = state.event?.current ?? null;
    this.eventCard.visible = current !== null;
    if (current !== this.eventShown) {
      this.eventCard.material = current ? eventMaterialFor(current) : eventMaterialShared();
      this.eventShown = current;
    }

    // 매트 색
    state.players.forEach((p, i) => {
      const dead = !p.alive && !p.ghost;
      this.table.setMatTone(i, dead ? 'dead' : state.turn.active === p.id ? 'active' : 'idle');
    });
  }

  /** 큐에 든 연출이 이 카드를 옮길 예정인가. Scene 이 fx-store 의 판정을 꽂는다 */
  isReservedNow: (card: CardId) => boolean = () => false;

  /** 마지막으로 받은 상태로 다시 정렬한다 (배치가 끝났을 때) */
  resettle(snap: boolean, reserved: (card: CardId) => boolean) {
    if (this.state) this.settle(this.state, this.viewerIndex, snap, reserved);
  }

  /** 지목 가능한 좌석 강조 */
  highlightTargets(pids: PlayerId[]) {
    const state = this.state;
    if (!state) return;
    state.players.forEach((p, i) => {
      const dead = !p.alive && !p.ghost;
      const tone = pids.includes(p.id) ? 'target' : dead ? 'dead' : state.turn.active === p.id ? 'active' : 'idle';
      this.table.setMatTone(i, tone);
    });
  }

  private stack(mesh: THREE.Mesh, at: Vec3, count: number) {
    if (count <= 0) {
      mesh.visible = false;
      return;
    }
    const h = Math.max(T, count * T);
    // 옆면 줄을 카드 한 장에 하나씩
    const side = (mesh.material as THREE.MeshBasicMaterial[])[0];
    if (side.map) side.map.repeat.set(1, Math.max(1, count));
    mesh.visible = true;
    mesh.scale.y = h;
    mesh.position.set(at[0], h / 2 + 0.002, at[2]);
  }

  // -------------------------------------------------------------------------
  // 자리 계산. 앞면 여부는 여기서만 정한다
  // -------------------------------------------------------------------------

  /**
   * 장착 카드 자리. card 를 알면 무기는 보드의 무기 칸에, 나머지는 무기를 뺀 순번으로 줄에 둔다.
   * card 를 모르면 (옛 호출) i/count 를 그대로 줄 순번으로 쓴다.
   */
  equipmentPose(seatIndex: number, i: number, count: number, card?: CardId): Pose {
    const seat = this.layout!.seats[seatIndex];
    if (card && isWeapon(card)) {
      const at = seat.slots.weapon;
      return { ...IDLE_POSE, pos: [at[0], 0.02, at[2]], yaw: seat.yaw, scale: SLOT_CARD_SCALE * seat.scale };
    }
    let j = i;
    let n = count;
    const owned = this.state?.players[seatIndex]?.equipment;
    if (card && owned) {
      const row = owned.filter((c) => !isWeapon(c));
      const k = row.indexOf(card);
      // 아직 상태에 없는 카드(날아오는 중)는 줄 끝에 붙는다
      j = k >= 0 ? k : row.length;
      n = k >= 0 ? row.length : row.length + 1;
    }
    const dx = equipmentOffset(j, n) * seat.scale;
    return {
      ...IDLE_POSE,
      pos: [seat.equipment[0] + seat.right[0] * dx, 0.012, seat.equipment[2] + seat.right[2] * dx],
      yaw: seat.yaw,
      scale: ROW_CARD_SCALE * seat.scale,
    };
  }

  discardPose(index: number): Pose {
    const at = this.layout!.discard;
    return { ...IDLE_POSE, pos: [at[0], 0.004 + (index + 1) * T, at[2]], yaw: 0 };
  }

  deckPose(): Pose {
    const at = this.layout!.deck;
    const n = this.state?.deck.length ?? 0;
    return { ...IDLE_POSE, pos: [at[0], 0.004 + (n + 1) * T, at[2]], flip: Math.PI };
  }

  /** 잡화점 카드가 있는 셈 치는 자리. 가운데 창 바로 아래 공중이라, 고른 카드가 거기서 손으로 날아간다 */
  storeLiftPose(): Pose {
    return this.centerPose(0.9);
  }

  storePose(i: number, count: number): Pose {
    const at = storeSlot(this.layout!, i, count);
    return { ...IDLE_POSE, pos: [at[0], 0.012, at[2]], scale: 0.9 };
  }

  handPose(seatIndex: number, ordinal: number, count: number): Pose {
    const layout = this.layout!;
    if (seatIndex === this.viewerIndex) {
      return { ...IDLE_POSE, pos: layout.handOrigin, yaw: 0, pitch: -0.9, scale: 1.1 };
    }
    const seat = layout.seats[seatIndex];
    const n = Math.max(count, 1);
    const { dx, rot } = fanOffset(Math.min(ordinal, n - 1), n);
    return {
      ...IDLE_POSE,
      pos: [seat.hand[0] + seat.right[0] * dx, 0.01 + ordinal * T, seat.hand[2] + seat.right[2] * dx],
      yaw: seat.yaw,
      spin: rot,
      // 사카가웨이면 남의 손패도 앞면이다 (view 에 실제 카드가 들어 있다)
      flip: this.state && handsRevealed(this.state) ? 0 : Math.PI,
      scale: FAN_CARD_SCALE,
    };
  }

  centerPose(lift = 0.4): Pose {
    const at = this.layout!.center;
    return { ...IDLE_POSE, pos: [at[0], lift, at[2]], scale: 1.15 };
  }

  /** zone 의 자리. ordinal/count 는 그 존 안에서의 순번과 장수. card 는 장착 칸을 고를 때 쓴다 */
  anchorFor(zone: Zone | null, ordinal = 0, count = 1, card?: CardId): Pose {
    if (!zone) return this.centerPose();
    switch (zone.z) {
      case 'deck':
        return this.deckPose();
      case 'discard':
        return this.discardPose(ordinal);
      case 'hand': {
        const i = this.seatIndexOf(zone.pid);
        return i < 0 ? this.centerPose() : this.handPose(i, ordinal, count);
      }
      case 'equipment': {
        const i = this.seatIndexOf(zone.pid);
        return i < 0 ? this.centerPose() : this.equipmentPose(i, ordinal, count, card);
      }
      case 'limbo':
        if (zone.kind === 'store') return this.storeLiftPose();
        return zone.kind === 'poker'
          ? this.storePose(ordinal, count)
          : this.centerPose(0.05);
    }
  }

  /** 좌석의 3D 위치 (이펙트 배치용) */
  seatPos(pid: PlayerId): Vec3 | null {
    const i = this.seatIndexOf(pid);
    const seat = this.layout?.seats[i];
    return seat ? seat.pos : null;
  }

  tick(dt: number, now: number): boolean {
    let moving = this.table.tick(dt, now);
    if (this.seatCards.tick(dt)) moving = true;
    for (const h of this.handles.values()) if (h.tick(dt)) moving = true;
    if (this.bullets.tick(dt)) moving = true;
    return moving;
  }
}

function isWeapon(card: CardId): boolean {
  return CARD_DEFS[kindOf(card)].equip === 'weapon';
}
