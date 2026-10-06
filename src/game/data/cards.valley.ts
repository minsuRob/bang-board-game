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
    category: 'brown',
    symbols: [{ s: 'targetAll' }],
    expansion: 'valley',
  },
  escape: {
    kind: 'escape',
    name: 'FUGA',
    category: 'brown',
    symbols: [],
    outOfTurn: true,
    expansion: 'valley',
  },
  aim: {
    kind: 'aim',
    name: 'MIRA',
    category: 'brown',
    symbols: [],
    expansion: 'valley',
  },
  poker: {
    kind: 'poker',
    name: 'POKER',
    category: 'brown',
    symbols: [{ s: 'targetAll' }],
    expansion: 'valley',
  },
  backfire: {
    kind: 'backfire',
    name: 'RITORNO DI FIAMMA',
    category: 'brown',
    symbols: [{ s: 'missed' }],
    countsAs: 'missed',
    expansion: 'valley',
  },
  saved: {
    kind: 'saved',
    name: 'SALVO!',
    category: 'brown',
    symbols: [],
    outOfTurn: true,
    expansion: 'valley',
  },
  fanning: {
    kind: 'fanning',
    name: 'SVENTAGLIATA',
    category: 'brown',
    symbols: [{ s: 'bang' }, { s: 'targetReachable' }],
    expansion: 'valley',
  },
  tomahawk: {
    kind: 'tomahawk',
    name: 'TOMAHAWK',
    category: 'brown',
    symbols: [{ s: 'bang' }, { s: 'weaponRange', range: 2 }],
    expansion: 'valley',
  },
  tornado: {
    kind: 'tornado',
    name: 'TORNADO',
    category: 'brown',
    symbols: [{ s: 'discard', amount: 1 }, { s: 'draw', amount: 2 }, { s: 'targetAll' }],
    expansion: 'valley',
  },
  lastCall: {
    kind: 'lastCall',
    name: 'ULTIMO GIRO',
    category: 'brown',
    symbols: [{ s: 'heal', amount: 1 }],
    expansion: 'valley',
  },

  // ----- 파랑 -----------------------------------------------------------
  ghost: {
    kind: 'ghost',
    name: 'FANTASMA',
    category: 'blue',
    equip: 'eliminated',
    symbols: [],
    expansion: 'valley',
  },
  lemat: {
    kind: 'lemat',
    name: 'LEMAT',
    category: 'blue',
    equip: 'weapon',
    weaponRange: 1,
    symbols: [{ s: 'weaponRange', range: 1 }],
    expansion: 'valley',
  },
  rattlesnake: {
    kind: 'rattlesnake',
    name: 'SERPENTE A SONAGLI',
    category: 'blue',
    equip: 'other',
    symbols: [{ s: 'targetAny' }],
    expansion: 'valley',
  },
  shotgun: {
    kind: 'shotgun',
    name: 'SHOTGUN',
    category: 'blue',
    equip: 'weapon',
    weaponRange: 1,
    symbols: [{ s: 'weaponRange', range: 1 }],
    expansion: 'valley',
  },
  bounty: {
    kind: 'bounty',
    name: 'TAGLIA',
    category: 'blue',
    equip: 'other',
    symbols: [{ s: 'targetAny' }],
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
