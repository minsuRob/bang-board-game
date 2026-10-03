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
    nameKo: '재갈',
    text: '아무도 말할 수 없다. 채팅을 쓸 수 없다.',
  },
  boneOrchard: {
    id: 'boneOrchard',
    expansion: 'wildwestshow',
    name: 'Bone Orchard',
    nameKo: '묘지',
    text:
      '제거된 플레이어는 자기 차례가 오면 목숨 1로 돌아온다. 역할은 제거된 플레이어들의 역할을 섞어 다시 나눈다 (보안관 제외).',
  },
  darlingValentine: {
    id: 'darlingValentine',
    expansion: 'wildwestshow',
    name: 'Darling Valentine',
    nameKo: '달링 발렌타인',
    text: '자기 차례 시작에 손패를 모두 버리고, 같은 장수만큼 덱에서 새로 가져온다.',
  },
  dorothyRage: {
    id: 'dorothyRage',
    expansion: 'wildwestshow',
    name: 'Dorothy Rage',
    nameKo: '도로시 레이지',
    text:
      '자기 차례에 한 번, 다른 플레이어에게 카드 종류와 대상을 정해 그 카드를 내게 할 수 있다. 그 카드가 손에 없으면 그 사람은 손패를 모두에게 보여 준다.',
  },
  helenaZontero: {
    id: 'helenaZontero',
    expansion: 'wildwestshow',
    name: 'Helena Zontero',
    nameKo: '헬레나 존테로',
    text:
      "이 카드가 공개되면 '카드 펼치기'를 한다. ♥·♦ 면 보안관을 뺀 살아 있는 플레이어의 역할을 섞어 다시 나눈다.",
  },
  ladyRoseOfTexas: {
    id: 'ladyRoseOfTexas',
    expansion: 'wildwestshow',
    name: 'Lady Rose of Texas',
    nameKo: '레이디 로즈 오브 텍사스',
    text: '자기 차례에 한 번, 오른쪽 플레이어와 자리를 바꿀 수 있다. 그 플레이어는 다음 차례를 건너뛴다.',
  },
  missSusanna: {
    id: 'missSusanna',
    expansion: 'wildwestshow',
    name: 'Miss Susanna',
    nameKo: '미스 수잔나',
    text: '자기 차례에 카드를 3장 이상 내야 한다. 못 내면 차례가 끝날 때 목숨 1을 잃는다.',
  },
  showdown: {
    id: 'showdown',
    expansion: 'wildwestshow',
    name: 'Showdown',
    nameKo: '결전',
    text: '모든 카드를 뱅!으로 낼 수 있다. 뱅!은 빗나감!으로도 낼 수 있다.',
  },
  sacagaway: {
    id: 'sacagaway',
    expansion: 'wildwestshow',
    name: 'Sacagaway',
    nameKo: '사카가웨이',
    text: '모두 손패를 펼쳐 놓고 한다 (역할은 가린다).',
  },
  wildWestShow: {
    id: 'wildWestShow',
    expansion: 'wildwestshow',
    name: 'Wild West Show',
    nameKo: '와일드 웨스트 쇼',
    text: "모두의 목표가 '마지막까지 살아남기'가 된다.",
    isFinal: true,
  },
};

export const WILDWESTSHOW_EVENT_IDS = Object.keys(WILDWESTSHOW_EVENTS) as WildWestShowEventId[];

/** 덱 맨 밑에 고정되는 카드를 제외한, 섞어야 하는 이벤트들 */
export const WILDWESTSHOW_SHUFFLED_IDS = WILDWESTSHOW_EVENT_IDS.filter(
  (id) => !WILDWESTSHOW_EVENTS[id].isFinal,
);

export const WILDWESTSHOW_FINAL_ID: WildWestShowEventId = 'wildWestShow';
