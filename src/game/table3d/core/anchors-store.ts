/**
 * 3D 앵커의 화면 좌표.
 *
 * 카메라가 움직이거나 화면 크기가 바뀔 때만 갱신된다. RN 오버레이가 이걸 구독해
 * 좌석 라벨을 3D 위치에 얹는다. 프레임마다 쓰지 않는다.
 */

import { createStore } from 'zustand/vanilla';

export type AnchorPoint = {
  x: number;
  y: number;
  depth: number;
  visible: boolean;
  /** 좌석이면 매트+손패가 차지하는 화면 세로 범위 */
  top?: number;
  bottom?: number;
};

export type AnchorsState = {
  width: number;
  height: number;
  points: Record<string, AnchorPoint>;
};

export const anchorsStore = createStore<AnchorsState>(() => ({ width: 0, height: 0, points: {} }));

export const seatKey = (index: number) => `seat:${index}`;
export const ANCHOR_DECK = 'deck';
export const ANCHOR_DISCARD = 'discard';
export const ANCHOR_EVENT = 'event';
export const ANCHOR_CENTER = 'center';
