import { describe, expect, it } from 'vitest';

import { insideClub, insideDiamond, insideHeart, insideSpade, insideStar } from '../materials/suit-sdf';

function coverage(f: (x: number, y: number) => boolean): number {
  let n = 0;
  const N = 64;
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) if (f((i / (N - 1)) * 2 - 1, (j / (N - 1)) * 2 - 1)) n++;
  return n / (N * N);
}

describe('suit shapes', () => {
  it('각 무늬는 상자의 일부를 채우되 전부 채우지는 않는다', () => {
    for (const f of [insideHeart, insideDiamond, insideSpade, insideClub, insideStar]) {
      const c = coverage(f);
      expect(c).toBeGreaterThan(0.15);
      expect(c).toBeLessThan(0.8);
    }
  });

  it('하트는 위가 갈라지고 아래가 뾰족하다', () => {
    expect(insideHeart(0, 0.9)).toBe(false);
    expect(insideHeart(-0.5, 0.45)).toBe(true);
    expect(insideHeart(0.5, 0.45)).toBe(true);
    expect(insideHeart(0, -0.6)).toBe(true);
    expect(insideHeart(0.5, -0.7)).toBe(false);
  });

  it('스페이드는 하트를 뒤집은 것이라 위가 뾰족하다', () => {
    expect(insideSpade(0, 0.7)).toBe(true);
    expect(insideSpade(0.5, 0.7)).toBe(false);
  });
});
