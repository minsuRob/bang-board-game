/**
 * 웹 단축키.
 *
 * 원본 맵의 조작을 그대로 잇는다 (v0.12 / v0.24 패치노트):
 *   Q  차례 마치기
 *   W  반응하지 않음
 *   1~0  손패 n번째 카드 고르기
 *   Esc  선택 취소
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';

export type HotkeyHandlers = {
  onEndTurn?: () => void;
  onPass?: () => void;
  onPickIndex?: (index: number) => void;
  onCancel?: () => void;
};

export function useHotkeys(handlers: HotkeyHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || typeof window === 'undefined') return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      const key = e.key.toLowerCase();
      if (key === 'q') {
        handlers.onEndTurn?.();
      } else if (key === 'w') {
        handlers.onPass?.();
      } else if (key === 'escape') {
        handlers.onCancel?.();
      } else if (key >= '0' && key <= '9') {
        handlers.onPickIndex?.(key === '0' ? 9 : Number(key) - 1);
      } else {
        return;
      }
      e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, handlers]);
}
