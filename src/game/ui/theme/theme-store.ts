/**
 * 화면 테마 고르기: 시스템 / 라이트 / 다크.
 *
 * 웹은 localStorage 를 바로 읽어 첫 화면부터 고른 테마로 그린다 (+html.tsx 도 같은 키를 읽는다).
 * 앱은 AsyncStorage 에 두고, 읽어 오는 동안 잠깐 기본값(시스템)으로 그린다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore } from 'zustand/vanilla';

export type ThemePref = 'system' | 'light' | 'dark';

export const THEME_KEY = 'bang.ui.theme';

const isPref = (v: unknown): v is ThemePref => v === 'system' || v === 'light' || v === 'dark';

function webStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function loadSync(): ThemePref {
  try {
    const v = webStorage()?.getItem(THEME_KEY);
    return isPref(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export const themePref = createStore<{ pref: ThemePref }>(() => ({ pref: loadSync() }));

if (!webStorage()) {
  AsyncStorage.getItem(THEME_KEY)
    .then((v) => {
      if (isPref(v)) themePref.setState({ pref: v });
    })
    .catch(() => {});
}

export function setThemePref(pref: ThemePref) {
  themePref.setState({ pref });
  const web = webStorage();
  if (web) {
    try {
      web.setItem(THEME_KEY, pref);
    } catch {
      /* 저장을 못 해도 이번 실행 동안은 바뀐다 */
    }
  } else {
    AsyncStorage.setItem(THEME_KEY, pref).catch(() => {});
  }
}
