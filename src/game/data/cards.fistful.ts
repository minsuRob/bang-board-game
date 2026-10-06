/**
 * 한줌의 카드 (A Fistful of Cards) 이벤트 카드 15종.
 *
 * 카드 텍스트는 dV Giochi 공식 사이트(cardslist.php?id=5)의 카드 그림에서
 * 영어·이탈리아어 원문을 읽어 옮겼다. 한글 이름은 원본 SC2 맵 패치노트를 따르고,
 * 패치노트에 없는 것(매복·의형제·목장·판사)은 뜻을 옮겼다.
 *
 * 진행 규칙은 하이 눈과 같다. '한줌의 카드' 카드를 맨 밑에 두고 나머지 14장을 섞는다.
 */

import type { EventCardDef, FistfulEventId } from './types';

export const FISTFUL_EVENTS: Record<FistfulEventId, EventCardDef> = {
  abandonedMine: {
    id: 'abandonedMine',
    expansion: 'fistful',
    name: 'Abandoned Mine',
  },
  ambush: {
    id: 'ambush',
    expansion: 'fistful',
    name: 'Ambush',
  },
  bloodBrothers: {
    id: 'bloodBrothers',
    expansion: 'fistful',
    name: 'Blood Brothers',
  },
  deadMan: {
    id: 'deadMan',
    expansion: 'fistful',
    name: 'Dead Man',
  },
  hardLiquor: {
    id: 'hardLiquor',
    expansion: 'fistful',
    name: 'Hard Liquor',
  },
  lasso: {
    id: 'lasso',
    expansion: 'fistful',
    name: 'Lasso',
  },
  lawOfTheWest: {
    id: 'lawOfTheWest',
    expansion: 'fistful',
    name: 'Law of the West',
  },
  peyote: {
    id: 'peyote',
    expansion: 'fistful',
    name: 'Peyote',
  },
  ranch: {
    id: 'ranch',
    expansion: 'fistful',
    name: 'Ranch',
  },
  ricochet: {
    id: 'ricochet',
    expansion: 'fistful',
    name: 'Ricochet',
  },
  russianRoulette: {
    id: 'russianRoulette',
    expansion: 'fistful',
    name: 'Russian Roulette',
  },
  sniper: {
    id: 'sniper',
    expansion: 'fistful',
    name: 'Sniper',
  },
  theJudge: {
    id: 'theJudge',
    expansion: 'fistful',
    name: 'The Judge',
  },
  vendetta: {
    id: 'vendetta',
    expansion: 'fistful',
    name: 'Vendetta',
  },
  fistfulOfCards: {
    id: 'fistfulOfCards',
    expansion: 'fistful',
    name: 'A Fistful of Cards',
    isFinal: true,
  },
};

export const FISTFUL_EVENT_IDS = Object.keys(FISTFUL_EVENTS) as FistfulEventId[];

export const FISTFUL_SHUFFLED_IDS = FISTFUL_EVENT_IDS.filter((id) => !FISTFUL_EVENTS[id].isFinal);

export const FISTFUL_FINAL_ID: FistfulEventId = 'fistfulOfCards';
