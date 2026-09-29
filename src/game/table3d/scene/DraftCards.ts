/**
 * 캐릭터 드래프트 중 상대 자리에 놓이는 후보 카드들.
 *
 * 전부 뒷면이다. 누가 어느 카드 위에 마우스를 올렸는지만 보인다:
 * 올린 카드는 들리고, 기울고, 천천히 흔들린다. 고른 뒤에는 고른 카드만 들린 채로 남고
 * 나머지는 매트로 가라앉는다. 내 후보는 화면 아래 RN 패널이 보여 주므로 여기선 그리지 않는다.
 */

import * as THREE from 'three';

import type { GameState } from '../../engine';
import { draftOfferCount } from '../../engine';
import type { TableLayout } from '../core/types';
import { CardHandle, IDLE_POSE, type Pose } from './CardHandle';

const SPACING = 0.62;
const REST_SCALE = 0.82;

export class DraftCards {
  readonly root = new THREE.Group();
  /** handles[seat][j] */
  private handles: CardHandle[][] = [];
  private layout: TableLayout | null = null;
  private state: GameState | null = null;
  private viewerIndex = 0;

  setLayout(layout: TableLayout) {
    this.layout = layout;
    this.rebuild(true);
  }

  update(state: GameState, viewerIndex: number) {
    const was = Boolean(this.state?.draft);
    this.state = state;
    this.viewerIndex = viewerIndex;
    // 드래프트가 새로 열리면 즉시 제자리에
    this.rebuild(!was);
  }

  private rebuild(snap: boolean) {
    const layout = this.layout;
    const draft = this.state?.draft;
    if (!layout || !draft) {
      for (const row of this.handles) for (const h of row) h.show(false);
      return;
    }
    const per = draftOfferCount(layout.n);
    for (let i = 0; i < layout.n; i++) {
      const row = (this.handles[i] ??= []);
      for (let j = 0; j < per; j++) {
        let h = row[j];
        if (!h) {
          h = new CardHandle();
          row[j] = h;
          this.root.add(h.group);
        }
        const visible = i !== this.viewerIndex;
        h.show(visible);
        if (snap && visible) h.snap(this.restPose(i, j, per));
      }
      for (let j = per; j < row.length; j++) row[j].show(false);
    }
  }

  private restPose(seatIndex: number, j: number, per: number): Pose {
    const seat = this.layout!.seats[seatIndex];
    const dx = (j - (per - 1) / 2) * SPACING;
    // 아직 캐릭터가 없는 보드 위에 후보를 펼친다
    const at = seat.slots.character;
    return {
      ...IDLE_POSE,
      pos: [at[0] + seat.right[0] * dx, 0.012, at[2] + seat.right[2] * dx],
      yaw: seat.yaw,
      flip: Math.PI,
      scale: REST_SCALE,
    };
  }

  /**
   * hover[pid] = 그 사람이 올려 둔 후보 인덱스.
   * 흔들리는 카드가 하나라도 있으면 true (프레임을 계속 요청해야 한다).
   */
  tick(dt: number, now: number, hover: Record<string, number | null>): boolean {
    const state = this.state;
    const layout = this.layout;
    const draft = state?.draft;
    if (!state || !layout || !draft) return false;

    const per = draftOfferCount(layout.n);
    let active = false;
    state.players.forEach((p, i) => {
      if (i === this.viewerIndex) return;
      const row = this.handles[i];
      if (!row) return;
      const pick = draft.picked[p.id];
      const pickedIndex = pick ? draft.offers[p.id].indexOf(pick) : -1;
      const hovered = pickedIndex < 0 ? (hover[p.id] ?? null) : null;

      for (let j = 0; j < per; j++) {
        const h = row[j];
        if (!h) continue;
        const rest = this.restPose(i, j, per);
        let target = rest;
        if (pickedIndex >= 0) {
          target =
            j === pickedIndex
              ? { ...rest, pos: [rest.pos[0], 0.3, rest.pos[2]], pitch: -0.3, scale: 0.95 }
              : { ...rest, pos: [rest.pos[0], 0.004, rest.pos[2]], scale: 0.62 };
        } else if (hovered === j) {
          // 들어 올려 주인 쪽으로 기울이고, 천천히 흔든다
          const t = now + i * 377;
          const bob = Math.sin(t / 420) * 0.05;
          target = {
            ...rest,
            pos: [rest.pos[0], 0.5 + bob, rest.pos[2]],
            pitch: -0.5 + Math.sin(t / 900) * 0.08,
            roll: Math.sin(t / 700) * 0.06,
            scale: 1.0,
          };
          active = true;
        }
        h.setTarget(target);
        if (h.tick(dt)) active = true;
      }
    });
    return active;
  }
}
