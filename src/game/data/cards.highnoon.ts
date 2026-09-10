/**
 * 하이 눈 확장 이벤트 카드 15종.
 *
 * 카드 텍스트는 도감 이미지
 * reference/sc2-arcade/images/howtoplay_f5c505960482.jpg 의 한/영 병기 문구를 읽어 옮겼다.
 *
 * 진행 규칙: 'highNoon' 카드를 이벤트 덱 맨 밑에 두고 나머지 14장을 섞어 그 위에 쌓는다.
 * 보안관의 두 번째 차례부터, 보안관의 차례 시작 시 1장을 공개해 이전 이벤트를 대체한다.
 */

import type { EventCardDef, EventCardId } from './types';

export const HIGHNOON_EVENTS: Record<EventCardId, EventCardDef> = {
  blessing: {
    id: 'blessing',
    expansion: 'highnoon',
    name: 'Blessing',
    nameKo: '축복',
    text: '모든 카드의 무늬를 하트로 간주한다.',
  },
  curse: {
    id: 'curse',
    expansion: 'highnoon',
    name: 'Curse',
    nameKo: '저주',
    text: '모든 카드의 무늬를 스페이드로 간주한다.',
  },
  ghostTown: {
    id: 'ghostTown',
    expansion: 'highnoon',
    name: 'Ghost Town',
    nameKo: '유령도시',
    text:
      '제거된 플레이어가 자기 차례에 유령으로 되살아난다. 카드를 3장 가져오며 목숨을 잃지 않고, 차례가 끝나면 다시 제거된다.',
  },
  goldRush: {
    id: 'goldRush',
    expansion: 'highnoon',
    name: 'Gold Rush',
    nameKo: '골드러시',
    text: '차례가 반시계 방향으로 진행된다.',
  },
  hangover: {
    id: 'hangover',
    expansion: 'highnoon',
    name: 'Hangover',
    nameKo: '숙취',
    text: '모든 캐릭터의 특수 능력이 사라진다.',
  },
  shootout: {
    id: 'shootout',
    expansion: 'highnoon',
    name: 'Shootout',
    nameKo: '총격전',
    text: '모두 자기 차례에 뱅!을 두 번까지 사용할 수 있다.',
  },
  theDaltons: {
    id: 'theDaltons',
    expansion: 'highnoon',
    name: 'The Daltons',
    nameKo: '달톤 형제',
    text: '이 카드가 공개되는 순간, 파랑 카드를 장착한 모든 플레이어가 그중 1장을 버린다.',
  },
  theDoctor: {
    id: 'theDoctor',
    expansion: 'highnoon',
    name: 'The Doctor',
    nameKo: '의사',
    text: '이 카드가 공개되는 순간, 목숨이 가장 적은 플레이어가 목숨을 1 회복한다.',
  },
  theReverend: {
    id: 'theReverend',
    expansion: 'highnoon',
    name: 'The Reverend',
    nameKo: '목사',
    text: '아무도 맥주 카드를 사용할 수 없다.',
  },
  theSermon: {
    id: 'theSermon',
    expansion: 'highnoon',
    name: 'The Sermon',
    nameKo: '설교',
    text: '아무도 자기 차례에 뱅! 카드를 사용할 수 없다.',
  },
  trainArrival: {
    id: 'trainArrival',
    expansion: 'highnoon',
    name: 'Train Arrival',
    nameKo: '기차도착',
    text: "'카드 가져오기' 단계가 끝날 때 카드를 1장 더 가져온다.",
  },
  thirst: {
    id: 'thirst',
    expansion: 'highnoon',
    name: 'Thirst',
    nameKo: '갈증',
    text: "'카드 가져오기' 단계에서 첫 번째 카드만 가져온다.",
  },
  newIdentity: {
    id: 'newIdentity',
    expansion: 'highnoon',
    name: 'New Identity',
    nameKo: '새로운 신분',
    text: '차례 시작에 예비 캐릭터 카드를 보고, 목숨 2로 시작하는 그 캐릭터로 교체할 수 있다.',
  },
  handcuffs: {
    id: 'handcuffs',
    expansion: 'highnoon',
    name: 'Handcuffs',
    nameKo: '수갑',
    text: "'카드 가져오기' 단계 뒤에 무늬를 하나 선언하고, 그 차례에는 그 무늬 카드만 사용할 수 있다.",
  },
  highNoon: {
    id: 'highNoon',
    expansion: 'highnoon',
    name: 'High Noon',
    nameKo: '하이 눈',
    text: '모든 플레이어는 차례 시작에 목숨을 1 잃는다.',
    isFinal: true,
  },
};

export const HIGHNOON_EVENT_IDS = Object.keys(HIGHNOON_EVENTS) as EventCardId[];

/** 덱 맨 밑에 고정되는 카드를 제외한, 섞어야 하는 이벤트들 */
export const HIGHNOON_SHUFFLED_IDS = HIGHNOON_EVENT_IDS.filter(
  (id) => !HIGHNOON_EVENTS[id].isFinal,
);

export const HIGHNOON_FINAL_ID: EventCardId = 'highNoon';
