/**
 * 테이블 배치.
 *
 * 2D Table.tsx 의 타원 배치를 3D 로 옮긴 것이다. 나는 언제나 화면 아래(+z)에 앉고,
 * 나머지는 착석 순서대로 시계 방향으로 돈다. 세로 화면에서는 상대를 위쪽 호에 모은다.
 *
 * 좌표계: y 위, +z 가 카메라(나) 쪽, x 오른쪽.
 */

import { vadd, vnorm, vscale } from './math';
import { BOARD_SIZE, type SeatAnchor, type TableLayout, type Vec3 } from './types';

const LANDSCAPE = { rx: 4.3, ry: 2.7 };
const PORTRAIT = { rx: 2.9, ry: 3.7 };

/** 세로 화면에서 상대들이 차지하는 호. 150° 부터 시계 방향으로 240° */
const PORTRAIT_ARC = { start: 150, span: 240 };

/** 내 보드 배율 */
export const SELF_BOARD_SCALE = 1.4;

/** 세로 화면에서 내 보드 아래에 비워 둘 정보창 자리 (월드 단위) */
const SELF_LABEL_ROOM = 1.7;

/** 내 보드를 바깥으로 미는 거리. 커진 판이 가운데 더미에 닿지 않게 */
const SELF_PUSH = 0.35;

/**
 * 보드 그림 위의 자리. 원본(747×531) 픽셀을 비율로 옮겼다.
 * u 는 폭 기준 오른쪽이 +, v 는 높이 기준 아래(테이블 바깥)가 +.
 */
export const BOARD_SLOTS = {
  role: { u: -0.317, v: 0.116 },
  character: { u: 0, v: 0.116 },
  weapon: { u: 0.32, v: 0.116 },
  /** 슬롯 한 칸 크기 (폭·높이 비율) */
  size: { u: 0.288, v: 0.65 },
  bullets: [-0.373, -0.192, -0.005, 0.183, 0.37].map((u) => ({ u, v: -0.35 })),
} as const;

/** 슬롯에 놓는 카드 배율 (seat.scale 을 곱한다) */
export const SLOT_CARD_SCALE = 0.9;
/** 보드 밖 장착 카드 줄의 카드 배율 */
export const ROW_CARD_SCALE = 0.62;
/** 상대 손패 부채의 카드 배율 */
export const FAN_CARD_SCALE = 0.62;

const STORE_SLOTS = 8;
const STORE_GAP = 0.8;

export function layoutTable(n: number, viewerIndex: number, aspect: number): TableLayout {
  const portrait = aspect < 1;
  const base = portrait ? PORTRAIT : LANDSCAPE;
  // 7명을 넘으면 보드가 부딪히지 않게 테이블을 넓힌다
  const grow = n > 7 ? 1 + (n - 7) * 0.12 : 1;
  const rx = base.rx * grow;
  const ry = base.ry * grow;

  const seats: SeatAnchor[] = [];
  for (let i = 0; i < n; i++) {
    const offset = (i - viewerIndex + n) % n;
    const deg = seatAngle(offset, n, portrait, rx, ry);
    const a = (deg * Math.PI) / 180;
    const self = offset === 0;
    const push = self ? SELF_PUSH : 0;
    const ring: Vec3 = [rx * Math.cos(a), 0, ry * Math.sin(a)];
    const inward = vnorm([-ring[0], 0, -ring[2]]);
    const pos = vadd(ring, vscale(inward, -push));
    // 카드 윗변(yaw=0 일 때 -z)이 중심을 향하도록
    const yaw = Math.atan2(-inward[0], -inward[2]);
    const right: Vec3 = [-inward[2], 0, inward[0]];
    const scale = self ? SELF_BOARD_SCALE : 1;
    const H = BOARD_SIZE.h * scale;
    const at = (p: { u: number; v: number }): Vec3 =>
      vadd(pos, vadd(vscale(right, p.u * BOARD_SIZE.w * scale), vscale(inward, -p.v * H)));
    seats.push({
      index: i,
      pos,
      yaw,
      inward,
      right,
      scale,
      slots: { role: at(BOARD_SLOTS.role), character: at(BOARD_SLOTS.character), weapon: at(BOARD_SLOTS.weapon) },
      bullets: BOARD_SLOTS.bullets.map(at),
      equipment: vadd(pos, vscale(inward, H / 2 + 0.34 * scale)),
      hand: vadd(pos, vscale(inward, -(H / 2 + 0.2))),
      // 세로 화면의 내 자리는 옆에 정보창을 붙일 폭이 없다. 보드 아래로 자리를 비워 두게 카메라에 알린다
      label: vadd(pos, vscale(inward, self && portrait ? -(H / 2 + SELF_LABEL_ROOM) : -1.0)),
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

/**
 * 좌석의 타원 매개변수 각도(°). 같은 각도 간격으로 나누면 타원의 긴 쪽 끝에서 좌석끼리 붙으므로
 * 호의 길이로 고르게 나눈다.
 */
function seatAngle(offset: number, n: number, portrait: boolean, rx: number, ry: number): number {
  if (offset === 0) return 90;
  if (!portrait) return arcAngle(90, 360, offset / n, rx, ry);
  const others = n - 1;
  if (others === 1) return 270;
  return arcAngle(PORTRAIT_ARC.start, PORTRAIT_ARC.span, (offset - 1) / (others - 1), rx, ry);
}

/** start° 에서 span° 만큼의 타원 호에서, 호 길이 비율 t 에 해당하는 매개변수 각도(°) */
function arcAngle(start: number, span: number, t: number, rx: number, ry: number): number {
  const steps = 240;
  const speed = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return Math.hypot(rx * Math.sin(a), ry * Math.cos(a));
  };
  const lengths = [0];
  for (let i = 1; i <= steps; i++) {
    const d0 = start + (span * (i - 1)) / steps;
    const d1 = start + (span * i) / steps;
    lengths.push(lengths[i - 1] + (speed(d0) + speed(d1)) / 2);
  }
  const goal = t * lengths[steps];
  for (let i = 1; i <= steps; i++) {
    if (lengths[i] >= goal) {
      const f = (goal - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
      return start + (span * (i - 1 + f)) / steps;
    }
  }
  return start + span;
}

/**
 * 좌석이 테이블 위에서 차지하는 테두리 점. 보드 네 모서리, 장비 줄 바깥, 손패 부채 바깥.
 * 카메라 프레이밍과 라벨 자리 계산이 같이 쓴다.
 */
export function seatFootprint(seat: SeatAnchor, margin = 0.1): Vec3[] {
  const hw = (BOARD_SIZE.w * seat.scale) / 2 + margin;
  const hh = (BOARD_SIZE.h * seat.scale) / 2 + margin;
  const corner = (u: number, w: number): Vec3 => vadd(seat.pos, vadd(vscale(seat.right, u), vscale(seat.inward, w)));
  const out: Vec3[] = [corner(-hw, -hh), corner(hw, -hh), corner(-hw, hh), corner(hw, hh)];
  // 장비 줄 윗변
  const rowTop = vadd(seat.equipment, vscale(seat.inward, (ROW_CARD_SCALE * seat.scale) / 2));
  out.push(vadd(rowTop, vscale(seat.right, -hw * 0.8)), vadd(rowTop, vscale(seat.right, hw * 0.8)));
  // 손패 부채 바깥 (내 자리는 부채가 없다)
  if (seat.scale === 1) {
    const fanBottom = vadd(seat.hand, vscale(seat.inward, -FAN_CARD_SCALE / 2 - margin));
    out.push(vadd(fanBottom, vscale(seat.right, -0.8)), vadd(fanBottom, vscale(seat.right, 0.8)));
  }
  return out;
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

/** 보드 밖 장착 카드 줄의 i 번째 카드 자리 */
export function equipmentOffset(i: number, count: number): number {
  const step = Math.min(0.5, 1.9 / Math.max(1, count));
  return (i - (count - 1) / 2) * step;
}
