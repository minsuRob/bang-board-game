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

export const CARD_DEFS: Record<CardKind, CardDef> = {
  // ----- 갈색: 즉시 사용 -------------------------------------------------
  bang: {
    kind: 'bang',
    name: 'BANG!',
    nameKo: '뱅!',
    category: 'brown',
    symbols: [{ s: 'bang' }, { s: 'targetReachable' }],
    text: '사정거리 안의 플레이어 1명에게 목숨 1을 잃게 한다. 자기 차례에 1번만 사용할 수 있다.',
  },
  missed: {
    kind: 'missed',
    name: 'MANCATO!',
    nameKo: '빗나감!',
    category: 'brown',
    symbols: [{ s: 'missed' }],
    text: '자신을 향한 뱅! 1발을 무효로 만든다.',
  },
  beer: {
    kind: 'beer',
    name: 'BIRRA',
    nameKo: '맥주',
    category: 'brown',
    symbols: [{ s: 'heal', amount: 1 }],
    text: '목숨을 1 회복한다. 생존자가 2명뿐이면 아무 효과가 없다.',
  },
  saloon: {
    kind: 'saloon',
    name: 'SALOON',
    nameKo: '주점',
    category: 'brown',
    symbols: [{ s: 'heal', amount: 1 }, { s: 'targetAll' }],
    text: '자신을 포함한 모든 플레이어가 목숨을 1 회복한다.',
  },
  stagecoach: {
    kind: 'stagecoach',
    name: 'DILIGENZA',
    nameKo: '역마차',
    category: 'brown',
    symbols: [{ s: 'draw', amount: 2 }],
    text: '덱에서 카드 2장을 가져온다.',
  },
  wellsFargo: {
    kind: 'wellsFargo',
    name: 'WELLS FARGO',
    nameKo: '웰스 파고',
    category: 'brown',
    symbols: [{ s: 'draw', amount: 3 }],
    text: '덱에서 카드 3장을 가져온다.',
  },
  generalStore: {
    kind: 'generalStore',
    name: 'EMPORIO',
    nameKo: '잡화점',
    category: 'brown',
    symbols: [{ s: 'draw', amount: 1 }, { s: 'targetAll' }],
    text: '생존자 수만큼 카드를 펼친다. 사용자부터 시계 방향으로 1장씩 고른다.',
  },
  gatling: {
    kind: 'gatling',
    name: 'GATLING',
    nameKo: '기관총',
    category: 'brown',
    symbols: [{ s: 'bang' }, { s: 'targetAll' }],
    text: '자신을 제외한 모든 플레이어에게 거리와 무관하게 뱅!을 쏜다.',
  },
  indians: {
    kind: 'indians',
    name: 'INDIANI!',
    nameKo: '인디언!',
    category: 'brown',
    symbols: [{ s: 'bang' }, { s: 'targetAll' }],
    text: '자신을 제외한 모든 플레이어는 뱅! 카드를 버리거나 목숨 1을 잃는다.',
  },
  duel: {
    kind: 'duel',
    name: 'DUELLO',
    nameKo: '결투',
    category: 'brown',
    symbols: [{ s: 'bang' }, { s: 'targetAny' }],
    text: '거리와 무관하게 1명을 지목한다. 지목당한 쪽부터 번갈아 뱅!을 버리고, 먼저 못 내는 쪽이 목숨 1을 잃는다.',
  },
  panic: {
    kind: 'panic',
    name: 'PANICO!',
    nameKo: '강탈',
    category: 'brown',
    symbols: [{ s: 'draw', amount: 1 }, { s: 'range1' }],
    text: '거리 1 이내(무기 미고려)의 플레이어에게서 카드 1장을 가져온다.',
  },
  catBalou: {
    kind: 'catBalou',
    name: 'CAT BALOU',
    nameKo: '캣 발루',
    category: 'brown',
    symbols: [{ s: 'discard', amount: 1 }, { s: 'targetAny' }],
    text: '거리와 무관하게 1명을 지목해 카드 1장을 버리게 한다.',
  },

  // ----- 파랑: 무기 -----------------------------------------------------
  volcanic: {
    kind: 'volcanic',
    name: 'VOLCANIC',
    nameKo: '볼캐닉',
    category: 'blue',
    equip: 'weapon',
    weaponRange: 1,
    symbols: [{ s: 'weaponRange', range: 1 }],
    text: '사정거리 1. 자기 차례에 뱅!을 횟수 제한 없이 사용할 수 있다.',
  },
  schofield: {
    kind: 'schofield',
    name: 'SCHOFIELD',
    nameKo: '스코필드',
    category: 'blue',
    equip: 'weapon',
    weaponRange: 2,
    symbols: [{ s: 'weaponRange', range: 2 }],
    text: '사정거리 2.',
  },
  remington: {
    kind: 'remington',
    name: 'REMINGTON',
    nameKo: '레밍턴',
    category: 'blue',
    equip: 'weapon',
    weaponRange: 3,
    symbols: [{ s: 'weaponRange', range: 3 }],
    text: '사정거리 3.',
  },
  carabine: {
    kind: 'carabine',
    name: 'REV. CARABINE',
    nameKo: '카빈',
    category: 'blue',
    equip: 'weapon',
    weaponRange: 4,
    symbols: [{ s: 'weaponRange', range: 4 }],
    text: '사정거리 4.',
  },
  winchester: {
    kind: 'winchester',
    name: 'WINCHESTER',
    nameKo: '윈체스터',
    category: 'blue',
    equip: 'weapon',
    weaponRange: 5,
    symbols: [{ s: 'weaponRange', range: 5 }],
    text: '사정거리 5.',
  },

  // ----- 파랑: 기타 장비 -------------------------------------------------
  scope: {
    kind: 'scope',
    name: 'MIRINO',
    nameKo: '조준경',
    category: 'blue',
    equip: 'self',
    symbols: [],
    text: '다른 사람을 볼 때 거리가 1 가까워진다.',
  },
  mustang: {
    kind: 'mustang',
    name: 'MUSTANG',
    nameKo: '야생마',
    category: 'blue',
    equip: 'self',
    symbols: [],
    text: '다른 사람이 볼 때 거리가 1 멀어진다.',
  },
  barrel: {
    kind: 'barrel',
    name: 'BARILE',
    nameKo: '술통',
    category: 'blue',
    equip: 'self',
    symbols: [{ s: 'missed' }],
    text: '뱅!의 표적이 될 때마다 판정한다. ♥가 나오면 빗나감! 효과를 얻는다.',
  },
  jail: {
    kind: 'jail',
    name: 'PRIGIONE',
    nameKo: '감옥',
    category: 'blue',
    equip: 'other',
    symbols: [{ s: 'targetAny' }],
    text: '보안관을 제외한 1명 앞에 놓는다. 그 사람은 차례 시작에 판정해서 ♥가 아니면 차례를 통째로 건너뛴다.',
  },
  dynamite: {
    kind: 'dynamite',
    name: 'DINAMITE',
    nameKo: '다이너마이트',
    category: 'blue',
    equip: 'self',
    symbols: [],
    text: '차례 시작에 판정한다. ♠2~9이면 목숨 3을 잃고 버려지며, 아니면 다음 사람에게 넘어간다.',
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
