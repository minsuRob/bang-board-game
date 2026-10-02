import { describe, expect, it } from 'vitest';

import type { GameEvent } from '../engine';
import { HIDDEN_CARD } from '../engine/view';
import { pickSpotlight, revealedEventOf } from './spotlight-pick';

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
