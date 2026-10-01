/**
 * 모든 확장판의 이벤트 카드를 한 곳에서 조회한다.
 *
 * UI 와 로그는 지금 공개된 이벤트가 어느 확장판 것인지 모르고 조회하므로
 * 확장판별 표 대신 이 표를 쓴다.
 */

import { FISTFUL_EVENTS, FISTFUL_FINAL_ID, FISTFUL_SHUFFLED_IDS } from './cards.fistful';
import { HIGHNOON_EVENTS, HIGHNOON_FINAL_ID, HIGHNOON_SHUFFLED_IDS } from './cards.highnoon';
import type { EventCardDef, EventCardId, EventExpansion, Expansion } from './types';

export const EVENTS: Record<EventCardId, EventCardDef> = {
  ...HIGHNOON_EVENTS,
  ...FISTFUL_EVENTS,
};

/** 확장판별 섞는 카드와 맨 밑 고정 카드 */
export const EVENT_DECKS: Record<EventExpansion, { shuffled: EventCardId[]; final: EventCardId }> = {
  highnoon: { shuffled: HIGHNOON_SHUFFLED_IDS, final: HIGHNOON_FINAL_ID },
  fistful: { shuffled: FISTFUL_SHUFFLED_IDS, final: FISTFUL_FINAL_ID },
};

/** 켜진 확장판 중 이벤트 덱을 가진 것 (정의 순서 고정) */
export function eventExpansionsOf(expansions: readonly Expansion[]): EventExpansion[] {
  return (Object.keys(EVENT_DECKS) as EventExpansion[]).filter((x) => expansions.includes(x));
}

/** 이벤트 덱 한 벌의 장수. 하이 눈·한줌의 카드를 섞어도 15장이다 */
export const EVENT_DECK_SIZE = 15;
