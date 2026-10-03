import { describe, expect, it } from 'vitest';

import { playOut } from './__tests__/play';
import type { AiTier } from './types';

describe('AI 대전 · 중과 하', () => {
  it('중 난이도가 하 난이도보다 확실히 강하다', () => {
    // 좌석마다 난이도를 번갈아 배정해 역할 편향을 없앤다
    const wins: Record<string, number> = { easy: 0, medium: 0 };
    const seats: Record<string, number> = { easy: 0, medium: 0 };

    for (let seed = 400; seed < 440; seed++) {
      const count = 6;
      const tierOf = (s: number): AiTier => ((s + seed) % 2 === 0 ? 'easy' : 'medium');
      const { state } = playOut(seed, count, tierOf);
      if (!state.result) continue;
      for (let s = 0; s < count; s++) {
        const tier = tierOf(s);
        seats[tier]++;
        if (state.result.winnerIds.includes(`p${s}`)) wins[tier]++;
      }
    }
    const rate = (t: string) => wins[t] / Math.max(1, seats[t]);
    expect(rate('medium')).toBeGreaterThan(rate('easy') + 0.05);
  });
});
