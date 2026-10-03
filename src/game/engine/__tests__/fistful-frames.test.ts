/**
 * 한줌의 카드 — 이벤트가 쌓는 프레임과 쏜 사람 없는 뱅!.
 *
 * 이벤트 훅은 아직 이 프레임들을 쌓지 않는다. 프레임을 직접 쌓아 해결기만 확인한다.
 */

import { describe, expect, it } from 'vitest';

import { legalActions } from '../legal';
import type { Choice, Frame, GameState, PlayerId } from '../types';
import { handCard, logged, loggedCount, p, resolveStack, run, scenario, totalCards } from './helpers';

/** 스택 맨 위에 프레임을 얹고 해결한다 */
function push(s: GameState, frame: Frame): GameState {
  return resolveStack({ ...s, stack: [...s.stack, frame], awaiting: null });
}

function respond(s: GameState, pid: PlayerId, choice: Choice): GameState {
  return run(s, { type: 'respond', pid, choice });
}

const pass: Choice = { c: 'pass' };

describe('한줌의 카드 뱅! (쏜 사람 없음)', () => {
  it('빗나감!이 없으면 남은 발 수만큼 맞고, 현상금은 없다', () => {
    const s0 = scenario({
      players: [{ id: 'a', hand: ['beer', 'panic'] }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
    });
    const s = push(s0, { k: 'fistfulBangs', pid: 'a', remaining: 2 });
    expect(p(s, 'a').hp).toBe(p(s0, 'a').hp - 2);
    expect(loggedCount(s, 'fistfulBang')).toBe(2);
    expect(s.awaiting).toBeNull();
    expect(totalCards(s)).toBe(totalCards(s0));
  });

  it('빗나감!을 물을 때 쏜 사람은 null 이고, 막으면 다음 발로 넘어간다', () => {
    const s0 = scenario({
      players: [{ id: 'a', hand: ['missed', 'missed'] }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
    });
    let s = push(s0, { k: 'fistfulBangs', pid: 'a', remaining: 2 });
    expect(s.awaiting).toMatchObject({ k: 'missed', pid: 'a', source: null });
    s = respond(s, 'a', { c: 'card', card: p(s, 'a').hand[0] });
    expect(s.awaiting).toMatchObject({ k: 'missed', pid: 'a', source: null });
    s = respond(s, 'a', { c: 'card', card: p(s, 'a').hand[0] });
    expect(s.awaiting).toBeNull();
    expect(p(s, 'a').hp).toBe(p(s0, 'a').hp);
  });

  it('역화는 빗나감!으로만 쓰이고 되쏘지 않는다', () => {
    const s0 = scenario({
      expansions: ['valley'],
      players: [{ id: 'a' }, { id: 'b', hand: ['backfire'] }, { id: 'c' }, { id: 'd' }],
    });
    let s = push(s0, { k: 'fistfulBangs', pid: 'b', remaining: 1 });
    s = respond(s, 'b', { c: 'card', card: handCard(s, 'b', 'backfire') });
    expect(s.awaiting).toBeNull();
    expect(s.stack.some((f) => f.k === 'bang')).toBe(false);
    expect(s.players.every((x) => x.hp === p(s0, x.id).hp)).toBe(true);
  });
});

describe('러시안 룰렛', () => {
  it('빗나감!을 버리며 돌다가 처음 못 버린 사람이 목숨 2를 잃고 멈춘다', () => {
    const s0 = scenario({
      players: [{ id: 'a', hand: ['missed'] }, { id: 'b' }, { id: 'c', hand: ['missed'] }, { id: 'd' }],
    });
    let s = push(s0, { k: 'russianRoulette', queue: ['a', 'b', 'c', 'd'], i: 0 });
    expect(s.awaiting).toMatchObject({ k: 'russianRoulette', pid: 'a' });
    s = respond(s, 'a', { c: 'card', card: handCard(s, 'a', 'missed') });
    expect(s.awaiting).toBeNull();
    expect(p(s, 'b').hp).toBe(p(s0, 'b').hp - 2);
    expect(p(s, 'c').hand).toHaveLength(1);
    expect(s.stack.some((f) => f.k === 'russianRoulette')).toBe(false);
  });
});

describe('의형제', () => {
  it('목숨 1을 넘겨준다', () => {
    const s0 = scenario({
      players: [{ id: 'a', hp: 3 }, { id: 'b', hp: 2 }, { id: 'c' }, { id: 'd' }],
    });
    let s = push(s0, { k: 'bloodBrothers', pid: 'a' });
    expect(s.awaiting).toMatchObject({ k: 'bloodBrothers', targets: ['b'] });
    s = respond(s, 'a', { c: 'player', pid: 'b' });
    expect(p(s, 'a').hp).toBe(2);
    expect(p(s, 'b').hp).toBe(3);
  });

  it('마지막 목숨은 넘길 수 없다', () => {
    const s0 = scenario({ players: [{ id: 'a', hp: 1 }, { id: 'b', hp: 2 }, { id: 'c' }, { id: 'd' }] });
    const s = push(s0, { k: 'bloodBrothers', pid: 'a' });
    expect(s.awaiting).toBeNull();
    expect(p(s, 'a').hp).toBe(1);
  });
});

describe('독한 술', () => {
  it('예면 가져오지 않고 회복한다', () => {
    const s0 = scenario({ players: [{ id: 'a', hp: 2 }, { id: 'b' }, { id: 'c' }, { id: 'd' }] });
    const s = respond(push(s0, { k: 'hardLiquor', pid: 'a' }), 'a', { c: 'yes' });
    expect(p(s, 'a').hp).toBe(3);
    expect(p(s, 'a').hand).toHaveLength(0);
  });

  it('넘기면 평소대로 2장을 가져온다', () => {
    const s0 = scenario({ players: [{ id: 'a', hp: 2 }, { id: 'b' }, { id: 'c' }, { id: 'd' }] });
    const s = respond(push(s0, { k: 'hardLiquor', pid: 'a' }), 'a', pass);
    expect(p(s, 'a').hp).toBe(2);
    expect(p(s, 'a').hand).toHaveLength(2);
  });
});

describe('피요테', () => {
  it('맞히면 카드를 갖고 다시 묻고, 틀리면 그 카드를 버리고 끝난다', () => {
    const s0 = scenario({
      players: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
      deckTop: [{ kind: 'bang', suit: 'hearts' }, { kind: 'bang', suit: 'spades' }],
    });
    let s = push(s0, { k: 'peyote', pid: 'a' });
    expect(legalActions(s, 'a')).toHaveLength(2);
    s = respond(s, 'a', { c: 'color', color: 'red' });
    expect(p(s, 'a').hand).toHaveLength(1);
    expect(s.awaiting).toMatchObject({ k: 'peyote', pid: 'a' });
    s = respond(s, 'a', { c: 'color', color: 'red' });
    expect(p(s, 'a').hand).toHaveLength(1);
    expect(s.awaiting).toBeNull();
    expect(logged(s, 'peyote')).toBe(true);
    expect(totalCards(s)).toBe(totalCards(s0));
  });

  // 카드 원문 (assets/cards/event/peyote.png): "if he guessed right, he keeps it and may guess again"
  it('첫 색은 꼭 불러야 하고, 맞힌 뒤에는 그만둘 수 있다', () => {
    const s0 = scenario({
      players: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
      deckTop: [{ kind: 'bang', suit: 'hearts' }, { kind: 'bang', suit: 'spades' }],
    });
    let s = push(s0, { k: 'peyote', pid: 'a' });
    const passes = (x: GameState) =>
      legalActions(x, 'a').some((l) => l.type === 'respond' && l.choice.c === 'pass');
    expect(passes(s)).toBe(false);
    s = respond(s, 'a', { c: 'color', color: 'red' });
    expect(s.awaiting).toMatchObject({ k: 'peyote', pid: 'a' });
    expect(passes(s)).toBe(true);
    s = respond(s, 'a', pass);
    expect(s.awaiting).toBeNull();
    expect(p(s, 'a').hand).toHaveLength(1);
    expect(s.stack.some((f) => f.k === 'peyote')).toBe(false);
    expect(totalCards(s)).toBe(totalCards(s0));
  });
});

describe('목장', () => {
  it('고른 카드를 버리고 그만큼 새로 가져온다', () => {
    const s0 = scenario({ players: [{ id: 'a', hand: ['beer', 'panic'] }, { id: 'b' }, { id: 'c' }, { id: 'd' }] });
    const beer = handCard(s0, 'a', 'beer');
    let s = push(s0, { k: 'ranch', pid: 'a', picked: [] });
    s = respond(s, 'a', { c: 'card', card: beer });
    expect(s.awaiting).toMatchObject({ k: 'ranch', picked: [beer] });
    s = respond(s, 'a', pass);
    expect(p(s, 'a').hand).toHaveLength(2);
    expect(p(s, 'a').hand).not.toContain(beer);
    expect(s.discard).toContain(beer);
  });
});

describe('서부의 법', () => {
  it('보여 준 카드를 이번 차례에 내야 할 카드로 건다', () => {
    const s0 = scenario({ players: [{ id: 'a', hand: ['beer'] }, { id: 'b' }, { id: 'c' }, { id: 'd' }] });
    const beer = handCard(s0, 'a', 'beer');
    const s = push(s0, { k: 'lawOfTheWest', pid: 'a', card: beer });
    expect(s.turn.mustPlay).toBe(beer);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('리코체', () => {
  it('빗나감!이 없으면 노린 카드가 버려진다', () => {
    const s0 = scenario({ players: [{ id: 'a' }, { id: 'b', equipment: ['barrel'] }, { id: 'c' }, { id: 'd' }] });
    const barrel = p(s0, 'b').equipment[0];
    const s = push(s0, { k: 'ricochet', source: 'a', target: 'b', card: barrel });
    expect(p(s, 'b').equipment).toHaveLength(0);
    expect(s.discard).toContain(barrel);
  });

  it('빗나감!을 내면 카드를 지킨다', () => {
    const s0 = scenario({
      players: [{ id: 'a' }, { id: 'b', hand: ['missed'], equipment: ['barrel'] }, { id: 'c' }, { id: 'd' }],
    });
    const barrel = p(s0, 'b').equipment[0];
    let s = push(s0, { k: 'ricochet', source: 'a', target: 'b', card: barrel });
    expect(s.awaiting).toMatchObject({ k: 'ricochet', pid: 'b', source: 'a' });
    s = respond(s, 'b', { c: 'card', card: handCard(s, 'b', 'missed') });
    expect(p(s, 'b').equipment).toEqual([barrel]);
  });
});

describe('복수 판정', () => {
  it('♥ 면 돈 벨과 같은 자리로 추가 차례를 건다', () => {
    const s0 = scenario({
      players: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
      deckTop: [{ kind: 'bang', suit: 'hearts' }],
    });
    const s = push(s0, { k: 'judgement', pid: 'a', purpose: 'vendetta', candidates: [] });
    expect(s.turn.extraTurnFor).toBe('a');
    expect(logged(s, 'vendetta')).toBe(true);
  });

  it('♥ 가 아니면 아무 일도 없다', () => {
    const s0 = scenario({
      players: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
      deckTop: [{ kind: 'bang', suit: 'diamonds' }],
    });
    const s = push(s0, { k: 'judgement', pid: 'a', purpose: 'vendetta', candidates: [] });
    expect(s.turn.extraTurnFor ?? null).toBeNull();
  });
});
