/**
 * 손패에서 살펴보는 카드.
 *
 * 손패(하단 HUD)와 설명 창(테이블 위 오버레이)이 다른 트리에 있어 스토어로 잇는다.
 * 웹은 hover, 폰은 첫 탭이 이 값을 채운다. 화면 전용이라 GameState 에 넣지 않는다.
 */

import { Platform } from 'react-native';
import { createStore } from 'zustand/vanilla';

import type { CardId } from '../data/types';

/**
 * 마우스 hover 로 살펴볼 수 있는 화면인가. 폰 브라우저도 웹이지만 hover 가 없으므로
 * 앱과 같이 "첫 탭은 보기" 로 다룬다.
 */
export const CAN_HOVER =
  Platform.OS === 'web' && !(typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches);

export const cardPeek = createStore<{ card: CardId | null }>(() => ({ card: null }));

export function setPeek(card: CardId | null) {
  if (cardPeek.getState().card === card) return;
  cardPeek.setState({ card });
}

/** 이 카드를 보고 있을 때만 닫는다 (hover 가 다른 카드로 먼저 넘어간 경우) */
export function clearPeek(card: CardId) {
  if (cardPeek.getState().card === card) cardPeek.setState({ card: null });
}
