/**
 * 한줌의 카드 이벤트 — 실제 차례 흐름에서 훅이 프레임을 쌓는지.
 */

import { describe, expect, it } from 'vitest';

import type { EventCardId } from '../../data/types';
import { distance } from '../distance';
import { legalActions } from '../legal';
import { reduce } from '../reducer';
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
