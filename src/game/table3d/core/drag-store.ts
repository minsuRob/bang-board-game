/**
 * 손패 드래그 상태. RN 제스처가 쓰고, 씬이 프레임마다 읽는다. React 는 구독하지 않는다.
 */

import { createStore } from 'zustand/vanilla';

import type { CardId } from '../../data/types';
import type { PlayerId } from '../../engine';

export type DragState = {
  /** 캔버스 기준 좌표. vx/vy 는 px/s */
  active: { card: CardId; x: number; y: number; vx: number; vy: number } | null;
  /** 캔버스의 창 기준 원점 (제스처 absoluteX/Y 를 캔버스 좌표로 바꿀 때) */
  origin: { x: number; y: number };
  /** 지금 손가락 아래 있는 좌석 */
  hover: PlayerId | null;
  /** 놓았지만 내지 않은 카드. 씬이 손으로 되돌린 뒤 지운다 */
  returning: CardId | null;
};

export const dragStore = createStore<DragState>(() => ({
  active: null,
  origin: { x: 0, y: 0 },
  hover: null,
  returning: null,
}));

export function beginDrag(card: CardId, x: number, y: number) {
  dragStore.setState({ active: { card, x, y, vx: 0, vy: 0 }, returning: null });
}

export function moveDrag(x: number, y: number, vx: number, vy: number) {
  const a = dragStore.getState().active;
  if (a) dragStore.setState({ active: { ...a, x, y, vx, vy } });
}

/** played 면 씬이 카드를 그대로 두고 연출이 이어받는다. 아니면 손으로 되돌린다 */
export function endDrag(played: boolean) {
  const a = dragStore.getState().active;
  dragStore.setState({ active: null, hover: null, returning: a && !played ? a.card : null });
}
