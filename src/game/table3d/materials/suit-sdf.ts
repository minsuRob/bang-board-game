/**
 * 무늬 모양의 내부 판정. 정규화 좌표 (-1..1, y 위) 로 받는다.
 *
 * 글자를 그릴 수 없는 환경(네이티브에는 DOM canvas 가 없다)에서 카드 면을 픽셀로
 * 찍기 위한 것이라 정확한 SDF 가 아니라 안/밖만 판정한다.
 */

import type { Suit } from '../../data/types';

export function insideHeart(x: number, y: number): boolean {
  // 고전 하트 곡선. 살짝 키워서 -1..1 상자를 채운다
  const px = x * 1.25;
  const py = y * 1.25 + 0.15;
  const a = px * px + py * py - 1;
  return a * a * a - px * px * py * py * py < 0;
}

export function insideDiamond(x: number, y: number): boolean {
  return Math.abs(x) * 1.35 + Math.abs(y) < 1;
}

export function insideSpade(x: number, y: number): boolean {
  // 뒤집힌 하트 + 밑동
  if (insideHeart(x, -y - 0.1)) return true;
  return Math.abs(x) < 0.16 + Math.max(0, -y - 0.45) * 0.9 && y < -0.35 && y > -1;
}

export function insideClub(x: number, y: number): boolean {
  const r = 0.36;
  const c = (cx: number, cy: number) => (x - cx) ** 2 + (y - cy) ** 2 < r * r;
  if (c(0, 0.5) || c(-0.42, -0.1) || c(0.42, -0.1)) return true;
  return Math.abs(x) < 0.14 + Math.max(0, -y - 0.35) * 0.8 && y < 0 && y > -1;
}

export function insideSuit(suit: Suit, x: number, y: number): boolean {
  switch (suit) {
    case 'hearts':
      return insideHeart(x, y);
    case 'diamonds':
      return insideDiamond(x, y);
    case 'spades':
      return insideSpade(x, y);
    case 'clubs':
      return insideClub(x, y);
  }
}

/** 카드 뒷면 별. 8각 별 */
export function insideStar(x: number, y: number): boolean {
  const a = Math.atan2(y, x);
  const r = Math.hypot(x, y);
  const edge = 0.55 + 0.45 * Math.abs(Math.cos(a * 4));
  return r < edge;
}
