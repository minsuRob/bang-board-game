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
    nameKo: '한잔의 술',
    cost: 1,
    category: 'brown',
    count: 3,
    text: '원하는 플레이어 한 명(자신도 된다)이 목숨 1을 회복합니다.',
  },
  bottle: {
    kind: 'bottle',
    name: 'Bottiglia',
    nameEn: 'Bottle',
    nameKo: '병',
    cost: 2,
    category: 'brown',
    count: 3,
    text: '<강탈>, <맥주>, <뱅!> 중 하나로 사용합니다. 그 카드로 치지는 않으며, 이 뱅!은 차례당 한 번 제한에 들어가지 않습니다.',
  },
  pardner: {
    kind: 'pardner',
    name: 'Complice',
    nameEn: 'Pardner',
    nameKo: '동업자',
    cost: 2,
    category: 'brown',
    count: 3,
    text: '<잡화점>, <결투>, <캣 벌로우> 중 하나로 사용합니다. 그 카드로 치지는 않습니다.',
  },
  goldRush: {
    kind: 'goldRush',
    name: "Corsa all'Oro",
    nameEn: 'Gold Rush',
    nameKo: '황금 러시',
    cost: 5,
    category: 'brown',
    count: 1,
    text: '차례가 끝납니다. 목숨을 전부 회복한 뒤 차례를 한 번 더 진행합니다.',
  },
  wanted: {
    kind: 'wanted',
    name: 'Ricercato',
    nameEn: 'Wanted',
    nameKo: '수배',
    cost: 2,
    category: 'brown',
    count: 3,
    text: '자기 자신을 포함해 원하는 플레이어 앞에 놓습니다. 그 사람을 제거한 사람이 카드 2장과 금덩이 1개를 받습니다.',
  },
  rhum: {
    kind: 'rhum',
    name: 'Rum',
    nameEn: 'Rhum',
    nameKo: '럼',
    cost: 3,
    category: 'brown',
    count: 2,
    text: '카드 4장을 펼칩니다. 나온 무늬의 가짓수만큼 목숨을 회복합니다.',
  },
  unionPacific: {
    kind: 'unionPacific',
    name: 'Union Pacific',
    nameEn: 'Union Pacific',
    nameKo: '유니언 퍼시픽',
    cost: 4,
    category: 'brown',
    count: 1,
    text: '카드 더미에서 카드 4장을 가져옵니다.',
  },
  calumet: {
    kind: 'calumet',
    name: 'Calumet',
    nameEn: 'Calumet',
    nameKo: '칼루멧',
    cost: 3,
    category: 'black',
    count: 1,
    text: '다른 사람이 낸 다이아몬드 카드는 나에게 효과가 없습니다. 결투에는 적용되지 않습니다.',
  },
  gunBelt: {
    kind: 'gunBelt',
    name: 'Cinturone',
    nameEn: 'Gun Belt',
    nameKo: '탄띠',
    cost: 2,
    category: 'black',
    count: 1,
    text: '차례를 마칠 때 손에 카드를 8장까지 들 수 있습니다.',
  },
  horseshoe: {
    kind: 'horseshoe',
    name: 'Ferro di Cavallo',
    nameEn: 'Horseshoe',
    nameKo: '편자',
    cost: 2,
    category: 'black',
    count: 1,
    text: "'카드 펼치기'를 할 때마다 한 장을 더 펼치고 결과를 고릅니다.",
  },
  pickaxe: {
    kind: 'pickaxe',
    name: 'Piccone',
    nameEn: 'Pickaxe',
    nameKo: '곡괭이',
    cost: 4,
    category: 'black',
    count: 1,
    text: "'카드 가져오기' 단계에서 카드를 한 장 더 가져옵니다.",
  },
  goldPan: {
    kind: 'goldPan',
    name: 'Setaccio',
    nameEn: 'Gold Pan',
    nameKo: '사금채취판',
    cost: 3,
    category: 'black',
    count: 1,
    text: '금덩이 1개를 내고 카드 더미에서 카드 한 장을 가져옵니다. 차례당 2번까지.',
  },
  boots: {
    kind: 'boots',
    name: 'Stivali',
    nameEn: 'Boots',
    nameKo: '장화',
    cost: 3,
    category: 'black',
    count: 1,
    text: '목숨 1을 잃을 때마다 카드 더미에서 카드 한 장을 가져옵니다. 마지막 목숨에는 적용되지 않습니다.',
  },
  luckyCharm: {
    kind: 'luckyCharm',
    name: 'Talismano',
    nameEn: 'Lucky Charm',
    nameKo: '부적',
    cost: 3,
    category: 'black',
    count: 1,
    text: '목숨 1을 잃을 때마다 금덩이 1개를 받습니다. 마지막 목숨에는 적용되지 않습니다.',
  },
  rucksack: {
    kind: 'rucksack',
    name: 'Zaino',
    nameEn: 'Rucksack',
    nameKo: '배낭',
    cost: 3,
    category: 'black',
    count: 1,
    text: '금덩이 2개를 내고 목숨 1을 회복합니다. 마지막 목숨을 잃을 때는 남의 차례에도 쓸 수 있습니다.',
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
  if (!card) throw new Error(`알 수 없는 골드 러시 카드 id: ${id}`);
  return card.kind;
}

export function goldDefOf(id: GoldCardId): GoldCardDef {
  return GOLD_CARD_DEFS[goldKindOf(id)];
}
