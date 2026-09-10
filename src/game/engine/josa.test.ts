import { describe, expect, it } from 'vitest';

import { eul, ga, hasFinalConsonant, neun, ro, wa } from './josa';

describe('한국어 조사', () => {
  it('받침 유무를 가린다', () => {
    expect(hasFinalConsonant('보안관')).toBe(true);
    expect(hasFinalConsonant('나')).toBe(false);
    expect(hasFinalConsonant('현상금꾼')).toBe(true);
    expect(hasFinalConsonant('바텐더')).toBe(false);
  });

  it('숫자는 한국어 읽기로 판단한다', () => {
    expect(hasFinalConsonant('P0')).toBe(true); // 영
    expect(hasFinalConsonant('P2')).toBe(false); // 이
    expect(hasFinalConsonant('P7')).toBe(true); // 칠
  });

  it('이/가 를 고른다', () => {
    expect(ga('보안관')).toBe('보안관이');
    expect(ga('광부')).toBe('광부가');
  });

  it('1인칭 대명사는 말 자체가 바뀐다', () => {
    expect(ga('나')).toBe('내가');
    expect(ga('저')).toBe('제가');
  });

  it('을/를 을 고른다', () => {
    expect(eul('뱅!')).toBe('뱅!을');
    expect(eul('맥주')).toBe('맥주를');
  });

  it('은/는 을 고른다', () => {
    expect(neun('보안관')).toBe('보안관은');
    expect(neun('나')).toBe('나는');
  });

  it('과/와 와 으로/로 를 고른다', () => {
    expect(wa('보안관')).toBe('보안관과');
    expect(wa('나')).toBe('나와');
    expect(ro('보안관')).toBe('보안관으로');
    expect(ro('나')).toBe('나로');
    expect(ro('서울')).toBe('서울로'); // ㄹ 받침은 '로'
  });
});
