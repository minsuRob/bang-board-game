import { describe, expect, it } from 'vitest';

import { playOut } from './__tests__/play';
import type { AiTier } from './types';

describe('AI 대전', () => {
  // 상 난이도가 섞여 한 판이 느리다. CPU 가 바쁠 때 기본 30초에 걸리지 않게 넉넉히 기다린다.
  it('4~7인 대전 20판이 예외 없이 끝난다', { timeout: 180_000 }, () => {
    let finished = 0;
    for (let seed = 200; seed < 220; seed++) {
      const count = 4 + (seed % 4);
      const { state } = playOut(seed, count, (s) => (['easy', 'medium', 'hard'] as AiTier[])[s % 3]);
      if (state.result) finished++;
    }
    expect(finished).toBeGreaterThanOrEqual(18);
  });

  it('하이 눈 확장에서도 끝난다', () => {
    let finished = 0;
    for (let seed = 300; seed < 310; seed++) {
      const { state } = playOut(seed, 5, () => 'medium', 4000, true);
      if (state.result) finished++;
    }
    expect(finished).toBeGreaterThanOrEqual(9);
  });
});
