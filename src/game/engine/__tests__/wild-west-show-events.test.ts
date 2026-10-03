/**
 * 와일드 웨스트 쇼 이벤트 10장 — 공개만 되고 효과가 없던 것을 붙였다.
 * 카드 원문은 dV Giochi 카드 목록(cardslist.php?id=6)을 따른다.
 */

import { describe, expect, it } from 'vitest';

import type { EventCardId, Role } from '../../data/types';
import { LEE_VAN_KLIFF_ABILITY } from '../../modifiers';
import { distance } from '../distance';
import { chatSilenced } from '../hooks';
import { legalActions } from '../legal';
import { defaultAction, reduce } from '../reducer';
import type { Action, GameState, PlayerId } from '../types';
import { viewFor } from '../view';
import {
  beginTurn,
  handCard,
  logged,
  p,
  resolveStack,
  scenario,
  totalCards,
  type PlayerSpec,
} from './helpers';

/** 보안관 a 와 b·c·d. 캐릭터는 차례 흐름에 끼어들지 않는 윌리 더 키드 */
function table(event: EventCardId, specs: Partial<PlayerSpec>[] = [], deckTop?: PlayerSpec['hand']): GameState {
  const base: PlayerSpec[] = [
    { id: 'a', role: 'sheriff', character: 'willyTheKid' },
    { id: 'b', role: 'outlaw', character: 'willyTheKid' },
    { id: 'c', role: 'renegade', character: 'willyTheKid' },
    { id: 'd', role: 'deputy', character: 'willyTheKid' },
  ];
  return scenario({ event, deckTop, players: base.map((b, i) => ({ ...b, ...specs[i] })) });
}

function endTurn(state: GameState, pid: PlayerId): GameState {
  return reduce(state, { type: 'endTurn', pid });
}

function roles(state: GameState): Role[] {
  return state.players.map((x) => x.role).sort();
}

/** 이벤트 카드를 실제로 공개한다 */
function reveal(state: GameState, id: EventCardId): GameState {
  return resolveStack({
    ...state,
    event: { deck: [id], current: null, past: [] },
    stack: [{ k: 'revealEvent' }],
    awaiting: null,
  });
}

function roundTrip(state: GameState): void {
  expect(JSON.parse(JSON.stringify(state))).toEqual(state);
}

describe('재갈', () => {
  it('채팅을 막는다', () => {
    expect(chatSilenced(table('gag'))).toBe(true);
    expect(chatSilenced(table('sacagaway'))).toBe(false);
  });
});

describe('묘지', () => {
  const dead = (role: Role): Partial<PlayerSpec> => ({ role, alive: false, hp: 0 });

  it('제거된 사람이 자기 차례에 목숨 1로 돌아오고, 제거된 사람들의 역할 중 하나를 받는다', () => {
    // 무법자 d 가 살아 있어야 판이 이어진다
    const s0 = table('boneOrchard', [{}, dead('outlaw'), dead('renegade'), { role: 'outlaw' }]);
    const before = roles(s0);
    const s = endTurn(s0, 'a');
    expect(s.turn.active).toBe('b');
    expect(p(s, 'b')).toMatchObject({ alive: true, hp: 1, roleRevealed: false });
    expect(['outlaw', 'renegade']).toContain(p(s, 'b').role);
    expect(roles(s)).toEqual(before);
    expect(logged(s, 'rolesShuffled')).toBe(true);
    roundTrip(s);
  });

  it('이벤트가 없으면 제거된 사람은 건너뛴다', () => {
    const s = endTurn(scenario({ players: [{ id: 'a' }, { id: 'b', alive: false, hp: 0 }, { id: 'c' }] }), 'a');
    expect(s.turn.active).toBe('c');
  });
});

describe('달링 발렌타인', () => {
  it('차례 시작에 손패를 모두 버리고 같은 장수를 새로 가져온 뒤 평소대로 가져온다', () => {
    const s0 = table('darlingValentine', [{ hand: ['beer', 'panic', 'gatling'] }]);
    const old = p(s0, 'a').hand;
    const s = beginTurn(s0, 'a');
    expect(p(s, 'a').hand).toHaveLength(5);
    expect(p(s, 'a').hand.some((c) => old.includes(c))).toBe(false);
    for (const c of old) expect(s.discard).toContain(c);
    expect(totalCards(s)).toBe(80);
  });
});

describe('도로시 레이지', () => {
  const order = (forced: PlayerId, kind: 'bang' | 'duel' | 'beer', target?: PlayerId): Action => ({
    type: 'eventAbility',
    pid: 'a',
    ability: 'dorothyRage',
    forced,
    kind,
    ...(target ? { target } : {}),
  });

  it('남에게 뱅!을 내게 한다. 시킨 사람의 뱅! 횟수는 그대로다', () => {
    const s0 = table('dorothyRage', [{}, { hand: ['bang'] }]);
    const s = reduce(s0, order('b', 'bang', 'c'));
    expect(p(s, 'b').hand).toHaveLength(0);
    expect(p(s, 'c').hp).toBe(p(s0, 'c').hp - 1);
    expect(s.turn.bangsPlayed).toBe(0);
    expect(s.turn.active).toBe('a');
  });

  it('그 카드가 없으면 낸 것은 없고, 기회는 쓴 것이다', () => {
    const s = reduce(table('dorothyRage'), order('b', 'bang', 'c'));
    expect(logged(s, 'dorothyRageMiss')).toBe(true);
    expect(legalActions(s, 'a').some((x) => x.type === 'eventAbility')).toBe(false);
  });

  // 공식 해설: "If the forced player does not have the called card, he must show his hand."
  // 와일드 웨스트 쇼 FAQ Q20: 누가 보는가 — "All players."
  it('그 카드가 없으면 시킨 사람이 손패를 모두에게 보여 준다', () => {
    const s0 = table('dorothyRage', [{}, { hand: ['beer', 'missed'] }]);
    const s = reduce(s0, order('b', 'bang', 'c'));
    const shown = s.log.find((e) => e.t === 'dorothyRageMiss');
    expect(shown?.cards?.slice().sort()).toEqual(p(s0, 'b').hand.slice().sort());
    // 공개 로그라 다른 사람의 시점에도 그대로 남는다
    for (const viewer of ['a', 'c', 'd']) {
      const seen = viewFor(s, viewer).log.find((e) => e.t === 'dorothyRageMiss');
      expect(seen?.cards).toEqual(shown?.cards);
      expect(seen?.text).toContain('맥주');
      expect(seen?.text).toContain('빗나감!');
    }
  });

  it('고를 수 있는 수는 시키는 사람의 손패를 보지 않는다 (장수만 본다)', () => {
    const count = (s: GameState) => legalActions(s, 'a').filter((x) => x.type === 'eventAbility').length;
    expect(count(table('dorothyRage', [{}, { hand: ['bang', 'duel'] }]))).toBe(
      count(table('dorothyRage', [{}, { hand: ['beer', 'missed'] }])),
    );
  });

  it('남의 차례에는 쓸 수 없고, 시간이 지나도 대신 쓰지 않는다', () => {
    const s = table('dorothyRage', [{}, { hand: ['bang'] }]);
    expect(legalActions(s, 'b').some((x) => x.type === 'eventAbility')).toBe(false);
    expect(defaultAction(s, 'a')?.type).toBe('endTurn');
  });
});

describe('헬레나 존테로', () => {
  it('공개될 때 ♥ 면 보안관을 뺀 살아 있는 사람의 역할을 다시 나눈다', () => {
    const s0 = table('sacagaway', [], [{ kind: 'beer', suit: 'hearts' }]);
    const s = reveal(s0, 'helenaZontero');
    expect(logged(s, 'rolesShuffled')).toBe(true);
    expect(p(s, 'a').role).toBe('sheriff');
    expect(roles(s)).toEqual(roles(s0));
  });

  it('검은 무늬면 그대로다', () => {
    const s0 = table('sacagaway', [], [{ kind: 'bang', suit: 'clubs' }]);
    const s = reveal(s0, 'helenaZontero');
    expect(logged(s, 'rolesShuffled')).toBe(false);
    expect(s.players.map((x) => x.role)).toEqual(s0.players.map((x) => x.role));
  });
});

describe('레이디 로즈 오브 텍사스', () => {
  const swap: Action = { type: 'eventAbility', pid: 'a', ability: 'ladyRose' };

  it('오른쪽 사람과 자리를 바꾸고, 그 사람은 다음 차례를 건너뛴다', () => {
    const s0 = table('ladyRoseOfTexas');
    const s = reduce(s0, swap);
    expect(s.players.map((x) => x.id)).toEqual(['d', 'b', 'c', 'a']);
    expect(s.players.map((x) => x.seat)).toEqual([0, 1, 2, 3]);
    expect(p(s, 'd').skipsNextTurn).toBe(true);
    // 새 자리에서 거리를 잰다
    expect(distance(s, 'a', 'c')).toBe(1);
    expect(legalActions(s, 'a').some((x) => x.type === 'eventAbility')).toBe(false);

    const next = endTurn(s, 'a');
    expect(next.turn.active).toBe('b');
    expect(p(next, 'd').skipsNextTurn).toBeUndefined();
    expect(logged(next, 'ladyRoseSkip')).toBe(true);
    roundTrip(next);
  });
});

describe('미스 수잔나', () => {
  it('카드를 3장 내지 못하면 차례 끝에 목숨 1을 잃는다', () => {
    const s0 = table('missSusanna', [{ hand: ['stagecoach'] }]);
    let s = reduce(s0, { type: 'playCard', pid: 'a', card: handCard(s0, 'a', 'stagecoach') });
    s = endTurn(s, 'a');
    // 손패가 넘치면 버리기 단계에서 멈춘다
    while (s.turn.active === 'a' && s.turn.phase === 'discard') {
      s = reduce(s, { type: 'discardCard', pid: 'a', card: p(s, 'a').hand[0] });
    }
    expect(p(s, 'a').hp).toBe(p(s0, 'a').hp - 1);
    expect(logged(s, 'missSusanna')).toBe(true);
  });

  it('3장을 냈으면 잃지 않는다', () => {
    const s0 = table('missSusanna', [{ hand: ['stagecoach', 'wellsFargo', 'beer'] }]);
    let s = s0;
    for (const kind of ['stagecoach', 'wellsFargo', 'beer'] as const) {
      s = reduce(s, { type: 'playCard', pid: 'a', card: handCard(s, 'a', kind) });
    }
    expect(s.turn.cardsPlayed).toBe(3);
    s = endTurn(s, 'a');
    while (s.turn.active === 'a' && s.turn.phase === 'discard') {
      s = reduce(s, { type: 'discardCard', pid: 'a', card: p(s, 'a').hand[0] });
    }
    expect(logged(s, 'missSusanna')).toBe(false);
  });
});

describe('결전', () => {
  it('아무 카드나 뱅!으로 낼 수 있다', () => {
    const s = table('showdown', [{ hand: ['beer'] }]);
    const beer = handCard(s, 'a', 'beer');
    expect(
      legalActions(s, 'a').some((x) => x.type === 'playCard' && x.card === beer && x.as === 'bang' && x.target === 'b'),
    ).toBe(true);
  });

  it('뱅!을 빗나감!으로 낼 수 있다', () => {
    const s0 = table('showdown', [{ hand: ['bang'] }, { hand: ['bang'] }]);
    const s = reduce(s0, { type: 'playCard', pid: 'a', card: handCard(s0, 'a', 'bang'), target: 'b' });
    expect(s.awaiting).toMatchObject({ k: 'missed', pid: 'b' });
    expect(s.awaiting?.k === 'missed' && s.awaiting.options).toContain(handCard(s0, 'b', 'bang'));
  });
});

describe('사카가웨이', () => {
  it('남의 손패가 보이지만 역할은 가린다', () => {
    const s = table('sacagaway', [{}, { hand: ['bang', 'beer'] }]);
    const view = viewFor(s, 'c');
    expect(p(view, 'b').hand).toEqual(p(s, 'b').hand);
    expect(p(view, 'b').role).toBe('outlaw');
    expect(p(view, 'd').role).toBe('outlaw'); // 부관인데 가려져 무법자로 보인다
    expect(viewFor(table('gag', [{}, { hand: ['bang'] }]), 'c').players[1].hand).toEqual(['?']);
  });
});

describe('와일드 웨스트 쇼', () => {
  it('보안관이 쓰러져도 판이 끝나지 않는다', () => {
    const s0 = table('wildWestShow', [{ hp: 1 }, { hand: ['bang'] }], undefined);
    const s1 = { ...s0, turn: { ...s0.turn, active: 'b' }, stack: [{ k: 'playPhase' as const, pid: 'b' }] };
    const s = reduce(s1, { type: 'playCard', pid: 'b', card: handCard(s0, 'b', 'bang'), target: 'a' });
    expect(p(s, 'a').alive).toBe(false);
    expect(s.result).toBeNull();
  });

  it('마지막 한 사람이 역할과 상관없이 이긴다', () => {
    const s0 = table('wildWestShow', [{ hand: ['bang'] }, { hp: 1 }, { alive: false, hp: 0 }, { alive: false, hp: 0 }]);
    const s = reduce(s0, { type: 'playCard', pid: 'a', card: handCard(s0, 'a', 'bang'), target: 'b' });
    expect(s.result).toMatchObject({ winners: ['sheriff'], winnerIds: ['a'] });
  });
});

/**
 * 공개 시점. 와일드 웨스트 쇼 룰(1쪽)·확장 팩 룰(1쪽):
 * "When you play a Stagecoach or Wells Fargo, take the WWS pile and place it in front of you.
 *  Then, reveal the top card … continues until a new Stagecoach or Wells Fargo is played …
 *  Remove the previous card from play. Exception: once revealed, the card titled Wild West Show
 *  stays in play until the end of the game, and it doesn't get replaced."
 * 리 반 클리프(룰 2쪽): "If you repeat the effect of a Stagecoach or Wells Fargo, the WWS card only
 *  changes the first time." · FAQ Q19 "No, you have to use a real Stagecoach or Wells Fargo card."
 * 도로시 레이지 FAQ Q06: 시킨 사람이 아니라 시킴을 받은 사람이 역마차를 낸다(카드도 그 사람이 가져간다).
 */
describe('공개 시점 — 역마차·웰스 파고를 낼 때', () => {
  /** 이벤트 더미가 그대로 남은 판. a(보안관)·b·c·d */
  function pile(
    deck: EventCardId[],
    current: EventCardId | null,
    specs: Partial<PlayerSpec>[] = [],
    deckTop?: PlayerSpec['hand'],
  ): GameState {
    const base: PlayerSpec[] = [
      { id: 'a', role: 'sheriff', character: 'willyTheKid' },
      { id: 'b', role: 'outlaw', character: 'willyTheKid' },
      { id: 'c', role: 'renegade', character: 'willyTheKid' },
      { id: 'd', role: 'deputy', character: 'willyTheKid' },
    ];
    const s = scenario({
      expansions: ['wildwestshow'],
      deckTop,
      players: base.map((b, i) => ({ ...b, ...specs[i] })),
    });
    return { ...s, event: { deck, current, past: [] } };
  }

  const play = (s: GameState, pid: PlayerId, kind: 'stagecoach' | 'wellsFargo'): GameState =>
    reduce(s, { type: 'playCard', pid, card: handCard(s, pid, kind) });

  it('보안관 차례가 돌아와도 공개하지 않는다 (하이 눈과 다르다)', () => {
    const s0 = pile(['gag', 'wildWestShow'], null);
    const s = beginTurn(s0, 'a');
    expect(s.turn.round).toBe(2);
    expect(s.event).toEqual({ deck: ['gag', 'wildWestShow'], current: null, past: [] });
    expect(logged(s, 'event')).toBe(false);
  });

  it('역마차를 내면 맨 위 카드를 공개한다. 그 전에는 이벤트가 없다', () => {
    const s0 = pile(['gag', 'missSusanna', 'wildWestShow'], null, [{ hand: ['stagecoach'] }]);
    const s = play(s0, 'a', 'stagecoach');
    expect(s.event).toEqual({ deck: ['missSusanna', 'wildWestShow'], current: 'gag', past: [] });
    expect(logged(s, 'event')).toBe(true);
    expect(p(s, 'a').hand).toHaveLength(2); // 역마차 효과는 그대로
    roundTrip(s);
  });

  it('웰스 파고도 공개하고, 새 카드가 이전 카드를 대신한다', () => {
    const s0 = pile(['missSusanna', 'wildWestShow'], 'gag', [{ hand: ['wellsFargo'] }]);
    const s = play(s0, 'a', 'wellsFargo');
    expect(s.event).toEqual({ deck: ['wildWestShow'], current: 'missSusanna', past: ['gag'] });
    expect(p(s, 'a').hand).toHaveLength(3);
  });

  it('다른 갈색 카드로는 바뀌지 않는다', () => {
    const s0 = pile(['gag', 'wildWestShow'], null, [{ hand: ['beer', 'generalStore'], hp: 3 }]);
    let s = reduce(s0, { type: 'playCard', pid: 'a', card: handCard(s0, 'a', 'beer') });
    s = reduce(s, { type: 'playCard', pid: 'a', card: handCard(s, 'a', 'generalStore') });
    for (let i = 0; i < 8 && s.awaiting; i++) s = reduce(s, legalActions(s, s.awaiting.pid)[0]);
    expect(s.event?.current).toBeNull();
  });

  it("마지막 '와일드 웨스트 쇼'는 공개된 뒤 바뀌지 않는다", () => {
    const s0 = pile([], 'wildWestShow', [{ hand: ['stagecoach'] }]);
    const s = play(s0, 'a', 'stagecoach');
    expect(s.event).toEqual({ deck: [], current: 'wildWestShow', past: [] });
    expect(logged(s, 'event')).toBe(false);
  });

  it('리 반 클리프가 역마차를 다시 낸 효과로는 바뀌지 않는다 (처음 한 번만)', () => {
    const s0 = pile(['gag', 'missSusanna', 'wildWestShow'], null, [
      { character: 'leeVanKliff', hand: ['stagecoach', 'bang'] },
    ]);
    const s1 = play(s0, 'a', 'stagecoach');
    expect(s1.event?.current).toBe('gag');
    const again = legalActions(s1, 'a').find(
      (x): x is Extract<Action, { type: 'playCard' }> =>
        x.type === 'playCard' && x.ability === LEE_VAN_KLIFF_ABILITY,
    );
    expect(again?.as).toBe('stagecoach');
    const s2 = reduce(s1, again!);
    expect(p(s2, 'a').hand).toHaveLength(4); // 효과는 한 번 더 났다
    expect(s2.event).toEqual({ deck: ['missSusanna', 'wildWestShow'], current: 'gag', past: [] });
  });

  it('도로시 레이지로 시킨 역마차는 낸 사람이 더미를 가져가 공개한다', () => {
    const s0 = pile(['helenaZontero', 'wildWestShow'], 'dorothyRage', [{}, { hand: ['stagecoach'] }], [
      { kind: 'bang', suit: 'clubs' },
    ]);
    const s = reduce(s0, { type: 'eventAbility', pid: 'a', ability: 'dorothyRage', forced: 'b', kind: 'stagecoach' });
    expect(s.event?.current).toBe('helenaZontero');
    expect(s.event?.past).toEqual(['dorothyRage']);
    // 헬레나 존테로 판정은 더미를 가져간 사람(b)이 한다
    expect(s.log.find((e) => e.t === 'judgement')?.pid).toBe('b');
    expect(s.turn.active).toBe('a');
  });

  it('하이 눈에서는 역마차를 내도 공개하지 않는다', () => {
    const s0 = scenario({ expansions: ['highnoon'], players: [{ hand: ['stagecoach'] }, {}, {}, {}] });
    const s1: GameState = { ...s0, event: { deck: ['thirst', 'highNoon'], current: null, past: [] } };
    const s = play(s1, 'p0', 'stagecoach');
    expect(s.event?.current).toBeNull();
  });
});
