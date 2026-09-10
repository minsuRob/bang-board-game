/**
 * 액션 전달 통로.
 *
 * 로컬 핫시트든 Firebase 락스텝이든 게임 화면은 이 인터페이스만 안다.
 * 화면이 트랜스포트의 정체를 모르기 때문에 온라인 대전을 붙일 때
 * UI 를 한 줄도 고치지 않아도 된다.
 */

import type { Action } from '../engine';

export type TransportStatus = 'connecting' | 'ready' | 'closed' | 'error';

export type Transport = {
  /** 액션을 제출한다. 확정된 순서로 되돌아오면 subscribe 콜백이 불린다. */
  submit(action: Action): void | Promise<void>;
  /** 확정된 액션을 순서대로 받는다. 해제 함수를 돌려준다. */
  subscribe(onAction: (action: Action) => void): () => void;
  /** 연결 상태 변화 */
  onStatus?(cb: (status: TransportStatus, detail?: string) => void): () => void;
  close(): void;
};
