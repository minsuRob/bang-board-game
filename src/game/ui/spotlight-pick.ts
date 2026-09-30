/**
 * 가운데 카드 연출(PlayedCardSpotlight)이 새 로그 중에서 무엇을 띄울지 고른다.
 *
 * 손에서 낸 카드와 새로 공개된 이벤트 카드를 띄운다. 한 번에 여러 개가 들어왔으면 가장 나중 것.
 */

import { HIGHNOON_EVENTS } from '../data/cards.highnoon';
import type { EventCardDef } from '../data/types';
import { isHidden, type GameEvent } from '../engine';

/** 손에서 카드를 내는 로그 */
const PLAY_EVENTS = new Set(['playCard', 'playMissed', 'indiansBang', 'duelBang']);

/** 이벤트 공개 로그의 카드 정의. 이벤트 로그가 아니거나 모르는 이벤트면 null */
export function revealedEventOf(e: GameEvent): EventCardDef | null {
  if (e.t !== 'event' || !e.card) return null;
  return (HIGHNOON_EVENTS as Record<string, EventCardDef | undefined>)[e.card] ?? null;
}

function spotlightable(e: GameEvent): boolean {
  if (e.t === 'event') return revealedEventOf(e) !== null;
  return PLAY_EVENTS.has(e.t) && Boolean(e.card) && !isHidden(e.card!);
}

/** seq 가 since 보다 뒤인 로그 중 가운데에 띄울 마지막 것 */
export function pickSpotlight(log: readonly GameEvent[], since: number): GameEvent | null {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i];
    if (e.seq <= since) break;
    if (spotlightable(e)) return e;
  }
  return null;
}
