import { describe, expect, it } from 'vitest';

import { legalActions } from '../legal';
import { defaultAction, reduce } from '../reducer';
import { handCard, logged, p, scenario, totalCards } from './helpers';
import type { GameState } from '../types';

const playCard = (s: GameState, pid: string, kind: Parameters<typeof handCard>[2], target?: string) =>
  reduce(s, { type: 'playCard', pid, card: handCard(s, pid, kind), target });

const pass = (s: GameState, pid: string) =>
  reduce(s, { type: 'respond', pid, choice: { c: 'pass' } });

const pick = (s: GameState, pid: string, card: string) =>
  reduce(s, { type: 'respond', pid, choice: { c: 'card', card } });

describe('기관총', () => {
  it('자신을 제외한 전원에게 뱅!을 쏜다', () => {
    const s0 = scenario({
      players: [{ hand: ['gatling'] }, { hp: 4 }, { hp: 4 }, { hp: 4 }],
    });
    const s = playCard(s0, 'p0', 'gatling');
    expect(p(s, 'p0').hp).toBe(p(s0, 'p0').hp);
    expect([p(s, 'p1').hp, p(s, 'p2').hp, p(s, 'p3').hp]).toEqual([3, 3, 3]);
  });

  it('거리를 무시한다', () => {
    const s0 = scenario({
      players: [{ hand: ['gatling'] }, { hp: 4 }, { hp: 4 }, { hp: 4 }, { hp: 4 }, { hp: 4 }, { hp: 4 }],
    });
    const s = playCard(s0, 'p0', 'gatling');
    expect(s.players.slice(1).every((x) => x.hp === 3)).toBe(true);
  });

  it('빗나감으로 막을 수 있다', () => {
    const s0 = scenario({
      players: [{ hand: ['gatling'] }, { hand: ['missed'], hp: 4 }, { hp: 4 }, { hp: 4 }],
    });
    let s = playCard(s0, 'p0', 'gatling');
    expect(s.awaiting).toMatchObject({ k: 'missed', pid: 'p1' });
    s = pick(s, 'p1', p(s, 'p1').hand[0]);
    expect(p(s, 'p1').hp).toBe(4);
    expect(p(s, 'p2').hp).toBe(3);
  });

  it('술통 판정도 정상 작동한다 (v0.4)', () => {
    const s0 = scenario({
      players: [{ hand: ['gatling'] }, { equipment: ['barrel'], hp: 4 }, { hp: 4 }, { hp: 4 }],
      deckTop: [{ kind: 'beer', suit: 'hearts' }],
    });
    const s = playCard(s0, 'p0', 'gatling');
    expect(p(s, 'p1').hp).toBe(4);
    expect(p(s, 'p2').hp).toBe(3);
  });

  it('슬랩 더 킬러라도 기관총은 빗나감 한 장으로 막힌다', () => {
    const s0 = scenario({
      players: [
        { character: 'slabTheKiller', hand: ['gatling'] },
        { hand: ['missed'], hp: 4 },
        { hp: 4 },
        { hp: 4 },
      ],
    });
    const s = playCard(s0, 'p0', 'gatling');
    expect(s.awaiting).toMatchObject({ k: 'missed', remaining: 1 });
  });

  it('뱅! 횟수를 소비하지 않는다', () => {
    const s0 = scenario({
      players: [{ hand: ['gatling', 'bang'] }, { hp: 4 }, { hp: 4 }, { hp: 4 }],
    });
    let s = playCard(s0, 'p0', 'gatling');
    expect(s.turn.bangsPlayed).toBe(0);
    s = playCard(s, 'p0', 'bang', 'p1');
    expect(logged(s, 'rejected')).toBe(false);
    expect(p(s, 'p1').hp).toBe(2);
  });
});

describe('인디언!', () => {
  it('뱅!을 버리거나 목숨을 잃는다', () => {
    const s0 = scenario({
      players: [{ hand: ['indians'] }, { hand: ['bang'], hp: 4 }, { hp: 4 }, { hp: 4 }],
    });
    let s = playCard(s0, 'p0', 'indians');
    expect(s.awaiting).toMatchObject({ k: 'indiansBang', pid: 'p1' });
    s = pick(s, 'p1', p(s, 'p1').hand[0]);
    expect(p(s, 'p1').hp).toBe(4);
    expect(p(s, 'p2').hp).toBe(3);
    expect(p(s, 'p3').hp).toBe(3);
    expect(p(s, 'p0').hp).toBe(p(s0, 'p0').hp);
  });

  it('빗나감으로는 막지 못한다', () => {
    const s0 = scenario({
      players: [{ hand: ['indians'] }, { hand: ['missed'], hp: 4 }, { hp: 4 }, { hp: 4 }],
    });
    const s = playCard(s0, 'p0', 'indians');
    // 빗나감뿐이면 물어보지도 않고 피해
    expect(p(s, 'p1').hp).toBe(3);
    expect(p(s, 'p1').hand).toHaveLength(1);
  });

  it('술통은 통하지 않는다', () => {
    const s0 = scenario({
      players: [{ hand: ['indians'] }, { equipment: ['barrel'], hp: 4 }, { hp: 4 }, { hp: 4 }],
      deckTop: [{ kind: 'beer', suit: 'hearts' }],
    });
    const s = playCard(s0, 'p0', 'indians');
    expect(p(s, 'p1').hp).toBe(3);
  });

  it('칼라미티 자넷은 빗나감을 뱅!으로 내서 막는다', () => {
    const s0 = scenario({
      players: [
        { hand: ['indians'] },
        { character: 'calamityJanet', hand: ['missed'], hp: 4 },
        { hp: 4 },
        { hp: 4 },
      ],
    });
    let s = playCard(s0, 'p0', 'indians');
    expect(s.awaiting).toMatchObject({ k: 'indiansBang', pid: 'p1' });
    s = pick(s, 'p1', p(s, 'p1').hand[0]);
    expect(p(s, 'p1').hp).toBe(4);
  });

  it('한 명이 포기해도 나머지 순서가 이어진다 (v0.254 / v0.418)', () => {
    const s0 = scenario({
      players: [
        { hand: ['indians'] },
        { hand: ['bang'], hp: 4 },
        { hand: ['bang'], hp: 4 },
        { hp: 4 },
      ],
    });
    let s = playCard(s0, 'p0', 'indians');
    s = pass(s, 'p1');
    expect(p(s, 'p1').hp).toBe(3);
    expect(s.awaiting).toMatchObject({ k: 'indiansBang', pid: 'p2' });
    s = pick(s, 'p2', p(s, 'p2').hand[0]);
    expect(p(s, 'p2').hp).toBe(4);
    expect(p(s, 'p3').hp).toBe(3);
    expect(s.awaiting).toBeNull();
  });
});

describe('잡화점', () => {
  it('생존자 수만큼 펼치고 사용자부터 한 장씩 고른다 (v0.275)', () => {
    const s0 = scenario({
      players: [{ hand: ['generalStore'] }, {}, {}, { alive: false }],
    });
    let s = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'generalStore') });
    expect(s.awaiting).toMatchObject({ k: 'generalStore', pid: 'p0' });
    const revealed = s.awaiting!.k === 'generalStore' ? s.awaiting!.options : [];
    expect(revealed).toHaveLength(3);

    s = pick(s, 'p0', revealed[0]);
    expect(s.awaiting).toMatchObject({ pid: 'p1', options: expect.any(Array) });
    s = pick(s, 'p1', p(s, 'p1').hand.length ? revealed[1] : revealed[1]);
    s = pick(s, 'p2', revealed[2]);

    expect(s.awaiting).toBeNull();
    expect(p(s, 'p0').hand).toContain(revealed[0]);
    expect(p(s, 'p1').hand).toContain(revealed[1]);
    expect(p(s, 'p2').hand).toContain(revealed[2]);
    expect(totalCards(s)).toBe(80);
  });
});

describe('결투', () => {
  it('지목당한 쪽부터 번갈아 뱅!을 내고, 먼저 못 내는 쪽이 목숨을 잃는다', () => {
    const s0 = scenario({
      players: [{ hand: ['duel', 'bang'], hp: 4 }, { hand: ['bang'], hp: 4 }, {}, {}],
    });
    let s = playCard(s0, 'p0', 'duel', 'p1');
    expect(s.awaiting).toMatchObject({ k: 'duelBang', pid: 'p1' });

    s = pick(s, 'p1', p(s, 'p1').hand[0]);
    expect(s.awaiting).toMatchObject({ k: 'duelBang', pid: 'p0' });

    s = pick(s, 'p0', p(s, 'p0').hand[0]);
    // p1 은 더 낼 뱅!이 없다
    expect(p(s, 'p1').hp).toBe(3);
    expect(p(s, 'p0').hp).toBe(4);
  });

  it('지목당한 쪽이 곧바로 못 내면 그쪽이 잃는다', () => {
    const s0 = scenario({
      players: [{ hand: ['duel'], hp: 4 }, { hp: 4 }, {}, {}],
    });
    const s = playCard(s0, 'p0', 'duel', 'p1');
    expect(p(s, 'p1').hp).toBe(3);
  });

  it('거리를 무시하고 아무나 지목할 수 있다', () => {
    const s0 = scenario({
      players: [{ hand: ['duel'], hp: 4 }, {}, {}, { hp: 4 }, {}, {}, {}],
    });
    const s = playCard(s0, 'p0', 'duel', 'p3');
    expect(logged(s, 'rejected')).toBe(false);
    expect(p(s, 'p3').hp).toBe(3);
  });

  it('결투에 쓰는 뱅!은 차례당 횟수 제한과 무관하다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang', 'duel'], hp: 4 }, { hand: ['bang', 'bang'], hp: 4 }, {}, {}],
    });
    let s = playCard(s0, 'p0', 'bang', 'p1');
    expect(s.turn.bangsPlayed).toBe(1);
    s = playCard(s, 'p0', 'duel', 'p1');
    expect(s.awaiting).toMatchObject({ k: 'duelBang', pid: 'p1' });
    s = pick(s, 'p1', p(s, 'p1').hand[0]);
    // p0 은 뱅!이 없어 진다
    expect(p(s, 'p0').hp).toBe(3);
  });

  it('설교 중에도 결투 응수는 막히지 않는다 (edge-cases 쟁점 B)', () => {
    const s0 = scenario({
      players: [{ hand: ['duel', 'bang'], hp: 4 }, { hand: ['bang'], hp: 4 }, {}, {}],
      event: 'theSermon',
    });
    let s = playCard(s0, 'p0', 'duel', 'p1');
    s = pick(s, 'p1', p(s, 'p1').hand[0]);
    // 설교 중이지만 결투를 건 p0 도 뱅!을 낼 수 있다
    expect(s.awaiting).toMatchObject({ k: 'duelBang', pid: 'p0' });
    const opts = s.awaiting!.k === 'duelBang' ? s.awaiting!.options : [];
    expect(opts).toHaveLength(1);
  });

  it('설교 중에는 자기 차례에 뱅! 카드를 낼 수 없다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, {}, {}, {}],
      event: 'theSermon',
    });
    const s = playCard(s0, 'p0', 'bang', 'p1');
    expect(logged(s, 'rejected')).toBe(true);
  });
});

describe('강탈과 캣 벌로우', () => {
  it('강탈은 거리 1 이내에서 카드를 가져온다', () => {
    const s0 = scenario({
      players: [{ hand: ['panic'] }, { hand: ['beer'] }, {}, {}],
    });
    let s = playCard(s0, 'p0', 'panic', 'p1');
    expect(s.awaiting).toMatchObject({ k: 'stealCard', pid: 'p0', target: 'p1', handCount: 1 });
    s = reduce(s, {
      type: 'respond',
      pid: 'p0',
      choice: { c: 'pick', pick: { zone: 'hand', index: 0 } },
    });
    expect(p(s, 'p0').hand).toHaveLength(1);
    expect(p(s, 'p1').hand).toHaveLength(0);
  });

  it('강탈은 무기 사정거리를 무시한다 (거리 2는 안 된다)', () => {
    const s0 = scenario({
      players: [{ hand: ['panic'], equipment: ['winchester'] }, {}, { hand: ['beer'] }, {}, {}],
    });
    const s = playCard(s0, 'p0', 'panic', 'p2');
    expect(logged(s, 'rejected')).toBe(true);
  });

  it('캣 벌로우는 거리와 무관하게 카드를 버리게 한다', () => {
    const s0 = scenario({
      players: [{ hand: ['catBalou'] }, {}, {}, { hand: ['beer'] }, {}, {}, {}],
    });
    let s = playCard(s0, 'p0', 'catBalou', 'p3');
    s = reduce(s, {
      type: 'respond',
      pid: 'p0',
      choice: { c: 'pick', pick: { zone: 'hand', index: 0 } },
    });
    expect(p(s, 'p3').hand).toHaveLength(0);
    expect(p(s, 'p0').hand).toHaveLength(0);
    expect(s.discard.length).toBeGreaterThan(0);
  });

  it('앞에 놓인 파랑 카드도 대상이 된다', () => {
    const s0 = scenario({
      players: [{ hand: ['catBalou'] }, { equipment: ['barrel'] }, {}, {}],
    });
    const barrel = p(s0, 'p1').equipment[0];
    let s = playCard(s0, 'p0', 'catBalou', 'p1');
    s = reduce(s, {
      type: 'respond',
      pid: 'p0',
      choice: { c: 'pick', pick: { zone: 'equipment', card: barrel } },
    });
    expect(p(s, 'p1').equipment).toHaveLength(0);
    expect(s.discard).toContain(barrel);
  });

  it('자기 앞의 다이너마이트는 스스로 치울 수 있다 (edge-cases 쟁점 I)', () => {
    const s0 = scenario({
      players: [{ hand: ['catBalou'], equipment: ['dynamite'] }, {}, {}, {}],
    });
    const dyn = p(s0, 'p0').equipment[0];
    let s = playCard(s0, 'p0', 'catBalou', 'p0');
    s = reduce(s, {
      type: 'respond',
      pid: 'p0',
      choice: { c: 'pick', pick: { zone: 'equipment', card: dyn } },
    });
    expect(p(s, 'p0').equipment).toHaveLength(0);
  });

  // 기본판 룰 기호 설명: 강탈 "you can draw a random card from his hand",
  // 캣 벌로우 "discard a random card from his hand". 손패 순서는 받은 순서라(잡화점에서 고른 카드는 맨 끝)
  // 번호로 고르면 공개된 카드를 노릴 수 있다. 번호와 상관없이 시드 RNG 로 뽑는다.
  it('손패에서는 고른 번호와 상관없이 무작위로 뽑는다', () => {
    for (const kind of ['panic', 'catBalou'] as const) {
      const taken = new Set<string>();
      for (let seed = 1; seed <= 12; seed++) {
        const s0 = scenario({
          seed,
          players: [{ hand: [kind] }, { hand: ['beer', 'bang', 'missed', 'saloon'] }, {}, {}],
        });
        const last = p(s0, 'p1').hand.length - 1;
        let s = playCard(s0, 'p0', kind, 'p1');
        s = reduce(s, { type: 'respond', pid: 'p0', choice: { c: 'pick', pick: { zone: 'hand', index: last } } });
        const gone = p(s0, 'p1').hand.filter((c) => !p(s, 'p1').hand.includes(c));
        expect(gone).toHaveLength(1);
        taken.add(gone[0]);
      }
      expect(taken.size).toBeGreaterThan(1);
    }
  });

  // 결정 I 는 자기 앞의 카드를 치우는 것만 허용한다. 자기 손패를 버리는 것은 자발적 버리기다:
  // 기본판 FAQ Q12 "Can I voluntarily discard my cards?" "No, neither cards from your hand nor cards in play"
  it('자기 자신에게 쓰면 손패는 고를 수 없고 앞의 카드만 고른다', () => {
    for (const kind of ['catBalou', 'panic'] as const) {
      const s0 = scenario({
        players: [{ hand: [kind, 'beer', 'bang'], equipment: ['dynamite'] }, {}, {}, {}],
      });
      const s = playCard(s0, 'p0', kind, 'p0');
      expect(s.awaiting).toMatchObject({ k: 'stealCard', pid: 'p0', target: 'p0', handCount: 0 });
      const picks = legalActions(s, 'p0');
      expect(picks.length).toBeGreaterThan(0);
      expect(
        picks.every((a) => a.type === 'respond' && a.choice.c === 'pick' && a.choice.pick.zone === 'equipment'),
      ).toBe(true);
      // 시간이 지나 대신 고를 때도 손패를 버리지 않는다
      const timeout = reduce(s, defaultAction(s, 'p0')!);
      expect(p(timeout, 'p0').equipment).toHaveLength(0);
      expect(p(timeout, 'p0').hand).toEqual(expect.arrayContaining(p(s, 'p0').hand));
      expect(p(timeout, 'p0').hand).toHaveLength(kind === 'panic' ? 3 : 2);
    }
  });
});
