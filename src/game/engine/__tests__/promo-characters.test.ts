/**
 * 하이 눈 프로모 캐릭터 — 엉클 윌 · 조니 키시.
 * (docs/edge-cases.md EC-119, EC-120)
 */

import { describe, expect, it } from 'vitest';

import { charactersFor } from '../../data/characters';
import { UNCLE_WILL_ABILITY } from '../../modifiers';
import { kindOf } from '../cards';
import { legalActions } from '../legal';
import { reduce } from '../reducer';
import { createGame } from '../setup';
import type { Action, GameState } from '../types';
import { beginTurn, handCard, logged, p, scenario, totalCards } from './helpers';

/** 잡화점이 열려 있으면 모두 첫 번째 카드를 집어 끝낸다 */
function finishStore(state: GameState): GameState {
  let s = state;
  while (s.awaiting?.k === 'generalStore') {
    const a = s.awaiting;
    s = reduce(s, { type: 'respond', pid: a.pid, choice: { c: 'card', card: a.options[0] } });
  }
  return s;
}

const storeAs = (s: GameState, pid: string, kind: Parameters<typeof handCard>[2]): Action => ({
  type: 'playCard',
  pid,
  card: handCard(s, pid, kind),
  as: 'generalStore',
});

const storePlays = (s: GameState, pid: string) =>
  legalActions(s, pid).filter(
    (a) => a.type === 'playCard' && a.as === 'generalStore' && kindOf(a.card) !== 'generalStore',
  );

// ---------------------------------------------------------------------------

describe('엉클 윌', () => {
  const will = (hand: Parameters<typeof scenario>[0]['players'][number]['hand']) =>
    scenario({ players: [{ character: 'uncleWill', hand }, {}, {}, {}] });

  it('손의 어떤 카드든 대상 없이 잡화점으로 낼 수 있다 (파랑 카드 포함)', () => {
    const s = will(['bang', 'missed', 'beer', 'barrel', 'jail']);
    const kinds = storePlays(s, 'p0').map((a) => a.type === 'playCard' && kindOf(a.card));
    expect(kinds.sort()).toEqual(['bang', 'barrel', 'beer', 'jail', 'missed']);
    for (const a of storePlays(s, 'p0')) expect(a.type === 'playCard' && a.target).toBeFalsy();
  });

  it('진짜 잡화점 카드는 평소처럼 한 가지로만 낸다', () => {
    const s = will(['generalStore']);
    const plays = legalActions(s, 'p0').filter((a) => a.type === 'playCard');
    expect(plays).toHaveLength(1);
    expect(plays[0].type === 'playCard' && plays[0].as).toBeUndefined();
  });

  it('빗나감!을 잡화점으로 내면 버려지고, 생존자 수만큼 펼쳐진다', () => {
    const s0 = will(['missed', 'bang']);
    const missed = handCard(s0, 'p0', 'missed');
    const s1 = reduce(s0, storeAs(s0, 'p0', 'missed'));
    expect(s1.discard).toContain(missed);
    expect(s1.awaiting?.k).toBe('generalStore');
    expect(s1.awaiting?.k === 'generalStore' && s1.awaiting.options).toHaveLength(4);
    expect(s1.turn.bangsPlayed).toBe(0);
    const ev = s1.log.find((e) => e.t === 'playCard');
    expect(ev?.as).toBe('generalStore');
    expect(ev?.msg).toMatchObject({ k: 'played', as: 'generalStore' });

    const s2 = finishStore(s1);
    expect(p(s2, 'p0').usedThisTurn).toContain(UNCLE_WILL_ABILITY);
    expect(totalCards(s2)).toBe(80);
  });

  it('차례당 한 번이다. 진짜 잡화점과 뱅!은 그 뒤에도 낼 수 있고, 다음 차례엔 다시 열린다', () => {
    const s0 = will(['missed', 'generalStore', 'bang', 'beer']);
    const s1 = finishStore(reduce(s0, storeAs(s0, 'p0', 'missed')));
    expect(storePlays(s1, 'p0')).toHaveLength(0);
    const legal = legalActions(s1, 'p0');
    expect(legal.some((a) => a.type === 'playCard' && kindOf(a.card) === 'generalStore')).toBe(true);
    expect(legal.some((a) => a.type === 'playCard' && kindOf(a.card) === 'bang')).toBe(true);

    // 두 번째 능력 사용은 거부된다
    const s2 = reduce(s1, storeAs(s1, 'p0', 'beer'));
    expect(logged(s2, 'rejected')).toBe(true);

    const s3 = beginTurn({ ...s1, stack: [] }, 'p0');
    expect(p(s3, 'p0').usedThisTurn).toEqual([]);
  });

  it('숙취 아래에서는 쓸 수 없다', () => {
    const s = scenario({
      players: [{ character: 'uncleWill', hand: ['bang', 'missed'] }, {}, {}, {}],
      event: 'hangover',
    });
    expect(storePlays(s, 'p0')).toHaveLength(0);
  });

  it('수갑은 실제 카드의 무늬로 판정한다', () => {
    const s0 = scenario({
      players: [
        {
          character: 'uncleWill',
          hand: [
            { kind: 'missed', suit: 'clubs' },
            { kind: 'beer', suit: 'hearts' },
          ],
        },
        {},
        {},
        {},
      ],
      event: 'handcuffs',
    });
    const s = { ...s0, turn: { ...s0.turn, handcuffsSuit: 'hearts' as const } };
    const kinds = storePlays(s, 'p0').map((a) => a.type === 'playCard' && kindOf(a.card));
    expect(kinds).toEqual(['beer']);
  });

  it('설교 아래에서도 뱅!을, 목사 아래에서도 맥주를 잡화점으로 낼 수 있다', () => {
    const sermon = scenario({
      players: [{ character: 'uncleWill', hand: ['bang'] }, {}, {}, {}],
      event: 'theSermon',
    });
    expect(storePlays(sermon, 'p0')).toHaveLength(1);
    const reverend = scenario({
      players: [{ character: 'uncleWill', hand: ['beer'], hp: 2 }, {}, {}, {}],
      event: 'theReverend',
    });
    expect(storePlays(reverend, 'p0')).toHaveLength(1);
  });

  it('다른 캐릭터에게는 이 선택지가 없다', () => {
    const s = scenario({ players: [{ hand: ['bang', 'missed', 'beer'] }, {}, {}, {}] });
    expect(storePlays(s, 'p0')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------

describe('조니 키시', () => {
  it('술통을 장착하면 남 앞의 술통이 버려진다', () => {
    const s0 = scenario({
      players: [{ character: 'johnnyKisch', hand: ['barrel'] }, { equipment: ['barrel'] }, {}, {}],
    });
    const other = p(s0, 'p1').equipment[0];
    const mine = handCard(s0, 'p0', 'barrel');
    const s = reduce(s0, { type: 'playCard', pid: 'p0', card: mine });
    expect(p(s, 'p0').equipment).toEqual([mine]);
    expect(p(s, 'p1').equipment).toEqual([]);
    expect(s.discard).toContain(other);
    expect(logged(s, 'discardSameName')).toBe(true);
    expect(totalCards(s)).toBe(80);
  });

  it('스코필드로 바꿔 들면 자기 볼캐닉은 원래대로 버려지고, 남의 스코필드는 모두 버려진다', () => {
    const s0 = scenario({
      players: [
        { character: 'johnnyKisch', hand: ['schofield'], equipment: ['volcanic'] },
        { equipment: ['schofield'] },
        {},
        { equipment: ['schofield'] },
      ],
    });
    const mine = handCard(s0, 'p0', 'schofield');
    const s = reduce(s0, { type: 'playCard', pid: 'p0', card: mine });
    expect(p(s, 'p0').equipment).toEqual([mine]);
    expect(p(s, 'p1').equipment).toEqual([]);
    expect(p(s, 'p3').equipment).toEqual([]);
    expect(totalCards(s)).toBe(80);
  });

  it('남에게 감옥을 걸면 다른 사람 앞의 감옥이 버려진다', () => {
    const s0 = scenario({
      players: [{ character: 'johnnyKisch', hand: ['jail'] }, {}, {}, { equipment: ['jail'] }],
    });
    const jail = handCard(s0, 'p0', 'jail');
    const s = reduce(s0, { type: 'playCard', pid: 'p0', card: jail, target: 'p2' });
    expect(p(s, 'p2').equipment).toEqual([jail]);
    expect(p(s, 'p3').equipment).toEqual([]);
  });

  it('남이 같은 카드를 장착할 때는 아무 일도 없다', () => {
    const s0 = scenario({
      players: [{ hand: ['barrel'] }, { character: 'johnnyKisch', equipment: ['barrel'] }, {}, {}],
    });
    const s = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'barrel') });
    expect(p(s, 'p1').equipment).toHaveLength(1);
    expect(logged(s, 'discardSameName')).toBe(false);
  });

  it('숙취 아래에서는 발동하지 않는다', () => {
    const s0 = scenario({
      players: [{ character: 'johnnyKisch', hand: ['mustang'] }, { equipment: ['mustang'] }, {}, {}],
      event: 'hangover',
    });
    const s = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'mustang') });
    expect(p(s, 'p1').equipment).toHaveLength(1);
  });

  it('겹치는 카드가 없으면 로그도 없고 카드 사용 단계가 이어진다', () => {
    const s0 = scenario({
      players: [{ character: 'johnnyKisch', hand: ['scope', 'bang'] }, {}, {}, {}],
    });
    const s = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'scope') });
    expect(logged(s, 'discardSameName')).toBe(false);
    expect(s.stack[s.stack.length - 1]).toEqual({ k: 'playPhase', pid: 'p0' });
  });

  it('상태가 JSON 으로 왕복된다', () => {
    const s0 = scenario({
      players: [{ character: 'johnnyKisch', hand: ['barrel'] }, { equipment: ['barrel'] }, {}, {}],
    });
    const s = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'barrel') });
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

// ---------------------------------------------------------------------------

describe('프로모 캐릭터의 드래프트', () => {
  const seats = Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  const offered = (expansions: ('highnoon')[]) => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const s = createGame(seed, { playerCount: 7, expansions }, seats);
      for (const list of Object.values(s.draft!.offers)) list.forEach((c) => seen.add(c));
    }
    return seen;
  };

  it('기본판에서는 나오지 않는다', () => {
    const seen = offered([]);
    expect(seen.has('uncleWill')).toBe(false);
    expect(seen.has('johnnyKisch')).toBe(false);
    expect(charactersFor([])).toHaveLength(16);
  });

  it('하이 눈을 켜면 후보에 나온다', () => {
    const seen = offered(['highnoon']);
    expect(seen.has('uncleWill')).toBe(true);
    expect(seen.has('johnnyKisch')).toBe(true);
    expect(charactersFor(['highnoon'])).toHaveLength(18);
  });
});
