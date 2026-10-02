import { describe, expect, it } from 'vitest';

import type { GameEvent, JudgementPurpose } from '../engine';
import { HIDDEN_CARD } from '../engine/view';
import { isGroupRevealEvent, isRevealEvent, isTakeEvent, pickSpotlight, pickSpotlights, revealedEventOf, takenCardOf } from './spotlight-pick';

const ev = (seq: number, t: string, card?: string): GameEvent => ({ t, card, seq, text: t });

describe('pickSpotlight', () => {
  it('새로 공개된 이벤트 카드를 가운데에 띄운다', () => {
    const log = [ev(1, 'playCard', 'bang-1'), ev(2, 'turnStart'), ev(2, 'event', 'blessing')];
    expect(pickSpotlight(log, 1)?.card).toBe('blessing');
  });

  it('같은 틱에 여럿이면 가장 나중 것', () => {
    const log = [ev(3, 'event', 'curse'), ev(3, 'playCard', 'beer-2')];
    expect(pickSpotlight(log, 2)?.card).toBe('beer-2');
  });

  it('이미 본 로그와 띄우지 않는 로그는 건너뛴다', () => {
    const log = [ev(1, 'event', 'blessing'), ev(2, 'turnStart'), ev(2, 'draw', 'bang-1')];
    expect(pickSpotlight(log, 1)).toBeNull();
    expect(pickSpotlight(log, 2)).toBeNull();
  });

  it('와일드 웨스트 쇼 · 한줌의 카드 이벤트도 띄운다', () => {
    expect(pickSpotlight([ev(2, 'event', 'gag')], 1)?.card).toBe('gag');
    expect(pickSpotlight([ev(2, 'event', 'ambush')], 1)?.card).toBe('ambush');
  });

  it('가려진 카드와 모르는 이벤트는 띄우지 않는다', () => {
    expect(pickSpotlight([ev(2, 'playCard', HIDDEN_CARD)], 1)).toBeNull();
    expect(pickSpotlight([ev(2, 'event', 'noSuchEvent')], 1)).toBeNull();
  });
});

describe('revealedEventOf', () => {
  it('이벤트 공개 로그만 카드 정의를 돌려준다', () => {
    expect(revealedEventOf(ev(1, 'event', 'highNoon'))?.isFinal).toBe(true);
    expect(revealedEventOf(ev(1, 'playCard', 'blessing'))).toBeNull();
  });
});

describe('남의 카드를 버리게·가져간 결과', () => {
  const take = (seq: number, t: string, card?: string): GameEvent => ({
    t,
    pid: 'p1',
    target: 'p0',
    card,
    seq,
    text: t,
  });

  it('손패에서 뽑은 캣 발루·강탈은 뒷면으로 띄운다', () => {
    for (const t of ['catBalou', 'panic']) {
      const e = pickSpotlight([take(2, t)], 1);
      expect(e?.t).toBe(t);
      expect(isTakeEvent(e!)).toBe(true);
      expect(takenCardOf(e!)).toBeNull();
    }
  });

  it('장비를 버리게 한 캣 발루·리코체는 그 카드를 띄운다', () => {
    expect(takenCardOf(pickSpotlight([take(2, 'catBalou', 'barrel-1')], 1)!)).toBe('barrel-1');
    expect(takenCardOf(pickSpotlight([take(2, 'ricochet', 'mustang-1')], 1)!)).toBe('mustang-1');
  });

  it('가려진 카드는 뒷면, 대상이 없으면 띄우지 않는다', () => {
    expect(takenCardOf(take(2, 'panic', HIDDEN_CARD))).toBeNull();
    expect(pickSpotlight([{ ...take(2, 'catBalou'), target: undefined }], 1)).toBeNull();
  });
});

describe('카드 펼치기 결과', () => {
  const judge = (seq: number, card: string, suit: 'hearts' | 'spades', purpose: JudgementPurpose): GameEvent => ({
    t: 'judgement',
    pid: 'p1',
    card,
    reveal: { suit, hit: suit === 'hearts', purpose },
    seq,
    text: 'judgement',
  });

  it('판정 로그를 띄운다', () => {
    const e = pickSpotlight([judge(2, 'beer-1', 'hearts', 'barrel')], 1);
    expect(e?.t).toBe('judgement');
    expect(isRevealEvent(e!)).toBe(true);
  });

  it('뱅! 뒤의 술통 판정은 뱅! 다음에 줄 선다', () => {
    const log = [ev(2, 'playCard', 'bang-1'), judge(2, 'beer-1', 'hearts', 'barrel'), ev(2, 'dodge')];
    expect(pickSpotlights(log, 1).map((e) => e.t)).toEqual(['playCard', 'judgement']);
  });

  it('차례 시작의 다이너마이트와 감옥 판정을 둘 다 띄운다', () => {
    const log = [ev(3, 'turnStart'), judge(3, 'bang-2', 'spades', 'dynamite'), judge(3, 'beer-3', 'hearts', 'jail')];
    expect(pickSpotlights(log, 2).map((e) => e.reveal?.purpose)).toEqual(['dynamite', 'jail']);
  });

  it('낸 카드보다 앞선 결과는 버리지만 판정은 남긴다', () => {
    const take = { ...ev(4, 'catBalou', 'bang-3'), target: 'p1' };
    const log = [take, judge(4, 'bang-2', 'spades', 'jail'), ev(4, 'playCard', 'beer-1')];
    expect(pickSpotlights(log, 3).map((e) => e.t)).toEqual(['judgement', 'playCard']);
  });

  it('이벤트 공개 → 헬레나 존테로 판정 → 바로 낸 카드까지 모두 띄운다', () => {
    const log = [ev(5, 'event', 'helenaZontero'), judge(5, 'beer-1', 'hearts', 'helenaZontero'), ev(5, 'playCard', 'bang-1')];
    expect(pickSpotlights(log, 4).map((e) => e.t)).toEqual(['judgement', 'playCard']);
  });

  it('포커 판돈 공개와 럼은 여러 장을 펼친 결과로 띄운다', () => {
    const poker: GameEvent = { t: 'pokerReveal', pid: 'p0', cards: ['bang-1', 'beer-1'], seq: 6, text: '' };
    const rhum: GameEvent = { t: 'rhum', pid: 'p0', cards: ['bang-1'], amount: 1, seq: 6, text: '' };
    expect(isGroupRevealEvent(poker)).toBe(true);
    expect(isGroupRevealEvent(rhum)).toBe(true);
    expect(isGroupRevealEvent({ ...poker, cards: ['bang-1', HIDDEN_CARD] })).toBe(false);
    expect(pickSpotlights([poker], 5)).toEqual([poker]);
  });
});
