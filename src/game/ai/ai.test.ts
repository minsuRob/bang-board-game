import { describe, expect, it } from 'vitest';

import { actionKey, legalActions, reduce, type Action, type GameState } from '../engine';
import { viewFor } from '../engine/view';
import { decide } from './index';
import type { AiTier } from './types';

function startGame(seed: number, count: number, highnoon = false): GameState {
  const seats = Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  return reduce(null, {
    type: 'startGame',
    seed,
    config: { playerCount: count, expansions: highnoon ? ['highnoon'] : [] },
    seats,
  });
}

type PlayResult = { state: GameState; steps: number };

function playOut(
  seed: number,
  count: number,
  tierOf: (seat: number) => AiTier,
  maxSteps = 4000,
  highnoon = false,
): PlayResult {
  let state = startGame(seed, count, highnoon);
  let steps = 0;

  while (!state.result && steps < maxSteps) {
    const actor = state.awaiting ? state.awaiting.pid : state.turn.active;
    const seat = state.players.findIndex((p) => p.id === actor);
    const action = decide(state, actor, tierOf(seat), seed * 31 + steps);
    if (!action) break;
    const next = reduce(state, action);
    expect(next, `상태가 진행되지 않았다 (seed ${seed}, step ${steps})`).not.toBe(state);
    state = next;
    steps++;
  }
  return { state, steps };
}

describe('AI 기본 동작', () => {
  it('세 난이도 모두 합법적인 수만 낸다', () => {
    for (const tier of ['easy', 'medium', 'hard'] as AiTier[]) {
      let state = startGame(5, 5);
      for (let i = 0; i < 40 && !state.result; i++) {
        const actor = state.awaiting ? state.awaiting.pid : state.turn.active;
        const action = decide(state, actor, tier, i);
        expect(action, `${tier} 가 수를 못 골랐다`).not.toBeNull();
        const legal = legalActions(state, actor).map(actionKey);
        expect(legal, `${tier} 가 불법 수를 냈다`).toContain(actionKey(action as Action));
        state = reduce(state, action as Action);
      }
    }
  });

  it('가려진 시야만 보고 판단한다 (전체 상태를 줘도 결과가 같다)', () => {
    const state = startGame(9, 6);
    const actor = state.turn.active;
    const fromFull = decide(state, actor, 'medium', 3);
    const fromView = decide(viewFor(state, actor), actor, 'medium', 3);
    expect(actionKey(fromView as Action)).toBe(actionKey(fromFull as Action));
  });

  it('같은 국면 + 같은 시드면 같은 수를 둔다', () => {
    const state = startGame(13, 5);
    const actor = state.turn.active;
    for (const tier of ['easy', 'medium', 'hard'] as AiTier[]) {
      const a = decide(state, actor, tier, 77);
      const b = decide(state, actor, tier, 77);
      expect(actionKey(b as Action)).toBe(actionKey(a as Action));
    }
  });

  it('시드가 다르면 하 난이도는 다른 수도 낸다', () => {
    const state = startGame(21, 6);
    const actor = state.turn.active;
    const seen = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const a = decide(state, actor, 'easy', seed);
      if (a) seen.add(actionKey(a));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('AI 대전', () => {
  it('4~7인 대전 20판이 예외 없이 끝난다', () => {
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
