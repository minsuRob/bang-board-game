import { describe, expect, it } from 'vitest';

import { hpRows } from './hp-rows';

describe('hpRows', () => {
  it('5 이하는 한 줄', () => {
    expect(hpRows(4)).toEqual([4]);
    expect(hpRows(5)).toEqual([5]);
  });

  it('5를 넘으면 5개씩 끊는다', () => {
    expect(hpRows(6)).toEqual([5, 1]);
    expect(hpRows(10)).toEqual([5, 5]);
  });

  it('0 이하는 비어 있다', () => {
    expect(hpRows(0)).toEqual([]);
  });
});
