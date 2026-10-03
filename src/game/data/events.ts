/**
 * 모든 확장판의 이벤트 카드 합본과, 한 판에 쓸 이벤트 덱 고르기.
 *
 * 상황 카드 확장판(하이 눈 · 와일드 웨스트 쇼 · 한줌의 카드)은 한 판에 하나만 고른다.
 * 로비는 하나만 켤 수 있게 하고, 설정 값은 `expansionsFor` 로만 확장판 목록으로 바꾼다.
 * 그래도 둘 이상 들어오면(예전 저장본 등) `EVENT_EXPANSIONS` 앞에 있는 쪽을 쓴다.
 */

import { FISTFUL_EVENTS, FISTFUL_FINAL_ID, FISTFUL_SHUFFLED_IDS } from './cards.fistful';
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
import type { CardKind, EventCardDef, EventCardId, EventExpansion, Expansion } from './types';

export const EVENTS: Record<EventCardId, EventCardDef> = {
  ...HIGHNOON_EVENTS,
  ...WILDWESTSHOW_EVENTS,
  ...FISTFUL_EVENTS,
};

/**
 * 다음 이벤트를 공개하는 때.
 * - sheriffTurn: 보안관의 두 번째 차례부터 보안관 차례 시작마다 (하이 눈·한줌의 카드)
 * - playCard: 이 종류의 카드를 손에서 낼 때, 낸 사람이 더미를 가져가 공개한다 (와일드 웨스트 쇼의
 *   역마차·웰스 파고). 리 반 클리프가 다시 낸 효과로는 공개하지 않는다
 */
export type EventRevealTrigger =
  | { k: 'sheriffTurn' }
  | { k: 'playCard'; kinds: readonly CardKind[] };

export type EventDeckSpec = {
  expansion: EventExpansion;
  /** 섞어서 위에 쌓는 카드 */
  shuffled: EventCardId[];
  /** 맨 밑에 고정되는 카드 */
  final: EventCardId;
  revealOn: EventRevealTrigger;
};

const SHERIFF_TURN: EventRevealTrigger = { k: 'sheriffTurn' };

const DECKS: Record<EventExpansion, EventDeckSpec> = {
  highnoon: {
    expansion: 'highnoon',
    shuffled: HIGHNOON_SHUFFLED_IDS,
    final: HIGHNOON_FINAL_ID,
    revealOn: SHERIFF_TURN,
  },
  // "When you play a Stagecoach or Wells Fargo, take the WWS pile … reveal the top card" (WWS 룰 1쪽)
  wildwestshow: {
    expansion: 'wildwestshow',
    shuffled: WILDWESTSHOW_SHUFFLED_IDS,
    final: WILDWESTSHOW_FINAL_ID,
    revealOn: { k: 'playCard', kinds: ['stagecoach', 'wellsFargo'] },
  },
  fistful: {
    expansion: 'fistful',
    shuffled: FISTFUL_SHUFFLED_IDS,
    final: FISTFUL_FINAL_ID,
    revealOn: SHERIFF_TURN,
  },
};

/** 상황 카드 확장판. 로비에 이 순서로 놓고, 둘 이상 켜져 있으면 앞의 것을 쓴다 */
export const EVENT_EXPANSIONS: readonly EventExpansion[] = ['highnoon', 'wildwestshow', 'fistful'];

export function isEventExpansion(value: unknown): value is EventExpansion {
  return (EVENT_EXPANSIONS as readonly unknown[]).includes(value);
}

/** 이 확장판 조합에서 쓰는 상황 카드 확장판. 하나도 안 켰으면 null */
export function eventExpansionOf(expansions: readonly Expansion[]): EventExpansion | null {
  return EVENT_EXPANSIONS.find((x) => expansions.includes(x)) ?? null;
}

/** 로비 설정(상황 카드 하나 + 나머지 켜고 끄기)을 엔진 설정의 확장판 목록으로 바꾼다 */
export function expansionsFor(opts: {
  event: EventExpansion | null;
  valley?: boolean;
  goldrush?: boolean;
}): Expansion[] {
  return [
    ...(opts.event ? [opts.event] : []),
    ...(opts.valley ? (['valley'] as const) : []),
    ...(opts.goldrush ? (['goldrush'] as const) : []),
  ];
}

/** 이 확장판 조합에서 쓸 이벤트 덱. 이벤트 덱이 있는 확장판을 안 켰으면 null */
export function eventDeckFor(expansions: readonly Expansion[]): EventDeckSpec | null {
  const ex = eventExpansionOf(expansions);
  return ex ? DECKS[ex] : null;
}

/** 이 이벤트 카드가 속한 덱의 전체 장수 (남은 장수 표시용) */
export function eventDeckSize(id: EventCardId): number {
  const ex = EVENTS[id].expansion;
  return isEventExpansion(ex) ? DECKS[ex].shuffled.length + 1 : 0;
}
