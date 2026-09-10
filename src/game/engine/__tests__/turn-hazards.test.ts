import { describe, expect, it } from 'vitest';

import { legalActions } from '../legal';
import { reduce } from '../reducer';
import { beginTurn, handCard, logged, p, scenario, totalCards } from './helpers';

describe('감옥', () => {
  it('보안관에게는 쓸 수 없다', () => {
    const s0 = scenario({
      players: [{ role: 'outlaw', hand: ['jail'] }, { role: 'sheriff' }, { role: 'deputy' }, {}],
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'jail'),
      target: 'p1',
    });
    expect(logged(s, 'rejected')).toBe(true);
    expect(p(s, 'p1').equipment).toHaveLength(0);
  });

  it('보안관이 아닌 사람에게는 쓸 수 있다', () => {
    const s0 = scenario({
      players: [{ role: 'sheriff', hand: ['jail'] }, { role: 'outlaw' }, {}, {}],
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'jail'),
      target: 'p1',
    });
    expect(p(s, 'p1').equipment).toHaveLength(1);
  });

  it('판정이 하트면 탈출하고 차례를 정상 진행한다', () => {
    const s0 = scenario({
      players: [{}, { equipment: ['jail'] }, {}, {}],
      deckTop: [{ kind: 'beer', suit: 'hearts' }],
    });
    const s = beginTurn(s0, 'p1');
    expect(p(s, 'p1').equipment).toHaveLength(0);
    expect(s.turn.active).toBe('p1');
    expect(s.turn.phase).toBe('play');
    expect(logged(s, 'jailEscape')).toBe(true);
  });

  it('판정이 하트가 아니면 차례를 통째로 건너뛴다', () => {
    const s0 = scenario({
      players: [{}, { equipment: ['jail'] }, {}, {}],
      deckTop: [{ kind: 'missed', suit: 'spades' }],
    });
    const s = beginTurn(s0, 'p1');
    expect(logged(s, 'jailSkip')).toBe(true);
    expect(p(s, 'p1').equipment).toHaveLength(0);
    // 카드도 뽑지 않고 다음 사람으로 넘어간다
    expect(p(s, 'p1').hand).toHaveLength(0);
    expect(s.turn.active).toBe('p2');
  });

  it('같은 사람에게 감옥을 두 번 걸 수 없다', () => {
    const s0 = scenario({
      players: [{ hand: ['jail'] }, { equipment: ['jail'] }, {}, {}],
    });
    const legal = legalActions(s0, 'p0').filter(
      (a) => a.type === 'playCard' && a.target === 'p1',
    );
    expect(legal).toHaveLength(0);
  });
});

describe('다이너마이트', () => {
  it('♠2~9 이면 터져서 목숨 3을 잃는다', () => {
    const s0 = scenario({
      players: [{ equipment: ['dynamite'], hp: 4 }, {}, {}, {}],
      deckTop: [{ kind: 'missed', suit: 'spades', rank: '5' }],
    });
    const s = beginTurn(s0, 'p0');
    expect(p(s, 'p0').hp).toBe(1);
    expect(p(s, 'p0').equipment).toHaveLength(0);
    expect(logged(s, 'dynamite')).toBe(true);
  });

  it('그 외에는 다음 사람에게 넘어간다', () => {
    const s0 = scenario({
      players: [{ equipment: ['dynamite'], hp: 4 }, {}, {}, {}],
      deckTop: [{ kind: 'beer', suit: 'hearts' }],
    });
    const s = beginTurn(s0, 'p0');
    expect(p(s, 'p0').hp).toBe(4);
    expect(p(s, 'p0').equipment).toHaveLength(0);
    expect(p(s, 'p1').equipment).toHaveLength(1);
    expect(logged(s, 'dynamitePass')).toBe(true);
  });

  it('♠10 이나 ♠A 는 터지지 않는다', () => {
    const s0 = scenario({
      players: [{ equipment: ['dynamite'], hp: 4 }, {}, {}, {}],
      deckTop: [{ kind: 'jail', suit: 'spades', rank: '10' }],
    });
    const s = beginTurn(s0, 'p0');
    expect(p(s, 'p0').hp).toBe(4);
    expect(p(s, 'p1').equipment).toHaveLength(1);
  });

  it('폭발로 죽으면 제거되고 카드가 전부 버려진다', () => {
    const s0 = scenario({
      players: [{ equipment: ['dynamite'], hp: 2, hand: ['bang', 'beer'] }, {}, {}, {}],
      deckTop: [{ kind: 'missed', suit: 'spades', rank: '5' }],
    });
    const s = beginTurn(s0, 'p0');
    // 맥주 한 장으로는 -1 에서 1 로 올릴 수 없다 (2장 필요)
    expect(p(s, 'p0').alive).toBe(false);
    expect(p(s, 'p0').hand).toHaveLength(0);
    expect(totalCards(s)).toBe(80);
  });

  it('다이너마이트 판정이 감옥 판정보다 먼저다', () => {
    const s0 = scenario({
      players: [{ equipment: ['dynamite', 'jail'], hp: 4 }, {}, {}, {}],
      deckTop: [
        { kind: 'missed', suit: 'spades', rank: '5' }, // 다이너마이트 폭발
        { kind: 'missed', suit: 'clubs', rank: 'J' }, // 감옥 실패
      ],
    });
    const s = beginTurn(s0, 'p0');
    expect(p(s, 'p0').hp).toBe(1);
    expect(logged(s, 'jailSkip')).toBe(true);
    expect(p(s, 'p0').hand).toHaveLength(0);
  });
});

describe('탈락 처리', () => {
  it('무법자를 처치하면 현상금 3장을 받는다', () => {
    const s0 = scenario({
      players: [
        { role: 'sheriff', hand: ['bang'] },
        { role: 'outlaw', hp: 1 },
        { role: 'outlaw' },
        { role: 'renegade' },
      ],
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'bang'),
      target: 'p1',
    });
    expect(p(s, 'p1').alive).toBe(false);
    expect(p(s, 'p0').hand).toHaveLength(3);
    expect(logged(s, 'bounty')).toBe(true);
  });

  it('보안관이 부관을 쏘면 손패와 장비를 전부 잃는다', () => {
    const s0 = scenario({
      players: [
        { role: 'sheriff', hand: ['bang', 'beer', 'beer'], equipment: ['scope'] },
        { role: 'deputy', hp: 1 },
        { role: 'outlaw' },
        { role: 'renegade' },
      ],
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'bang'),
      target: 'p1',
    });
    expect(p(s, 'p1').alive).toBe(false);
    expect(p(s, 'p0').hand).toHaveLength(0);
    expect(p(s, 'p0').equipment).toHaveLength(0);
    expect(logged(s, 'penalty')).toBe(true);
  });

  it('배신자를 처치해도 현상금은 없다', () => {
    const s0 = scenario({
      players: [
        { role: 'sheriff', hand: ['bang'] },
        { role: 'renegade', hp: 1 },
        { role: 'outlaw' },
        { role: 'outlaw' },
      ],
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'bang'),
      target: 'p1',
    });
    expect(p(s, 'p0').hand).toHaveLength(0);
    expect(logged(s, 'bounty')).toBe(false);
  });

  it('벌쳐 샘이 탈락자의 손패와 장비를 전부 가져간다', () => {
    const s0 = scenario({
      players: [
        // 야생마를 신은 상대를 쏘려면 사정거리 2 가 필요하다
        { role: 'sheriff', hand: ['bang'], equipment: ['schofield'] },
        // 반응에 쓸 수 있는 카드(맥주·빗나감)를 들려 주면 프롬프트가 떠서 탈락이 지연된다
        { role: 'outlaw', hp: 1, hand: ['catBalou', 'panic'], equipment: ['mustang'] },
        { role: 'outlaw', character: 'vultureSam' },
        { role: 'renegade' },
      ],
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'bang'),
      target: 'p1',
    });
    expect(p(s, 'p2').hand).toHaveLength(3);
    expect(p(s, 'p1').hand).toHaveLength(0);
    expect(p(s, 'p1').equipment).toHaveLength(0);
    expect(totalCards(s)).toBe(80);
  });

  it('벌쳐 샘 회수가 현상금보다 먼저다 (edge-cases 쟁점 K)', () => {
    const s0 = scenario({
      players: [
        { role: 'sheriff', hand: ['bang'], character: 'vultureSam' },
        { role: 'outlaw', hp: 1, hand: ['catBalou'] },
        { role: 'outlaw' },
        { role: 'renegade' },
      ],
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'bang'),
      target: 'p1',
    });
    const order = s.log.filter((e) => e.t === 'vultureSam' || e.t === 'bounty').map((e) => e.t);
    expect(order).toEqual(['vultureSam', 'bounty']);
  });

  it('탈락하면 역할이 공개된다', () => {
    const s0 = scenario({
      players: [
        { role: 'sheriff', hand: ['bang'] },
        { role: 'outlaw', hp: 1 },
        { role: 'outlaw' },
        { role: 'renegade' },
      ],
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'bang'),
      target: 'p1',
    });
    expect(p(s, 'p1').roleRevealed).toBe(true);
  });
});

describe('승리 판정', () => {
  it('보안관이 제거되고 배신자만 남으면 배신자가 이긴다', () => {
    const s0 = scenario({
      players: [
        { role: 'renegade', hand: ['bang'] },
        { role: 'sheriff', hp: 1 },
        { role: 'outlaw', alive: false },
        { role: 'outlaw', alive: false },
      ],
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'bang'),
      target: 'p1',
    });
    expect(s.result).toMatchObject({ winners: ['renegade'] });
  });

  it('보안관이 제거되고 무법자가 남아 있으면 무법자가 이긴다', () => {
    const s0 = scenario({
      players: [
        { role: 'outlaw', hand: ['bang'] },
        { role: 'sheriff', hp: 1 },
        { role: 'outlaw' },
        { role: 'renegade' },
      ],
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'bang'),
      target: 'p1',
    });
    expect(s.result).toMatchObject({ winners: ['outlaw'] });
  });

  it('보안관이 살아 있고 배신자가 혼자 남아도 아직 안 끝난다', () => {
    const s0 = scenario({
      players: [
        { role: 'sheriff', hand: ['bang'] },
        { role: 'outlaw', hp: 1 },
        { role: 'renegade' },
        { role: 'outlaw', alive: false },
      ],
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'bang'),
      target: 'p1',
    });
    expect(s.result).toBeNull();
  });

  it('무법자와 배신자가 전멸하면 보안관 편이 이긴다', () => {
    const s0 = scenario({
      players: [
        { role: 'sheriff', hand: ['bang'] },
        { role: 'renegade', hp: 1 },
        { role: 'outlaw', alive: false },
        { role: 'deputy' },
      ],
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'bang'),
      target: 'p1',
    });
    expect(s.result).toMatchObject({ winners: ['sheriff', 'deputy'] });
    expect(s.result!.winnerIds.sort()).toEqual(['p0', 'p3']);
  });

  it('게임이 끝나면 더 이상 액션을 받지 않는다', () => {
    const s0 = scenario({
      players: [
        { role: 'outlaw', hand: ['bang', 'bang'] },
        { role: 'sheriff', hp: 1 },
        { role: 'outlaw' },
        { role: 'renegade' },
      ],
    });
    let s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'bang'),
      target: 'p1',
    });
    const before = s;
    s = reduce(s, { type: 'endTurn', pid: 'p0' });
    expect(s).toBe(before);
    expect(legalActions(s, 'p0')).toHaveLength(0);
  });
});
