import { describe, expect, it } from 'vitest';

import type { Action, GameState } from '../engine';
import { autoPlayOf, autoPlayText } from './auto-play';

const seats = [
  { id: 'p0', human: true },
  { id: 'p1', human: false },
  { id: 'p2', human: true },
];

const players = [
  { id: 'p0', name: '민수' },
  { id: 'p1', name: 'AI 2' },
  { id: 'p2', name: '지우' },
];

function transition(action: Action, logged: boolean) {
  const next = {
    seq: 8,
    players,
    log: logged ? [{ seq: 8, t: 'timeout', text: '' }] : [{ seq: 7, t: 'timeout', text: '' }],
  } as unknown as GameState;
  return { prev: null, next, action };
}

describe('자동 플레이 알림', () => {
  it('사람 자리의 제한시간 초과를 알린다', () => {
    expect(autoPlayOf(transition({ type: 'timeout', pid: 'p2' }, true), seats)).toBe('p2');
  });

  it('AI 자리의 timeout, 기본 행동이 없던 timeout, 직접 둔 수는 알리지 않는다', () => {
    expect(autoPlayOf(transition({ type: 'timeout', pid: 'p1' }, true), seats)).toBeNull();
    expect(autoPlayOf(transition({ type: 'timeout', pid: 'p2' }, false), seats)).toBeNull();
    expect(autoPlayOf(transition({ type: 'endTurn', pid: 'p2' } as Action, true), seats)).toBeNull();
  });

  it('내 자리면 "내", 남이면 이름을 쓴다', () => {
    const state = { players } as unknown as GameState;
    expect(autoPlayText({ pids: ['p0'] }, state, 'p0')).toBe('내 제한시간이 지나 기본 행동을 대신했다');
    expect(autoPlayText({ pids: ['p2', 'p0'] }, state, 'p1')).toBe(
      '지우 · 민수의 제한시간이 지나 기본 행동을 대신했다',
    );
  });
});
