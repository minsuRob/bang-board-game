import { describe, expect, it } from 'vitest';

import { aiDraftActions, aiNextAction, type SeatTier } from '../ai/driver-policy';
import type { AiTier } from '../ai/types';
import { legalActions } from '../engine/legal';
import { reduce } from '../engine/reducer';
import type { Action, GameState, PlayerId } from '../engine/types';
import { MIN_ACTIONS } from './constants';
import { makeMatchUpload, type MatchDoc, type MatchSeat } from './model';
import { verifyLocalMatch, verifyRoomLog } from './verify';

/**
 * 사람 없이 로컬 판 하나를 머리로 돌려 기록을 만든다.
 * 사람 자리(p0)는 '첫 번째 합법 수' 를 둔다. AI 자리는 driver-policy 그대로.
 */
function playLocal(seed: number, playerCount = 4, tier: AiTier = 'easy', humanPolicy?: (s: GameState, legal: Action[]) => Action) {
  const seats: MatchSeat[] = Array.from({ length: playerCount }, (_, i) => ({
    id: `p${i}` as PlayerId,
    name: i === 0 ? '나' : `AI${i}`,
    human: i === 0,
    tier,
  }));
  const tiers: SeatTier[] = seats.map((s) => ({ id: s.id, human: s.human, tier: s.tier }));
  const controlled: PlayerId[] = ['p0'];
  const start: Action = {
    type: 'startGame',
    seed,
    config: { playerCount, expansions: [] },
    seats: seats.map((s) => ({ id: s.id, name: s.name })),
  };
  const actions: Action[] = [start];
  let state = reduce(null, start);

  // 드래프트: ai-driver 처럼 열린 상태 하나로 AI 전부를 계산하고, 사람은 그 뒤에 고른다
  for (const a of aiDraftActions(state, tiers, controlled, seed)) {
    actions.push(a);
    state = reduce(state, a);
  }
  if (state.draft) {
    const a = legalActions(state, 'p0')[0];
    actions.push(a);
    state = reduce(state, a);
  }

  for (let guard = 0; guard < 5000 && !state.result; guard++) {
    const ai = aiNextAction(state, tiers, controlled, seed);
    let a: Action | null = ai;
    if (!a) {
      const legal = legalActions(state, 'p0');
      a = humanPolicy ? humanPolicy(state, legal) : legal[0];
      if (!a) a = { type: 'timeout', pid: 'p0' };
    }
    actions.push(a);
    state = reduce(state, a);
  }
  expect(state.result).not.toBeNull();
  return { seats, actions, state };
}

function docOf(seed: number, seats: MatchSeat[], actions: Action[], controlled: PlayerId[] = ['p0']): MatchDoc {
  return { ...makeMatchUpload({ uid: 'u1', seed, seats, controlled, actions }).doc };
}

describe('로컬 판 검증', () => {
  const game = playLocal(11);

  it('정상 기록은 통과하고 사람 자리만 보상한다', () => {
    const v = verifyLocalMatch(docOf(11, game.seats, game.actions));
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.credits).toHaveLength(1);
    expect(v.credits[0].uid).toBe('u1');
    expect(v.credits[0].won).toBe(game.state.result!.winnerIds.includes('p0'));
  });

  it('JSON 왕복 뒤에도 통과한다 (undefined 필드)', () => {
    const doc = docOf(11, game.seats, game.actions);
    const roundTripped = JSON.parse(JSON.stringify(doc)) as MatchDoc;
    expect(verifyLocalMatch(roundTripped).ok).toBe(true);
  });

  it('하드 AI 도 다시 계산해 맞는다', () => {
    const hard = playLocal(5, 4, 'hard');
    expect(verifyLocalMatch(docOf(5, hard.seats, hard.actions)).ok).toBe(true);
  });

  it('AI 의 수를 다른 합법 수로 바꾸면 거절한다', () => {
    const actions = [...game.actions];
    // 드래프트 뒤 첫 AI 수를 찾는다
    let state: GameState | null = null;
    for (let i = 0; i < actions.length; i++) {
      const a = actions[i];
      if (state && !state.draft && 'pid' in a && a.pid !== 'p0' && a.type !== 'timeout') {
        const legal = legalActions(state, a.pid).filter((x) => JSON.stringify(x) !== JSON.stringify(a));
        if (legal.length > 0) {
          actions[i] = legal[legal.length - 1];
          break;
        }
      }
      state = reduce(state, a);
    }
    const v = verifyLocalMatch(docOf(11, game.seats, actions));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('aiMismatch');
  });

  it('AI 자리의 시간 만료는 거절한다', () => {
    const actions = [...game.actions];
    let state: GameState | null = null;
    for (let i = 0; i < actions.length; i++) {
      const a = actions[i];
      if (state && !state.draft && 'pid' in a && a.pid !== 'p0') {
        actions[i] = { type: 'timeout', pid: a.pid };
        break;
      }
      state = reduce(state, a);
    }
    const v = verifyLocalMatch(docOf(11, game.seats, actions));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('aiTimeout');
  });

  it('끝나기 전에 잘린 기록은 거절한다', () => {
    const actions = game.actions.slice(0, Math.max(MIN_ACTIONS + 1, game.actions.length - 3));
    const v = verifyLocalMatch(docOf(11, game.seats, actions));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('unfinished');
  });

  it('결과 뒤에 액션이 더 있으면 거절한다', () => {
    const actions = [...game.actions, { type: 'endTurn', pid: 'p0' } as Action];
    const v = verifyLocalMatch(docOf(11, game.seats, actions));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('shape');
  });

  it('사람 자리가 둘이면 거절한다', () => {
    const seats = game.seats.map((s, i) => (i === 1 ? { ...s, human: true } : s));
    const v = verifyLocalMatch(docOf(11, seats, game.actions, ['p0', 'p1']));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('controlled');
  });

  it('시드가 다르면 거절한다', () => {
    const v = verifyLocalMatch({ ...docOf(11, game.seats, game.actions), seed: 12 });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('seed');
  });

  it('devEvent 판은 거절한다', () => {
    const actions = [...game.actions];
    const start = actions[0];
    if (start.type === 'startGame') {
      actions[0] = { ...start, config: { ...start.config, devEvent: 'blessing' as never } };
    }
    const v = verifyLocalMatch(docOf(11, game.seats, actions));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('config');
  });
});

describe('온라인 방 검증', () => {
  it('다시 접어 좌석의 uid 에 보상을 매긴다', () => {
    const game = playLocal(21);
    const v = verifyRoomLog(game.actions, ['a', null, 'c', null]);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.credits.map((c) => c.uid)).toEqual(['a', 'c']);
  });

  it('끝나지 않은 로그는 거절한다', () => {
    const game = playLocal(21);
    const v = verifyRoomLog(game.actions.slice(0, 40), ['a', null, null, null]);
    expect(v.ok).toBe(false);
  });
});
