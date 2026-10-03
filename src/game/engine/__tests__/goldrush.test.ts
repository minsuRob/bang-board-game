/**
 * 골드 러시 — 금덩이 · 상점 · 장비 · 캐릭터.
 * (docs/edge-cases.md 골드 러시 절)
 */

import { describe, expect, it } from 'vitest';

import { GOLD_DECK } from '../../data/cards.goldrush';
import { charactersFor } from '../../data/characters';
import { cardOf } from '../cards';
import { nuggetsOf } from '../gold';
import { goldUseOptions } from '../gold-cards';
import { handLimitOf } from '../hooks';
import { legalActions } from '../legal';
import { reduce } from '../reducer';
import { createGame } from '../setup';
import type { GameState, PlayerId } from '../types';
import { handCard, scenario, totalCards, type PlayerSpec } from './helpers';

const GOLD_CHARS = [
  'donBell', 'dutchWill', 'jackyMurieta', 'joshMcCloud',
  'madamYto', 'prettyLuzena', 'raddieSnake', 'simeonPicos',
] as const;

/** 시나리오에 골드 러시 상태를 얹는다 */
function withGold(
  s: GameState,
  opts: { shop?: string[]; nuggets?: Record<PlayerId, number>; equip?: Record<PlayerId, string[]> } = {},
): GameState {
  const shop = opts.shop ?? ['gr-shot-1', 'gr-pickaxe-1', 'gr-unionPacific-1'];
  const equipped = Object.values(opts.equip ?? {}).flat();
  const used = new Set([...shop, ...equipped]);
  return {
    ...s,
    gold: { deck: GOLD_DECK.map((c) => c.id).filter((id) => !used.has(id)), shop, discard: [] },
    players: s.players.map((p) => ({
      ...p,
      nuggets: opts.nuggets?.[p.id] ?? 0,
      goldEquipment: opts.equip?.[p.id] ?? [],
    })),
  };
}

function goldTotal(s: GameState): number {
  const g = s.gold!;
  return (
    g.deck.length +
    g.shop.length +
    g.discard.length +
    s.players.reduce((n, p) => n + (p.goldEquipment?.length ?? 0), 0)
  );
}

const four = (a: Partial<PlayerSpec> = {}, b: Partial<PlayerSpec> = {}): PlayerSpec[] => [
  { id: 'a', role: 'sheriff', character: 'willyTheKid', ...a },
  { id: 'b', role: 'outlaw', character: 'vultureSam', hp: 3, ...b },
  { id: 'c', role: 'outlaw', character: 'vultureSam' },
  { id: 'd', role: 'renegade', character: 'vultureSam' },
];

const nug = (s: GameState, pid: PlayerId) => nuggetsOf(s.players.find((p) => p.id === pid)!);
const player = (s: GameState, pid: PlayerId) => s.players.find((p) => p.id === pid)!;

/** a 가 b 에게 뱅!을 쏘고 b 는 맞는다 */
function shoot(s: GameState, card?: string): GameState {
  let cur = reduce(s, { type: 'playCard', pid: 'a', card: card ?? handCard(s, 'a', 'bang'), target: 'b' });
  if (cur.awaiting?.k === 'missed') {
    cur = reduce(cur, { type: 'respond', pid: 'b', choice: { c: 'pass' } });
  }
  return cur;
}

// ---------------------------------------------------------------------------

describe('골드 러시 준비', () => {
  const seats = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));

  it('확장을 켜면 상점 3장, 덱 21장, 모두 금덩이 0개로 시작한다', () => {
    const s = createGame(7, { playerCount: 5, expansions: ['goldrush'] }, seats);
    expect(s.gold?.shop).toHaveLength(3);
    expect(s.gold?.deck).toHaveLength(21);
    expect(s.players.every((p) => p.nuggets === 0 && p.goldEquipment?.length === 0)).toBe(true);
  });

  it('기본판에서는 장비 덱도 골드 러시 캐릭터도 없다', () => {
    const s = createGame(7, { playerCount: 5, expansions: [] }, seats);
    expect(s.gold).toBeNull();
    const pool = charactersFor([]);
    const hn = charactersFor(['highnoon']);
    for (const c of GOLD_CHARS) {
      expect(pool).not.toContain(c);
      expect(hn).not.toContain(c);
      expect(charactersFor(['goldrush'])).toContain(c);
    }
  });

  it('기본판의 시드 결과가 그대로다 (골드 러시를 켜도 역할·캐릭터 후보는 같은 난수를 먼저 쓴다)', () => {
    const base = createGame(11, { playerCount: 5, expansions: [] }, seats);
    const again = createGame(11, { playerCount: 5, expansions: [] }, seats);
    expect(again).toEqual(base);
  });

  it('JSON 으로 왕복한다', () => {
    const s = createGame(3, { playerCount: 6, expansions: ['goldrush', 'highnoon'] }, seats.concat({ id: 'p5', name: 'P5' }));
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('상처 금덩이', () => {
  it('남에게 입힌 목숨 1점마다 금덩이 1개', () => {
    const s = shoot(withGold(scenario({ players: four({ hand: ['bang'] }) })));
    expect(player(s, 'b').hp).toBe(2);
    expect(nug(s, 'a')).toBe(1);
  });

  it('마지막 목숨을 빼앗는 한 점은 금덩이를 주지 않는다', () => {
    const s = shoot(withGold(scenario({ players: four({ hand: ['bang'] }, { hp: 1 }) })));
    expect(player(s, 'b').alive).toBe(false);
    expect(nug(s, 'a')).toBe(0);
  });

  it('확장을 안 쓰면 금덩이가 생기지 않는다', () => {
    const s = shoot(scenario({ players: four({ hand: ['bang'] }) }));
    expect(player(s, 'a').nuggets).toBeUndefined();
  });

  it('시미언 피코스는 맞을 때마다 금덩이를 받는다', () => {
    const s = shoot(withGold(scenario({ players: four({ hand: ['bang'] }, { character: 'simeonPicos' }) })));
    expect(nug(s, 'b')).toBe(1);
  });
});

describe('상점', () => {
  it('검정 장비를 사면 앞에 놓이고 상점이 곧바로 채워진다', () => {
    let s = withGold(scenario({ players: four() }), { nuggets: { a: 4 } });
    const buy = legalActions(s, 'a').find((x) => x.type === 'buyGold' && x.card === 'gr-pickaxe-1');
    expect(buy).toBeDefined();
    s = reduce(s, buy!);
    expect(nug(s, 'a')).toBe(0);
    expect(player(s, 'a').goldEquipment).toContain('gr-pickaxe-1');
    expect(s.gold!.shop).toHaveLength(3);
    expect(goldTotal(s)).toBe(24);
    expect(totalCards(s)).toBe(80);
  });

  it('금덩이가 모자라면 살 수 없다', () => {
    const s = withGold(scenario({ players: four() }), { nuggets: { a: 3 } });
    expect(legalActions(s, 'a').some((x) => x.type === 'buyGold' && x.card === 'gr-pickaxe-1')).toBe(false);
  });

  it('프리티 루제나는 한 번 1개 싸게 산다', () => {
    const s = withGold(scenario({ players: four({ character: 'prettyLuzena' }) }), { nuggets: { a: 3 } });
    expect(legalActions(s, 'a').some((x) => x.type === 'buyGold' && x.card === 'gr-pickaxe-1')).toBe(true);
  });

  it('남의 장비는 값 + 1 을 내고 버리게 한다', () => {
    let s = withGold(scenario({ players: four() }), { nuggets: { a: 3 }, equip: { b: ['gr-horseshoe-1'] } });
    const act = legalActions(s, 'a').find((x) => x.type === 'removeGold');
    expect(act).toBeDefined();
    s = reduce(s, act!);
    expect(nug(s, 'a')).toBe(0);
    expect(player(s, 'b').goldEquipment).toHaveLength(0);
    expect(s.gold!.discard).toContain('gr-horseshoe-1');
  });

  it('유니언 퍼시픽은 카드 4장', () => {
    let s = withGold(scenario({ players: four() }), { nuggets: { a: 4 } });
    const before = player(s, 'a').hand.length;
    const act = legalActions(s, 'a').find((x) => x.type === 'buyGold' && x.card === 'gr-unionPacific-1');
    s = reduce(s, act!);
    expect(player(s, 'a').hand.length).toBe(before + 4);
    expect(s.gold!.discard).toContain('gr-unionPacific-1');
  });
});

describe('럼', () => {
  function buyRhum(s: GameState): GameState {
    const act = legalActions(s, 'a').find((x) => x.type === 'buyGold' && x.card === 'gr-rhum-1');
    if (!act) throw new Error('럼을 살 수 없다');
    return reduce(s, act);
  }

  it('카드 4장을 펼쳐 무늬 가짓수만큼 회복한다', () => {
    const s0 = withGold(scenario({ players: four({ hp: 1 }) }), { shop: ['gr-rhum-1'], nuggets: { a: 3 } });
    const s = buyRhum(s0);
    expect(s.log.find((e) => e.t === 'rhum')?.cards).toHaveLength(4);
    expect(s.deck).toHaveLength(s0.deck.length - 4);
    expect(totalCards(s)).toBe(80);
  });

  // 공식 FAQ Q05 (faq-goldrush): "How does Lucky Duke work with the Rhum?
  //   A. Lucky Duke draws up to 5 cards instead of 4."
  it('러키 듀크는 5장을 펼친다 (FAQ Q05)', () => {
    const s0 = withGold(scenario({ players: four({ character: 'luckyDuke', hp: 1 }) }), {
      shop: ['gr-rhum-1'],
      nuggets: { a: 3 },
    });
    const s = buyRhum(s0);
    expect(s.log.find((e) => e.t === 'rhum')?.cards).toHaveLength(5);
    expect(s.deck).toHaveLength(s0.deck.length - 5);
    expect(totalCards(s)).toBe(80);
  });

  // 공식 FAQ Q12 (faq-goldrush): "How does John Pain work with the Rhum?
  //   A. He takes in his hand all the "drawn" cards, one by one until he has 6 cards or less."
  it('존 페인은 펼친 카드를 손패가 6장이 될 때까지 한 장씩 가져간다 (FAQ Q12)', () => {
    const s0 = withGold(
      scenario({
        players: four({ hp: 1 }, { character: 'johnPain', hand: ['bang', 'bang', 'missed', 'missed'] }),
      }),
      { shop: ['gr-rhum-1'], nuggets: { a: 3 } },
    );
    const s = buyRhum(s0);
    const flipped = s.log.find((e) => e.t === 'rhum')?.cards ?? [];
    expect(flipped).toHaveLength(4);
    expect(player(s, 'b').hand).toEqual([...player(s0, 'b').hand, flipped[0], flipped[1]]);
    expect(s.discard.slice(-2)).toEqual([flipped[2], flipped[3]]);
    expect(totalCards(s)).toBe(80);
  });
});

describe('맥주 → 금덩이', () => {
  it('맥주를 금덩이 1개로 바꾸고, 마담 이토는 카드 한 장을 받는다', () => {
    let s = withGold(
      scenario({ players: [...four({ hand: ['beer'] }).slice(0, 2), { id: 'c', role: 'outlaw', character: 'madamYto' }, four()[3]] }),
    );
    const yto = player(s, 'c').hand.length;
    const act = legalActions(s, 'a').find((x) => x.type === 'beerForGold');
    expect(act).toBeDefined();
    s = reduce(s, act!);
    expect(nug(s, 'a')).toBe(1);
    expect(player(s, 'c').hand.length).toBe(yto + 1);
  });

  // 마담 이토 카드: "Each time a Beer card is played, she draws 1 card from the deck."
  // 골드 러시 해설: "It doesn't matter whether the Beer was played to regain a life point or to take a gold nugget."
  it('목숨을 회복하려고 낸 보통 맥주에도 마담 이토가 카드 한 장을 받는다', () => {
    let s = withGold(
      scenario({
        players: [...four({ hand: ['beer'], hp: 3 }).slice(0, 2), { id: 'c', role: 'outlaw', character: 'madamYto' }, four()[3]],
      }),
    );
    const yto = player(s, 'c').hand.length;
    s = reduce(s, { type: 'playCard', pid: 'a', card: handCard(s, 'a', 'beer') });
    expect(player(s, 'a').hp).toBe(4);
    expect(player(s, 'c').hand.length).toBe(yto + 1);
    expect(totalCards(s)).toBe(80);
  });

  it('마담 이토 자신이 낸 맥주에도 받는다', () => {
    let s = withGold(
      scenario({ players: [{ id: 'a', role: 'sheriff', character: 'madamYto', hp: 2, hand: ['beer'] }, ...four().slice(1)] }),
    );
    s = reduce(s, { type: 'playCard', pid: 'a', card: handCard(s, 'a', 'beer') });
    expect(player(s, 'a').hp).toBe(3);
    expect(player(s, 'a').hand.length).toBe(1);
  });
});

describe('검정 장비', () => {
  it('탄띠를 달면 손패 한도가 8', () => {
    const s = withGold(scenario({ players: four() }), { equip: { a: ['gr-gunBelt-1'] } });
    expect(handLimitOf(s, 'a')).toBe(8);
    expect(handLimitOf(s, 'b')).toBe(player(s, 'b').hp);
  });

  it('칼루멧: 남이 낸 ♦ 뱅!의 대상이 되지 않는다', () => {
    const s = withGold(
      scenario({ players: four({ hand: [{ kind: 'bang', suit: 'diamonds' }] }) }),
      { equip: { b: ['gr-calumet-1'] } },
    );
    const card = player(s, 'a').hand[0];
    expect(cardOf(card).suit).toBe('diamonds');
    const targets = legalActions(s, 'a').filter((x) => x.type === 'playCard').map((x) => (x as { target?: string }).target);
    expect(targets).not.toContain('b');
  });

  // 칼루멧 원문 "Cards of Diamonds played by the other players have no effect on you." (결투만 예외)
  // 그림자의 계곡의 ♦ 카드도 마찬가지다: 토마호크 ♦A, 노상강도 ♦Q.
  it('칼루멧: 남이 낸 ♦ 토마호크의 대상이 되지 않는다', () => {
    const s = withGold(
      scenario({ expansions: ['valley'], players: four({ hand: ['tomahawk'] }) }),
      { equip: { b: ['gr-calumet-1'] } },
    );
    const card = handCard(s, 'a', 'tomahawk');
    expect(cardOf(card).suit).toBe('diamonds');
    const targets = legalActions(s, 'a')
      .filter((x) => x.type === 'playCard' && x.card === card)
      .map((x) => (x as { target?: string }).target);
    expect(targets).toContain('d');
    expect(targets).not.toContain('b');
  });

  it('칼루멧: 남이 낸 ♦ 노상강도는 칼루멧을 가진 사람을 건너뛴다', () => {
    const s0 = withGold(
      scenario({
        expansions: ['valley'],
        players: four({ hand: ['bandidos'] }, { hand: ['beer', 'beer'] }),
      }),
      { equip: { b: ['gr-calumet-1'] } },
    );
    let s = reduce(s0, { type: 'playCard', pid: 'a', card: handCard(s0, 'a', 'bandidos') });
    const asked: PlayerId[] = [];
    for (let i = 0; i < 20 && s.awaiting; i++) {
      asked.push(s.awaiting.pid);
      s = reduce(s, legalActions(s, s.awaiting.pid)[0]);
    }
    expect(asked).not.toContain('b');
    expect(player(s, 'b').hand).toHaveLength(2);
    expect(player(s, 'b').hp).toBe(player(s0, 'b').hp);
  });
});

describe('수배 · 배낭 · 숙취', () => {
  it('수배가 붙은 사람을 제거하면 카드 2장과 금덩이 1개를 더 받는다', () => {
    const s = shoot(
      withGold(scenario({ players: four({ hand: ['bang'] }, { hp: 1 }) }), { equip: { b: ['gr-wanted-1'] } }),
    );
    expect(player(s, 'b').alive).toBe(false);
    // 마지막 한 점이라 상처 금덩이는 없고, 수배 1개만
    expect(nug(s, 'a')).toBe(1);
    // 무법자 현상금 3 + 수배 2
    expect(player(s, 'a').hand.length).toBe(5);
    expect(s.gold!.discard).toContain('gr-wanted-1');
    expect(goldTotal(s)).toBe(24);
    expect(totalCards(s)).toBe(80);
  });

  // 카드 원문 "Play on any player." / 골드 러시 FAQ Q07 "You must play it immediately in front of you
  // or in front of another player." — 자기 앞에도 놓을 수 있다. 이미 수배가 붙은 사람은 뺀다.
  it('수배는 자기 자신을 포함해 아무에게나 놓을 수 있다', () => {
    const s = withGold(scenario({ players: four() }), { equip: { c: ['gr-wanted-2'] } });
    const targets = goldUseOptions(s, 'a', 'gr-wanted-1').map((u) => u.target).sort();
    expect(targets).toEqual(['a', 'b', 'd']);
  });

  it('배낭은 죽기 직전에도 금덩이 2개로 목숨 1을 회복한다', () => {
    let s = shoot(
      withGold(scenario({ players: four({ hand: ['bang'] }, { hp: 1 }) }), {
        nuggets: { b: 2 },
        equip: { b: ['gr-rucksack-1'] },
      }),
    );
    expect(s.awaiting?.k).toBe('beerToSurvive');
    const use = legalActions(s, 'b').find((x) => x.type === 'goldAbility');
    expect(use).toBeDefined();
    s = reduce(s, use!);
    expect(player(s, 'b').alive).toBe(true);
    expect(player(s, 'b').hp).toBe(1);
    expect(nug(s, 'b')).toBe(0);
  });

  it('숙취 중에는 시미언 피코스가 금덩이를 받지 못하지만 쏜 사람은 받는다', () => {
    const s = shoot(
      withGold(scenario({ players: four({ hand: ['bang'] }, { character: 'simeonPicos' }), event: 'hangover' })),
    );
    expect(nug(s, 'b')).toBe(0);
    expect(nug(s, 'a')).toBe(1);
  });
});
