import { describe, expect, it } from 'vitest';

import { legalActions } from '../legal';
import { reduce } from '../reducer';
import { beginTurn, handCard, logged, p, scenario } from './helpers';

const drink = (s: ReturnType<typeof scenario>, pid = 'p0') => ({
  type: 'playCard' as const,
  pid,
  card: handCard(s, pid, 'beer'),
});

describe('맥주 (자기 차례에 회복)', () => {
  it('목숨이 깎여 있으면 1 회복한다', () => {
    const s0 = scenario({ players: [{ hand: ['beer'], hp: 2 }, {}, {}, {}] });
    const s = reduce(s0, drink(s0));
    expect(p(s, 'p0').hp).toBe(3);
  });

  it('최대 목숨을 넘겨 회복하지 않는다', () => {
    const s0 = scenario({ players: [{ hand: ['beer'] }, {}, {}, {}] });
    const legal = legalActions(s0, 'p0').filter((a) => a.type === 'playCard');
    expect(legal).toHaveLength(0);
  });

  it('생존자가 2명뿐이면 맥주를 쓸 수 없다', () => {
    const s0 = scenario({
      players: [{ hand: ['beer'], hp: 1 }, {}, { alive: false }, { alive: false }],
    });
    const legal = legalActions(s0, 'p0').filter((a) => a.type === 'playCard');
    expect(legal).toHaveLength(0);
  });

  it('목사가 걸려 있으면 맥주를 쓸 수 없다', () => {
    const s0 = scenario({
      players: [{ hand: ['beer'], hp: 2 }, {}, {}, {}],
      event: 'theReverend',
    });
    expect(legalActions(s0, 'p0').filter((a) => a.type === 'playCard')).toHaveLength(0);
  });
});

describe('죽음 직전의 맥주', () => {
  it('목숨이 0이 되면 맥주를 낼 기회를 준다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { hp: 1, hand: ['beer'] }, {}, {}],
    });
    let s = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'bang'), target: 'p1' });
    expect(s.awaiting).toMatchObject({ k: 'beerToSurvive', pid: 'p1', needed: 1 });

    const beer = s.awaiting!.k === 'beerToSurvive' ? s.awaiting!.options[0] : '';
    s = reduce(s, { type: 'respond', pid: 'p1', choice: { c: 'card', card: beer } });
    expect(p(s, 'p1').hp).toBe(1);
    expect(p(s, 'p1').alive).toBe(true);
    expect(s.discard).toContain(beer);
  });

  it('포기하면 제거된다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { hp: 1, hand: ['beer'] }, {}, {}],
    });
    let s = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'bang'), target: 'p1' });
    s = reduce(s, { type: 'respond', pid: 'p1', choice: { c: 'pass' } });
    expect(p(s, 'p1').alive).toBe(false);
  });

  it('생존자가 2명이면 맥주를 물어보지도 않고 제거된다 (v0.30 / v0.42)', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { hp: 1, hand: ['beer'] }, { alive: false }, { alive: false }],
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'bang'),
      target: 'p1',
    });
    expect(s.awaiting).toBeNull();
    expect(p(s, 'p1').alive).toBe(false);
  });

  it('피해가 3이면 맥주 세 장이 필요하다 (v0.36)', () => {
    // 다이너마이트로 목숨 3을 잃어 hp 가 -2 가 되는 상황
    const s0 = scenario({
      players: [
        { hp: 1, hand: ['beer', 'beer', 'beer'], equipment: ['dynamite'] },
        {},
        {},
        {},
      ],
      deckTop: [{ kind: 'missed', suit: 'spades', rank: '5' }],
    });
    let s = beginTurn(s0, 'p0');
    // 다이너마이트가 터져 목숨이 -2 가 되고, 맥주 3장을 요구한다
    expect(s.awaiting).toMatchObject({ k: 'beerToSurvive', pid: 'p0', needed: 3 });

    for (let i = 0; i < 3; i++) {
      const beer = s.awaiting!.k === 'beerToSurvive' ? s.awaiting!.options[0] : null;
      expect(beer).toBeTruthy();
      s = reduce(s, { type: 'respond', pid: 'p0', choice: { c: 'card', card: beer! } });
    }
    expect(p(s, 'p0').alive).toBe(true);
    expect(p(s, 'p0').hp).toBe(1);
  });

  it('목사 중에는 죽음 회피용 맥주도 못 쓴다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { hp: 1, hand: ['beer'] }, {}, {}],
      event: 'theReverend',
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'bang'),
      target: 'p1',
    });
    expect(p(s, 'p1').alive).toBe(false);
  });
});

describe('주점', () => {
  it('생존자 전원을 1씩 회복시킨다', () => {
    const s0 = scenario({
      players: [{ hand: ['saloon'], hp: 2 }, { hp: 1 }, { hp: 4 }, { alive: false, hp: 0 }],
    });
    const s = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'saloon') });
    expect(p(s, 'p0').hp).toBe(3);
    expect(p(s, 'p1').hp).toBe(2);
    expect(p(s, 'p2').hp).toBe(4); // 이미 최대
    expect(p(s, 'p3').hp).toBe(0);
  });

  it('생존자가 2명뿐이어도 쓸 수 있다 (v0.101, 맥주와 다르다)', () => {
    const s0 = scenario({
      players: [{ hand: ['saloon'], hp: 1 }, { hp: 1 }, { alive: false }, { alive: false }],
    });
    const s = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'saloon') });
    expect(logged(s, 'rejected')).toBe(false);
    expect(p(s, 'p0').hp).toBe(2);
    expect(p(s, 'p1').hp).toBe(2);
  });
});
