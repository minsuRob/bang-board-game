/**
 * 이벤트 덱의 진행 — 지난 이벤트와 남은 장수.
 *
 * 남은 덱은 뷰에서 비워져 온다(순서를 숨긴다). 그래서 장수는 덱 길이가 아니라
 * 하이 눈 이벤트 전체 장수에서 공개된 만큼을 빼서 센다.
 */

import { HIGHNOON_EVENT_IDS } from '../data/cards.highnoon';
import type { EventCardId } from '../data/types';
import type { GameState } from '../engine';

export function eventProgress(ev: NonNullable<GameState['event']>): {
  /** 지나간 이벤트, 공개된 순서대로 */
  past: EventCardId[];
  remaining: number;
} {
  const shown = ev.past.length + (ev.current ? 1 : 0);
  return { past: ev.past, remaining: Math.max(0, HIGHNOON_EVENT_IDS.length - shown) };
}
