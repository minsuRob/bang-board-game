/**
 * 보드 슬롯의 직업·캐릭터 카드.
 *
 * 캐릭터는 늘 앞면. 직업은 공개(보안관·탈락자)면 앞면, 아니면 뒷면이다.
 * 내 직업은 숨긴 채로 내 쪽을 향해 비스듬히 세운다. 나에게만 앞면이 보인다.
 *
 * 숨은 정보: 남의 역할은 view 에서 가려져 있을 수 있다. roleRevealed 가 아니면
 * 앞면 머티리얼을 아예 붙이지 않는다.
 */

import * as THREE from 'three';

import type { GameState } from '../../engine';
import { SLOT_CARD_SCALE } from '../core/layout';
import { CARD_SIZE, type TableLayout } from '../core/types';
import {
  characterFrameMaterial,
  portraitMaterial,
  roleBackMaterial,
  roleFaceMaterial,
} from '../materials/card-materials';
import { PORTRAIT_WINDOW } from '../materials/textures';
import { CardHandle, IDLE_POSE, type Pose } from './CardHandle';

/**
 * 내 직업 카드를 세우는 각도. 가까운 변을 경첩 삼아 먼 변을 내 쪽으로 든다.
 * 앞면은 나(카메라)를 보고, 테이블의 남들에게는 뒷면만 보인다.
 */
const PEEK = 0.95;

type SeatPair = { role: CardHandle; character: CardHandle; portrait: THREE.Mesh };

export class SeatCards {
  readonly root = new THREE.Group();
  private seats: SeatPair[] = [];
  private layout: TableLayout | null = null;
  private readonly portraitGeometry = new THREE.PlaneGeometry(
    CARD_SIZE.w * PORTRAIT_WINDOW.w,
    CARD_SIZE.h * PORTRAIT_WINDOW.h,
  );

  setLayout(layout: TableLayout) {
    this.layout = layout;
  }

  update(state: GameState, viewerIndex: number, snap: boolean) {
    const layout = this.layout;
    if (!layout) return;
    while (this.seats.length < state.players.length) this.seats.push(this.newPair());

    this.seats.forEach((pair, i) => {
      const p = state.players[i];
      const seat = layout.seats[i];
      if (!p || !seat) {
        pair.role.show(false);
        pair.character.show(false);
        return;
      }
      const self = i === viewerIndex;
      const revealed = p.roleRevealed;
      const scale = SLOT_CARD_SCALE * seat.scale;
      const base: Pose = { ...IDLE_POSE, yaw: seat.yaw, scale };

      // 직업
      const roleFace = revealed || self ? roleFaceMaterial(p.role) : roleBackMaterial();
      pair.role.dress(roleFace, roleBackMaterial());
      const at = seat.slots.role;
      let rolePose: Pose = { ...base, pos: [at[0], 0.014, at[2]], flip: revealed ? 0 : Math.PI };
      if (self && !revealed) {
        // 가까운 변은 제자리, 중심을 위로 올리고 바깥쪽으로 조금 당긴다
        const half = (CARD_SIZE.h * scale) / 2;
        const lift = half * Math.sin(PEEK);
        const slide = half * (1 - Math.cos(PEEK));
        rolePose = {
          ...rolePose,
          pos: [at[0] - seat.inward[0] * slide, 0.014 + lift, at[2] - seat.inward[2] * slide],
          pitch: PEEK,
          flip: 0,
        };
      }
      pair.role.show(true);
      this.move(pair.role, rolePose, snap);

      // 캐릭터. 드래프트 중에는 아직 없다
      const drafting = Boolean(state.draft);
      pair.character.show(!drafting);
      if (!drafting) {
        pair.character.dress(characterFrameMaterial(), roleBackMaterial());
        pair.portrait.material = portraitMaterial(p.character);
        this.move(pair.character, { ...base, pos: [seat.slots.character[0], 0.014, seat.slots.character[2]] }, snap);
      }
    });
  }

  tick(dt: number): boolean {
    let moving = false;
    for (const pair of this.seats) {
      if (pair.role.tick(dt)) moving = true;
      if (pair.character.tick(dt)) moving = true;
    }
    return moving;
  }

  private readonly placed = new WeakSet<CardHandle>();

  private move(h: CardHandle, pose: Pose, snap: boolean) {
    if (snap || !this.placed.has(h)) {
      h.snap(pose);
      this.placed.add(h);
    } else h.setTarget(pose);
  }

  private newPair(): SeatPair {
    const role = new CardHandle();
    const character = new CardHandle();
    const portrait = new THREE.Mesh(this.portraitGeometry);
    portrait.position.set(0, CARD_SIZE.h * PORTRAIT_WINDOW.y, 0.001);
    // 틀도 투명 머티리얼이라 정렬 순서가 흔들린다. 초상을 늘 뒤에 그려 틀 위에 오게 한다
    portrait.renderOrder = 1;
    character.addToFront(portrait);
    this.root.add(role.group, character.group);
    return { role, character, portrait };
  }
}
