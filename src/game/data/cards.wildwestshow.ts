/**
 * 와일드 웨스트 쇼 확장 이벤트 카드 10종.
 *
 * 카드 텍스트는 dV Giochi 카드 그림(content/6/cards/06_*.png)의 영문 원문을 옮겼다.
 * 한글 표기는 원본 맵 패치노트에 있는 것(재갈·묘지·결전)을 따르고 나머지는 음차했다.
 *
 * 진행 규칙: 'wildWestShow' 카드를 덱 맨 밑에 두고 나머지 9장을 섞어 그 위에 쌓는다.
 * 하이 눈과 달리 보안관 차례가 아니라, 누군가 역마차·웰스 파고를 낼 때 그 사람이 더미를 가져가
 * 맨 위 1장을 공개한다. 새 카드는 이전 카드를 대신하고, 'wildWestShow' 는 공개되면 끝까지 남는다.
 * 리 반 클리프가 다시 낸 효과로는 바뀌지 않는다 (WWS 룰 1~2쪽, FAQ Q19). 공개 시점은
 * `events.ts` 의 `revealOn` 이 정한다.
 */

import type { EventCardDef, WildWestShowEventId } from './types';

export const WILDWESTSHOW_EVENTS: Record<WildWestShowEventId, EventCardDef> = {
  gag: {
    id: 'gag',
    expansion: 'wildwestshow',
    name: 'Gag',
  },
  boneOrchard: {
    id: 'boneOrchard',
    expansion: 'wildwestshow',
    name: 'Bone Orchard',
  },
  darlingValentine: {
    id: 'darlingValentine',
    expansion: 'wildwestshow',
    name: 'Darling Valentine',
  },
  dorothyRage: {
    id: 'dorothyRage',
    expansion: 'wildwestshow',
    name: 'Dorothy Rage',
  },
  helenaZontero: {
    id: 'helenaZontero',
    expansion: 'wildwestshow',
    name: 'Helena Zontero',
  },
  ladyRoseOfTexas: {
    id: 'ladyRoseOfTexas',
    expansion: 'wildwestshow',
    name: 'Lady Rose of Texas',
  },
  missSusanna: {
    id: 'missSusanna',
    expansion: 'wildwestshow',
    name: 'Miss Susanna',
  },
  showdown: {
    id: 'showdown',
    expansion: 'wildwestshow',
    name: 'Showdown',
  },
  sacagaway: {
    id: 'sacagaway',
    expansion: 'wildwestshow',
    name: 'Sacagaway',
  },
  wildWestShow: {
    id: 'wildWestShow',
    expansion: 'wildwestshow',
    name: 'Wild West Show',
    isFinal: true,
  },
};

export const WILDWESTSHOW_EVENT_IDS = Object.keys(WILDWESTSHOW_EVENTS) as WildWestShowEventId[];

/** 덱 맨 밑에 고정되는 카드를 제외한, 섞어야 하는 이벤트들 */
export const WILDWESTSHOW_SHUFFLED_IDS = WILDWESTSHOW_EVENT_IDS.filter(
  (id) => !WILDWESTSHOW_EVENTS[id].isFinal,
);

export const WILDWESTSHOW_FINAL_ID: WildWestShowEventId = 'wildWestShow';
