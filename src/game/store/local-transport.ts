/**
 * 로컬 트랜스포트.
 *
 * 제출한 액션을 그 자리에서 되돌려준다. 핫시트와 AI 대전이 이걸 쓴다.
 * 네트워크가 없을 뿐, 게임 화면 입장에서는 온라인과 완전히 같다.
 */

import type { Action } from '../engine';
import type { Transport } from './transport';

export function createLocalTransport(): Transport {
  let listeners: ((action: Action) => void)[] = [];

  return {
    submit(action) {
      for (const fn of [...listeners]) fn(action);
    },
    subscribe(onAction) {
      listeners.push(onAction);
      return () => {
        listeners = listeners.filter((fn) => fn !== onAction);
      };
    },
    close() {
      listeners = [];
    },
  };
}
