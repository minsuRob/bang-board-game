import { describe, expect, it } from 'vitest';

import { glowingSeat } from './glowing-seat';

const turn = { active: 'p1' } as never;

describe('glowingSeat', () => {
  it('평소에는 차례 주인', () => {
    expect(glowingSeat({ turn, awaiting: null })).toBe('p1');
  });

  it('잡화점에서 고르는 동안은 고르는 사람', () => {
    expect(glowingSeat({ turn, awaiting: { k: 'generalStore', pid: 'p3', options: [] } })).toBe('p3');
  });

  it('빗나감! 응답 같은 다른 대기에는 옮기지 않는다', () => {
    expect(
      glowingSeat({ turn, awaiting: { k: 'missed', pid: 'p2', source: 'p1', remaining: 1, options: [] } }),
    ).toBe('p1');
  });
});
