/**
 * 여러 연출이 함께 쓰는 Skia 모양 워클릿.
 */

import { Skia } from '@shopify/react-native-skia';

import type { ShotGeom } from './timeline';

export type SkPath = ReturnType<typeof Skia.Path.Make>;

/** 장착 카드가 자리에 붙을 때 카드 둘레로 한 번 퍼지는 고리. k 가 0~1 밖이면 빈 모양 */
export function settlePath(g: ShotGeom, k: number): SkPath {
  'worklet';
  const p = Skia.Path.Make();
  if (k <= 0 || k >= 1) return p;
  const pad = (3 + (1 - (1 - k) * (1 - k) * (1 - k)) * 14) * (g.cw / 92);
  p.addRRect(Skia.RRectXY(Skia.XYWHRect(g.cx - g.cw / 2 - pad, g.cy - g.ch / 2 - pad, g.cw + pad * 2, g.ch + pad * 2), 8 + pad, 8 + pad));
  return p;
}

/** (x, y) 를 중심으로 a 만큼 돌린 점 */
export function rot(x: number, y: number, a: number, dx: number, dy: number) {
  'worklet';
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: x + dx * c - dy * s, y: y + dx * s + dy * c };
}

/** 돌린 사각형 (가운데 x, y) */
export function addRotRect(p: SkPath, x: number, y: number, w: number, h: number, a: number) {
  'worklet';
  const c = [
    rot(x, y, a, -w / 2, -h / 2),
    rot(x, y, a, w / 2, -h / 2),
    rot(x, y, a, w / 2, h / 2),
    rot(x, y, a, -w / 2, h / 2),
  ];
  p.moveTo(c[0].x, c[0].y);
  for (let i = 1; i < 4; i++) p.lineTo(c[i].x, c[i].y);
  p.close();
}

/** 돌린 타원 (다각형으로 근사) */
export function addRotOval(p: SkPath, x: number, y: number, rx: number, ry: number, a: number) {
  'worklet';
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2;
    const q = rot(x, y, a, Math.cos(t) * rx, Math.sin(t) * ry);
    if (i === 0) p.moveTo(q.x, q.y);
    else p.lineTo(q.x, q.y);
  }
  p.close();
}

/** 하트. 시안 단위로 s 배 */
export function addHeart(p: SkPath, x: number, y: number, s: number) {
  'worklet';
  p.moveTo(x, y + 4 * s);
  p.cubicTo(x - 8 * s, y - 2 * s, x - 5 * s, y - 9 * s, x, y - 5 * s);
  p.cubicTo(x + 5 * s, y - 9 * s, x + 8 * s, y - 2 * s, x, y + 4 * s);
  p.close();
}

/** 별 (점 n·2 개, 바깥 반지름 r1, 안 r0) */
export function addStar(p: SkPath, x: number, y: number, r0: number, r1: number, n: number, a0: number) {
  'worklet';
  for (let i = 0; i < n * 2; i++) {
    const a = a0 + (i * Math.PI) / n;
    const r = i % 2 ? r0 : r1;
    if (i === 0) p.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else p.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  p.close();
}

/** 시드 고정 난수 (mulberry32). 모듈을 불러올 때 표를 한 번 만드는 데만 쓴다 */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
