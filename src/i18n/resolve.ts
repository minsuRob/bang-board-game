import type { Lang, LangPref } from './types';

/**
 * 고른 언어와 기기 언어 목록으로 화면 언어를 정한다.
 * 직접 고른 값이 우선이고, 시스템이면 첫 번째 선호 언어가 ko·it 일 때만 그 언어, 그 밖은 en.
 */
export function resolveLang(pref: LangPref, locales: readonly { languageCode?: string | null }[]): Lang {
  if (pref !== 'system') return pref;
  const code = locales[0]?.languageCode?.toLowerCase();
  return code === 'ko' || code === 'it' ? code : 'en';
}
