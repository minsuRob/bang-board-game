/**
 * 캐릭터 드래프트의 화면 전용 상태.
 *
 * 누가 어느 후보 위에 마우스를 올려 두었는지, 드래프트가 언제 시작됐는지.
 * 판의 결과에 영향이 없으므로 GameState 에도 액션 로그에도 넣지 않는다.
 * 온라인에서는 각자 자기 hover 를 members 문서로 흘리고 남의 것을 받아 적는다.
 */

import { createStore } from 'zustand/vanilla';

import type { PlayerId } from '../engine';

export type DraftUi = {
  /** 이 클라이언트가 드래프트를 처음 본 시각 (카운트다운 기준) */
  startedAt: number | null;
  /** 좌석별로 올려 둔 후보 인덱스. 없으면 null */
  hover: Record<PlayerId, number | null>;
};

export const draftUi = createStore<DraftUi>(() => ({ startedAt: null, hover: {} }));

/** 드래프트가 열려 있으면 시작 시각을 한 번만 적고, 닫히면 비운다. 시작 시각을 돌려준다. */
export function syncDraftClock(open: boolean): number | null {
  const { startedAt } = draftUi.getState();
  if (open && startedAt === null) {
    const now = Date.now();
    draftUi.setState({ startedAt: now });
    return now;
  }
  if (!open && startedAt !== null) draftUi.setState({ startedAt: null, hover: {} });
  return open ? startedAt : null;
}

export function setDraftHover(pid: PlayerId, index: number | null) {
  if ((draftUi.getState().hover[pid] ?? null) === index) return;
  draftUi.setState((s) => ({ hover: { ...s.hover, [pid]: index } }));
}
