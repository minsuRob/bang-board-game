import { describe, expect, it } from 'vitest';

import { resolveLang } from '../resolve';

const loc = (...codes: (string | null)[]) => codes.map((languageCode) => ({ languageCode }));

describe('resolveLang', () => {
  it('시스템이면 첫 번째 선호 언어를 따른다', () => {
    expect(resolveLang('system', loc('ko'))).toBe('ko');
    expect(resolveLang('system', loc('it'))).toBe('it');
    expect(resolveLang('system', loc('en'))).toBe('en');
  });
  it('ko·it 가 아니면 en', () => {
    expect(resolveLang('system', loc('fr'))).toBe('en');
    expect(resolveLang('system', loc('ja'))).toBe('en');
    expect(resolveLang('system', loc(null))).toBe('en');
  });
  it('목록이 비면 en', () => {
    expect(resolveLang('system', [])).toBe('en');
  });
  it('첫 번째만 본다', () => {
    expect(resolveLang('system', loc('fr', 'ko'))).toBe('en');
  });
  it('직접 고른 값이 우선이다', () => {
    expect(resolveLang('it', loc('ko'))).toBe('it');
    expect(resolveLang('ko', [])).toBe('ko');
  });
});
