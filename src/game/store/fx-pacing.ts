/**
 * 연출과 AI 의 박자.
 *
 * 연출 층이 "이 시각까지는 바쁘다"고 적어 두면 AI 구동기가 그때까지 두지 않는다.
 * 연출 층이 없으면(2D) 0 이라 예전 템포 그대로다.
 */

import { createStore } from 'zustand/vanilla';

export const fxPacing = createStore<{ busyUntil: number; timeScale: number }>(() => ({
  busyUntil: 0,
  timeScale: 1,
}));

/** 아무리 밀려도 이 이상은 AI 를 세우지 않는다 */
export const MAX_HOLD_MS = 2000;

/** 지금 바쁜 시각 뒤에 ms 만큼 더 붙인다 */
export function extendFx(ms: number) {
  const now = Date.now();
  fxPacing.setState((s) => ({
    busyUntil: Math.min(Math.max(s.busyUntil, now) + ms, now + MAX_HOLD_MS),
  }));
}

export function releaseFx() {
  fxPacing.setState({ busyUntil: 0 });
}
