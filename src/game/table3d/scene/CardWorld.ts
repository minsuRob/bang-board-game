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

import type { CardId } from '../../data/types';
import type { GameState, PlayerId } from '../../engine';
import { equipmentOffset, fanOffset, storeSlot } from '../core/layout';
import { CARD_SIZE, type FxBudget, type TableLayout, type Vec3, type Zone } from '../core/types';
import { backMaterialShared, eventMaterialShared, cardPlaneGeometry } from '../materials/card-materials';
import { CardHandle, IDLE_POSE, type Pose } from './CardHandle';
import { OpponentFans } from './OpponentFans';
import { TableGeometry } from './TableGeometry';

const T = CARD_SIZE.thickness;

export class CardWorld {
  readonly root = new THREE.Group();
  readonly table = new TableGeometry();
  readonly fans = new OpponentFans();
  layout: TableLayout | null = null;
  private state: GameState | null = null;
  private viewerIndex = 0;
  private readonly handles = new Map<CardId, CardHandle>();
  private readonly pool: CardHandle[] = [];
  private readonly cards = new THREE.Group();
  private readonly deckStack: THREE.Mesh;
  private readonly discardStack: THREE.Mesh;
  private readonly eventCard: THREE.Mesh;

  constructor(readonly budget: FxBudget) {
    const side = new THREE.MeshBasicMaterial({ color: '#2B1F13' });
    const paperSide = new THREE.MeshBasicMaterial({ color: '#C9B48A' });
    const box = new THREE.BoxGeometry(CARD_SIZE.w, 1, CARD_SIZE.h);
    this.deckStack = new THREE.Mesh(box, [side, side, backMaterialShared(), side, side, side]);
    this.discardStack = new THREE.Mesh(box, [paperSide, paperSide, paperSide, paperSide, paperSide, paperSide]);
    this.eventCard = new THREE.Mesh(cardPlaneGeometry(CARD_SIZE.w, CARD_SIZE.h), eventMaterialShared());
    this.eventCard.rotation.x = -Math.PI / 2;
    this.eventCard.scale.setScalar(1.05);
    this.eventCard.visible = false;
    this.root.add(this.table.root, this.fans.mesh, this.deckStack, this.discardStack, this.eventCard, this.cards);
  }

  setLayout(layout: TableLayout) {
    this.layout = layout;
    this.table.setLayout(layout);
    this.eventCard.position.set(layout.event[0], 0.01, layout.event[2]);
    if (this.state) this.settle(this.state, this.viewerIndex, true);
  }

  seatIndexOf(pid: PlayerId): number {
    return this.state?.players.findIndex((p) => p.id === pid) ?? -1;
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

    // 장착 카드 (공개)
    state.players.forEach((p, i) => {
      const seat = layout.seats[i];
      if (!seat) return;
      p.equipment.forEach((card, j) => place(card, this.equipmentPose(seat.index, j, p.equipment.length)));
    });

    // 버린 더미 맨 위 (공개)
    const top = state.discard[state.discard.length - 1];
    if (top) place(top, this.discardPose(state.discard.length - 1));

    // 잡화점처럼 가운데 펼친 카드 (공개)
    const revealed = revealedCards(state);
    revealed.forEach((card, i) => place(card, this.storePose(i, revealed.length)));

    // 자리를 못 받은 카드는 치운다 (연출 중인 카드는 예외)
    for (const [card, h] of [...this.handles]) {
      if (!h.resident && !h.driven) this.release(card);
    }

    // 더미 높이
    this.stack(this.deckStack, layout.deck, state.deck.length);
    this.stack(this.discardStack, layout.discard, Math.max(0, state.discard.length - 1));

    // 상대 손패 부채
    const counts = state.players.map((p, i) => (i === viewerIndex ? 0 : p.hand.length));
    this.fans.update(layout, counts);

    // 이벤트 카드
    this.eventCard.visible = Boolean(state.event?.current);

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
    mesh.visible = true;
    mesh.scale.y = h;
    mesh.position.set(at[0], h / 2 + 0.002, at[2]);
  }

  // -------------------------------------------------------------------------
  // 자리 계산. 앞면 여부는 여기서만 정한다
  // -------------------------------------------------------------------------

  equipmentPose(seatIndex: number, i: number, count: number): Pose {
    const seat = this.layout!.seats[seatIndex];
    const rx = -seat.inward[2];
    const rz = seat.inward[0];
    const dx = equipmentOffset(i, count);
    return {
      ...IDLE_POSE,
      pos: [seat.equipment[0] + rx * dx, 0.012, seat.equipment[2] + rz * dx],
      yaw: seat.yaw,
      scale: 0.82,
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
    const rx = -seat.inward[2];
    const rz = seat.inward[0];
    return {
      ...IDLE_POSE,
      pos: [seat.hand[0] + rx * dx, 0.01 + ordinal * T, seat.hand[2] + rz * dx],
      yaw: seat.yaw,
      spin: rot,
      flip: Math.PI,
      scale: 0.92,
    };
  }

  centerPose(lift = 0.4): Pose {
    const at = this.layout!.center;
    return { ...IDLE_POSE, pos: [at[0], lift, at[2]], scale: 1.15 };
  }

  /** zone 의 자리. ordinal/count 는 그 존 안에서의 순번과 장수 */
  anchorFor(zone: Zone | null, ordinal = 0, count = 1): Pose {
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
        return i < 0 ? this.centerPose() : this.equipmentPose(i, ordinal, count);
      }
      case 'limbo':
        return zone.kind === 'store' ? this.storePose(ordinal, count) : this.centerPose(0.05);
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
    for (const h of this.handles.values()) if (h.tick(dt)) moving = true;
    return moving;
  }
}

/** 지금 가운데 펼쳐져 있는 공개 카드 */
export function revealedCards(state: GameState): CardId[] {
  for (let i = state.stack.length - 1; i >= 0; i--) {
    const f = state.stack[i];
    if (f.k === 'generalStore') return f.revealed;
  }
  return [];
}
