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
  seatKey,
  type AnchorPoint,
} from '../core/anchors-store';
import { BOARD_SLOTS, seatFootprint } from '../core/layout';
import { BOARD_SIZE, type TableLayout, type Vec3 } from '../core/types';

const v = new THREE.Vector3();

export class AnchorProjector {
  project(camera: THREE.Camera, width: number, height: number, layout: TableLayout) {
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
    put(ANCHOR_CENTER, layout.center);

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
