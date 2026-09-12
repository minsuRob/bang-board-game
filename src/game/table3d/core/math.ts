/**
 * 애니메이션 수학. 순수 함수만.
 */

import type { Vec3 } from './types';

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 프레임 시간에 독립적인 지수 감쇠. lambda 가 클수록 빨리 붙는다 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function easeOutQuad(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - (1 - x) * (1 - x);
}

export function easeOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

export function easeInOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeInCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * x;
}

/** 살짝 넘겼다가 돌아오는 착지 */
export function easeOutBack(t: number, overshoot = 1.7): number {
  const x = clamp(t, 0, 1);
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + overshoot * Math.pow(x - 1, 2);
}

export function vadd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vsub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vscale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function vlen(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function vnorm(a: Vec3): Vec3 {
  const l = vlen(a);
  return l === 0 ? [0, 0, 0] : [a[0] / l, a[1] / l, a[2] / l];
}

export function vlerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function vdot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function vcross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/** 2차 베지어 */
export function quadBezier(p0: Vec3, p1: Vec3, p2: Vec3, t: number): Vec3 {
  const u = 1 - t;
  const a = u * u;
  const b = 2 * u * t;
  const c = t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0],
    a * p0[1] + b * p1[1] + c * p2[1],
    a * p0[2] + b * p1[2] + c * p2[2],
  ];
}

/** 2차 베지어의 접선 (정규화 안 함) */
export function quadBezierTangent(p0: Vec3, p1: Vec3, p2: Vec3, t: number): Vec3 {
  const u = 1 - t;
  return [
    2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]),
    2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]),
    2 * u * (p1[2] - p0[2]) + 2 * t * (p2[2] - p1[2]),
  ];
}

/** 비행 궤적의 꼭대기. 거리에 비례해 높이 띄운다 */
export function arcControl(from: Vec3, to: Vec3, lift: number): Vec3 {
  const mid = vlerp(from, to, 0.5);
  const dist = vlen(vsub(to, from));
  return [mid[0], Math.max(from[1], to[1]) + lift + dist * 0.18, mid[2]];
}

/** 정수 하나로 결정되는 [0,1) 잡음. 연출 지터용이라 엔진 난수와 무관하다 */
export function hashNoise(i: number, salt = 0): number {
  let h = (i * 374761393 + salt * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 각도 차를 (-π, π] 로 접는다 */
export function wrapAngle(a: number): number {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x <= -Math.PI) x += Math.PI * 2;
  return x;
}
