/**
 * 이벤트 덱의 진행 — 지난 이벤트와 남은 장수.
 *
 * 남은 덱은 뷰에서 비워져 온다(순서를 숨긴다). 그래서 장수는 덱 길이가 아니라
 * 그 판 이벤트 덱의 전체 장수에서 공개된 만큼을 빼서 센다.
 */

import { eventDeckFor, eventDeckSize } from '../data/events';
import type { EventCardId, Expansion } from '../data/types';
import type { GameState } from '../engine';

export function eventProgress(
  ev: NonNullable<GameState['event']>,
  expansions: readonly Expansion[] = ['highnoon'],
): {
  /** 지나간 이벤트, 공개된 순서대로 */
  past: EventCardId[];
  remaining: number;
} {
  const shown = ev.past.length + (ev.current ? 1 : 0);
  const first = ev.past[0] ?? ev.current;
  const deck = eventDeckFor(expansions);
  const size = first ? eventDeckSize(first) : deck ? deck.shuffled.length + 1 : 0;
  return { past: ev.past, remaining: Math.max(0, size - shown) };
}
