/**
 * 기본판 플레잉 카드 22종 / 80장.
 *
 * 종류·심벌은 도감 이미지(reference/sc2-arcade/images/howtoplay_058e97e1463e.jpg)에서,
 * 무늬·숫자·매수는 dV Giochi 공식 카드 목록에서 가져왔다.
 * 무늬/숫자는 판정(술통 ♥, 감옥 ♥ 탈출, 다이너마이트 ♠2~9)과
 * 블랙 잭·수갑 같은 능력에만 영향을 준다.
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
import { VALLEY_CARD_DEFS, VALLEY_DECK } from './cards.valley';
import type { Expansion } from './types';

export const CARD_DEFS: Record<CardKind, CardDef> = {
  ...VALLEY_CARD_DEFS,
  // ----- 갈색: 즉시 사용 -------------------------------------------------
  bang: {
    kind: 'bang',
    name: 'BANG!',
    category: 'brown',
    symbols: [{ s: 'bang' }, { s: 'targetReachable' }],
  },
  missed: {
    kind: 'missed',
    name: 'MANCATO!',
    category: 'brown',
    symbols: [{ s: 'missed' }],
  },
  beer: {
    kind: 'beer',
    name: 'BIRRA',
    category: 'brown',
    symbols: [{ s: 'heal', amount: 1 }],
  },
  saloon: {
    kind: 'saloon',
    name: 'SALOON',
    category: 'brown',
    symbols: [{ s: 'heal', amount: 1 }, { s: 'targetAll' }],
  },
  stagecoach: {
    kind: 'stagecoach',
    name: 'DILIGENZA',
    category: 'brown',
    symbols: [{ s: 'draw', amount: 2 }],
  },
  wellsFargo: {
    kind: 'wellsFargo',
    name: 'WELLS FARGO',
    category: 'brown',
    symbols: [{ s: 'draw', amount: 3 }],
  },
  generalStore: {
    kind: 'generalStore',
    name: 'EMPORIO',
    category: 'brown',
    symbols: [{ s: 'draw', amount: 1 }, { s: 'targetAll' }],
  },
  gatling: {
    kind: 'gatling',
    name: 'GATLING',
    category: 'brown',
    symbols: [{ s: 'bang' }, { s: 'targetAll' }],
  },
  indians: {
    kind: 'indians',
    name: 'INDIANI!',
    category: 'brown',
    symbols: [{ s: 'bang' }, { s: 'targetAll' }],
  },
  duel: {
    kind: 'duel',
    name: 'DUELLO',
    category: 'brown',
    symbols: [{ s: 'bang' }, { s: 'targetAny' }],
  },
  panic: {
    kind: 'panic',
    name: 'PANICO!',
    category: 'brown',
    symbols: [{ s: 'draw', amount: 1 }, { s: 'range1' }],
  },
  catBalou: {
    kind: 'catBalou',
    name: 'CAT BALOU',
    category: 'brown',
    symbols: [{ s: 'discard', amount: 1 }, { s: 'targetAny' }],
  },

  // ----- 파랑: 무기 -----------------------------------------------------
  volcanic: {
    kind: 'volcanic',
    name: 'VOLCANIC',
    category: 'blue',
    equip: 'weapon',
    weaponRange: 1,
    symbols: [{ s: 'weaponRange', range: 1 }],
  },
  schofield: {
    kind: 'schofield',
    name: 'SCHOFIELD',
    category: 'blue',
    equip: 'weapon',
    weaponRange: 2,
    symbols: [{ s: 'weaponRange', range: 2 }],
  },
  remington: {
    kind: 'remington',
    name: 'REMINGTON',
    category: 'blue',
    equip: 'weapon',
    weaponRange: 3,
    symbols: [{ s: 'weaponRange', range: 3 }],
  },
  carabine: {
    kind: 'carabine',
    name: 'REV. CARABINE',
    category: 'blue',
    equip: 'weapon',
    weaponRange: 4,
    symbols: [{ s: 'weaponRange', range: 4 }],
  },
  winchester: {
    kind: 'winchester',
    name: 'WINCHESTER',
    category: 'blue',
    equip: 'weapon',
    weaponRange: 5,
    symbols: [{ s: 'weaponRange', range: 5 }],
  },

  // ----- 파랑: 기타 장비 -------------------------------------------------
  scope: {
    kind: 'scope',
    name: 'MIRINO',
    category: 'blue',
    equip: 'self',
    symbols: [],
  },
  mustang: {
    kind: 'mustang',
    name: 'MUSTANG',
    category: 'blue',
    equip: 'self',
    symbols: [],
  },
  barrel: {
    kind: 'barrel',
    name: 'BARILE',
    category: 'blue',
    equip: 'self',
    symbols: [{ s: 'missed' }],
  },
  jail: {
    kind: 'jail',
    name: 'PRIGIONE',
    category: 'blue',
    equip: 'other',
    symbols: [{ s: 'targetAny' }],
  },
  dynamite: {
    kind: 'dynamite',
    name: 'DINAMITE',
    category: 'blue',
    equip: 'self',
    symbols: [],
  },
};

/** 덱 구성표. [무늬, 숫자] 목록이 곧 매수다. */
const DECK_COMPOSITION: [CardKind, [Suit, Rank][]][] = [
  ['bang', [
    ['spades', 'A'],
    ['diamonds', '2'], ['diamonds', '3'], ['diamonds', '4'], ['diamonds', '5'],
    ['diamonds', '6'], ['diamonds', '7'], ['diamonds', '8'], ['diamonds', '9'],
    ['diamonds', '10'], ['diamonds', 'J'], ['diamonds', 'Q'], ['diamonds', 'K'],
    ['diamonds', 'A'],
    ['clubs', '2'], ['clubs', '3'], ['clubs', '4'], ['clubs', '5'],
    ['clubs', '6'], ['clubs', '7'], ['clubs', '8'], ['clubs', '9'],
    ['hearts', 'Q'], ['hearts', 'K'], ['hearts', 'A'],
  ]],
  ['missed', [
    ['clubs', '10'], ['clubs', 'J'], ['clubs', 'Q'], ['clubs', 'K'], ['clubs', 'A'],
    ['spades', '2'], ['spades', '3'], ['spades', '4'], ['spades', '5'],
    ['spades', '6'], ['spades', '7'], ['spades', '8'],
  ]],
  ['beer', [
    ['hearts', '6'], ['hearts', '7'], ['hearts', '8'],
    ['hearts', '9'], ['hearts', '10'], ['hearts', 'J'],
  ]],
  ['saloon', [['hearts', '5']]],
  ['wellsFargo', [['hearts', '3']]],
  ['stagecoach', [['spades', '9'], ['spades', '9']]],
  ['generalStore', [['clubs', '9'], ['spades', 'Q']]],
  ['gatling', [['hearts', '10']]],
  ['indians', [['diamonds', 'K'], ['diamonds', 'A']]],
  ['duel', [['diamonds', 'Q'], ['spades', 'J'], ['clubs', '8']]],
  ['panic', [['hearts', 'J'], ['hearts', 'Q'], ['hearts', 'A'], ['diamonds', '8']]],
  ['catBalou', [['hearts', 'K'], ['diamonds', '9'], ['diamonds', '10'], ['diamonds', 'J']]],
  ['mustang', [['hearts', '8'], ['hearts', '9']]],
  ['scope', [['spades', 'A']]],
  ['barrel', [['spades', 'Q'], ['spades', 'K']]],
  ['jail', [['spades', 'J'], ['hearts', '4'], ['spades', '10']]],
  ['dynamite', [['hearts', '2']]],
  ['volcanic', [['spades', '10'], ['clubs', '10']]],
  ['schofield', [['clubs', 'J'], ['clubs', 'Q'], ['spades', 'K']]],
  ['remington', [['clubs', 'K']]],
  ['carabine', [['clubs', 'A']]],
  ['winchester', [['spades', '8']]],
];

function buildBaseDeck(): CardInstance[] {
  const cards: CardInstance[] = [];
  const used = new Set<CardId>();

  for (const [kind, entries] of DECK_COMPOSITION) {
    for (const [suit, rank] of entries) {
      let id: CardId = `${kind}-${SUIT_CODE[suit]}${rank}`;
      // 같은 종류에 같은 무늬/숫자가 두 장 있는 경우(역마차 ♠9 ×2)를 위해 접미사
      let n = 2;
      while (used.has(id)) id = `${kind}-${SUIT_CODE[suit]}${rank}#${n++}`;
      used.add(id);
      cards.push({ id, kind, suit, rank });
    }
  }
  return cards;
}

/** 기본판 80장. 순서는 항상 같으며, 셔플은 엔진의 시드 RNG가 담당한다. */
export const BASE_DECK: readonly CardInstance[] = Object.freeze(buildBaseDeck());

export const BASE_CARDS_BY_ID: ReadonlyMap<CardId, CardInstance> = new Map(
  BASE_DECK.map((c) => [c.id, c]),
);

/** 모든 확장판 카드까지 합친 전체 (기본판 80 + 그림자의 계곡 16) */
export const ALL_CARDS: readonly CardInstance[] = Object.freeze([...BASE_DECK, ...VALLEY_DECK]);

export const ALL_CARDS_BY_ID: ReadonlyMap<CardId, CardInstance> = new Map(
  ALL_CARDS.map((c) => [c.id, c]),
);

/** 이 확장판 조합으로 섞을 덱. 기본판 순서 뒤에 확장 카드가 붙는다 */
export function deckFor(expansions: readonly Expansion[]): CardInstance[] {
  return expansions.includes('valley') ? [...BASE_DECK, ...VALLEY_DECK] : [...BASE_DECK];
}
