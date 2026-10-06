/**
 * 골드 러시 장비 카드 24장 (갈색 16 · 검정 8).
 *
 * 능력 문구와 값은 dV Giochi 카드 그림(content/4/cards/*.png)을 직접 읽어 옮겼다.
 * 장수는 bang.dvgiochi.com/cardslist.php?id=4 의 'copie nel gioco' 를 따른다.
 *
 * 한글 이름은 원본 맵 패치노트에 나온 것(한잔의 술·병·편자·사금채취판·배낭·럼·금덩이)을
 * 그대로 쓰고, 나머지는 뜻을 옮겼다. 하이 눈 이벤트 '골드러시'와 헷갈리지 않도록
 * Corsa all'Oro 는 '황금 러시'로 부른다.
 *
 * 진행 규칙 (골드 러시 설명서):
 * - 장비 덱을 섞어 앞면으로 3장을 펼쳐 둔다 (상점). 사면 곧바로 덱에서 채운다.
 * - 버린 장비는 장비 버린 더미로 간다. 덱이 비면 그 더미를 섞어 새 덱을 만든다.
 */

import type { GoldCardDef, GoldCardId, GoldCardKind } from './types';

export const GOLD_CARD_DEFS: Record<GoldCardKind, GoldCardDef> = {
  shot: {
    kind: 'shot',
    name: 'Bicchierino',
    nameEn: 'Shot',
    cost: 1,
    category: 'brown',
    count: 3,
  },
  bottle: {
    kind: 'bottle',
    name: 'Bottiglia',
    nameEn: 'Bottle',
    cost: 2,
    category: 'brown',
    count: 3,
  },
  pardner: {
    kind: 'pardner',
    name: 'Complice',
    nameEn: 'Pardner',
    cost: 2,
    category: 'brown',
    count: 3,
  },
  goldRush: {
    kind: 'goldRush',
    name: "Corsa all'Oro",
    nameEn: 'Gold Rush',
    cost: 5,
    category: 'brown',
    count: 1,
  },
  wanted: {
    kind: 'wanted',
    name: 'Ricercato',
    nameEn: 'Wanted',
    cost: 2,
    category: 'brown',
    count: 3,
  },
  rhum: {
    kind: 'rhum',
    name: 'Rum',
    nameEn: 'Rhum',
    cost: 3,
    category: 'brown',
    count: 2,
  },
  unionPacific: {
    kind: 'unionPacific',
    name: 'Union Pacific',
    nameEn: 'Union Pacific',
    cost: 4,
    category: 'brown',
    count: 1,
  },
  calumet: {
    kind: 'calumet',
    name: 'Calumet',
    nameEn: 'Calumet',
    cost: 3,
    category: 'black',
    count: 1,
  },
  gunBelt: {
    kind: 'gunBelt',
    name: 'Cinturone',
    nameEn: 'Gun Belt',
    cost: 2,
    category: 'black',
    count: 1,
  },
  horseshoe: {
    kind: 'horseshoe',
    name: 'Ferro di Cavallo',
    nameEn: 'Horseshoe',
    cost: 2,
    category: 'black',
    count: 1,
  },
  pickaxe: {
    kind: 'pickaxe',
    name: 'Piccone',
    nameEn: 'Pickaxe',
    cost: 4,
    category: 'black',
    count: 1,
  },
  goldPan: {
    kind: 'goldPan',
    name: 'Setaccio',
    nameEn: 'Gold Pan',
    cost: 3,
    category: 'black',
    count: 1,
  },
  boots: {
    kind: 'boots',
    name: 'Stivali',
    nameEn: 'Boots',
    cost: 3,
    category: 'black',
    count: 1,
  },
  luckyCharm: {
    kind: 'luckyCharm',
    name: 'Talismano',
    nameEn: 'Lucky Charm',
    cost: 3,
    category: 'black',
    count: 1,
  },
  rucksack: {
    kind: 'rucksack',
    name: 'Zaino',
    nameEn: 'Rucksack',
    cost: 3,
    category: 'black',
    count: 1,
  },
};

export const GOLD_CARD_KINDS = Object.keys(GOLD_CARD_DEFS) as GoldCardKind[];

export type GoldCardInstance = { id: GoldCardId; kind: GoldCardKind };

/** 장비 덱 24장. id 는 'gr-<kind>-<n>' 이고 게임 내내 바뀌지 않는다 */
export const GOLD_DECK: readonly GoldCardInstance[] = GOLD_CARD_KINDS.flatMap((kind) =>
  Array.from({ length: GOLD_CARD_DEFS[kind].count }, (_, i) => ({
    id: `gr-${kind}-${i + 1}`,
    kind,
  })),
);

export const GOLD_CARDS_BY_ID: ReadonlyMap<GoldCardId, GoldCardInstance> = new Map(
  GOLD_DECK.map((c) => [c.id, c]),
);

/** 상점에 펼쳐 두는 장수 */
export const GOLD_SHOP_SIZE = 3;

/** 이 카드의 종류. 알 수 없는 id 면 던진다 */
export function goldKindOf(id: GoldCardId): GoldCardKind {
  const card = GOLD_CARDS_BY_ID.get(id);
  if (!card) throw new Error(`unknown gold rush card id: ${id}`);
  return card.kind;
}

export function goldDefOf(id: GoldCardId): GoldCardDef {
  return GOLD_CARD_DEFS[goldKindOf(id)];
}
