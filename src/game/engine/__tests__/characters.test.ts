/**
 * 기본 캐릭터 16종의 능력.
 *
 * 뱅!·판정·전체 대상 카드 쪽에서 이미 검증한 각도는 여기서 다시 다루지 않는다.
 * (bang.test.ts: 주르도네·러키 듀크·슬랩·자넷·윌리, turn-hazards.test.ts: 벌쳐 샘,
 *  distance.test.ts: 폴 리그렛·로즈 둘란의 거리 계산)
 */

import { describe, expect, it } from 'vitest';

import { SID_KETCHUM_ABILITY } from '../../modifiers';
import { kindOf } from '../cards';
import { legalActions } from '../legal';
import { reduce } from '../reducer';
import { beginTurn, handCard, logged, p, scenario, totalCards } from './helpers';
import type { Action, GameState } from '../types';

const play = (pid: string, card: string): Action => ({
  type: 'respond',
  pid,
  choice: { c: 'card', card },
});
const pass = (pid: string): Action => ({ type: 'respond', pid, choice: { c: 'pass' } });
const shoot = (s: GameState, from: string, to: string): Action => ({
  type: 'playCard',
  pid: from,
  card: handCard(s, from, 'bang'),
  target: to,
});

// ---------------------------------------------------------------------------

describe('바트 캐시디', () => {
  it('목숨 1을 잃으면 카드 1장을 가져온다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { character: 'bartCassidy' }, {}, {}],
    });
    const s = reduce(s0, shoot(s0, 'p0', 'p1'));
    expect(p(s, 'p1').hand).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });

  it('다이너마이트로 3을 잃으면 3장을 가져온다 — 가해자가 없어도 발동한다 (v0.281)', () => {
    const s0 = scenario({
      players: [
        {},
        { character: 'bartCassidy', equipment: ['dynamite', 'jail'], hp: 4 },
        {},
        {},
      ],
      deckTop: [
        { kind: 'missed', suit: 'spades', rank: '5' }, // 다이너마이트 폭발
        'stagecoach',
        'wellsFargo',
        'saloon', // 능력으로 가져올 3장
        { kind: 'missed', suit: 'clubs', rank: 'J' }, // 감옥 실패 → 카드 가져오기 단계는 건너뛴다
      ],
    });
    const s = beginTurn(s0, 'p1');
    expect(p(s, 'p1').hp).toBe(1);
    expect(p(s, 'p1').hand).toHaveLength(3);
  });

  it('능력으로 뽑은 맥주로 그 자리에서 죽음을 면할 수 있다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { character: 'bartCassidy', hp: 1 }, {}, {}],
      deckTop: [{ kind: 'beer', suit: 'hearts' }],
    });
    let s = reduce(s0, shoot(s0, 'p0', 'p1'));
    // 피해 → 능력으로 맥주를 뽑음 → 그 맥주로 생존
    expect(s.awaiting).toMatchObject({ k: 'beerToSurvive', pid: 'p1' });

    const beer = s.awaiting!.k === 'beerToSurvive' ? s.awaiting!.options[0] : '';
    s = reduce(s, play('p1', beer));
    expect(p(s, 'p1').alive).toBe(true);
    expect(p(s, 'p1').hp).toBe(1);
    expect(totalCards(s)).toBe(80);
  });
});

describe('블랙 잭', () => {
  it('두 번째 카드가 하트면 한 장 더 가져와 3장이 된다', () => {
    const s0 = scenario({
      players: [{}, { character: 'blackJack' }, {}, {}],
      deckTop: [
        { kind: 'bang', suit: 'clubs' },
        { kind: 'beer', suit: 'hearts' },
        { kind: 'missed', suit: 'spades' },
      ],
    });
    const s = beginTurn(s0, 'p1');
    expect(p(s, 'p1').hand).toHaveLength(3);
    expect(logged(s, 'blackJack')).toBe(true);
  });

  it('두 번째 카드가 클로버면 2장에서 멈춘다', () => {
    const s0 = scenario({
      players: [{}, { character: 'blackJack' }, {}, {}],
      deckTop: [
        { kind: 'bang', suit: 'hearts' },
        { kind: 'missed', suit: 'clubs' },
      ],
    });
    const s = beginTurn(s0, 'p1');
    expect(p(s, 'p1').hand).toHaveLength(2);
  });

  it('축복 중에는 모든 카드가 하트라 언제나 3장이다 (v0.43)', () => {
    const s0 = scenario({
      players: [{}, { character: 'blackJack' }, {}, {}],
      deckTop: [
        { kind: 'bang', suit: 'spades' },
        { kind: 'missed', suit: 'spades' },
        { kind: 'missed', suit: 'clubs' },
      ],
      event: 'blessing',
    });
    const s = beginTurn(s0, 'p1');
    expect(p(s, 'p1').hand).toHaveLength(3);
  });
});

describe('엘 그링고', () => {
  it('총알 3개짜리다', () => {
    const s = scenario({ players: [{}, { character: 'elGringo' }, {}, {}] });
    expect(p(s, 'p1').maxHp).toBe(3);
  });

  it('자신을 쏜 사람의 손에서 카드 1장을 가져온다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang', 'beer'] }, { character: 'elGringo' }, {}, {}],
    });
    const s = reduce(s0, shoot(s0, 'p0', 'p1'));
    expect(p(s, 'p1').hand).toHaveLength(1);
    expect(p(s, 'p0').hand).toHaveLength(0);
    expect(logged(s, 'steal')).toBe(true);
    expect(totalCards(s)).toBe(80);
  });

  it('가해자가 없는 다이너마이트 피해에는 발동하지 않는다 (v0.281)', () => {
    const s0 = scenario({
      players: [
        { role: 'sheriff', character: 'elGringo', equipment: ['dynamite'] },
        { hand: ['bang', 'beer'] },
        {},
        {},
      ],
      deckTop: [{ kind: 'missed', suit: 'spades', rank: '5' }],
    });
    const s = beginTurn(s0, 'p0');
    expect(p(s, 'p0').hp).toBe(1);
    expect(logged(s, 'steal')).toBe(false);
    expect(p(s, 'p1').hand).toHaveLength(2);
  });

  it('하이 눈으로 잃은 목숨에도 발동하지 않는다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang', 'beer'] }, { character: 'elGringo' }, {}, {}],
      event: 'highNoon',
    });
    const s = beginTurn(s0, 'p1');
    expect(p(s, 'p1').hp).toBe(2);
    expect(logged(s, 'steal')).toBe(false);
    expect(p(s, 'p0').hand).toHaveLength(2);
  });

  it('가해자의 손이 비어 있으면 아무 일도 일어나지 않는다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { character: 'elGringo' }, {}, {}],
    });
    const s = reduce(s0, shoot(s0, 'p0', 'p1'));
    expect(p(s, 'p1').hp).toBe(2);
    expect(p(s, 'p1').hand).toHaveLength(0);
    expect(logged(s, 'steal')).toBe(false);
  });

  it('자기가 신청한 결투에서 졌을 때는 발동하지 않는다 (v0.61, edge-cases 쟁점 A)', () => {
    const s0 = scenario({
      players: [{}, { character: 'elGringo', hand: ['duel'] }, { hand: ['bang', 'beer'] }, {}],
      activeSeat: 1,
    });
    let s = reduce(s0, {
      type: 'playCard',
      pid: 'p1',
      card: handCard(s0, 'p1', 'duel'),
      target: 'p2',
    });
    s = reduce(s, play('p2', handCard(s, 'p2', 'bang')));
    expect(p(s, 'p1').hp).toBe(2);
    expect(logged(s, 'steal')).toBe(false);
    expect(p(s, 'p2').hand).toHaveLength(1);
  });
});

describe('제시 존스', () => {
  it('카드 가져오기 단계의 첫 장을 남의 손에서 가져온다', () => {
    const s0 = scenario({
      players: [{ character: 'jesseJones' }, { hand: ['bang'] }, {}, {}],
    });
    let s = beginTurn(s0, 'p0');
    expect(s.awaiting).toMatchObject({ k: 'jesseJones', pid: 'p0', targets: ['p1'] });

    s = reduce(s, { type: 'respond', pid: 'p0', choice: { c: 'player', pid: 'p1' } });
    expect(p(s, 'p0').hand).toHaveLength(2);
    expect(p(s, 'p1').hand).toHaveLength(0);
    expect(totalCards(s)).toBe(80);
  });

  it('아무도 손패가 없으면 선택지 없이 덱에서 2장을 가져온다 (v0.25)', () => {
    const s0 = scenario({
      players: [{ character: 'jesseJones' }, {}, {}, {}],
    });
    const s = beginTurn(s0, 'p0');
    expect(s.awaiting).toBeNull();
    expect(p(s, 'p0').hand).toHaveLength(2);
  });
});

describe('킷 칼슨', () => {
  it('세 장을 보고 두 장을 고른다', () => {
    const s0 = scenario({
      players: [{ character: 'kitCarlson' }, {}, {}, {}],
      deckTop: ['jail', 'dynamite', 'volcanic'],
    });
    let s = beginTurn(s0, 'p0');
    expect(s.awaiting).toMatchObject({ k: 'kitCarlson', pid: 'p0', remaining: 2 });
    const options = s.awaiting!.k === 'kitCarlson' ? s.awaiting!.options : [];
    expect(options).toHaveLength(3);

    s = reduce(s, play('p0', options[0]));
    s = reduce(s, play('p0', options[1]));
    expect(p(s, 'p0').hand).toEqual([options[0], options[1]]);
    expect(totalCards(s)).toBe(80);
  });

  it('고르지 않은 한 장은 덱 맨 위로 돌아가 다음 사람이 가져간다', () => {
    const s0 = scenario({
      players: [{ character: 'kitCarlson' }, {}, {}, {}],
      deckTop: ['jail', 'dynamite', 'volcanic'],
    });
    let s = beginTurn(s0, 'p0');
    const options = s.awaiting!.k === 'kitCarlson' ? s.awaiting!.options : [];
    // 'volcanic' 을 남긴다
    s = reduce(s, play('p0', options[0]));
    s = reduce(s, play('p0', options[1]));
    s = reduce(s, { type: 'endTurn', pid: 'p0' });

    expect(kindOf(p(s, 'p1').hand[0])).toBe('volcanic');
    expect(totalCards(s)).toBe(80);
  });
});

describe('폴 리그렛', () => {
  it('총알 3개짜리다', () => {
    const s = scenario({ players: [{}, { character: 'paulRegret' }, {}, {}] });
    expect(p(s, 'p1').maxHp).toBe(3);
  });

  it('거리가 1 멀어져 맨손 뱅!이 옆자리에도 닿지 않는다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { character: 'paulRegret' }, {}, {}],
    });
    const s = reduce(s0, shoot(s0, 'p0', 'p1'));
    expect(logged(s, 'rejected')).toBe(true);
    expect(p(s, 'p1').hp).toBe(3);
  });

  it('사정거리 2짜리 무기로는 닿는다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'], equipment: ['schofield'] }, { character: 'paulRegret' }, {}, {}],
    });
    const s = reduce(s0, shoot(s0, 'p0', 'p1'));
    expect(p(s, 'p1').hp).toBe(2);
  });
});

describe('로즈 둘란', () => {
  it('거리가 1 가까워져 맨손 뱅!이 거리 2까지 닿는다', () => {
    const s0 = scenario({
      players: [{ character: 'roseDoolan', hand: ['bang'] }, {}, {}, {}],
    });
    const s = reduce(s0, shoot(s0, 'p0', 'p2'));
    expect(p(s, 'p2').hp).toBe(3);
  });

  it('능력이 없으면 같은 거리에 닿지 않는다', () => {
    const s0 = scenario({ players: [{ hand: ['bang'] }, {}, {}, {}] });
    const s = reduce(s0, shoot(s0, 'p0', 'p2'));
    expect(logged(s, 'rejected')).toBe(true);
  });
});

describe('페드로 라미레즈', () => {
  it('버린 더미 맨 위를 첫 장으로 가져온다 (v0.24)', () => {
    const s0 = scenario({
      players: [{ character: 'pedroRamirez' }, {}, {}, {}],
      discard: ['catBalou'],
    });
    const top = s0.discard[0];
    let s = beginTurn(s0, 'p0');
    expect(s.awaiting).toMatchObject({ k: 'pedroRamirez', pid: 'p0', topDiscard: top });

    s = reduce(s, { type: 'respond', pid: 'p0', choice: { c: 'yes' } });
    expect(p(s, 'p0').hand).toContain(top);
    expect(p(s, 'p0').hand).toHaveLength(2);
    expect(s.discard).toHaveLength(0);
    expect(totalCards(s)).toBe(80);
  });

  it('버린 더미가 비면 선택지 없이 덱에서 2장을 가져온다', () => {
    const s0 = scenario({ players: [{ character: 'pedroRamirez' }, {}, {}, {}] });
    const s = beginTurn(s0, 'p0');
    expect(s.awaiting).toBeNull();
    expect(p(s, 'p0').hand).toHaveLength(2);
  });
});

describe('시드 케첨', () => {
  const sid = (pid: string, cards: string[]): Action => ({
    type: 'useAbility',
    pid,
    ability: SID_KETCHUM_ABILITY,
    cards,
  });

  it('카드 2장을 버리고 목숨 1을 회복한다 (v0.136)', () => {
    const s0 = scenario({
      players: [{}, { character: 'sidKetchum', hp: 2, hand: ['bang', 'beer'] }, {}, {}],
      activeSeat: 1,
    });
    const s = reduce(s0, sid('p1', p(s0, 'p1').hand));
    expect(p(s, 'p1').hp).toBe(3);
    expect(p(s, 'p1').hand).toHaveLength(0);
    expect(totalCards(s)).toBe(80);
  });

  it('남의 차례에도 쓸 수 있다', () => {
    const s0 = scenario({
      players: [{}, { character: 'sidKetchum', hp: 2, hand: ['bang', 'beer'] }, {}, {}],
      activeSeat: 0,
    });
    const s = reduce(s0, sid('p1', p(s0, 'p1').hand));
    expect(p(s, 'p1').hp).toBe(3);
  });

  it('반응을 기다리는 중에도 쓸 수 있다', () => {
    const s0 = scenario({
      players: [
        { hand: ['bang'] },
        { character: 'sidKetchum', hp: 2, hand: ['missed', 'bang', 'beer'] },
        {},
        {},
      ],
    });
    let s = reduce(s0, shoot(s0, 'p0', 'p1'));
    expect(s.awaiting).toMatchObject({ k: 'missed', pid: 'p1' });

    const spare = p(s, 'p1').hand.filter((c) => kindOf(c) !== 'missed');
    s = reduce(s, sid('p1', spare));
    expect(p(s, 'p1').hp).toBe(3);
    // 반응 창은 그대로 열려 있다
    expect(s.awaiting).toMatchObject({ k: 'missed', pid: 'p1' });
  });

  it('목숨이 최대면 쓸 수 없다', () => {
    const s0 = scenario({
      players: [{}, { character: 'sidKetchum', hand: ['bang', 'beer'] }, {}, {}],
      activeSeat: 1,
    });
    expect(legalActions(s0, 'p1').filter((a) => a.type === 'useAbility')).toHaveLength(0);
  });

  it('목사가 걸려도 죽음 직전 반응 창에서 쓸 수 있다 (edge-cases 쟁점 D)', () => {
    const s0 = scenario({
      players: [
        {},
        { role: 'outlaw', hand: ['bang'] },
        { role: 'renegade', character: 'sidKetchum', hp: 1, hand: ['catBalou', 'panic'] },
        { role: 'deputy' },
      ],
      event: 'theReverend',
      activeSeat: 1,
    });
    let s = reduce(s0, shoot(s0, 'p1', 'p2'));
    // 맥주는 목사가 막지만 시드 케첨의 능력은 맥주 카드가 아니다
    expect(s.awaiting).toMatchObject({ k: 'beerToSurvive', pid: 'p2', options: [] });

    const ability = legalActions(s, 'p2').find((a) => a.type === 'useAbility');
    expect(ability).toBeDefined();
    s = reduce(s, ability!);
    expect(p(s, 'p2').hp).toBe(1);
  });

  it('능력으로 목숨을 되돌리면 탈락하지 않는다 (edge-cases 쟁점 D)', () => {
    const s0 = scenario({
      players: [
        {},
        { role: 'outlaw', hand: ['bang'] },
        { role: 'renegade', character: 'sidKetchum', hp: 1, hand: ['catBalou', 'panic'] },
        { role: 'deputy' },
      ],
      activeSeat: 1,
    });
    let s = reduce(s0, shoot(s0, 'p1', 'p2'));
    const ability = legalActions(s, 'p2').find((a) => a.type === 'useAbility');
    s = reduce(s, ability!);
    expect(p(s, 'p2').alive).toBe(true);
    expect(p(s, 'p2').hp).toBe(1);
    // 생존맥주 창이 닫히고 쏜 사람의 차례가 이어진다
    expect(s.awaiting).toBeNull();
    expect(s.turn.phase).toBe('play');
  });
});

describe('수지 라파예트', () => {
  it('마지막 카드를 사용해 손이 비면 1장을 가져온다', () => {
    const s0 = scenario({
      players: [{ character: 'suzyLafayette', hand: ['bang'] }, {}, {}, {}],
    });
    const s = reduce(s0, shoot(s0, 'p0', 'p1'));
    expect(p(s, 'p0').hand).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });

  it('감옥을 남에게 걸어 손이 비어도 발동한다 (v0.203)', () => {
    const s0 = scenario({
      players: [{ character: 'suzyLafayette', hand: ['jail'] }, { role: 'outlaw' }, {}, {}],
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'jail'),
      target: 'p1',
    });
    expect(p(s, 'p1').equipment).toHaveLength(1);
    expect(p(s, 'p0').hand).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });

  it('강탈당해 손이 비어도 발동한다 (v0.513)', () => {
    const s0 = scenario({
      players: [{ character: 'suzyLafayette', hand: ['bang'] }, { hand: ['panic'] }, {}, {}],
      activeSeat: 1,
    });
    let s = reduce(s0, {
      type: 'playCard',
      pid: 'p1',
      card: handCard(s0, 'p1', 'panic'),
      target: 'p0',
    });
    s = reduce(s, { type: 'respond', pid: 'p1', choice: { c: 'pick', pick: { zone: 'hand', index: 0 } } });
    expect(p(s, 'p0').hand).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });

  it('캣 발루로 손이 비어도 발동한다 (v0.513)', () => {
    const s0 = scenario({
      players: [{ character: 'suzyLafayette', hand: ['bang'] }, { hand: ['catBalou'] }, {}, {}],
      activeSeat: 1,
    });
    let s = reduce(s0, {
      type: 'playCard',
      pid: 'p1',
      card: handCard(s0, 'p1', 'catBalou'),
      target: 'p0',
    });
    s = reduce(s, { type: 'respond', pid: 'p1', choice: { c: 'pick', pick: { zone: 'hand', index: 0 } } });
    expect(p(s, 'p0').hand).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });

  it('인디언에 뱅!을 버려 손이 비어도 발동한다', () => {
    const s0 = scenario({
      players: [{ character: 'suzyLafayette', hand: ['bang'] }, { hand: ['indians'] }, {}, {}],
      activeSeat: 1,
    });
    let s = reduce(s0, {
      type: 'playCard',
      pid: 'p1',
      card: handCard(s0, 'p1', 'indians'),
    });
    expect(s.awaiting).toMatchObject({ k: 'indiansBang', pid: 'p0' });

    s = reduce(s, play('p0', p(s, 'p0').hand[0]));
    expect(p(s, 'p0').hand).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });

  it('결투가 진행 중이면 발동하지 않는다 (v0.141)', () => {
    const s0 = scenario({
      players: [{ character: 'suzyLafayette', hand: ['bang'] }, { hand: ['duel', 'bang'] }, {}, {}],
      activeSeat: 1,
    });
    let s = reduce(s0, {
      type: 'playCard',
      pid: 'p1',
      card: handCard(s0, 'p1', 'duel'),
      target: 'p0',
    });
    s = reduce(s, play('p0', p(s, 'p0').hand[0]));
    // 아직 상대의 응수를 기다리는 중이다
    expect(s.awaiting).toMatchObject({ k: 'duelBang', pid: 'p1' });
    expect(p(s, 'p0').hand).toHaveLength(0);
  });

  it('결투의 승부가 갈린 직후 발동한다 (v0.141)', () => {
    const s0 = scenario({
      players: [{ character: 'suzyLafayette', hand: ['bang'] }, { hand: ['duel', 'bang'] }, {}, {}],
      activeSeat: 1,
    });
    let s = reduce(s0, {
      type: 'playCard',
      pid: 'p1',
      card: handCard(s0, 'p1', 'duel'),
      target: 'p0',
    });
    s = reduce(s, play('p0', p(s, 'p0').hand[0]));
    s = reduce(s, pass('p1'));
    expect(logged(s, 'duelLoss')).toBe(true);
    expect(p(s, 'p0').hand).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });

  it('유령이 손패 제한으로 마지막 장을 버려도 발동한다 (v0.460)', () => {
    const s0 = scenario({
      players: [
        { character: 'suzyLafayette', hand: ['bang'], alive: false, ghost: true, hp: 0 },
        {},
        {},
        {},
      ],
      event: 'ghostTown',
    });
    let s = reduce(s0, { type: 'endTurn', pid: 'p0' });
    expect(s.turn.phase).toBe('discard');

    s = reduce(s, { type: 'discardCard', pid: 'p0', card: p(s, 'p0').hand[0] });
    expect(p(s, 'p0').hand).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });
});

describe('벌쳐 샘', () => {
  it('숙취 중에는 발동하지 않고 탈락자의 카드는 버린 더미로 간다 (v0.43)', () => {
    const s0 = scenario({
      players: [
        { role: 'sheriff', hand: ['bang'] },
        { role: 'outlaw', hp: 1, hand: ['catBalou'] },
        { role: 'outlaw', character: 'vultureSam' },
        { role: 'renegade' },
      ],
      event: 'hangover',
    });
    const s = reduce(s0, shoot(s0, 'p0', 'p1'));
    expect(p(s, 'p1').alive).toBe(false);
    expect(p(s, 'p2').hand).toHaveLength(0);
    expect(logged(s, 'vultureSam')).toBe(false);
    expect(totalCards(s)).toBe(80);
  });
});

describe('주르도네', () => {
  it('능력이 있어도 판정에 실패하면 그대로 맞는다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { character: 'jourdonnais' }, {}, {}],
      deckTop: [{ kind: 'missed', suit: 'spades' }],
    });
    const s = reduce(s0, shoot(s0, 'p0', 'p1'));
    expect(logged(s, 'judgement')).toBe(true);
    expect(p(s, 'p1').hp).toBe(3);
  });
});

describe('러키 듀크', () => {
  it('다이너마이트 판정에서도 두 장을 보고 고른다 (v0.418)', () => {
    const s0 = scenario({
      players: [{}, { character: 'luckyDuke', equipment: ['dynamite'], hp: 4 }, {}, {}],
      deckTop: [
        { kind: 'missed', suit: 'spades', rank: '5' }, // 폭발
        { kind: 'indians', suit: 'diamonds' }, // 안전
      ],
    });
    let s = beginTurn(s0, 'p1');
    expect(s.awaiting).toMatchObject({ k: 'judgementChoice', pid: 'p1', purpose: 'dynamite' });
    const options = s.awaiting!.k === 'judgementChoice' ? s.awaiting!.options : [];
    expect(options).toHaveLength(2);

    // 일부러 폭발하는 쪽을 고를 수도 있다
    s = reduce(s, play('p1', options[0]));
    expect(p(s, 'p1').hp).toBe(1);
    expect(logged(s, 'dynamite')).toBe(true);
  });
});

describe('슬랩 더 킬러', () => {
  it('빗나감 한 장만 내고 포기하면 그 한 장은 돌아오지 않는다', () => {
    const s0 = scenario({
      players: [
        { character: 'slabTheKiller', hand: ['bang'] },
        { hand: ['missed', 'missed'] },
        {},
        {},
      ],
    });
    let s = reduce(s0, shoot(s0, 'p0', 'p1'));
    const first = p(s, 'p1').hand[0];
    s = reduce(s, play('p1', first));
    s = reduce(s, pass('p1'));

    expect(p(s, 'p1').hp).toBe(3);
    expect(p(s, 'p1').hand).toHaveLength(1);
    expect(s.discard).toContain(first);
    expect(totalCards(s)).toBe(80);
  });
});

describe('칼라미티 자넷', () => {
  it('결투 응수로 빗나감!을 뱅!으로 낼 수 있다 (v0.12)', () => {
    const s0 = scenario({
      players: [{ hand: ['duel'] }, { character: 'calamityJanet', hand: ['missed'] }, {}, {}],
    });
    let s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'duel'),
      target: 'p1',
    });
    expect(s.awaiting).toMatchObject({ k: 'duelBang', pid: 'p1' });

    s = reduce(s, play('p1', p(s, 'p1').hand[0]));
    // 응수를 받았으니 이번엔 결투를 건 쪽이 못 내고 진다
    expect(p(s, 'p1').hp).toBe(4);
    expect(p(s, 'p0').hp).toBe(4);
    expect(totalCards(s)).toBe(80);
  });
});

describe('윌리 더 키드', () => {
  it('푸는 것은 횟수뿐이고 사정거리는 그대로다', () => {
    const s0 = scenario({
      players: [{ character: 'willyTheKid', hand: ['bang'] }, {}, {}, {}],
    });
    const s = reduce(s0, shoot(s0, 'p0', 'p2'));
    expect(logged(s, 'rejected')).toBe(true);
    expect(p(s, 'p2').hp).toBe(4);
  });
});
