import { describe, expect, it } from 'vitest';

import { eventDeckNote, eventProgress } from './event-progress';

describe('eventProgress', () => {
  it('공개 전에는 15장이 남는다', () => {
    expect(eventProgress({ deck: [], current: null, past: [] })).toEqual({ past: [], remaining: 15 });
  });

  it('현재 이벤트와 지난 이벤트를 빼고 센다 (뷰의 덱은 비어 있다)', () => {
    const p = eventProgress({ deck: [], current: 'curse', past: ['blessing', 'thirst'] });
    expect(p.past).toEqual(['blessing', 'thirst']);
    expect(p.remaining).toBe(12);
  });

  it('마지막 하이 눈이 공개되면 0장이다', () => {
    const past = ['blessing', 'curse', 'ghostTown', 'goldRush', 'hangover', 'shootout', 'theDaltons',
      'theDoctor', 'theReverend', 'theSermon', 'trainArrival', 'thirst', 'newIdentity', 'handcuffs'] as const;
    expect(eventProgress({ deck: [], current: 'highNoon', past: [...past] }).remaining).toBe(0);
  });
});

describe('eventDeckNote', () => {
  it('그 판 덱의 마지막 카드를 적는다', () => {
    expect(eventDeckNote(['highnoon'])).toBe('마지막은 하이 눈');
    expect(eventDeckNote(['fistful'])).toBe('마지막은 한줌의 카드');
  });

  it('와일드 웨스트 쇼는 역마차·웰스 파고를 낼 때 열린다고 알린다', () => {
    expect(eventDeckNote(['wildwestshow'])).toBe('마지막은 와일드 웨스트 쇼 · 역마차·웰스 파고를 내면 다음 장이 열린다');
  });
});
