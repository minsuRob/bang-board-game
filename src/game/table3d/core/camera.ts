/**
 * 카메라 프레이밍.
 *
 * 화면 비율과 배치를 받아 모든 좌석·더미가 화면 안에 들어오는 가장 가까운 카메라를 찾는다.
 * three 없이 투영을 직접 계산하므로 테스트에서 그대로 검증한다.
 */

import { vadd, vcross, vdot, vnorm, vsub } from './math';
import { MAT_SIZE, type CameraFrame, type TableLayout, type Vec3 } from './types';

const UP: Vec3 = [0, 1, 0];

/** 화면 가장자리 여유 (NDC) */
const FIT = { x: 0.9, y: 0.86 };

export type Projected = { x: number; y: number; depth: number };

/** frame 으로 본 p 의 NDC 좌표. depth 는 카메라 앞 거리 */
export function projectPoint(frame: CameraFrame, aspect: number, p: Vec3): Projected {
  const f = vnorm(vsub(frame.lookAt, frame.position));
  const r = vnorm(vcross(f, UP));
  const u = vcross(r, f);
  const d = vsub(p, frame.position);
  const depth = vdot(d, f);
  const t = Math.tan((frame.fov * Math.PI) / 360);
  if (depth <= 1e-6) return { x: Infinity, y: Infinity, depth };
  return {
    x: vdot(d, r) / depth / (t * aspect),
    y: vdot(d, u) / depth / t,
    depth,
  };
}

/** 화면에 꼭 들어와야 하는 점들 */
export function framingSamples(layout: TableLayout): Vec3[] {
  const out: Vec3[] = [];
  const hw = MAT_SIZE.w / 2 + 0.15;
  const hh = MAT_SIZE.h / 2 + 0.15;
  for (const s of layout.seats) {
    const [x, , z] = s.pos;
    out.push([x - hw, 0, z - hh], [x + hw, 0, z - hh], [x - hw, 0, z + hh], [x + hw, 0, z + hh]);
    out.push(s.equipment, s.label);
  }
  out.push(layout.deck, layout.discard, layout.event, layout.center);
  return out;
}

export type FrameOptions = {
  tiltDeg?: number;
  fov?: number;
};

export function frameCamera(aspectIn: number, layout: TableLayout, opts: FrameOptions = {}): CameraFrame {
  const aspect = Number.isFinite(aspectIn) && aspectIn > 0.05 ? aspectIn : 1;
  const portrait = layout.portrait;
  const tilt = ((opts.tiltDeg ?? (portrait ? 62 : 54)) * Math.PI) / 180;
  const fov = opts.fov ?? (portrait ? 56 : 44);
  const samples = framingSamples(layout);

  let lookAt: Vec3 = [0, 0, 0];
  let frame = fit(aspect, lookAt, tilt, fov, samples);

  // 위아래 여백이 균등해지도록 시선점을 앞뒤로 옮기고 다시 맞춘다
  for (let i = 0; i < 3; i++) {
    const box = bounds(frame, aspect, samples);
    const dy = (box.maxY + box.minY) / 2;
    if (Math.abs(dy) < 0.01) break;
    const dist = Math.hypot(...vsub(frame.position, frame.lookAt));
    const worldPerNdc = (dist * Math.tan((fov * Math.PI) / 360)) / Math.sin(tilt);
    lookAt = [lookAt[0], 0, lookAt[2] - dy * worldPerNdc * 0.8];
    frame = fit(aspect, lookAt, tilt, fov, samples);
  }
  return frame;
}

function fit(aspect: number, lookAt: Vec3, tilt: number, fov: number, samples: Vec3[]): CameraFrame {
  let lo = 2;
  let hi = 80;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    const frame = at(lookAt, tilt, fov, mid);
    if (fits(frame, aspect, samples)) hi = mid;
    else lo = mid;
  }
  return at(lookAt, tilt, fov, hi);
}

function at(lookAt: Vec3, tilt: number, fov: number, dist: number): CameraFrame {
  return {
    position: vadd(lookAt, [0, dist * Math.sin(tilt), dist * Math.cos(tilt)]),
    lookAt,
    fov,
  };
}

function fits(frame: CameraFrame, aspect: number, samples: Vec3[]): boolean {
  for (const p of samples) {
    const q = projectPoint(frame, aspect, p);
    if (Math.abs(q.x) > FIT.x || Math.abs(q.y) > FIT.y) return false;
  }
  return true;
}

function bounds(frame: CameraFrame, aspect: number, samples: Vec3[]) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of samples) {
    const q = projectPoint(frame, aspect, p);
    minY = Math.min(minY, q.y);
    maxY = Math.max(maxY, q.y);
  }
  return { minY, maxY };
}
