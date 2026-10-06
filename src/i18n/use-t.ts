import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useLocales, getLocales } from 'expo-localization';
import { useStore } from 'zustand';

import { langPref } from './lang-store';
import { en } from './messages/en';
import { it } from './messages/it';
import { ko } from './messages/ko';
import { resolveLang } from './resolve';
import type { Messages } from './types-messages';
import type { Lang } from './types';

const DICTS: Record<Lang, Messages> = { ko, en, it };

/** 지금 화면 언어. 고른 값과 기기 언어가 바뀌면 다시 그린다 */
export function useLang(): Lang {
  const pref = useStore(langPref, (s) => s.pref);
  const locales = useLocales();
  return resolveLang(pref, locales);
}

/** 컴포넌트에서 쓰는 사전: `const t = useT(); t.settings.title` */
export function useT(): Messages {
  return DICTS[useLang()];
}

/** React 밖(스토어·오류 처리)에서 쓰는 사전 */
export function getLang(): Lang {
  return resolveLang(langPref.getState().pref, getLocales());
}

export function getT(): Messages {
  return DICTS[getLang()];
}

export function dictFor(lang: Lang): Messages {
  return DICTS[lang];
}

/** 웹에서 <html lang> 을 지금 화면 언어에 맞춘다. 루트 레이아웃에서 한 번 부른다 */
export function useDocumentLang() {
  const lang = useLang();
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);
}
