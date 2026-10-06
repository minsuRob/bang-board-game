/**
 * 하이 눈 확장 이벤트 카드 15종.
 *
 * 카드 텍스트는 도감 이미지
 * reference/sc2-arcade/images/howtoplay_f5c505960482.jpg 의 한/영 병기 문구를 읽어 옮겼다.
 *
 * 진행 규칙: 'highNoon' 카드를 이벤트 덱 맨 밑에 두고 나머지 14장을 섞어 그 위에 쌓는다.
 * 보안관의 두 번째 차례부터, 보안관의 차례 시작 시 1장을 공개해 이전 이벤트를 대체한다.
 */

import type { EventCardDef, HighNoonEventId } from './types';

export const HIGHNOON_EVENTS: Record<HighNoonEventId, EventCardDef> = {
  blessing: {
    id: 'blessing',
    expansion: 'highnoon',
    name: 'Blessing',
  },
  curse: {
    id: 'curse',
    expansion: 'highnoon',
    name: 'Curse',
  },
  ghostTown: {
    id: 'ghostTown',
    expansion: 'highnoon',
    name: 'Ghost Town',
  },
  goldRush: {
    id: 'goldRush',
    expansion: 'highnoon',
    name: 'Gold Rush',
  },
  hangover: {
    id: 'hangover',
    expansion: 'highnoon',
    name: 'Hangover',
  },
  shootout: {
    id: 'shootout',
    expansion: 'highnoon',
    name: 'Shootout',
  },
  theDaltons: {
    id: 'theDaltons',
    expansion: 'highnoon',
    name: 'The Daltons',
  },
  theDoctor: {
    id: 'theDoctor',
    expansion: 'highnoon',
    name: 'The Doctor',
  },
  theReverend: {
    id: 'theReverend',
    expansion: 'highnoon',
    name: 'The Reverend',
  },
  theSermon: {
    id: 'theSermon',
    expansion: 'highnoon',
    name: 'The Sermon',
  },
  trainArrival: {
    id: 'trainArrival',
    expansion: 'highnoon',
    name: 'Train Arrival',
  },
  thirst: {
    id: 'thirst',
    expansion: 'highnoon',
    name: 'Thirst',
  },
  newIdentity: {
    id: 'newIdentity',
    expansion: 'highnoon',
    name: 'New Identity',
  },
  handcuffs: {
    id: 'handcuffs',
    expansion: 'highnoon',
    name: 'Handcuffs',
  },
  highNoon: {
    id: 'highNoon',
    expansion: 'highnoon',
    name: 'High Noon',
    isFinal: true,
  },
};

export const HIGHNOON_EVENT_IDS = Object.keys(HIGHNOON_EVENTS) as HighNoonEventId[];

/** 덱 맨 밑에 고정되는 카드를 제외한, 섞어야 하는 이벤트들 */
export const HIGHNOON_SHUFFLED_IDS = HIGHNOON_EVENT_IDS.filter(
  (id) => !HIGHNOON_EVENTS[id].isFinal,
);

export const HIGHNOON_FINAL_ID: HighNoonEventId = 'highNoon';
