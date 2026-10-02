/**
 * 3D 앵커 → 화면 px. anchors-store 에 쓴다. 값이 안 바뀌면 set 하지 않는다.
 */

import * as THREE from 'three';

import {
  ANCHOR_CENTER,
  ANCHOR_DECK,
  ANCHOR_DISCARD,
  ANCHOR_EVENT,
  anchorsStore,
  characterKey,
  equipmentKey,
  seatKey,
  type AnchorPoint,
} from '../core/anchors-store';
import { BOARD_SLOTS, seatFootprint } from '../core/layout';
import type { Pose } from './CardHandle';
import { BOARD_SIZE, CARD_SIZE, EVENT_CARD_SCALE, type TableLayout, type Vec3 } from '../core/types';

const v = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

type EquipmentPose = { card: string; pose: Pose };

export class AnchorProjector {
  /** 마지막으로 받은 장착 카드 자리. 카메라만 움직일 때도 다시 쓴다 */
  private equipment: EquipmentPose[] = [];

  project(camera: THREE.Camera, width: number, height: number, layout: TableLayout, equipment?: EquipmentPose[]) {
    if (equipment) this.equipment = equipment;
    const points: Record<string, AnchorPoint> = {};
    const put = (key: string, p: Vec3, lift = 0) => {
      v.set(p[0], p[1] + lift, p[2]).project(camera);
      points[key] = {
        x: ((v.x + 1) / 2) * width,
        y: ((1 - v.y) / 2) * height,
        depth: v.z,
        visible: v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2,
      };
    };
    for (const s of layout.seats) {
      // 보드 중심을 앵커로, 보드+장비 줄+손패 부채가 차지하는 화면 범위를 같이 준다
      put(seatKey(s.index), s.pos, 0);
      let top = Infinity;
      let bottom = -Infinity;
      let left = Infinity;
      let right = -Infinity;
      for (const p of seatFootprint(s, 0.05)) {
        v.set(p[0], 0, p[2]).project(camera);
        const x = ((v.x + 1) / 2) * width;
        const y = ((1 - v.y) / 2) * height;
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
      const pt = points[seatKey(s.index)];
      pt.top = top;
      pt.bottom = bottom;
      pt.left = left;
      pt.right = right;

      // 캐릭터 카드 칸의 화면 사각형 (hover 로 능력 설명을 띄우는 자리)
      const c = s.slots.character;
      put(characterKey(s.index), c, 0);
      const hu = (BOARD_SLOTS.size.u * BOARD_SIZE.w * s.scale) / 2;
      const hv = (BOARD_SLOTS.size.v * BOARD_SIZE.h * s.scale) / 2;
      const cp = points[characterKey(s.index)];
      cp.top = Infinity;
      cp.bottom = -Infinity;
      cp.left = Infinity;
      cp.right = -Infinity;
      for (const [du, dv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        v.set(
          c[0] + s.right[0] * du * hu + s.inward[0] * dv * hv,
          0.02,
          c[2] + s.right[2] * du * hu + s.inward[2] * dv * hv,
        ).project(camera);
        const x = ((v.x + 1) / 2) * width;
        const y = ((1 - v.y) / 2) * height;
        cp.top = Math.min(cp.top, y);
        cp.bottom = Math.max(cp.bottom, y);
        cp.left = Math.min(cp.left, x);
        cp.right = Math.max(cp.right, x);
      }
    }
    put(ANCHOR_DECK, layout.deck, 0.05);
    put(ANCHOR_DISCARD, layout.discard, 0.05);
    put(ANCHOR_EVENT, layout.event, 0.05);
    // 이벤트 카드의 화면 사각형 (hover 로 이벤트 설명을 띄우는 자리). 테이블에 눕혀 놓였다
    {
      const ep = points[ANCHOR_EVENT];
      const hw = (CARD_SIZE.w * EVENT_CARD_SCALE) / 2;
      const hh = (CARD_SIZE.h * EVENT_CARD_SCALE) / 2;
      ep.top = Infinity;
      ep.bottom = -Infinity;
      ep.left = Infinity;
      ep.right = -Infinity;
      for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        v.set(layout.event[0] + dx * hw, 0.02, layout.event[2] + dz * hh).project(camera);
        const x = ((v.x + 1) / 2) * width;
        const y = ((1 - v.y) / 2) * height;
        ep.top = Math.min(ep.top, y);
        ep.bottom = Math.max(ep.bottom, y);
        ep.left = Math.min(ep.left, x);
        ep.right = Math.max(ep.right, x);
      }
    }
    put(ANCHOR_CENTER, layout.center);

    // 장착 카드의 화면 사각형 (hover 로 카드 설명을 띄우는 자리). 테이블에 눕혀 놓였다
    for (const { card, pose } of this.equipment) {
      const hw = (CARD_SIZE.w * pose.scale) / 2;
      const hh = (CARD_SIZE.h * pose.scale) / 2;
      put(equipmentKey(card), pose.pos, 0);
      const ep = points[equipmentKey(card)];
      ep.top = Infinity;
      ep.bottom = -Infinity;
      ep.left = Infinity;
      ep.right = -Infinity;
      for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        v.set(dx * hw, 0, dz * hh).applyAxisAngle(UP, pose.yaw);
        v.set(pose.pos[0] + v.x, pose.pos[1], pose.pos[2] + v.z).project(camera);
        const x = ((v.x + 1) / 2) * width;
        const y = ((1 - v.y) / 2) * height;
        ep.top = Math.min(ep.top, y);
        ep.bottom = Math.max(ep.bottom, y);
        ep.left = Math.min(ep.left, x);
        ep.right = Math.max(ep.right, x);
      }
    }

    const prev = anchorsStore.getState();
    if (prev.width === width && prev.height === height && same(prev.points, points)) return;
    anchorsStore.setState({ width, height, points });
  }
}

function same(a: Record<string, AnchorPoint>, b: Record<string, AnchorPoint>): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) {
    const p = a[k];
    const q = b[k];
    if (!q) return false;
    if (Math.abs(p.x - q.x) > 0.5 || Math.abs(p.y - q.y) > 0.5 || p.visible !== q.visible) return false;
    if (Math.abs((p.top ?? 0) - (q.top ?? 0)) > 0.5 || Math.abs((p.bottom ?? 0) - (q.bottom ?? 0)) > 0.5) return false;
    if (Math.abs((p.left ?? 0) - (q.left ?? 0)) > 0.5 || Math.abs((p.right ?? 0) - (q.right ?? 0)) > 0.5) return false;
  }
  return true;
}
