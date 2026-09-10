import { describe, expect, it } from 'vitest';

import { reduce } from '../reducer';
import { handCard, logged, p, scenario, totalCards } from './helpers';
import type { Action } from '../types';

const shoot = (s: ReturnType<typeof scenario>, from = 'p0', to = 'p1'): Action => ({
  type: 'playCard',
  pid: from,
  card: handCard(s, from, 'bang'),
  target: to,
});

const pass = (pid: string): Action => ({ type: 'respond', pid, choice: { c: 'pass' } });
const play = (pid: string, card: string): Action => ({
  type: 'respond',
  pid,
  choice: { c: 'card', card },
});

describe('뱅! 기본', () => {
  it('빗나감이 없으면 목숨 1을 잃는다', () => {
    const s0 = scenario({ players: [{ hand: ['bang'] }, { hand: ['beer'] }, {}, {}] });
    const s = reduce(s0, shoot(s0));
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
    expect(s.awaiting).toBeNull();
    expect(totalCards(s)).toBe(80);
  });

  it('빗나감을 낼 카드가 아예 없으면 묻지 않고 바로 피해가 들어간다', () => {
    const s0 = scenario({ players: [{ hand: ['bang'] }, { hand: [] }, {}, {}] });
    const s = reduce(s0, shoot(s0));
    expect(s.awaiting).toBeNull();
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
  });

  it('빗나감이 있으면 낼지 물어보고, 내면 피해가 없다', () => {
    const s0 = scenario({ players: [{ hand: ['bang'] }, { hand: ['missed'] }, {}, {}] });
    let s = reduce(s0, shoot(s0));
    expect(s.awaiting).toMatchObject({ k: 'missed', pid: 'p1', remaining: 1 });

    const missed = s.awaiting!.k === 'missed' ? s.awaiting!.options[0] : '';
    s = reduce(s, play('p1', missed));
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp);
    expect(p(s, 'p1').hand).toHaveLength(0);
    expect(logged(s, 'missed')).toBe(true);
  });

  it('빗나감을 안 내면 피해를 받는다', () => {
    const s0 = scenario({ players: [{ hand: ['bang'] }, { hand: ['missed'] }, {}, {}] });
    let s = reduce(s0, shoot(s0));
    s = reduce(s, pass('p1'));
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
    expect(p(s, 'p1').hand).toHaveLength(1);
  });

  it('차례당 뱅!은 한 번뿐이다', () => {
    const s0 = scenario({ players: [{ hand: ['bang', 'bang'] }, {}, {}, {}] });
    let s = reduce(s0, shoot(s0));
    expect(s.turn.bangsPlayed).toBe(1);

    const second = shoot(s, 'p0', 'p1');
    s = reduce(s, second);
    expect(logged(s, 'rejected')).toBe(true);
    expect(s.turn.bangsPlayed).toBe(1);
  });

  it('사정거리 밖에는 쏠 수 없다', () => {
    const s0 = scenario({ players: [{ hand: ['bang'] }, {}, {}, {}, {}, {}, {}] });
    const s = reduce(s0, shoot(s0, 'p0', 'p3'));
    expect(logged(s, 'rejected')).toBe(true);
    expect(p(s, 'p3').hp).toBe(p(s0, 'p3').hp);
  });
});

describe('술통과 주르도네', () => {
  it('술통 판정이 하트면 빗나간다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { equipment: ['barrel'] }, {}, {}],
      deckTop: [{ kind: 'beer', suit: 'hearts' }],
    });
    const s = reduce(s0, shoot(s0));
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp);
    expect(logged(s, 'dodge')).toBe(true);
    expect(s.awaiting).toBeNull();
  });

  it('술통 판정이 하트가 아니면 그대로 맞는다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { equipment: ['barrel'] }, {}, {}],
      deckTop: [{ kind: 'missed', suit: 'spades' }],
    });
    const s = reduce(s0, shoot(s0));
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
  });

  it('주르도네는 술통 없이도 판정한다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { character: 'jourdonnais' }, {}, {}],
      deckTop: [{ kind: 'beer', suit: 'hearts' }],
    });
    const s = reduce(s0, shoot(s0));
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp);
  });

  it('주르도네가 술통까지 차면 판정 기회가 두 번이다', () => {
    const s0 = scenario({
      players: [
        { hand: ['bang'] },
        { character: 'jourdonnais', equipment: ['barrel'] },
        {},
        {},
      ],
      // 첫 판정은 실패, 두 번째가 하트
      deckTop: [
        { kind: 'missed', suit: 'spades' },
        { kind: 'beer', suit: 'hearts' },
      ],
    });
    const s = reduce(s0, shoot(s0));
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp);
    expect(s.log.filter((e) => e.t === 'judgement')).toHaveLength(2);
  });

  it('술통으로 피해도 프레임이 정상 종료된다 (v0.254)', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { equipment: ['barrel'] }, {}, {}],
      deckTop: [{ kind: 'beer', suit: 'hearts' }],
    });
    const s = reduce(s0, shoot(s0));
    expect(s.stack[s.stack.length - 1].k).toBe('playPhase');
    expect(s.turn.phase).toBe('play');
  });
});

describe('러키 듀크', () => {
  it('판정 때 두 장을 보고 고른다', () => {
    const s0 = scenario({
      players: [
        { hand: ['bang'] },
        { character: 'luckyDuke', equipment: ['barrel'] },
        {},
        {},
      ],
      deckTop: [
        { kind: 'missed', suit: 'spades' },
        { kind: 'beer', suit: 'hearts' },
      ],
    });
    let s = reduce(s0, shoot(s0));
    expect(s.awaiting).toMatchObject({ k: 'judgementChoice', pid: 'p1' });
    const options = s.awaiting!.k === 'judgementChoice' ? s.awaiting!.options : [];
    expect(options).toHaveLength(2);

    // 하트를 고르면 빗나간다
    const hearts = options.find((c) => c.startsWith('beer-h'))!;
    s = reduce(s, play('p1', hearts));
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp);
    // 고르지 않은 카드도 버려진다
    expect(s.discard).toEqual(expect.arrayContaining(options));
  });
});

describe('슬랩 더 킬러', () => {
  it('빗나감 두 장을 요구한다', () => {
    const s0 = scenario({
      players: [
        { character: 'slabTheKiller', hand: ['bang'] },
        { hand: ['missed', 'missed'] },
        {},
        {},
      ],
    });
    let s = reduce(s0, shoot(s0));
    expect(s.awaiting).toMatchObject({ k: 'missed', remaining: 2 });

    s = reduce(s, play('p1', p(s, 'p1').hand[0]));
    expect(s.awaiting).toMatchObject({ k: 'missed', remaining: 1 });

    s = reduce(s, play('p1', p(s, 'p1').hand[0]));
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp);
  });

  it('한 장만 내고 포기하면 피해를 받는다', () => {
    const s0 = scenario({
      players: [
        { character: 'slabTheKiller', hand: ['bang'] },
        { hand: ['missed', 'missed'] },
        {},
        {},
      ],
    });
    let s = reduce(s0, shoot(s0));
    s = reduce(s, play('p1', p(s, 'p1').hand[0]));
    expect(s.awaiting).toMatchObject({ remaining: 1 });
    s = reduce(s, pass('p1'));
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
  });

  it('술통으로 한 장을 벌면 빗나감 한 장으로 충분하다', () => {
    const s0 = scenario({
      players: [
        { character: 'slabTheKiller', hand: ['bang'] },
        { equipment: ['barrel'], hand: ['missed'] },
        {},
        {},
      ],
      deckTop: [{ kind: 'beer', suit: 'hearts' }],
    });
    let s = reduce(s0, shoot(s0));
    expect(s.awaiting).toMatchObject({ k: 'missed', remaining: 1 });
    s = reduce(s, play('p1', p(s, 'p1').hand[0]));
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp);
  });
});

describe('칼라미티 자넷', () => {
  it('뱅!을 빗나감으로 낼 수 있다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { character: 'calamityJanet', hand: ['bang'] }, {}, {}],
    });
    let s = reduce(s0, shoot(s0));
    expect(s.awaiting).toMatchObject({ k: 'missed' });
    const opts = s.awaiting!.k === 'missed' ? s.awaiting!.options : [];
    expect(opts).toHaveLength(1);

    s = reduce(s, play('p1', opts[0]));
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp);
  });

  it('빗나감을 뱅!으로 쏠 수 있고, 그것도 차례당 1회 제한을 받는다 (v0.12)', () => {
    const s0 = scenario({
      players: [{ character: 'calamityJanet', hand: ['missed', 'missed'] }, {}, {}, {}],
    });
    const card = p(s0, 'p0').hand[0];
    let s = reduce(s0, { type: 'playCard', pid: 'p0', card, as: 'bang', target: 'p1' });
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp - 1);
    expect(s.turn.bangsPlayed).toBe(1);

    s = reduce(s, {
      type: 'playCard',
      pid: 'p0',
      card: p(s, 'p0').hand[0],
      as: 'bang',
      target: 'p1',
    });
    expect(logged(s, 'rejected')).toBe(true);
  });

  it('슬랩의 뱅!을 뱅! 두 장으로 막는다 (v0.12)', () => {
    const s0 = scenario({
      players: [
        { character: 'slabTheKiller', hand: ['bang'] },
        { character: 'calamityJanet', hand: ['bang', 'bang'] },
        {},
        {},
      ],
    });
    let s = reduce(s0, shoot(s0));
    s = reduce(s, play('p1', p(s, 'p1').hand[0]));
    s = reduce(s, play('p1', p(s, 'p1').hand[0]));
    expect(p(s, 'p1').hp).toBe(p(s0, 'p1').hp);
  });
});

describe('뱅! 횟수 제한을 푸는 것들', () => {
  it('윌리 더 키드는 원하는 만큼 쏜다', () => {
    const s0 = scenario({
      players: [{ character: 'willyTheKid', hand: ['bang', 'bang'] }, { hp: 4 }, {}, {}],
    });
    let s = reduce(s0, shoot(s0));
    s = reduce(s, shoot(s, 'p0', 'p1'));
    expect(p(s, 'p1').hp).toBe(2);
    expect(logged(s, 'rejected')).toBe(false);
  });

  it('볼캐닉도 제한을 푼다', () => {
    const s0 = scenario({
      players: [
        { character: 'bartCassidy', hand: ['bang', 'bang'], equipment: ['volcanic'] },
        { hp: 4 },
        {},
        {},
      ],
    });
    let s = reduce(s0, shoot(s0));
    s = reduce(s, shoot(s, 'p0', 'p1'));
    expect(p(s, 'p1').hp).toBe(2);
  });
});
