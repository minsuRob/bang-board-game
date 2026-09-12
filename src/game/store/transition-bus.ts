/**
 * 상태 전이 알림.
 *
 * game-store 가 reduce 한 직후 prev/next 를 (가리지 않은 채로) 흘려보낸다.
 * 완전한 카드 이동 diff 는 여기서만 계산할 수 있다. 화면은 가려진 사본만 받기 때문이다.
 */

import type { Action, GameState } from '../engine';

export type Transition = { prev: GameState | null; next: GameState; action: Action };

type Listener = (t: Transition) => void;

const listeners = new Set<Listener>();

export function onTransition(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitTransition(t: Transition) {
  for (const l of listeners) l(t);
}
