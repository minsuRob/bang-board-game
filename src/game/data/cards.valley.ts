/**
 * 그림자의 계곡 플레잉 카드 15종 / 16장.
 *
 * 효과와 무늬·숫자는 dV Giochi 카드 그림(content/7/cards/07_*.png)을 직접 읽어 옮겼다.
 * 원문과 판정 기준은 docs/valley-of-shadows.md.
 *
 * 한글 이름은 원본 맵 패치노트 표기(유령·샷건·포상금·역화·구조!·패닝)를 따르고,
 * 나머지는 음차하거나 뜻을 옮겼다.
 */

import {
  type CardDef,
  type CardId,
  type CardInstance,
  type CardKind,
  type Rank,
  type Suit,
  SUIT_CODE,
} from './types';

export type ValleyKind =
  | 'bandidos' | 'escape' | 'aim' | 'poker' | 'backfire' | 'saved'
  | 'fanning' | 'tomahawk' | 'tornado' | 'lastCall'
  | 'ghost' | 'lemat' | 'rattlesnake' | 'shotgun' | 'bounty';

export const VALLEY_CARD_DEFS: Record<ValleyKind, CardDef> = {
  // ----- 갈색 -----------------------------------------------------------
  bandidos: {
    kind: 'bandidos',
    name: 'BANDIDOS',
    nameKo: '반디도스',
    category: 'brown',
    symbols: [{ s: 'targetAll' }],
    text: '다른 모든 플레이어는 손패 2장(1장뿐이면 1장)을 버리거나 목숨 1을 잃는다.',
    expansion: 'valley',
  },
  escape: {
    kind: 'escape',
    name: 'FUGA',
    nameKo: '탈출',
    category: 'brown',
    symbols: [],
    text: '남의 차례에도 낼 수 있다. 나를 대상에 포함한 갈색 카드(뱅! 제외)의 효과를 피한다.',
    outOfTurn: true,
    expansion: 'valley',
  },
  aim: {
    kind: 'aim',
    name: 'MIRA',
    nameKo: '조준',
    category: 'brown',
    symbols: [],
    text: '뱅!과 함께 낸다. 표적이 맞으면 목숨 2를 잃는다.',
    expansion: 'valley',
  },
  poker: {
    kind: 'poker',
    name: 'POKER',
    nameKo: '포커',
    category: 'brown',
    symbols: [{ s: 'targetAll' }],
    text: '다른 모든 플레이어가 손패 1장씩을 버린다. 에이스가 없으면 그중 2장까지 가져온다.',
    expansion: 'valley',
  },
  backfire: {
    kind: 'backfire',
    name: 'RITORNO DI FIAMMA',
    nameKo: '역화',
    category: 'brown',
    symbols: [{ s: 'missed' }],
    text: '빗나감! 1장으로 친다. 쏜 사람이 뱅!의 표적이 된다.',
    countsAs: 'missed',
    expansion: 'valley',
  },
  saved: {
    kind: 'saved',
    name: 'SALVO!',
    nameKo: '구조!',
    category: 'brown',
    symbols: [],
    text: '남의 차례에도 낼 수 있다. 다른 플레이어가 목숨 1을 잃는 것을 막는다. 그 사람이 살아남으면 그 사람 손이나 덱에서 2장을 가져온다.',
    outOfTurn: true,
    expansion: 'valley',
  },
  fanning: {
    kind: 'fanning',
    name: 'SVENTAGLIATA',
    nameKo: '패닝',
    category: 'brown',
    symbols: [{ s: 'bang' }, { s: 'targetReachable' }],
    text: '차례당 한 번인 뱅!으로 친다. 첫 표적에서 거리 1인 사람 1명(나 제외)도 뱅!의 표적이 된다.',
    expansion: 'valley',
  },
  tomahawk: {
    kind: 'tomahawk',
    name: 'TOMAHAWK',
    nameKo: '토마호크',
    category: 'brown',
    symbols: [{ s: 'bang' }, { s: 'weaponRange', range: 2 }],
    text: '거리 2 이내(무기 무관)의 플레이어 1명에게 뱅!을 쏜다. 뱅! 횟수를 쓰지 않는다.',
    expansion: 'valley',
  },
  tornado: {
    kind: 'tornado',
    name: 'TORNADO',
    nameKo: '토네이도',
    category: 'brown',
    symbols: [{ s: 'discard', amount: 1 }, { s: 'draw', amount: 2 }, { s: 'targetAll' }],
    text: '모두 손패 1장을 버리고(가능하면) 덱에서 2장을 가져온다.',
    expansion: 'valley',
  },
  lastCall: {
    kind: 'lastCall',
    name: 'ULTIMO GIRO',
    nameKo: '라스트 콜',
    category: 'brown',
    symbols: [{ s: 'heal', amount: 1 }],
    text: '목숨을 1 회복한다. 맥주가 아니다.',
    expansion: 'valley',
  },

  // ----- 파랑 -----------------------------------------------------------
  ghost: {
    kind: 'ghost',
    name: 'FANTASMA',
    nameKo: '유령',
    category: 'blue',
    equip: 'eliminated',
    symbols: [],
    text: '제거된 플레이어 1명 앞에 놓는다. 그 사람은 게임에 돌아오지만 목숨을 얻지도 잃지도 않는다.',
    expansion: 'valley',
  },
  lemat: {
    kind: 'lemat',
    name: 'LEMAT',
    nameKo: '르매트',
    category: 'blue',
    equip: 'weapon',
    weaponRange: 1,
    symbols: [{ s: 'weaponRange', range: 1 }],
    text: '사정거리 1. 자기 차례에 손의 아무 카드나 뱅!으로 쓸 수 있다.',
    expansion: 'valley',
  },
  rattlesnake: {
    kind: 'rattlesnake',
    name: 'SERPENTE A SONAGLI',
    nameKo: '방울뱀',
    category: 'blue',
    equip: 'other',
    symbols: [{ s: 'targetAny' }],
    text: '다른 플레이어 앞에 놓는다. 그 사람은 차례 시작에 판정해서 ♠가 나오면 목숨 1을 잃는다.',
    expansion: 'valley',
  },
  shotgun: {
    kind: 'shotgun',
    name: 'SHOTGUN',
    nameKo: '샷건',
    category: 'blue',
    equip: 'weapon',
    weaponRange: 1,
    symbols: [{ s: 'weaponRange', range: 1 }],
    text: '사정거리 1. 내가 누군가에게 목숨을 잃게 할 때마다 그 사람은 손패 1장을 골라 버린다.',
    expansion: 'valley',
  },
  bounty: {
    kind: 'bounty',
    name: 'TAGLIA',
    nameKo: '포상금',
    category: 'blue',
    equip: 'other',
    symbols: [{ s: 'targetAny' }],
    text: '다른 플레이어 앞에 놓는다. 그 사람이 뱅! 카드에 맞으면 쏜 사람이 덱에서 1장 가져온다.',
    expansion: 'valley',
  },
};

/** 덱 구성표. 유령 두 번째 장은 카드 목록의 "9-10" 을 따라 10♠ 로 둔다. */
const VALLEY_COMPOSITION: [ValleyKind, [Suit, Rank][]][] = [
  ['ghost', [['spades', '9'], ['spades', '10']]],
  ['lemat', [['diamonds', '4']]],
  ['rattlesnake', [['hearts', '7']]],
  ['shotgun', [['spades', 'K']]],
  ['bounty', [['clubs', '9']]],
  ['bandidos', [['diamonds', 'Q']]],
  ['escape', [['hearts', '3']]],
  ['aim', [['clubs', '6']]],
  ['poker', [['hearts', 'J']]],
  ['backfire', [['clubs', 'Q']]],
  ['saved', [['hearts', '5']]],
  ['fanning', [['spades', '2']]],
  ['tomahawk', [['diamonds', 'A']]],
  ['tornado', [['clubs', 'A']]],
  ['lastCall', [['diamonds', '8']]],
];

function buildValleyDeck(): CardInstance[] {
  const cards: CardInstance[] = [];
  for (const [kind, entries] of VALLEY_COMPOSITION) {
    for (const [suit, rank] of entries) {
      const id: CardId = `${kind}-${SUIT_CODE[suit]}${rank}`;
      cards.push({ id, kind: kind as CardKind, suit, rank });
    }
  }
  return cards;
}

/** 그림자의 계곡 16장 */
export const VALLEY_DECK: readonly CardInstance[] = Object.freeze(buildValleyDeck());
