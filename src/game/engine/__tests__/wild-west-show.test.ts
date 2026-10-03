/**
 * 와일드 웨스트 쇼 캐릭터 8명.
 *
 * 빅 스펜서 · 플린트 웨스트우드 · 게리 루터 · 그레고리 덱 · 존 페인 · 리 반 클리프 · 테렌 킬 · 율 그리너
 */

import { describe, expect, it } from 'vitest';

import { charactersFor } from '../../data/characters';
import { FLINT_WESTWOOD_ABILITY, LEE_VAN_KLIFF_ABILITY } from '../../modifiers';
import { kindOf } from '../cards';
import { outgoingBangMissesOf } from '../hooks';
import { legalActions } from '../legal';
import { reduce } from '../reducer';
import { createGame } from '../setup';
import type { Action, GameState } from '../types';
import { beginTurn, handCard, logged, p, run, scenario, totalCards } from './helpers';

const swaps = (s: GameState, pid: string) =>
  legalActions(s, pid).filter(
    (a): a is Extract<Action, { type: 'playCard' }> =>
      a.type === 'playCard' && a.ability === FLINT_WESTWOOD_ABILITY,
  );

const repeats = (s: GameState, pid: string) =>
  legalActions(s, pid).filter(
    (a): a is Extract<Action, { type: 'playCard' }> =>
      a.type === 'playCard' && a.ability === LEE_VAN_KLIFF_ABILITY,
  );

/** 판정·선물처럼 기다리는 입력을 첫 선택지로 모두 넘긴다 */
function settle(state: GameState): GameState {
  let s = state;
  for (let i = 0; i < 20 && s.awaiting; i++) {
    const legal = legalActions(s, s.awaiting.pid);
    s = reduce(s, legal[0]);
  }
  return s;
}

// ---------------------------------------------------------------------------

describe('빅 스펜서', () => {
  it('카드 5장을 들고 시작한다 (목숨은 9)', () => {
    let s = createGame(7, { playerCount: 4, expansions: ['wildwestshow'] }, [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
      { id: 'd', name: 'D' },
    ]);
    // 후보에 빅 스펜서를 넣어 준다
    s = { ...s, draft: { ...s.draft!, offers: { ...s.draft!.offers, b: ['bigSpencer'] } } };
    for (const id of ['a', 'b', 'c', 'd']) {
      s = reduce(s, { type: 'pickCharacter', pid: id, character: s.draft!.offers[id][0] });
    }
    const big = p(s, 'b');
    expect(big.character).toBe('bigSpencer');
    expect(big.maxHp).toBe(big.role === 'sheriff' ? 10 : 9);
    expect(big.hand).toHaveLength(5);
  });

  it('뱅!을 맞아도 빗나감!을 낼 수 없다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { character: 'bigSpencer', hand: ['missed', 'missed'] }, {}, {}],
    });
    const s1 = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'bang'), target: 'p1' });
    if (s1.awaiting?.k === 'missed') {
      expect(s1.awaiting.options.some((c) => kindOf(c) === 'missed')).toBe(false);
    }
    const s2 = settle(s1);
    expect(p(s2, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
    expect(p(s2, 'p1').hand).toHaveLength(2);
  });
});

describe('플린트 웨스트우드', () => {
  const flint = () =>
    scenario({
      players: [
        { character: 'flintWestwood', hand: ['beer', 'bang'] },
        { hand: ['missed', 'gatling', 'stagecoach'] },
        { hand: [] },
        { hand: ['panic'] },
      ],
    });

  it('손패가 있는 다른 사람과만 맞바꿀 수 있다. 내 카드 아무거나 줄 수 있다', () => {
    const targets = new Set(swaps(flint(), 'p0').map((a) => a.target));
    expect([...targets].sort()).toEqual(['p1', 'p3']);
    const cards = new Set(swaps(flint(), 'p0').map((a) => kindOf(a.card)));
    expect([...cards].sort()).toEqual(['bang', 'beer']);
  });

  it('1장을 주고 2장을 무작위로 가져온다. 준 카드를 도로 가져오지 않는다', () => {
    const s0 = flint();
    const beer = handCard(s0, 'p0', 'beer');
    const s1 = reduce(s0, { type: 'playCard', pid: 'p0', card: beer, target: 'p1', ability: FLINT_WESTWOOD_ABILITY });
    expect(p(s1, 'p0').hand).toHaveLength(3);
    expect(p(s1, 'p0').hand).not.toContain(beer);
    expect(p(s1, 'p1').hand).toHaveLength(2);
    expect(p(s1, 'p1').hand).toContain(beer);
    // 카드를 낸 게 아니다
    expect(s1.discard).not.toContain(beer);
    expect(logged(s1, 'flintWestwood')).toBe(true);
    expect(logged(s1, 'playCard')).toBe(false);
    expect(totalCards(s1)).toBe(80);
  });

  it('상대 손패가 1장이면 그 1장만 가져온다', () => {
    const s0 = flint();
    const s1 = reduce(s0, {
      type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'bang'), target: 'p3', ability: FLINT_WESTWOOD_ABILITY,
    });
    expect(p(s1, 'p0').hand.map(kindOf).sort()).toEqual(['beer', 'panic']);
    expect(p(s1, 'p3').hand.map(kindOf)).toEqual(['bang']);
  });

  it('차례당 한 번이다. 다음 차례에 다시 열린다', () => {
    const s0 = flint();
    const s1 = reduce(s0, swaps(s0, 'p0')[0]);
    expect(swaps(s1, 'p0')).toHaveLength(0);
    const s2 = beginTurn(s1, 'p0');
    expect(swaps(s2, 'p0').length).toBeGreaterThan(0);
  });

  it('숙취 중에는 쓸 수 없다', () => {
    const s = scenario({
      players: [{ character: 'flintWestwood', hand: ['beer'] }, { hand: ['bang'] }, {}, {}],
      event: 'hangover',
    });
    expect(swaps(s, 'p0')).toHaveLength(0);
  });

  it('헨리 블록의 손에서 가져오면 뱅!을 맞는다', () => {
    const s0 = scenario({
      players: [{ character: 'flintWestwood', hand: ['beer'] }, { character: 'henryBlock', hand: ['bang', 'bang'] }, {}, {}],
    });
    const s1 = settle(reduce(s0, swaps(s0, 'p0')[0]));
    expect(p(s1, 'p0').hp).toBe(p(s0, 'p0').hp - 1);
  });
});

describe('게리 루터', () => {
  it('남이 버리기 단계에서 버린 카드를 가져간다', () => {
    const s0 = scenario({
      players: [
        { hp: 2, hand: ['beer', 'bang', 'stagecoach', 'gatling'] },
        {},
        { character: 'garyLooter', hand: [] },
        {},
      ],
    });
    let s = reduce(s0, { type: 'endTurn', pid: 'p0' });
    expect(s.turn.phase).toBe('discard');
    const discardBefore = s.discard.length;
    s = run(
      s,
      { type: 'discardCard', pid: 'p0', card: handCard(s, 'p0', 'beer') },
      { type: 'discardCard', pid: 'p0', card: handCard(s, 'p0', 'gatling') },
    );
    expect(p(s, 'p2').hand.map(kindOf).sort()).toEqual(['beer', 'gatling']);
    expect(s.discard.length).toBe(discardBefore);
    expect(logged(s, 'garyLooter')).toBe(true);
    expect(totalCards(s)).toBe(80);
  });

  it('자기 차례에 버린 카드는 그냥 버려진다', () => {
    const s0 = scenario({
      players: [{ character: 'garyLooter', hp: 1, hand: ['beer', 'bang'] }, {}, {}, {}],
    });
    let s = reduce(s0, { type: 'endTurn', pid: 'p0' });
    const beer = handCard(s, 'p0', 'beer');
    s = reduce(s, { type: 'discardCard', pid: 'p0', card: beer });
    expect(s.discard).toContain(beer);
    expect(p(s, 'p0').hand).toHaveLength(1);
  });
});

describe('그레고리 덱', () => {
  const greg = () =>
    scenario({
      players: [{ character: 'greygoryDeck' }, { character: 'willyTheKid' }, {}, {}],
    });

  it('첫 차례에는 묻지 않고 기본판 캐릭터 2명을 빌린다. 판에 나와 있는 캐릭터는 빼고', () => {
    const s = beginTurn(greg(), 'p0');
    const borrowed = p(s, 'p0').borrowed ?? [];
    expect(borrowed).toHaveLength(2);
    const base = charactersFor([]);
    for (const c of borrowed) {
      expect(base).toContain(c);
      expect(['willyTheKid', 'blackJack']).not.toContain(c);
    }
    expect(logged(s, 'borrowCharacters')).toBe(true);
    expect(s.awaiting).toBeNull();
  });

  it('다음 차례부터는 새로 뽑을지 묻는다. 그대로 두면 바뀌지 않는다', () => {
    const s1 = beginTurn(greg(), 'p0');
    const first = p(s1, 'p0').borrowed;
    const s2 = beginTurn(s1, 'p0');
    expect(s2.awaiting?.k).toBe('borrowCharacters');
    const kept = reduce(s2, { type: 'respond', pid: 'p0', choice: { c: 'pass' } });
    expect(p(kept, 'p0').borrowed).toEqual(first);
    const redrawn = reduce(s2, { type: 'respond', pid: 'p0', choice: { c: 'yes' } });
    expect(p(redrawn, 'p0').borrowed).toHaveLength(2);
    expect(logged(redrawn, 'borrowCharacters')).toBe(true);
  });

  it('빌린 캐릭터의 능력을 갖는다. 숙취 중에는 빌린 능력도 꺼진다', () => {
    const s0 = greg();
    const s = { ...s0, players: s0.players.map((x) => (x.id === 'p0' ? { ...x, borrowed: ['slabTheKiller' as const] } : x)) };
    expect(outgoingBangMissesOf(s, 'p0')).toBe(2);
    const hung = { ...s, event: { deck: [], current: 'hangover' as const, past: [] } };
    expect(outgoingBangMissesOf(hung, 'p0')).toBe(1);
  });

  it('JSON 으로 왕복한다', () => {
    const s = beginTurn(greg(), 'p0');
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('존 페인', () => {
  it('누가 펼치든 손패가 6장 미만이면 펼친 카드를 가져간다', () => {
    const s0 = scenario({
      players: [{ equipment: ['jail'] }, { character: 'johnPain', hand: ['bang'] }, {}, {}],
      deckTop: [{ kind: 'beer', suit: 'hearts' }],
      activeSeat: 1,
    });
    const s = beginTurn(s0, 'p0');
    expect(logged(s, 'jailEscape')).toBe(true);
    expect(p(s, 'p1').hand.map(kindOf).sort()).toEqual(['bang', 'beer']);
    expect(logged(s, 'johnPain')).toBe(true);
    expect(totalCards(s)).toBe(80);
  });

  it('손패가 6장이면 가져가지 않는다', () => {
    const s0 = scenario({
      players: [
        { equipment: ['jail'] },
        { character: 'johnPain', hand: ['bang', 'bang', 'bang', 'missed', 'missed', 'missed'] },
        {},
        {},
      ],
      deckTop: [{ kind: 'beer', suit: 'hearts' }],
      activeSeat: 1,
    });
    const s = beginTurn(s0, 'p0');
    expect(p(s, 'p1').hand).toHaveLength(6);
    expect(logged(s, 'johnPain')).toBe(false);
  });
});

describe('리 반 클리프', () => {
  it('뱅!을 버려 방금 낸 역마차를 한 번 더 낸다. 뱅! 횟수는 쓰지 않는다', () => {
    const s0 = scenario({ players: [{ character: 'leeVanKliff', hand: ['stagecoach', 'bang'] }, {}, {}, {}] });
    expect(repeats(s0, 'p0')).toHaveLength(0);
    const s1 = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'stagecoach') });
    expect(p(s1, 'p0').hand).toHaveLength(3);
    const again = repeats(s1, 'p0');
    expect(again).toHaveLength(1);
    expect(again[0].as).toBe('stagecoach');
    const s2 = reduce(s1, again[0]);
    expect(p(s2, 'p0').hand.filter((c) => kindOf(c) === 'bang')).toHaveLength(0);
    expect(p(s2, 'p0').hand).toHaveLength(4);
    expect(s2.turn.bangsPlayed).toBe(0);
    expect(totalCards(s2)).toBe(80);
  });

  it('다시 낸 효과는 또 다시 낼 수 없다', () => {
    const s0 = scenario({ players: [{ character: 'leeVanKliff', hand: ['stagecoach', 'bang', 'bang'] }, {}, {}, {}] });
    const s1 = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'stagecoach') });
    const s2 = reduce(s1, repeats(s1, 'p0')[0]);
    expect(repeats(s2, 'p0')).toHaveLength(0);
  });

  it('대상을 새로 고른다 (강탈)', () => {
    const s0 = scenario({
      players: [{ character: 'leeVanKliff', hand: ['panic', 'bang'] }, { hand: ['beer'] }, {}, { hand: ['beer'] }],
    });
    const s1 = settle(reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'panic'), target: 'p1' }));
    expect(new Set(repeats(s1, 'p0').map((a) => a.target))).toEqual(new Set(['p3']));
  });

  it('파랑 카드는 다시 낼 수 없다', () => {
    const s0 = scenario({ players: [{ character: 'leeVanKliff', hand: ['barrel', 'bang'] }, {}, {}, {}] });
    const s1 = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'barrel') });
    expect(repeats(s1, 'p0')).toHaveLength(0);
  });

  it('뱅!도 다시 낼 수 있고, 다시 낸 뱅!은 뱅! 횟수를 쓰지 않는다', () => {
    const s0 = scenario({ players: [{ character: 'leeVanKliff', hand: ['bang', 'bang'] }, {}, {}, {}] });
    const s1 = settle(reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'bang'), target: 'p1' }));
    expect(s1.turn.bangsPlayed).toBe(1);
    const again = repeats(s1, 'p0');
    expect(again.length).toBeGreaterThan(0);
    expect(again.every((a) => a.as === 'bang')).toBe(true);
    const s2 = settle(reduce(s1, again[0]));
    expect(s2.turn.bangsPlayed).toBe(1);
    expect(repeats(s2, 'p0')).toHaveLength(0);
    expect(totalCards(s2)).toBe(80);
  });

  it('한 차례에 갈색 카드마다 한 번씩 쓸 수 있다', () => {
    const s0 = scenario({
      players: [{ character: 'leeVanKliff', hand: ['stagecoach', 'panic', 'bang', 'bang'] }, { hand: ['beer', 'beer'] }, {}, {}],
    });
    const s1 = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'stagecoach') });
    const s2 = reduce(s1, repeats(s1, 'p0')[0]);
    const s3 = settle(reduce(s2, { type: 'playCard', pid: 'p0', card: handCard(s2, 'p0', 'panic'), target: 'p1' }));
    const again = repeats(s3, 'p0');
    expect(again.length).toBeGreaterThan(0);
    expect(again[0].as).toBe('panic');
  });

  it('결전 중에는 아무 카드나 버려 쓴다', () => {
    const s0 = scenario({ event: 'showdown', players: [{ character: 'leeVanKliff', hand: ['stagecoach', 'beer'] }, {}, {}, {}] });
    const s1 = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'stagecoach') });
    const again = repeats(s1, 'p0');
    // 역마차로 받은 2장까지 손패 3장 모두 버릴 수 있다
    expect(again).toHaveLength(3);
    expect(again.some((a) => kindOf(a.card) === 'beer')).toBe(true);
    expect(again.every((a) => a.as === 'stagecoach')).toBe(true);
  });
});

describe('테렌 킬', () => {
  const shoot = (top: 'hearts' | 'spades') => {
    const s0 = scenario({
      players: [{ hand: [{ kind: 'bang', suit: 'diamonds' }] }, { character: 'terenKill', hp: 1, hand: [] }, {}, {}],
      deckTop: [{ kind: 'bang', suit: top }],
    });
    return settle(reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'bang'), target: 'p1' }));
  };

  it('♠가 아니면 목숨 1로 버티고 카드 1장을 가져온다', () => {
    const s = shoot('hearts');
    expect(p(s, 'p1').alive).toBe(true);
    expect(p(s, 'p1').hp).toBe(1);
    expect(p(s, 'p1').hand).toHaveLength(1);
    expect(logged(s, 'terenKill')).toBe(true);
    expect(logged(s, 'eliminate')).toBe(false);
    expect(totalCards(s)).toBe(80);
  });

  it('♠면 제거된다', () => {
    const s = shoot('spades');
    expect(p(s, 'p1').alive).toBe(false);
    expect(logged(s, 'eliminate')).toBe(true);
  });
});

describe('율 그리너', () => {
  it('가져오기 전에 손패가 더 많은 사람이 1장씩 준다', () => {
    const s0 = scenario({
      players: [
        { character: 'youlGrinner', hand: ['beer'] },
        { hand: ['bang', 'missed', 'gatling'] },
        { hand: ['panic'] },
        { hand: ['stagecoach', 'wellsFargo'] },
      ],
    });
    let s = beginTurn(s0, 'p0');
    expect(s.awaiting?.k).toBe('giveCard');
    expect(s.awaiting?.pid).toBe('p1');
    const gatling = handCard(s, 'p1', 'gatling');
    s = reduce(s, { type: 'respond', pid: 'p1', choice: { c: 'card', card: gatling } });
    expect(s.awaiting?.pid).toBe('p3');
    s = reduce(s, { type: 'respond', pid: 'p3', choice: { c: 'card', card: handCard(s, 'p3', 'wellsFargo') } });
    expect(s.awaiting).toBeNull();
    // 1 + 선물 2 + 가져오기 2
    expect(p(s, 'p0').hand).toHaveLength(5);
    expect(p(s, 'p0').hand).toContain(gatling);
    expect(p(s, 'p2').hand).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });

  it('남이 보는 화면에는 줄 카드 후보가 가려진다', async () => {
    const { viewFor } = await import('../view');
    const s0 = scenario({
      players: [{ character: 'youlGrinner' }, { hand: ['bang', 'missed'] }, {}, {}],
    });
    const s = beginTurn(s0, 'p0');
    const v = viewFor(s, 'p0');
    expect(v.awaiting?.k === 'giveCard' && v.awaiting.options.every((c) => c === '?')).toBe(true);
  });
});

describe('기본판', () => {
  it('와일드 웨스트 쇼를 켜지 않으면 이 캐릭터들이 나오지 않는다', () => {
    const base = charactersFor([]);
    for (const c of ['bigSpencer', 'flintWestwood', 'garyLooter', 'greygoryDeck', 'johnPain', 'leeVanKliff', 'terenKill', 'youlGrinner'] as const) {
      expect(base).not.toContain(c);
    }
  });
});
