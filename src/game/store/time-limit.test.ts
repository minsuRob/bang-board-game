import { describe, expect, it } from 'vitest';

import { TIME_LIMIT_MS, timeLimitMs } from './online-driver';

const at = (phase: string, event: string | null = null, awaiting: unknown = null) =>
  ({
    turn: { phase },
    event: event ? { current: event } : null,
    awaiting,
  }) as never;

describe('제한시간', () => {
  it('평소 내 차례는 60초', () => {
    expect(timeLimitMs(at('play'))).toBe(TIME_LIMIT_MS.play);
  });

  it('도로시 레이지 이벤트 중 내 차례는 120초', () => {
    expect(timeLimitMs(at('play', 'dorothyRage'))).toBe(120_000);
  });

  it('도로시 레이지 중이어도 반응·버리기는 그대로', () => {
    expect(timeLimitMs(at('play', 'dorothyRage', { k: 'missed' }))).toBe(TIME_LIMIT_MS.reaction);
    expect(timeLimitMs(at('discard', 'dorothyRage'))).toBe(TIME_LIMIT_MS.discard);
  });
});
