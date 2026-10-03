/**
 * 사카가웨이(모두 손패를 펼쳐 놓는다) 아래에서 AI 가 펼쳐진 손패를 읽는가.
 * 결투는 셈으로, 뱅!·광역은 막을 카드가 있는지로, 강탈은 무엇을 가져올지로.
 */

import { describe, expect, it } from 'vitest';

import type { EventCardId } from '../data/types';
import { kindOf, legalActions, reduce, type Action, type GameState, type PlayerId } from '../engine';
import { handCard, scenario, type PlayerSpec } from '../engine/__tests__/helpers';
import { viewFor } from '../engine/view';
import { createRng } from '../engine/rng';
import { determinize } from './hard';
import { beliefsFor, isHopelessDuel, scoreAction } from './policy';

/** 보안관 a(공개)와 무법자 b(차례, 나). c·d 는 멀리 앉은 구경꾼 */
function table(a: Partial<PlayerSpec>, b: Partial<PlayerSpec>, event: EventCardId | null = 'sacagaway'): GameState {
  return scenario({
    event: event ?? undefined,
    activeSeat: 1,
    players: [
      { id: 'a', role: 'sheriff', ...a },
      { id: 'b', role: 'outlaw', ...b },
      { id: 'c', role: 'renegade' },
      { id: 'd', role: 'deputy' },
    ],
  });
}

function score(state: GameState, me: PlayerId, action: Action): number {
  const view = viewFor(state, me);
  return scoreAction(view, me, action, beliefsFor(view, me));
}

function duel(state: GameState): Action {
  return { type: 'playCard', pid: 'b', card: handCard(state, 'b', 'duel'), target: 'a' };
}

describe('펼쳐진 손패로 결투를 셈한다', () => {
  it('상대가 뱅!을 더 쥐었으면 지는 결투로 보고 걸지 않는다', () => {
    const s = table({ hand: ['bang', 'bang'] }, { hand: ['duel', 'bang'] });
    expect(isHopelessDuel(viewFor(s, 'b'), 'b', duel(s))).toBe(true);
    expect(score(s, 'b', duel(s))).toBeLessThan(0);
  });

  it('손을 모르면 예전처럼 내 뱅!이 있으면 걸어 볼 만하다', () => {
    const s = table({ hand: ['bang', 'bang'] }, { hand: ['duel', 'bang'] }, null);
    expect(isHopelessDuel(viewFor(s, 'b'), 'b', duel(s))).toBe(false);
  });

  it('상대 손에 뱅!이 없으면 손패가 있어도 이기는 결투다', () => {
    const open = table({ hand: ['beer', 'missed'] }, { hand: ['duel'] });
    const blind = table({ hand: ['beer', 'missed'] }, { hand: ['duel'] }, null);
    // 손을 모르면 내 뱅!이 없으니 반드시 진다고 본다
    expect(isHopelessDuel(viewFor(blind, 'b'), 'b', duel(blind))).toBe(true);
    expect(isHopelessDuel(viewFor(open, 'b'), 'b', duel(open))).toBe(false);
    expect(score(open, 'b', duel(open))).toBeGreaterThan(10);
  });

  it('뱅!이 같은 장수면 지목당한 쪽이 먼저 떨어지므로 거는 쪽이 이긴다', () => {
    const s = table({ hand: ['bang'] }, { hand: ['duel', 'bang'] });
    expect(isHopelessDuel(viewFor(s, 'b'), 'b', duel(s))).toBe(false);
  });

  it('질 결투에 지목당하면 뱅!을 버리지 않고 목숨 1로 끝낸다', () => {
    // a 가 b 에게 결투. a 는 뱅! 2장, b 는 1장
    const s0 = scenario({
      event: 'sacagaway',
      players: [
        { id: 'a', role: 'sheriff', hand: ['duel', 'bang', 'bang'] },
        { id: 'b', role: 'outlaw', hand: ['bang'] },
        { id: 'c', role: 'renegade' },
        { id: 'd', role: 'deputy' },
      ],
    });
    const s = reduce(s0, { type: 'playCard', pid: 'a', card: handCard(s0, 'a', 'duel'), target: 'b' });
    expect(s.awaiting?.k).toBe('duelBang');
    const moves = legalActions(s, 'b');
    const card = moves.find((m) => m.type === 'respond' && m.choice.c === 'card')!;
    const pass = moves.find((m) => m.type === 'respond' && m.choice.c === 'pass')!;
    expect(score(s, 'b', pass)).toBeGreaterThan(score(s, 'b', card));
  });

  it('이길 결투면 끝까지 뱅!을 낸다', () => {
    const s0 = scenario({
      event: 'sacagaway',
      players: [
        { id: 'a', role: 'sheriff', hand: ['duel', 'bang'] },
        { id: 'b', role: 'outlaw', hand: ['bang', 'bang'] },
        { id: 'c', role: 'renegade' },
        { id: 'd', role: 'deputy' },
      ],
    });
    const s = reduce(s0, { type: 'playCard', pid: 'a', card: handCard(s0, 'a', 'duel'), target: 'b' });
    const moves = legalActions(s, 'b');
    const card = moves.find((m) => m.type === 'respond' && m.choice.c === 'card')!;
    const pass = moves.find((m) => m.type === 'respond' && m.choice.c === 'pass')!;
    expect(score(s, 'b', card)).toBeGreaterThan(score(s, 'b', pass));
  });
});

describe('펼쳐진 손패로 뱅!·광역을 고른다', () => {
  it('빗나감!이 없는 상대를 쏘는 편이 낫다고 본다', () => {
    const bare = table({ hand: ['beer'] }, { hand: ['bang'] });
    const guarded = table({ hand: ['missed'] }, { hand: ['bang'] });
    const shot = (s: GameState): Action => ({ type: 'playCard', pid: 'b', card: handCard(s, 'b', 'bang'), target: 'a' });
    expect(score(bare, 'b', shot(bare))).toBeGreaterThan(score(guarded, 'b', shot(guarded)));
  });

  it('인디언!은 뱅!이 없는 적에게 더 잘 들어간다', () => {
    const bare = table({ hand: ['missed'] }, { hand: ['indians'] });
    const armed = table({ hand: ['bang'] }, { hand: ['indians'] });
    const play = (s: GameState): Action => ({ type: 'playCard', pid: 'b', card: handCard(s, 'b', 'indians') });
    expect(score(bare, 'b', play(bare))).toBeGreaterThan(score(armed, 'b', play(armed)));
  });
});

describe('펼쳐진 손패에서 가져올 카드를 고른다', () => {
  it('적의 손에서 가장 값진 카드를 집는다', () => {
    const s0 = table({ hand: ['dynamite', 'beer', 'saloon'] }, { hand: ['panic'] });
    const s = reduce(s0, { type: 'playCard', pid: 'b', card: handCard(s0, 'b', 'panic'), target: 'a' });
    expect(s.awaiting?.k).toBe('stealCard');
    const hand = s.players[0].hand;
    const picks = legalActions(s, 'b').filter((m) => m.type === 'respond' && m.choice.c === 'pick');
    const best = picks.reduce((x, y) => (score(s, 'b', y) > score(s, 'b', x) ? y : x));
    const index = best.type === 'respond' && best.choice.c === 'pick' && best.choice.pick.zone === 'hand'
      ? best.choice.pick.index
      : -1;
    expect(kindOf(hand[index])).toBe('beer');
  });
});

describe('상 난이도의 결정화', () => {
  it('펼쳐진 남의 손패는 지어내지 않고 그대로 둔다', () => {
    const s = table({ hand: ['beer', 'missed'] }, { hand: ['bang'] });
    const { state } = determinize(viewFor(s, 'b'), 'b', createRng(3));
    expect(state.players[0].hand).toEqual(s.players[0].hand);
    expect(state.deck).not.toContain(s.players[0].hand[0]);
  });
});
