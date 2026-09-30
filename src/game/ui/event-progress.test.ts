import { describe, expect, it } from 'vitest';

import { eventProgress } from './event-progress';

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
