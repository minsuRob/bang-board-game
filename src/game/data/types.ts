/**
 * 도메인 원시 타입.
 *
 * 이 파일은 게임의 다른 어떤 모듈도 import 하지 않는다.
 * (engine → data 방향만 허용)
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export const SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

/** 무늬가 빨강인가 (술통·감옥 판정에 쓰이는 ♥ 여부는 별도로 확인할 것) */
export const RED_SUITS: readonly Suit[] = ['hearts', 'diamonds'];

export type Rank =
  | 'A' | '2' | '3' | '4' | '5' | '6' | '7'
  | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export const RANKS: readonly Rank[] = [
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K',
];

/** 판정 비교용 숫자값. A=1 ... K=13 (다이너마이트 ♠2~9 판정에 사용) */
export const RANK_VALUE: Record<Rank, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
};

export const SUIT_GLYPH: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

/** 카드 id 안에 쓰는 한 글자 무늬 코드 */
export const SUIT_CODE: Record<Suit, string> = {
  hearts: 'h',
  diamonds: 'd',
  clubs: 'c',
  spades: 's',
};

// ---------------------------------------------------------------------------
// 심벌 — reference/sc2-arcade/images/howtoplay_8d3e2f235798.jpg 범례 그대로
// ---------------------------------------------------------------------------

export type CardSymbol =
  /** 총알+X : 유효 거리 내 상대에게 뱅! */
  | { s: 'bang' }
  /** 모자+X : 뱅!에 당할 때 빗나감 효과 */
  | { s: 'missed' }
  /** 총알+초록십자 : 목숨 획득 (최대치 초과 회복 불가) */
  | { s: 'heal'; amount: number }
  /** 카드+화살표 : 카드 가져오기 */
  | { s: 'draw'; amount: number }
  /** 카드+X : 카드 버리기 */
  | { s: 'discard'; amount: number }
  /** 카드 2장 = : 효과 발동을 위해 희생할 추가 카드 */
  | { s: 'extraCost'; amount: number }
  /** 모자 1개 : 거리 무관하게 플레이어 1명 지정 */
  | { s: 'targetAny' }
  /** 모자 여러개 : 자기 자신을 제외한 전원 지정 */
  | { s: 'targetAll' }
  /** 모자(원) : 도달 가능한 거리 내 1명 지정 */
  | { s: 'targetReachable' }
  /** ① : 거리 1 이내 지정 (장착 무기 미고려) */
  | { s: 'range1' }
  /** ②③④⑤ : 무기 장착 시 얻는 사정거리 */
  | { s: 'weaponRange'; range: number };

// ---------------------------------------------------------------------------
// 플레잉 카드
// ---------------------------------------------------------------------------

export type CardKind =
  // 갈색 (즉시 사용)
  | 'bang' | 'missed' | 'beer' | 'saloon' | 'stagecoach' | 'wellsFargo'
  | 'generalStore' | 'gatling' | 'indians' | 'duel' | 'panic' | 'catBalou'
  // 파랑 (장착)
  | 'volcanic' | 'schofield' | 'remington' | 'carabine' | 'winchester'
  | 'scope' | 'mustang' | 'barrel' | 'jail' | 'dynamite';

/** 갈색 = 사용 즉시 버림, 파랑 = 테이블에 장착 */
export type CardCategory = 'brown' | 'blue';

/** 파랑 카드의 장착 위치 */
export type EquipSlot =
  /** 무기 (한 번에 하나) */
  | 'weapon'
  /** 자기 앞에 놓는 보조 장비 (조준경·야생마·술통·다이너마이트) */
  | 'self'
  /** 다른 플레이어 앞에 놓는 장비 (감옥) */
  | 'other';

export type CardDef = {
  kind: CardKind;
  /** 도감 표기 (이탈리아어/영어 원어) */
  name: string;
  nameKo: string;
  category: CardCategory;
  equip?: EquipSlot;
  /** 무기 사정거리. 무기가 아니면 undefined (맨손은 1) */
  weaponRange?: number;
  symbols: CardSymbol[];
  text: string;
};

/** 덱에 실제로 존재하는 카드 한 장. id는 게임 내내 고유하고 안정적이다. */
export type CardId = string;

export type CardInstance = {
  id: CardId;
  kind: CardKind;
  suit: Suit;
  rank: Rank;
};

// ---------------------------------------------------------------------------
// 캐릭터
// ---------------------------------------------------------------------------

export type CharacterId =
  | 'bartCassidy' | 'blackJack' | 'calamityJanet' | 'elGringo' | 'jesseJones'
  | 'jourdonnais' | 'kitCarlson' | 'luckyDuke' | 'paulRegret' | 'pedroRamirez'
  | 'roseDoolan' | 'sidKetchum' | 'slabTheKiller' | 'suzyLafayette'
  | 'vultureSam' | 'willyTheKid';

export type CharacterDef = {
  id: CharacterId;
  name: string;
  nameKo: string;
  /** 캐릭터 카드에 그려진 총알 수. 보안관은 여기에 +1 */
  maxHp: number;
  ability: string;
};

// ---------------------------------------------------------------------------
// 역할
// ---------------------------------------------------------------------------

export type Role = 'sheriff' | 'deputy' | 'outlaw' | 'renegade';

// ---------------------------------------------------------------------------
// 이벤트 카드 (하이 눈 등 확장판)
// ---------------------------------------------------------------------------

export type Expansion = 'highnoon';

export type EventCardId =
  | 'blessing' | 'curse' | 'ghostTown' | 'goldRush' | 'hangover'
  | 'shootout' | 'theDaltons' | 'theDoctor' | 'theReverend' | 'theSermon'
  | 'trainArrival' | 'thirst' | 'newIdentity' | 'handcuffs' | 'highNoon';

export type EventCardDef = {
  id: EventCardId;
  expansion: Expansion;
  name: string;
  nameKo: string;
  text: string;
  /** 이벤트 덱 맨 밑에 고정되는 마지막 카드인가 (하이 눈) */
  isFinal?: boolean;
};
