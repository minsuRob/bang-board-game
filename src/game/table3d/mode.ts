/**
 * 3D 테이블을 쓸지, 2D 로 돌아갈지.
 *
 * `?flat=1` 이거나 GL 컨텍스트를 못 만들면 2D 다. 2D 는 언제나 살아 있어야 한다.
 */

import { useLocalSearchParams } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

export type TableMode = '3d' | 'flat';

let glFailed = false;
const listeners = new Set<() => void>();

/** Canvas 가 터졌을 때. 이후로는 이 세션 내내 2D 다 */
export function markGlFailed() {
  if (glFailed) return;
  glFailed = true;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const read = () => glFailed;

export function useTableMode(): TableMode {
  const params = useLocalSearchParams<{ flat?: string }>();
  const failed = useSyncExternalStore(subscribe, read, read);
  if (params.flat === '1' || failed) return 'flat';
  if (Platform.OS === 'web' && typeof globalThis.WebGLRenderingContext === 'undefined') return 'flat';
  return '3d';
}
