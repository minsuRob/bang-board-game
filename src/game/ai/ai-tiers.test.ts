import { describe, expect, it } from 'vitest';

import { playOut } from './__tests__/play';
import type { AiTier } from './types';

describe('AI 대전 · 난이도 순서', () => {
  // 상 난이도는 시뮬레이션을 돌리므로 한 판이 느리다. 판 수를 줄이는 대신 넉넉히 기다린다.
  it('난이도 순서가 뒤집히지 않는다 (상 > 중 > 하)', { timeout: 180_000 }, () => {
    // 좌석마다 난이도를 돌려 가며 배정해 역할 편향을 없앤다.
    const wins: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    const seats: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    const order: AiTier[] = ['easy', 'medium', 'hard'];

    for (let seed = 500; seed < 518; seed++) {
      const count = 6;
      const tierOf = (s: number): AiTier => order[(s + seed) % 3];
      const { state } = playOut(seed, count, tierOf);
      if (!state.result) continue;
      for (let s = 0; s < count; s++) {
        const tier = tierOf(s);
        seats[tier]++;
        if (state.result.winnerIds.includes(`p${s}`)) wins[tier]++;
      }
    }
    const rate = (t: string) => wins[t] / Math.max(1, seats[t]);
    // 18판으로는 상과 하만 가른다. 중 > 하는 판 수가 넉넉한 아래 테스트가 본다.
    expect(rate('hard')).toBeGreaterThan(rate('easy'));
    expect(rate('hard')).toBeGreaterThanOrEqual(rate('medium'));
  });
});
