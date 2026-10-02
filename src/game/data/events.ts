/**
 * 모든 확장판의 이벤트 카드 합본과, 한 판에 쓸 이벤트 덱 고르기.
 *
 * 한 판에는 이벤트 덱을 하나만 쓴다. 두 확장판을 함께 켜면 앞에 있는 쪽(하이 눈)을 쓴다.
 * 로비는 두 확장판을 동시에 켜지 못하게 막는다.
 */

import {
  HIGHNOON_EVENTS,
  HIGHNOON_FINAL_ID,
  HIGHNOON_SHUFFLED_IDS,
} from './cards.highnoon';
import {
  WILDWESTSHOW_EVENTS,
  WILDWESTSHOW_FINAL_ID,
  WILDWESTSHOW_SHUFFLED_IDS,
} from './cards.wildwestshow';
import { FISTFUL_EVENTS } from './cards.fistful';
import type { EventCardDef, EventCardId, Expansion } from './types';

export const EVENTS: Record<EventCardId, EventCardDef> = {
  ...HIGHNOON_EVENTS,
  ...WILDWESTSHOW_EVENTS,
  ...FISTFUL_EVENTS,
};

export type EventDeckSpec = {
  expansion: Expansion;
  /** 섞어서 위에 쌓는 카드 */
  shuffled: EventCardId[];
  /** 맨 밑에 고정되는 카드 */
  final: EventCardId;
};

const DECKS: EventDeckSpec[] = [
  { expansion: 'highnoon', shuffled: HIGHNOON_SHUFFLED_IDS, final: HIGHNOON_FINAL_ID },
  { expansion: 'wildwestshow', shuffled: WILDWESTSHOW_SHUFFLED_IDS, final: WILDWESTSHOW_FINAL_ID },
];

/** 이 확장판 조합에서 쓸 이벤트 덱. 이벤트 덱이 있는 확장판을 안 켰으면 null */
export function eventDeckFor(expansions: readonly Expansion[]): EventDeckSpec | null {
  return DECKS.find((d) => expansions.includes(d.expansion)) ?? null;
}

/** 이 이벤트 카드가 속한 덱의 전체 장수 (남은 장수 표시용) */
export function eventDeckSize(id: EventCardId): number {
  const ex = EVENTS[id].expansion;
  const deck = DECKS.find((d) => d.expansion === ex);
  return deck ? deck.shuffled.length + 1 : 0;
}
