/**
 * 지금 기다리는 차례가 언제 끝나는가.
 *
 * AI 구동기는 다음 수를 둘 시각을, 온라인 구동기는 사람 자리의 제한시간이 끝나는 시각을 쓴다.
 * 하단 안내 줄이 이걸 읽어 "N초" 를 띄운다. 기다리는 게 없으면 null.
 */

import { createStore } from 'zustand/vanilla';

export const waitClock = createStore<{ deadline: number | null }>(() => ({ deadline: null }));

export function setWaitDeadline(deadline: number | null) {
  if (waitClock.getState().deadline !== deadline) waitClock.setState({ deadline });
}
