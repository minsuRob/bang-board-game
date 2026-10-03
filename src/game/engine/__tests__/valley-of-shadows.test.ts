/**
 * 그림자의 계곡 — 카드 16장 · 캐릭터 8종.
 * 원문은 docs/valley-of-shadows.md, 판정 기준은 docs/edge-cases.md EC-121~.
 */

import { describe, expect, it } from 'vitest';

import { charactersFor } from '../../data/characters';
import { BLACK_FLOWER_ABILITY, DER_SPOT_ABILITY } from '../../modifiers';
import { deckFor } from '../../data/cards.base';
import { kindOf } from '../cards';
import { legalActions } from '../legal';
import { reduce } from '../reducer';
import { createGame } from '../setup';
import type { Action, GameState } from '../types';
import { beginTurn, handCard, logged, p, scenario, totalCards, type ScenarioSpec } from './helpers';

const V = (spec: ScenarioSpec): GameState => scenario({ expansions: ['valley'], ...spec });

const play = (s: GameState, pid: string, kind: Parameters<typeof handCard>[2], extra: Partial<Action> = {}): GameState =>
  reduce(s, { type: 'playCard', pid, card: handCard(s, pid, kind), ...extra } as Action);

const pass = (s: GameState): GameState =>
  reduce(s, { type: 'respond', pid: s.awaiting!.pid, choice: { c: 'pass' } });

const pick = (s: GameState, card: string): GameState =>
  reduce(s, { type: 'respond', pid: s.awaiting!.pid, choice: { c: 'card', card } });

// ---------------------------------------------------------------------------

describe('덱 구성', () => {
  it('그림자의 계곡을 켜면 96장, 기본판은 80장', () => {
    expect(deckFor([])).toHaveLength(80);
    expect(deckFor(['valley'])).toHaveLength(96);
    const g = createGame(1, { playerCount: 5, expansions: ['valley'] }, [0, 1, 2, 3, 4].map((i) => ({ id: `p${i}`, name: `P${i}` })));
    expect(totalCards(g)).toBe(96);
  });

  it('기본판에서는 새 캐릭터가 나오지 않는다', () => {
    const base = charactersFor([]);
    expect(base).not.toContain('blackFlower');
    expect(charactersFor(['valley'])).toContain('tucoFranziskaner');
    expect(charactersFor(['valley'])).toHaveLength(base.length + 8);
  });
});

describe('라스트 콜 · 토마호크', () => {
  it('라스트 콜은 맥주가 아니라 2인에서도 회복하고 목사에게 막히지 않는다', () => {
    const s0 = V({ players: [{ hand: ['lastCall'], hp: 2 }, {}], event: 'theReverend' });
    const s = play(s0, 'p0', 'lastCall');
    expect(p(s, 'p0').hp).toBe(3);
  });

  it('토마호크는 거리 2 까지 닿고 뱅! 횟수를 쓰지 않는다', () => {
    const s0 = V({ players: [{ hand: ['tomahawk', 'bang'] }, {}, {}, {}, {}] });
    const targets = legalActions(s0, 'p0')
      .filter((a) => a.type === 'playCard' && kindOf(a.card) === 'tomahawk')
      .map((a) => a.type === 'playCard' && a.target);
    expect(targets.sort()).toEqual(['p1', 'p2', 'p3', 'p4']);
    let s = play(s0, 'p0', 'tomahawk', { target: 'p2' });
    expect(s.awaiting).toBeNull();
    expect(p(s, 'p2').hp).toBe(p(s0, 'p2').hp - 1);
    expect(s.turn.bangsPlayed).toBe(0);
    s = play(s, 'p0', 'bang', { target: 'p1' });
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
  });
});

describe('조준 · 패닝', () => {
  it('조준을 뱅!과 함께 내면 목숨 2를 잃는다', () => {
    const s0 = V({ players: [{ hand: ['bang', 'aim'] }, {}, {}] });
    const s = play(s0, 'p0', 'bang', { target: 'p1', extra: handCard(s0, 'p0', 'aim') });
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 2);
    expect(p(s, 'p0').hand).toHaveLength(0);
    expect(totalCards(s)).toBe(96);
  });

  it('조준은 혼자 낼 수 없다', () => {
    const s = V({ players: [{ hand: ['aim'] }, {}, {}] });
    expect(legalActions(s, 'p0').some((a) => a.type === 'playCard')).toBe(false);
  });

  it('패닝은 첫 표적과 그 옆 1명을 쏘고 뱅! 횟수를 쓴다', () => {
    const s0 = V({ players: [{ hand: ['fanning', 'bang'] }, {}, {}, {}] });
    const s = play(s0, 'p0', 'fanning', { target: 'p1', target2: 'p2' });
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
    expect(p(s, 'p2').hp).toBe(p(s0, 'p2').hp - 1);
    expect(s.turn.bangsPlayed).toBe(1);
    expect(legalActions(s, 'p0').some((a) => a.type === 'playCard' && kindOf(a.card) === 'bang')).toBe(false);
  });
});

describe('반디도스 · 포커 · 토네이도', () => {
  it('반디도스: 2장을 버리거나 목숨 1을 잃는다', () => {
    const s0 = V({ players: [{ hand: ['bandidos'] }, { hand: ['bang', 'beer', 'missed'] }, { hand: ['bang'] }] });
    let s = play(s0, 'p0', 'bandidos');
    expect(s.awaiting).toMatchObject({ k: 'discardChoice', pid: 'p1', remaining: 2, canPass: true });
    s = pick(s, handCard(s, 'p1', 'bang'));
    expect(s.awaiting).toMatchObject({ pid: 'p1', remaining: 1, canPass: false });
    s = pick(s, handCard(s, 'p1', 'beer'));
    expect(p(s, 'p1').hand).toHaveLength(1);
    expect(s.awaiting).toMatchObject({ pid: 'p2', remaining: 1 });
    s = pass(s);
    expect(p(s, 'p2').hp).toBe(p(s0, 'p2').hp - 1);
    expect(p(s, 'p2').hand).toHaveLength(1);
    expect(totalCards(s)).toBe(96);
  });

  it('포커: 에이스가 없으면 낸 사람이 2장까지 가져간다', () => {
    const s0 = V({
      players: [{ hand: ['poker'] }, { hand: [{ kind: 'bang', rank: '2' }] }, { hand: [{ kind: 'missed', rank: '3' }] }],
    });
    let s = play(s0, 'p0', 'poker');
    s = pick(s, p(s, 'p1').hand[0]);
    s = pick(s, p(s, 'p2').hand[0]);
    expect(s.awaiting?.k).toBe('generalStore');
    s = pick(s, (s.awaiting as { options: string[] }).options[0]);
    s = pick(s, (s.awaiting as { options: string[] }).options[0]);
    expect(p(s, 'p0').hand).toHaveLength(2);
    expect(totalCards(s)).toBe(96);
  });

  it('포커: 에이스가 나오면 전부 버린다', () => {
    const s0 = V({
      players: [{ hand: ['poker'] }, { hand: [{ kind: 'bang', rank: 'A', suit: 'spades' }] }, { hand: [{ kind: 'missed', rank: '3' }] }],
    });
    let s = play(s0, 'p0', 'poker');
    s = pick(s, p(s, 'p1').hand[0]);
    s = pick(s, p(s, 'p2').hand[0]);
    expect(s.awaiting).toBeNull();
    expect(p(s, 'p0').hand).toHaveLength(0);
    expect(logged(s, 'pokerReveal')).toBe(true);
    expect(totalCards(s)).toBe(96);
  });

  it('토네이도: 모두 1장 버리고 2장 가져온다', () => {
    const s0 = V({ players: [{ hand: ['tornado', 'bang'] }, { hand: ['beer'] }, {}] });
    let s = play(s0, 'p0', 'tornado');
    s = pick(s, handCard(s, 'p0', 'bang'));
    s = pick(s, handCard(s, 'p1', 'beer'));
    expect(p(s, 'p0').hand).toHaveLength(2);
    expect(p(s, 'p1').hand).toHaveLength(2);
    expect(p(s, 'p2').hand).toHaveLength(2);
    expect(totalCards(s)).toBe(96);
  });
});

describe('방울뱀 · 포상금 · 샷건 · 르매트', () => {
  it('방울뱀은 남 앞에만 놓이고, 차례 시작 판정이 ♠면 목숨 1을 잃는다', () => {
    const s0 = V({
      players: [{ hand: ['rattlesnake'] }, {}, {}],
      deckTop: [{ kind: 'bang', suit: 'spades', rank: 'A' }],
    });
    const targets = legalActions(s0, 'p0')
      .filter((a) => a.type === 'playCard')
      .map((a) => a.type === 'playCard' && a.target);
    expect(targets.sort()).toEqual(['p1', 'p2']);
    let s = play(s0, 'p0', 'rattlesnake', { target: 'p1' });
    s = beginTurn(s, 'p1');
    expect(logged(s, 'rattlesnake')).toBe(true);
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
    expect(p(s, 'p1').equipment).toHaveLength(1);
  });

  it('방울뱀 판정이 ♠가 아니면 아무 일도 없다', () => {
    const s0 = V({
      players: [{}, { equipment: ['rattlesnake'] }, {}],
      deckTop: [{ kind: 'beer', suit: 'hearts' }],
    });
    const s = beginTurn(s0, 'p1');
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp);
  });

  it('포상금이 놓인 사람을 뱅!으로 맞히면 쏜 사람이 1장 가져온다', () => {
    const s0 = V({ players: [{ hand: ['bang'] }, { equipment: ['bounty'] }, {}] });
    const s = play(s0, 'p0', 'bang', { target: 'p1' });
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
    expect(p(s, 'p0').hand).toHaveLength(1);
  });

  it('포상금은 결투 피해에는 반응하지 않는다', () => {
    const s0 = V({ players: [{ hand: ['duel'] }, { equipment: ['bounty'] }, {}] });
    const s = play(s0, 'p0', 'duel', { target: 'p1' });
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
    expect(p(s, 'p0').hand).toHaveLength(0);
  });

  it('샷건으로 맞히면 맞은 사람이 손패 1장을 골라 버린다', () => {
    const s0 = V({ players: [{ hand: ['bang'], equipment: ['shotgun'] }, { hand: ['beer', 'panic'] }, {}] });
    let s = play(s0, 'p0', 'bang', { target: 'p1' });
    expect(s.awaiting).toMatchObject({ k: 'discardChoice', pid: 'p1', reason: 'shotgun' });
    s = pick(s, handCard(s, 'p1', 'panic'));
    expect(p(s, 'p1').hand.map(kindOf)).toEqual(['beer']);
    expect(totalCards(s)).toBe(96);
  });

  it('르매트: 자기 차례에는 아무 카드나 뱅!으로 쓴다', () => {
    const s0 = V({ players: [{ hand: ['beer'], equipment: ['lemat'] }, {}, {}] });
    const bangs = legalActions(s0, 'p0').filter((a) => a.type === 'playCard' && a.as === 'bang');
    expect(bangs.length).toBeGreaterThan(0);
    const s = reduce(s0, bangs[0]);
    expect(s.log.some((e) => e.t === 'playCard' && e.as === 'bang')).toBe(true);
  });

  it('르매트: 남의 차례에는 아무 카드나 뱅!이 되지 않는다 (인디언 대응)', () => {
    const s0 = V({ players: [{ hand: ['indians'] }, { hand: ['beer'], equipment: ['lemat'] }, {}] });
    const s = play(s0, 'p0', 'indians');
    // p1 은 뱅!이 없으니 묻지도 않고 목숨을 잃는다
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
  });
});

describe('유령', () => {
  it('제거된 사람 앞에 놓으면 유령으로 돌아와 차례를 받고, 피해를 받지 않는다', () => {
    const s0 = V({ players: [{ hand: ['ghost', 'bang'] }, { alive: false, hp: 0, role: 'renegade' }, {}] });
    const targets = legalActions(s0, 'p0')
      .filter((a) => a.type === 'playCard' && kindOf(a.card) === 'ghost')
      .map((a) => a.type === 'playCard' && a.target);
    expect(targets).toEqual(['p1']);
    let s = play(s0, 'p0', 'ghost', { target: 'p1' });
    expect(p(s, 'p1').ghost).toBe(true);
    s = beginTurn(s, 'p1');
    expect(s.turn.active).toBe('p1');
    expect(p(s, 'p1').hand).toHaveLength(2);
    expect(p(s, 'p1').ghost).toBe(true);
  });

  it('유령 카드를 빼앗기면 다시 제거되고 카드를 모두 잃는다', () => {
    const s0 = V({
      players: [{ hand: ['catBalou'] }, { alive: false, ghost: true, hp: 0, hand: ['bang'], equipment: ['ghost'] }, {}],
    });
    let s = play(s0, 'p0', 'catBalou', { target: 'p1' });
    const ghostCard = p(s, 'p1').equipment[0];
    s = reduce(s, { type: 'respond', pid: 'p0', choice: { c: 'pick', pick: { zone: 'equipment', card: ghostCard } } });
    expect(p(s, 'p1').ghost).toBe(false);
    expect(p(s, 'p1').hand).toHaveLength(0);
    expect(logged(s, 'ghostLeave')).toBe(true);
    expect(totalCards(s)).toBe(96);
  });
});

describe('역화 · 탈출 · 믹 디펜더 · 구조!', () => {
  it('역화는 빗나감!으로 막고, 쏜 사람에게 뱅!을 되돌린다', () => {
    const s0 = V({ players: [{ hand: ['bang'] }, { hand: ['backfire'] }, {}] });
    let s = play(s0, 'p0', 'bang', { target: 'p1' });
    expect(s.awaiting).toMatchObject({ k: 'missed', pid: 'p1' });
    s = pick(s, handCard(s, 'p1', 'backfire'));
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp);
    expect(p(s, 'p0').hp).toBe(p(s0, 'p0').hp - 1);
  });

  it('탈출은 결투를 피한다', () => {
    const s0 = V({ players: [{ hand: ['duel'] }, { hand: ['escape'] }, {}] });
    let s = play(s0, 'p0', 'duel', { target: 'p1' });
    expect(s.awaiting).toMatchObject({ k: 'evade', pid: 'p1', kind: 'duel' });
    s = pick(s, handCard(s, 'p1', 'escape'));
    expect(s.awaiting).toBeNull();
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp);
    expect(logged(s, 'evade')).toBe(true);
  });

  it('탈출을 내지 않으면 원래 효과가 그대로 온다 (인디언)', () => {
    const s0 = V({ players: [{ hand: ['indians'] }, { hand: ['escape'] }, {}] });
    let s = play(s0, 'p0', 'indians');
    expect(s.awaiting).toMatchObject({ k: 'evade', pid: 'p1' });
    s = pass(s);
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
    expect(p(s, 'p2').hp).toBe(p(s0, 'p2').hp - 1);
  });

  it('탈출은 뱅!을 피하지 못한다', () => {
    const s0 = V({ players: [{ hand: ['bang'] }, { hand: ['escape'] }, {}] });
    const s = play(s0, 'p0', 'bang', { target: 'p1' });
    expect(s.awaiting).toBeNull();
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
  });

  it('믹 디펜더는 빗나감!으로 캣 벌로우를 피한다', () => {
    const s0 = V({ players: [{ hand: ['catBalou'] }, { character: 'mickDefender', hand: ['missed', 'beer'] }, {}] });
    let s = play(s0, 'p0', 'catBalou', { target: 'p1' });
    expect(s.awaiting).toMatchObject({ k: 'evade', pid: 'p1' });
    s = pick(s, handCard(s, 'p1', 'missed'));
    expect(p(s, 'p1').hand.map(kindOf)).toEqual(['beer']);
    expect(s.awaiting).toBeNull();
  });

  it('구조!: 남이 잃을 목숨 1을 막고, 살아남으면 2장을 가져온다', () => {
    const s0 = V({ players: [{ hand: ['bang'] }, {}, { hand: ['saved'] }] });
    let s = play(s0, 'p0', 'bang', { target: 'p1' });
    expect(s.awaiting).toMatchObject({ k: 'saved', pid: 'p2', target: 'p1' });
    s = pick(s, handCard(s, 'p2', 'saved'));
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp);
    // p1 손패가 비어 있으니 덱에서 2장
    expect(p(s, 'p2').hand).toHaveLength(2);
    expect(totalCards(s)).toBe(96);
  });

  it('구조!는 자기 자신에게 쓸 수 없다', () => {
    const s0 = V({ players: [{ hand: ['bang'] }, { hand: ['saved'] }, {}] });
    const s = play(s0, 'p0', 'bang', { target: 'p1' });
    expect(s.awaiting).toBeNull();
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
  });

  it('구조! 보상은 대상의 손에서 가져올 수도 있다', () => {
    const s0 = V({ players: [{ hand: ['bang'] }, { hand: ['beer', 'panic'] }, { hand: ['saved'] }] });
    let s = play(s0, 'p0', 'bang', { target: 'p1' });
    // p1 이 빗나감! 없이 맞는다 → 구조!
    s = pick(s, handCard(s, 'p2', 'saved'));
    expect(s.awaiting).toMatchObject({ k: 'savedReward', pid: 'p2' });
    s = reduce(s, { type: 'respond', pid: 'p2', choice: { c: 'yes' } });
    expect(p(s, 'p1').hand).toHaveLength(0);
    expect(p(s, 'p2').hand).toHaveLength(2);
  });
});

describe('캐릭터', () => {
  it('투코: 앞에 카드가 없으면 4장, 있으면 2장', () => {
    const bare = beginTurn(V({ players: [{ character: 'tucoFranziskaner' }, {}, {}] }), 'p0');
    expect(p(bare, 'p0').hand).toHaveLength(4);
    const armed = beginTurn(V({ players: [{ character: 'tucoFranziskaner', equipment: ['mustang'] }, {}, {}] }), 'p0');
    expect(p(armed, 'p0').hand).toHaveLength(2);
  });

  it('블랙 플라워: ♣ 카드를 추가 뱅!으로 쏘고, 일반 뱅!도 남는다 (v0.275)', () => {
    const s0 = V({
      players: [{ character: 'blackFlower', hand: [{ kind: 'beer', suit: 'hearts' }, { kind: 'missed', suit: 'clubs' }, 'bang'] }, {}, {}],
    });
    const club = p(s0, 'p0').hand.find((c) => kindOf(c) === 'missed')!;
    const abil = legalActions(s0, 'p0').filter((a) => a.type === 'playCard' && a.ability === BLACK_FLOWER_ABILITY);
    expect(abil.every((a) => a.type === 'playCard' && a.card === club)).toBe(true);
    let s = reduce(s0, { type: 'playCard', pid: 'p0', card: club, as: 'bang', target: 'p1', ability: BLACK_FLOWER_ABILITY });
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
    expect(s.turn.bangsPlayed).toBe(0);
    s = play(s, 'p0', 'bang', { target: 'p2' });
    expect(p(s, 'p2').hp).toBe(p(s0, 'p2').hp - 1);
  });

  it('더 스팟: 뱅! 카드를 기관총으로 쓴다. 차례에 한 번', () => {
    const s0 = V({ players: [{ character: 'derSpotBurstRinger', hand: ['bang', 'bang'] }, {}, {}] });
    const card = handCard(s0, 'p0', 'bang');
    const s = reduce(s0, { type: 'playCard', pid: 'p0', card, as: 'gatling', ability: DER_SPOT_ABILITY });
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
    expect(p(s, 'p2').hp).toBe(p(s0, 'p2').hp - 1);
    expect(legalActions(s, 'p0').some((a) => a.type === 'playCard' && a.ability === DER_SPOT_ABILITY)).toBe(false);
  });

  it('콜로라도 빌: 판정이 ♠면 빗나감!을 내도 소용없다', () => {
    const s0 = V({
      players: [{ character: 'coloradoBill', hand: ['bang'] }, { hand: ['missed'] }, {}],
      deckTop: [{ kind: 'missed', suit: 'spades', rank: '2' }],
    });
    const s = play(s0, 'p0', 'bang', { target: 'p1' });
    expect(s.awaiting).toBeNull();
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
    expect(p(s, 'p1').hand).toHaveLength(1);
  });

  it('콜로라도 빌: ♠가 아니면 평소처럼 빗나감!을 묻는다', () => {
    const s0 = V({
      players: [{ character: 'coloradoBill', hand: ['bang'] }, { hand: ['missed'] }, {}],
      deckTop: [{ kind: 'beer', suit: 'hearts' }],
    });
    const s = play(s0, 'p0', 'bang', { target: 'p1' });
    expect(s.awaiting).toMatchObject({ k: 'missed', pid: 'p1' });
  });

  it('이블린: 가져오기 1장 대신 뱅! 1발, 서로 다른 사람에게', () => {
    let s = beginTurn(V({ players: [{ character: 'evelynShebang' }, {}, {}] }), 'p0');
    expect(s.awaiting).toMatchObject({ k: 'evelyn', remaining: 2 });
    s = reduce(s, { type: 'respond', pid: 'p0', choice: { c: 'player', pid: 'p1' } });
    expect(s.awaiting).toMatchObject({ k: 'evelyn', remaining: 1 });
    expect((s.awaiting as { targets: string[] }).targets).toEqual(['p2']);
    s = pass(s);
    expect(p(s, 'p0').hand).toHaveLength(1);
    expect(p(s, 'p1').hp).toBe(p(s, 'p1').maxHp - 1);
    expect(s.turn.bangsPlayed).toBe(0);
  });

  it('헨리 블록: 강탈한 사람은 뱅!의 표적이 된다', () => {
    const s0 = V({ players: [{ hand: ['panic'] }, { character: 'henryBlock', hand: ['beer'] }, {}] });
    let s = play(s0, 'p0', 'panic', { target: 'p1' });
    s = reduce(s, { type: 'respond', pid: 'p0', choice: { c: 'pick', pick: { zone: 'hand', index: 0 } } });
    expect(p(s, 'p0').hp).toBe(p(s0, 'p0').hp - 1);
    expect(p(s, 'p0').hand.map(kindOf)).toEqual(['beer']);
  });

  it('레모네이드 짐: 남이 맥주를 내면 1장 버리고 같이 회복한다', () => {
    const s0 = V({ players: [{ hand: ['beer'], hp: 3 }, { character: 'lemonadeJim', hp: 2, hand: ['bang'] }, {}] });
    let s = play(s0, 'p0', 'beer');
    expect(s.awaiting).toMatchObject({ k: 'discardChoice', pid: 'p1', reason: 'lemonadeJim', canPass: true });
    s = pick(s, handCard(s, 'p1', 'bang'));
    expect(p(s, 'p1').hp).toBe(3);
    expect(p(s, 'p0').hp).toBe(4);
  });

  // 카드 원문: "Each time another player plays a Beer card, you may discard any card from hand to also
  // regain 1 life point." 마지막 목숨을 잃을 때 내는 맥주도 맥주 카드를 내는 것이다
  // (기본 룰: 그때는 남의 차례에도 맥주를 낼 수 있다). 같은 문구인 마담 이토도 그 맥주에 발동한다.
  it('레모네이드 짐: 남이 쓰러질 때 낸 맥주에도 발동한다', () => {
    const s0 = V({
      players: [{ hand: ['bang'] }, { hp: 1, hand: ['beer'] }, { character: 'lemonadeJim', hp: 2, hand: ['missed'] }, {}],
    });
    let s = play(s0, 'p0', 'bang', { target: 'p1' });
    expect(s.awaiting).toMatchObject({ k: 'beerToSurvive', pid: 'p1' });
    s = pick(s, handCard(s, 'p1', 'beer'));
    expect(p(s, 'p1').alive).toBe(true);
    expect(s.awaiting).toMatchObject({ k: 'discardChoice', pid: 'p2', reason: 'lemonadeJim', canPass: true });
    s = pick(s, handCard(s, 'p2', 'missed'));
    expect(p(s, 'p2').hp).toBe(3);
    expect(totalCards(s)).toBe(96);
  });
});

describe('하이 눈 이벤트와의 상호작용', () => {
  it('숙취: 투코·블랙 플라워 능력이 꺼진다', () => {
    const tuco = beginTurn(V({ players: [{ character: 'tucoFranziskaner' }, {}, {}], event: 'hangover' }), 'p0');
    expect(p(tuco, 'p0').hand).toHaveLength(2);
    const bf = V({ players: [{ character: 'blackFlower', hand: [{ kind: 'missed', suit: 'clubs' }] }, {}, {}], event: 'hangover' });
    expect(legalActions(bf, 'p0').some((a) => a.type === 'playCard' && a.ability)).toBe(false);
  });

  it('수갑: 선언한 무늬가 아니면 새 카드도 못 낸다', () => {
    const s0 = V({ players: [{ hand: [{ kind: 'tomahawk', suit: 'diamonds' }] }, {}, {}], event: 'handcuffs' });
    const s = { ...s0, turn: { ...s0.turn, handcuffsSuit: 'hearts' as const } };
    expect(legalActions(s, 'p0').some((a) => a.type === 'playCard')).toBe(false);
  });

  it('설교: 패닝은 뱅!으로 쳐서 막히지 않는다 — 카드 종류가 다르다', () => {
    const s = V({ players: [{ hand: ['fanning'] }, {}, {}], event: 'theSermon' });
    // 설교는 '뱅!' 카드만 막는다 (EC-96). 패닝은 다른 카드다.
    expect(legalActions(s, 'p0').some((a) => a.type === 'playCard')).toBe(true);
  });

  it('목사: 레모네이드 짐도 맥주가 없어 발동하지 않는다, 라스트 콜은 쓸 수 있다', () => {
    const s = V({ players: [{ hand: ['beer', 'lastCall'], hp: 2 }, {}, {}], event: 'theReverend' });
    const kinds = legalActions(s, 'p0').filter((a) => a.type === 'playCard').map((a) => a.type === 'playCard' && kindOf(a.card));
    expect(kinds).toEqual(['lastCall']);
  });

  it('유령도시: 유령 카드 없는 유령은 자기 차례 동안만 남는다', () => {
    const s0 = V({ players: [{}, { alive: false, hp: 0 }, {}], event: 'ghostTown', activeSeat: 0 });
    const s = reduce(s0, { type: 'endTurn', pid: 'p0' });
    expect(s.turn.active).toBe('p1');
    expect(p(s, 'p1').ghost).toBe(true);
  });
});

describe('JSON 왕복', () => {
  it('확장판 상태가 JSON 으로 그대로 돌아온다', () => {
    const s0 = V({ players: [{ hand: ['poker'] }, { hand: ['bang'] }, { hand: ['missed'] }] });
    const s = play(s0, 'p0', 'poker');
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
