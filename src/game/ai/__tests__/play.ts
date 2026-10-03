/**
 * AI 테스트가 함께 쓰는 판 시작·끝까지 두기.
 *
 * 대전 테스트는 한 판이 무거워 파일 하나에 몰면 코어 하나로만 돈다. 테스트 실행기는 파일 단위로
 * 병렬로 돌리므로 무거운 대전은 파일을 나눠 두고, 공용 함수는 여기 모은다.
 */

import { expect } from 'vitest';

import { actorsOf, reduce, type Action, type GameState } from '../../engine';
import { decide } from '../index';
import type { AiTier } from '../types';

export function startGame(seed: number, count: number, highnoon = false): GameState {
  const seats = Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  return reduce(null, {
    type: 'startGame',
    seed,
    config: { playerCount: count, expansions: highnoon ? ['highnoon'] : [] },
    seats,
  });
}

/** 드래프트까지 AI 가 마친 판 */
export function startDrafted(seed: number, count: number): GameState {
  let state = startGame(seed, count);
  while (state.draft) {
    const actor = actorsOf(state)[0];
    state = reduce(state, decide(state, actor, 'medium', seed) as Action);
  }
  return state;
}

export type PlayResult = { state: GameState; steps: number };

export function playOut(
  seed: number,
  count: number,
  tierOf: (seat: number) => AiTier,
  maxSteps = 4000,
  highnoon = false,
): PlayResult {
  let state = startGame(seed, count, highnoon);
  let steps = 0;

  while (!state.result && steps < maxSteps) {
    const actor = actorsOf(state)[0];
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
