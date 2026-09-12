/**
 * 테이블 배치.
 *
 * 2D Table.tsx 의 타원 배치를 3D 로 옮긴 것이다. 나는 언제나 화면 아래(+z)에 앉고,
 * 나머지는 착석 순서대로 시계 방향으로 돈다. 세로 화면에서는 상대를 위쪽 호에 모은다.
 *
 * 좌표계: y 위, +z 가 카메라(나) 쪽, x 오른쪽.
 */

import { vadd, vnorm, vscale } from './math';
import type { SeatAnchor, TableLayout, Vec3 } from './types';

const LANDSCAPE = { rx: 4.3, ry: 2.7 };
const PORTRAIT = { rx: 2.55, ry: 3.6 };

/** 세로 화면에서 상대들이 차지하는 호. 150° 부터 시계 방향으로 240° */
const PORTRAIT_ARC = { start: 150, span: 240 };

const STORE_SLOTS = 8;
const STORE_GAP = 0.8;

export function layoutTable(n: number, viewerIndex: number, aspect: number): TableLayout {
  const portrait = aspect < 1;
  const { rx, ry } = portrait ? PORTRAIT : LANDSCAPE;

  const seats: SeatAnchor[] = [];
  for (let i = 0; i < n; i++) {
    const offset = (i - viewerIndex + n) % n;
    const deg = seatAngle(offset, n, portrait);
    const a = (deg * Math.PI) / 180;
    const pos: Vec3 = [rx * Math.cos(a), 0, ry * Math.sin(a)];
    const inward = vnorm([-pos[0], 0, -pos[2]]);
    // 카드 윗변(yaw=0 일 때 -z)이 중심을 향하도록
    const yaw = Math.atan2(-inward[0], -inward[2]);
    seats.push({
      index: i,
      pos,
      yaw,
      inward,
      equipment: vadd(pos, vscale(inward, 0.72)),
      hand: vadd(pos, vscale(inward, -0.12)),
      label: vadd(pos, vscale(inward, -1.0)),
    });
  }

  const store: Vec3[] = [];
  for (let i = 0; i < STORE_SLOTS; i++) store.push([0, 0, 1.15]);

  return {
    n,
    viewerIndex,
    portrait,
    rx,
    ry,
    seats,
    deck: [-0.85, 0, 0.1],
    discard: [0.85, 0, 0.1],
    event: [0, 0, -1.3],
    store,
    center: [0, 0, 0.1],
    handOrigin: [0, 0.35, ry + 1.6],
  };
}

function seatAngle(offset: number, n: number, portrait: boolean): number {
  if (offset === 0) return 90;
  if (!portrait) return 90 + offset * (360 / n);
  const others = n - 1;
  if (others === 1) return 270;
  return PORTRAIT_ARC.start + ((offset - 1) * PORTRAIT_ARC.span) / (others - 1);
}

/** 가운데 펼칠 카드 count 장의 i 번째 자리 */
export function storeSlot(layout: TableLayout, i: number, count: number): Vec3 {
  const base = layout.store[0];
  const x = (i - (count - 1) / 2) * STORE_GAP;
  return [base[0] + x, base[1], base[2]];
}

/** 부채꼴 손패의 i 번째 카드 자리. 가운데 카드가 매트 축에 놓인다 */
export function fanOffset(i: number, count: number): { dx: number; rot: number } {
  const step = Math.min(0.22, 1.6 / Math.max(1, count));
  const centered = i - (count - 1) / 2;
  return { dx: centered * step, rot: -centered * 0.06 };
}

/** 장착 카드 줄의 i 번째 카드 자리 */
export function equipmentOffset(i: number, count: number): number {
  const step = Math.min(0.62, 1.9 / Math.max(1, count));
  return (i - (count - 1) / 2) * step;
}
