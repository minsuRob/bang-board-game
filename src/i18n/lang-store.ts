/**
 * 화면 언어 고르기: 시스템 / 한국어 / English / Italiano.
 *
 * theme-store.ts 와 같은 방식이다. 웹은 localStorage 를 바로 읽어 첫 화면부터 고른 언어로 그린다
 * (+html.tsx 도 같은 키를 읽는다). 앱은 AsyncStorage 에 두고, 읽어 오는 동안은 기본값(시스템)으로 그린다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore } from 'zustand/vanilla';

import type { LangPref } from './types';

export const LANG_KEY = 'bang.ui.lang';

const isPref = (v: unknown): v is LangPref => v === 'system' || v === 'ko' || v === 'en' || v === 'it';

function webStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function loadSync(): LangPref {
  try {
    const v = webStorage()?.getItem(LANG_KEY);
    return isPref(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export const langPref = createStore<{ pref: LangPref }>(() => ({ pref: loadSync() }));

if (!webStorage()) {
  AsyncStorage.getItem(LANG_KEY)
    .then((v) => {
      if (isPref(v)) langPref.setState({ pref: v });
    })
    .catch(() => {});
}

export function setLangPref(pref: LangPref) {
  langPref.setState({ pref });
  const web = webStorage();
  if (web) {
    try {
      web.setItem(LANG_KEY, pref);
    } catch {
      /* 저장을 못 해도 이번 실행 동안은 바뀐다 */
    }
  } else {
    AsyncStorage.setItem(LANG_KEY, pref).catch(() => {});
  }
}
