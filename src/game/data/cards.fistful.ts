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
    nameKo: '폐광',
    text:
      "'카드 가져오기' 단계에서 버린 더미에서 가져온다(모자라면 덱에서). 버리기 단계에서는 버린 카드를 뒷면으로 덱 위에 올린다.",
  },
  ambush: {
    id: 'ambush',
    expansion: 'fistful',
    name: 'Ambush',
    nameKo: '매복',
    text: '두 플레이어 사이의 거리는 모두 1이다. 앞에 놓인 카드로만 달라진다.',
  },
  bloodBrothers: {
    id: 'bloodBrothers',
    expansion: 'fistful',
    name: 'Blood Brothers',
    nameKo: '의형제',
    text: '차례 시작에 목숨 1을 잃고(마지막 목숨은 안 된다) 원하는 플레이어의 목숨을 1 회복시킬 수 있다.',
  },
  deadMan: {
    id: 'deadMan',
    expansion: 'fistful',
    name: 'Dead Man',
    nameKo: '망자',
    text: '가장 먼저 제거된 플레이어가 자기 차례에 목숨 2와 카드 2장을 들고 게임에 돌아온다.',
  },
  hardLiquor: {
    id: 'hardLiquor',
    expansion: 'fistful',
    name: 'Hard Liquor',
    nameKo: '독한 술',
    text: "'카드 가져오기' 단계를 건너뛰고 목숨을 1 회복할 수 있다.",
  },
  lasso: {
    id: 'lasso',
    expansion: 'fistful',
    name: 'Lasso',
    nameKo: '올가미',
    text: '플레이어 앞에 놓인 카드는 효과가 없다.',
  },
  lawOfTheWest: {
    id: 'lawOfTheWest',
    expansion: 'fistful',
    name: 'Law of the West',
    nameKo: '서부의 법',
    text: "'카드 가져오기' 단계에서 두 번째로 가져온 카드를 보여 준다. 낼 수 있으면 그 차례에 반드시 낸다.",
  },
  peyote: {
    id: 'peyote',
    expansion: 'fistful',
    name: 'Peyote',
    nameKo: '피요테',
    text:
      "'카드 가져오기' 대신 덱 맨 위 카드가 빨강인지 검정인지 맞힌다. 맞히면 그 카드를 갖고 다시 맞힐 수 있고, 틀리면 카드 사용 단계로 넘어간다.",
  },
  ranch: {
    id: 'ranch',
    expansion: 'fistful',
    name: 'Ranch',
    nameKo: '목장',
    text: "'카드 가져오기' 단계가 끝나면 한 번, 손패를 원하는 만큼 버리고 그만큼 덱에서 가져올 수 있다.",
  },
  ricochet: {
    id: 'ricochet',
    expansion: 'fistful',
    name: 'Ricochet',
    nameKo: '리코체',
    text: '뱅!을 버려 누군가의 앞에 놓인 카드 1장을 노릴 수 있다. 주인이 빗나감!을 내지 않으면 그 카드가 버려진다.',
  },
  russianRoulette: {
    id: 'russianRoulette',
    expansion: 'fistful',
    name: 'Russian Roulette',
    nameKo: '러시안 룰렛',
    text:
      '이 카드가 공개되면 보안관부터 차례로 빗나감!을 1장씩 버린다. 처음으로 못 버린 사람이 목숨 2를 잃고 룰렛이 멈춘다.',
  },
  sniper: {
    id: 'sniper',
    expansion: 'fistful',
    name: 'Sniper',
    nameKo: '저격수',
    text: '자기 차례에 뱅! 2장을 함께 버려 한 사람을 쏠 수 있다. 뱅! 1회로 치며, 빗나감! 2장으로만 막는다.',
  },
  theJudge: {
    id: 'theJudge',
    expansion: 'fistful',
    name: 'The Judge',
    nameKo: '판사',
    text: '자기 앞에도 남의 앞에도 카드를 내려놓을 수 없다.',
  },
  vendetta: {
    id: 'vendetta',
    expansion: 'fistful',
    name: 'Vendetta',
    nameKo: '복수',
    text: '차례가 끝날 때 카드를 펼친다. ♥이면 차례를 한 번 더 한다(그때는 다시 펼치지 않는다).',
  },
  fistfulOfCards: {
    id: 'fistfulOfCards',
    expansion: 'fistful',
    name: 'A Fistful of Cards',
    nameKo: '한줌의 카드',
    text: '차례 시작에 손패 장수만큼 뱅!을 맞는다.',
    isFinal: true,
  },
};

export const FISTFUL_EVENT_IDS = Object.keys(FISTFUL_EVENTS) as FistfulEventId[];

export const FISTFUL_SHUFFLED_IDS = FISTFUL_EVENT_IDS.filter((id) => !FISTFUL_EVENTS[id].isFinal);

export const FISTFUL_FINAL_ID: FistfulEventId = 'fistfulOfCards';
