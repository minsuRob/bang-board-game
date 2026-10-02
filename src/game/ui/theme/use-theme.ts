/**
 * 지금 테마의 색과 스타일을 읽는 훅.
 *
 * UI 파일은 `Colors` 대신 이것을 쓴다. 모듈을 읽을 때 한 번 만든 스타일은 테마가 바뀌어도
 * 그대로 남기 때문이다.
 *
 * ```ts
 * const useStyles = themedStyles((c) => ({ box: { backgroundColor: c.panel } }));
 * function Box() { const styles = useStyles(); ... }
 * ```
 */

import { StyleSheet, useColorScheme } from 'react-native';
import { useStore } from 'zustand';

import { themePref } from './theme-store';
import { Palettes, type Scheme, type ThemeColors } from '@/constants/theme';

/** 고른 테마를 기기 설정과 맞춰 라이트/다크 중 하나로 정한다 */
export function useScheme(): Scheme {
  const pref = useStore(themePref, (s) => s.pref);
  const system = useColorScheme();
  if (pref === 'light' || pref === 'dark') return pref;
  return system === 'dark' ? 'dark' : 'light';
}

export function useColors(): ThemeColors {
  return Palettes[useScheme()];
}

/** 테마별로 한 번씩만 StyleSheet 를 만들어 두고 지금 테마의 것을 돌려주는 훅을 만든다 */
export function themedStyles<T extends StyleSheet.NamedStyles<T>>(factory: (c: ThemeColors) => T): () => T {
  const cache: Partial<Record<Scheme, T>> = {};
  return function useThemedStyles() {
    const scheme = useScheme();
    return (cache[scheme] ??= StyleSheet.create(factory(Palettes[scheme])));
  };
}
