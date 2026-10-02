/**
 * 한줌의 카드 이벤트 — 실제 차례 흐름에서 훅이 프레임을 쌓는지.
 */

import { describe, expect, it } from 'vitest';

import type { EventCardId } from '../../data/types';
import { distance } from '../distance';
import { legalActions } from '../legal';
import { defaultAction, reduce } from '../reducer';
import type { GameState, PlayerId } from '../types';
import { beginTurn, handCard, logged, loggedCount, p, resolveStack, scenario, type PlayerSpec } from './helpers';

/** 보안관 a 와 무법자 셋. 캐릭터는 차례 흐름에 끼어들지 않는 윌리 더 키드 */
function table(event: EventCardId, a: Partial<PlayerSpec> = {}, b: Partial<PlayerSpec> = {}) {
  return (extra: { deckTop?: PlayerSpec['hand'] } = {}): GameState =>
    scenario({
      event,
      deckTop: extra.deckTop,
      players: [
        { id: 'a', role: 'sheriff', character: 'willyTheKid', ...a },
        { id: 'b', character: 'willyTheKid', ...b },
        { id: 'c', character: 'willyTheKid' },
        { id: 'd', character: 'willyTheKid' },
      ],
    });
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

function endTurn(state: GameState, pid: PlayerId): GameState {
  return reduce(state, { type: 'endTurn', pid });
}

describe('차례 시작', () => {
  it('한줌의 카드: 손패 장수만큼 쏜 사람 없는 뱅!을 맞는다', () => {
    const s0 = table('fistfulOfCards', { hand: ['beer', 'panic', 'gatling'] })();
    const s = beginTurn(s0, 'a');
    expect(loggedCount(s, 'fistfulBang')).toBe(3);
    expect(p(s, 'a').hp).toBe(p(s0, 'a').hp - 3);
  });

  it('한줌의 카드: 손이 비었으면 아무 일도 없다', () => {
    const s0 = table('fistfulOfCards')();
    const s = beginTurn(s0, 'a');
    expect(logged(s, 'fistfulBang')).toBe(false);
    expect(p(s, 'a').hp).toBe(p(s0, 'a').hp);
  });

  it('의형제: 다친 사람이 있으면 넘겨줄지 묻는다', () => {
    const s = beginTurn(table('bloodBrothers', { hp: 3 }, { hp: 2 })(), 'a');
    expect(s.awaiting).toMatchObject({ k: 'bloodBrothers', pid: 'a', targets: ['b'] });
  });
});

describe('카드 가져오기 단계', () => {
  it('독한 술: 다쳤으면 가져오기 대신 회복할지 묻는다', () => {
    const s = beginTurn(table('hardLiquor', { hp: 2 })(), 'a');
    expect(s.awaiting).toMatchObject({ k: 'hardLiquor', pid: 'a' });
  });

  it('독한 술: 목숨이 가득이면 묻지 않고 평소대로 가져온다', () => {
    const s = beginTurn(table('hardLiquor')(), 'a');
    expect(s.awaiting).toBeNull();
    expect(p(s, 'a').hand).toHaveLength(2);
  });

  it('피요테: 가져오기 대신 색을 묻는다', () => {
    const s = beginTurn(table('peyote')(), 'a');
    expect(s.awaiting).toMatchObject({ k: 'peyote', pid: 'a' });
    expect(p(s, 'a').hand).toHaveLength(0);
  });

  it('목장: 가져온 뒤 바꿀 카드를 묻는다', () => {
    const s = beginTurn(table('ranch')(), 'a');
    expect(s.awaiting).toMatchObject({ k: 'ranch', pid: 'a', picked: [] });
    expect(p(s, 'a').hand).toHaveLength(2);
  });

  it('서부의 법: 두 번째로 가져온 카드를 내야 할 카드로 건다', () => {
    const s = beginTurn(table('lawOfTheWest')({ deckTop: ['missed', 'beer'] }), 'a');
    expect(s.turn.mustPlay).toBe(handCard(s, 'a', 'beer'));
    expect(logged(s, 'lawOfTheWest')).toBe(true);
  });
});

describe('공개 · 카드 사용', () => {
  it('러시안 룰렛: 공개되면 보안관부터 빗나감!을 묻는다', () => {
    const s = reveal(table('russianRoulette', { hand: ['missed'] })(), 'russianRoulette');
    expect(s.awaiting).toMatchObject({ k: 'russianRoulette', pid: 'a' });
  });

  it('판사: 파랑 카드는 낼 수 없고 갈색 카드는 낼 수 있다', () => {
    const s = table('theJudge', { hand: ['barrel', 'jail', 'stagecoach'] })();
    const played = legalActions(s, 'a').flatMap((x) => (x.type === 'playCard' ? [x.card] : []));
    expect(played).not.toContain(handCard(s, 'a', 'barrel'));
    expect(played).not.toContain(handCard(s, 'a', 'jail'));
    expect(played).toContain(handCard(s, 'a', 'stagecoach'));
  });
});

describe('차례 끝', () => {
  it('복수: ♥ 면 같은 사람이 차례를 한 번 더 하고, 추가 차례 끝에는 펼치지 않는다', () => {
    let s = table('vendetta')({
      deckTop: [{ kind: 'bang', suit: 'hearts' }, 'beer', 'beer', { kind: 'bang', suit: 'hearts' }],
    });
    s = endTurn(s, 'a');
    expect(loggedCount(s, 'vendetta')).toBe(1);
    expect(s.turn.active).toBe('a');
    expect(s.turn.extra).toBe(true);

    s = endTurn(s, 'a');
    expect(loggedCount(s, 'vendetta')).toBe(1);
    expect(s.turn.active).toBe('b');
  });

  it('복수: ♥ 가 아니면 다음 사람으로 넘어간다', () => {
    let s = table('vendetta')({ deckTop: [{ kind: 'bang', suit: 'spades' }] });
    s = endTurn(s, 'a');
    expect(s.turn.active).toBe('b');
  });
});

describe('올가미', () => {
  it('술통이 판정을 하지 않는다', () => {
    let s = table('lasso', { hand: ['bang'] }, { equipment: ['barrel'] })({
      deckTop: [{ kind: 'beer', suit: 'hearts' }],
    });
    s = reduce(s, { type: 'playCard', pid: 'a', card: handCard(s, 'a', 'bang'), target: 'b' });
    expect(logged(s, 'judgement')).toBe(false);
    expect(p(s, 'b').hp).toBe(p(s, 'b').maxHp - 1);
  });

  it('무기 사정거리가 맨손으로 돌아간다', () => {
    const s = table('lasso', { hand: ['bang'], equipment: ['remington'] })();
    const targets = legalActions(s, 'a').flatMap((x) => (x.type === 'playCard' && x.target ? [x.target] : []));
    expect(targets).toContain('b');
    expect(targets).not.toContain('c');
  });

  it('감옥에 있어도 판정 없이 차례를 한다', () => {
    const s = beginTurn(table('lasso', { equipment: ['jail'] })(), 'a');
    expect(logged(s, 'judgement')).toBe(false);
    expect(s.turn.phase).toBe('play');
    expect(p(s, 'a').hand).toHaveLength(2);
  });
});

describe('매복', () => {
  it('자리와 상관없이 거리는 1이다', () => {
    const s = table('ambush')();
    expect(distance(s, 'a', 'c')).toBe(1);
  });

  it('앞에 놓인 야생마는 더하고, 캐릭터의 거리 능력은 무시한다', () => {
    const s = scenario({
      event: 'ambush',
      players: [
        { id: 'a', role: 'sheriff', character: 'roseDoolan' },
        { id: 'b', equipment: ['mustang'] },
        { id: 'c', character: 'paulRegret' },
        { id: 'd' },
      ],
    });
    expect(distance(s, 'a', 'b')).toBe(2);
    expect(distance(s, 'a', 'c')).toBe(1);
    expect(distance(s, 'd', 'c')).toBe(1);
  });
});

describe('폐광', () => {
  it('가져오기는 버린 더미 맨 위부터 가져온다', () => {
    const s0 = scenario({
      event: 'abandonedMine',
      discard: ['beer', 'panic', 'gatling'],
      players: [{ id: 'a', role: 'sheriff', character: 'willyTheKid' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
    });
    const [, panic, gatling] = s0.discard;
    const s = beginTurn(s0, 'a');
    expect(p(s, 'a').hand).toEqual([gatling, panic]);
    expect(s.discard).toHaveLength(1);
    expect(s.deck).toHaveLength(s0.deck.length);
  });

  it('버린 더미가 모자라면 나머지는 덱에서 가져온다', () => {
    const s0 = scenario({
      event: 'abandonedMine',
      discard: ['beer'],
      players: [{ id: 'a', role: 'sheriff', character: 'willyTheKid' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
    });
    const s = beginTurn(s0, 'a');
    expect(p(s, 'a').hand).toHaveLength(2);
    expect(p(s, 'a').hand).toContain(s0.discard[0]);
    expect(s.deck).toHaveLength(s0.deck.length - 1);
  });

  it('버리기 단계에 버린 카드는 덱 맨 위로 가고 로그에 카드가 남지 않는다', () => {
    // 손패 3장 · 목숨 1 이라 한 장을 버려도 버리기 단계에 남는다
    let s = table('abandonedMine', { hp: 1, hand: ['beer', 'panic', 'gatling'] })();
    s = endTurn(s, 'a');
    const card = p(s, 'a').hand[0];
    s = reduce(s, { type: 'discardCard', pid: 'a', card });
    expect(s.deck[s.deck.length - 1]).toBe(card);
    expect(s.discard).not.toContain(card);
    expect(s.log.find((e) => e.t === 'discard')?.card).toBeUndefined();
  });
});

describe('망자', () => {
  /** b 가 이미 첫 탈락자로 적혀 있는 판 */
  function withFirstOut(s: GameState, pid: PlayerId, used = false): GameState {
    return { ...s, event: { ...s.event!, firstOut: pid, deadManUsed: used } };
  }

  it('이벤트 덱을 쓰면 첫 탈락자를 적어 두고, 두 번째 탈락자로 덮지 않는다', () => {
    let s = table('blessing', {}, { hp: 1 })();
    s = resolveStack({
      ...s,
      stack: [...s.stack, { k: 'damage', target: 'b', amount: 1, source: 'a', credit: 'a', cause: 'bang' }],
    });
    expect(p(s, 'b').alive).toBe(false);
    expect(s.event?.firstOut).toBe('b');

    s = resolveStack({
      ...s,
      players: s.players.map((x) => (x.id === 'c' ? { ...x, hp: 1 } : x)),
      stack: [...s.stack, { k: 'damage', target: 'c', amount: 1, source: 'a', credit: 'a', cause: 'bang' }],
    });
    expect(p(s, 'c').alive).toBe(false);
    expect(s.event?.firstOut).toBe('b');
  });

  it('첫 탈락자는 자기 차례에 목숨 2 · 카드 2장으로 돌아온다', () => {
    let s = withFirstOut(table('deadMan', {}, { alive: false, hp: 0 })(), 'b');
    s = endTurn(s, 'a');
    expect(s.turn.active).toBe('b');
    expect(p(s, 'b').alive).toBe(true);
    expect(p(s, 'b').hp).toBe(2);
    // 돌아올 때 2장 + 카드 가져오기 단계 2장
    expect(p(s, 'b').hand).toHaveLength(4);
    expect(s.event?.deadManUsed).toBe(true);
    expect(logged(s, 'deadMan')).toBe(true);
  });

  it('한 번 돌아왔으면 다시 돌아오지 않는다', () => {
    let s = withFirstOut(table('deadMan', {}, { alive: false, hp: 0 })(), 'b', true);
    s = endTurn(s, 'a');
    expect(s.turn.active).toBe('c');
    expect(p(s, 'b').alive).toBe(false);
  });
});

describe('저격수', () => {
  it('뱅! 2장을 함께 내는 수가 열리고, 같은 쌍은 한 번만 연다', () => {
    const s = table('sniper', { hand: ['bang', 'bang'] })();
    const pairs = legalActions(s, 'a').filter((x) => x.type === 'playCard' && x.also && x.target === 'b');
    expect(pairs).toHaveLength(1);
  });

  it('두 장 모두 버리고, 빗나감! 2장을 요구하며, 뱅! 1회로 친다', () => {
    let s = table('sniper', { hand: ['bang', 'bang'] }, { hand: ['missed', 'missed'] })();
    const play = legalActions(s, 'a').find((x) => x.type === 'playCard' && x.also && x.target === 'b')!;
    s = reduce(s, play);
    expect(p(s, 'a').hand).toHaveLength(0);
    expect(s.turn.bangsPlayed).toBe(1);
    expect(s.awaiting).toMatchObject({ k: 'missed', pid: 'b', remaining: 2 });
  });

  it('이벤트가 없으면 열리지 않는다', () => {
    const s = table('blessing', { hand: ['bang', 'bang'] })();
    expect(legalActions(s, 'a').some((x) => x.type === 'playCard' && x.also)).toBe(false);
  });
});

describe('리코체', () => {
  it('뱅! 횟수가 없어도, 거리가 멀어도 앞의 카드를 노리는 수가 열린다', () => {
    const s0 = scenario({
      event: 'ricochet',
      players: [
        // 윌리 더 키드는 뱅! 횟수 제한이 없으니 기본 캐릭터(블랙 잭)로 둔다
        { id: 'a', role: 'sheriff', hand: ['bang'] },
        { id: 'b' },
        { id: 'c', equipment: ['mustang'] },
        { id: 'd' },
      ],
    });
    const s = { ...s0, turn: { ...s0.turn, bangsPlayed: 1 } };
    const shots = legalActions(s, 'a').filter((x) => x.type === 'playCard');
    expect(shots).toEqual([
      expect.objectContaining({ target: 'c', pick: { zone: 'equipment', card: p(s, 'c').equipment[0] } }),
    ]);
  });

  it('맞으면 카드가 버려지고 뱅! 횟수를 쓰지 않는다', () => {
    let s = table('ricochet', { hand: ['bang'] }, { equipment: ['barrel'] })();
    const barrel = p(s, 'b').equipment[0];
    s = reduce(s, { type: 'playCard', pid: 'a', card: handCard(s, 'a', 'bang'), target: 'b', pick: { zone: 'equipment', card: barrel } });
    expect(p(s, 'b').equipment).toHaveLength(0);
    expect(s.discard).toContain(barrel);
    expect(s.turn.bangsPlayed).toBe(0);
    expect(p(s, 'b').hp).toBe(p(s, 'b').maxHp);
  });
});

describe('서부의 법 — 차례 마치기', () => {
  function owing(): GameState {
    const s0 = table('lawOfTheWest', { hp: 3, hand: ['beer', 'panic'] })();
    return { ...s0, turn: { ...s0.turn, mustPlay: handCard(s0, 'a', 'beer') } };
  }

  it('보여 준 카드를 낼 수 있으면 차례를 마칠 수 없다', () => {
    const s = owing();
    expect(legalActions(s, 'a').some((x) => x.type === 'endTurn')).toBe(false);
  });

  it('시간이 다 되면 그 카드를 낸다', () => {
    const s = owing();
    expect(defaultAction(s, 'a')).toMatchObject({ type: 'playCard', card: handCard(s, 'a', 'beer') });
  });

  it('그 카드를 내면 차례를 마칠 수 있다', () => {
    let s = owing();
    s = reduce(s, { type: 'playCard', pid: 'a', card: handCard(s, 'a', 'beer') });
    expect(legalActions(s, 'a').some((x) => x.type === 'endTurn')).toBe(true);
  });

  it('낼 수 없는 카드(빗나감!)면 막지 않는다', () => {
    const s0 = table('lawOfTheWest', { hand: ['missed'] })();
    const s = { ...s0, turn: { ...s0.turn, mustPlay: handCard(s0, 'a', 'missed') } };
    expect(legalActions(s, 'a').some((x) => x.type === 'endTurn')).toBe(true);
  });
});
