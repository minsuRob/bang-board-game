import { describe, expect, it } from 'vitest';

import { actionKey, actorsOf, legalActions, reduce, type Action } from '../engine';
import { viewFor } from '../engine/view';
import { startDrafted, startGame } from './__tests__/play';
import { decide } from './index';
import type { AiTier } from './types';

describe('AI 기본 동작', () => {
  it('세 난이도 모두 합법적인 수만 낸다', () => {
    for (const tier of ['easy', 'medium', 'hard'] as AiTier[]) {
      let state = startGame(5, 5);
      for (let i = 0; i < 40 && !state.result; i++) {
        const actor = actorsOf(state)[0];
        const action = decide(state, actor, tier, i);
        expect(action, `${tier} 가 수를 못 골랐다`).not.toBeNull();
        const legal = legalActions(state, actor).map(actionKey);
        expect(legal, `${tier} 가 불법 수를 냈다`).toContain(actionKey(action as Action));
        state = reduce(state, action as Action);
      }
    }
  });

  it('가려진 시야만 보고 판단한다 (전체 상태를 줘도 결과가 같다)', () => {
    const state = startDrafted(9, 6);
    const actor = state.turn.active;
    for (const tier of ['easy', 'medium', 'hard'] as AiTier[]) {
      const fromFull = decide(state, actor, tier, 3);
      const fromView = decide(viewFor(state, actor), actor, tier, 3);
      expect(actionKey(fromView as Action), tier).toBe(actionKey(fromFull as Action));
    }
  });

  it('같은 국면 + 같은 시드면 같은 수를 둔다', () => {
    const state = startDrafted(13, 5);
    const actor = state.turn.active;
    for (const tier of ['easy', 'medium', 'hard'] as AiTier[]) {
      const a = decide(state, actor, tier, 77);
      const b = decide(state, actor, tier, 77);
      expect(actionKey(b as Action)).toBe(actionKey(a as Action));
    }
  });

  it('시드가 다르면 하 난이도는 다른 수도 낸다', () => {
    const state = startDrafted(21, 6);
    const actor = state.turn.active;
    const seen = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const a = decide(state, actor, 'easy', seed);
      if (a) seen.add(actionKey(a));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
