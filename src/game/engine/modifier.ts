/**
 * 능력 훅.
 *
 * 캐릭터·장비·이벤트 카드가 규칙에 끼어드는 모든 지점을 여기 한 곳에 모은다.
 * 엔진 코어는 캐릭터 id 를 절대 검사하지 않는다. 훅을 먼저 정하고 그 위에
 * 캐릭터를 얹는다. (그래야 캐릭터 복제·능력 무효화 같은 확장이 견딘다)
 *
 * Modifier 는 상태에 저장되지 않는다. 상태에는 캐릭터 id / 카드 id / 이벤트 id 만
 * 남고, 훅은 그때그때 조회한다 (engine/hooks.ts).
 */

import type { CardId, CardKind, Suit } from '../data/types';
import type { DamageCause, Frame, GameState, PlayerId } from './types';

export type ModCtx = {
  state: GameState;
  /** 이 훅을 소유한 플레이어 */
  pid: PlayerId;
};

export type AnytimeAbility = {
  key: string;
  label: string;
};

/** 손패의 아무 카드나 정해진 종류로 쓰는 능력. 차례당 한 번 (엉클 윌) */
export type PlayAsAbility = {
  key: string;
  label: string;
  as: CardKind;
  /** 이 종류의 카드만 바꿀 수 있다 (더 스팟: 뱅!만). 없으면 아무 카드나 */
  from?: CardKind[];
  /** 이 무늬의 카드만 (블랙 플라워 ♣). 실제 적용 무늬로 본다 */
  suit?: Suit;
  /** 차례당 뱅! 횟수를 쓰지 않는 추가 뱅!인가 (블랙 플라워) */
  extra?: boolean;
};

/** 차례당 한 번 구매 할인 (프리티 루제나) */
export type GoldDiscount = { key: string; amount: number };

/**
 * 금덩이를 내고 쓰는 능력.
 * - target 'bang': 뱅!처럼 사거리 안의 한 명을 고른다 (재키 무리에타)
 * - perTurn: 차례당 횟수 제한. usedThisTurn 에 key 가 들어간 개수로 센다
 * - whenDying: 목숨이 0 이하가 되어 맥주를 물을 때도 쓸 수 있다 (배낭)
 */
export type GoldAbility = {
  key: string;
  label: string;
  cost: number;
  target?: 'bang';
  perTurn?: number;
  whenDying?: boolean;
};

export type Modifier = {
  id: string;
  from: 'character' | 'equipment' | 'event';
  /** 장비에서 온 훅이면 그 카드 id */
  card?: CardId;
  /** 같은 훅이 여럿일 때의 발동 순서. 작을수록 먼저 (기본 50) */
  order?: number;

  // --- 거리 -------------------------------------------------------------
  /** 남이 나를 볼 때 더해지는 거리 (야생마 +1, 폴 리그렛 +1) */
  distanceAsTarget?: number;
  /** 내가 남을 볼 때 빼는 거리 (조준경 1, 로즈 둘란 1) */
  distanceAsViewer?: number;

  // --- 뱅! --------------------------------------------------------------
  /** 이번 차례에 쓸 수 있는 뱅! 최대 횟수 */
  bangLimit?: (base: number) => number;
  /** 내가 쏜 뱅!을 막는 데 필요한 빗나감 장수 (슬랩 더 킬러 2) */
  outgoingBangMisses?: (base: number) => number;
  /** 내가 뱅! 카드를 낼 때. 뱅! 프레임보다 먼저 해결된다 (콜로라도 빌) */
  onPlayBang?: (ctx: ModCtx, target: PlayerId) => Frame[];
  /** 뱅!의 표적이 될 때 (술통·주르도네) */
  onTargetedByBang?: (ctx: ModCtx, source: PlayerId | null) => Frame[];

  // --- 판정 -------------------------------------------------------------
  /** 판정에서 들여다보는 장수 (러키 듀크 2) */
  judgementPeek?: number;

  // --- 피해·탈락 --------------------------------------------------------
  /** 목숨을 잃을 때마다 (바트 캐시디·엘 그링고). amount 만큼 반복 호출되지 않고 한 번 받는다 */
  onDamaged?: (
    ctx: ModCtx,
    amount: number,
    source: PlayerId | null,
    cause?: DamageCause,
  ) => Frame[];
  /** 내가 누군가에게 목숨을 잃게 했을 때 (샷건). ctx.pid 는 가해자 */
  onDealtDamage?: (ctx: ModCtx, target: PlayerId, amount: number, cause: DamageCause) => Frame[];
  /** 손패가 비는 순간 (수지 라파예트) */
  onHandEmpty?: (ctx: ModCtx) => Frame[];
  /** 누군가 게임에서 제거될 때 (벌쳐 샘) */
  onEliminated?: (ctx: ModCtx, victim: PlayerId) => Frame[];

  // --- 턴·이벤트 --------------------------------------------------------
  /** 차례 시작 (하이 눈 피해·새로운 신분 교체) */
  onTurnStart?: (ctx: ModCtx) => Frame[];
  /** 이벤트가 공개되는 순간 (달톤 형제·의사) */
  onEventEnter?: (state: GameState) => Frame[];

  // --- 카드 가져오기 단계 -------------------------------------------------
  /** 가져오는 장수를 바꾼다 (갈증 1, 기차도착 +1, 유령 3) */
  drawCount?: (base: number, ctx: ModCtx) => number;
  /** 카드 가져오기 단계가 끝난 직후 (수갑의 무늬 선언) */
  onDrawPhaseEnd?: (ctx: ModCtx) => Frame[];
  /** 단계 자체를 대신한다. null 을 돌려주면 관여하지 않는다 (제시 존스·킷 칼슨·페드로) */
  drawPhase?: (ctx: ModCtx, count: number) => Frame[] | null;
  /** 뽑은 뒤 조건부 추가 (블랙 잭) */
  afterDraw?: (ctx: ModCtx, drawn: CardId[]) => Frame[];

  // --- 카드 사용 --------------------------------------------------------
  /** 손에 든 from 종류 카드를 as 종류로 취급해 쓸 수 있는가 (칼라미티 자넷) */
  canUseAs?: (from: CardKind, as: CardKind, ctx: ModCtx) => boolean;
  /**
   * 지금 이 종류의 카드를 쓸 수 있는가 (설교·목사·수갑).
   *
   * reactive 는 '사용'이 아니라 '버림'인 경우다. 결투 응수와 인디언 대응으로 내는
   * 뱅!, 빗나감! 제출이 여기 해당한다. 원작 룰이 사용과 버림을 구분하므로
   * 설교·수갑은 버림을 막지 않는다. (docs/edge-cases.md 쟁점 B)
   */
  canPlay?: (ctx: ModCtx, kind: CardKind, card: CardId, reactive: boolean) => boolean;
  /**
   * 자기 카드 사용 단계에, 손의 아무 카드나 as 종류로 쓴다 (엉클 윌).
   * 한 번 쓰면 key 가 usedThisTurn 에 들어가 그 차례에는 닫힌다.
   */
  playAnyAs?: PlayAsAbility;
  /**
   * 파랑 카드를 앞에 내려놓은 직후 (조니 키시).
   * holder 는 카드가 놓인 사람이다. 감옥이면 대상, 나머지는 자기 자신.
   */
  onPutInPlay?: (ctx: ModCtx, card: CardId, holder: PlayerId) => Frame[];

  /** 내 카드(손패·앞)를 남이 가져가거나 버리게 했을 때. taker 가 그 사람 (헨리 블록) */
  onCardTaken?: (ctx: ModCtx, taker: PlayerId) => Frame[];
  /** 다른 사람이 카드를 낼 때 (레모네이드 짐: 맥주) */
  onOtherPlaysCard?: (ctx: ModCtx, player: PlayerId, kind: CardKind) => Frame[];
  /** 뱅!이 아닌 갈색 카드의 대상이 됐을 때 이 종류의 카드로 피할 수 있다 (믹 디펜더: 빗나감!) */
  evadeBrownWith?: CardKind;

  // --- 기타 -------------------------------------------------------------
  /** 언제든 발동할 수 있는 능력 (시드 케첨) */
  anytime?: AnytimeAbility[];

  // --- 골드 러시 --------------------------------------------------------
  /** 차례를 마칠 때 들 수 있는 손패 한도 (기본 = 목숨, 탄띠 8) */
  handLimit?: (base: number) => number;
  /** 판정에서 한 장 더 펼친다 (편자 +1). 러키 듀크와 더해진다 */
  judgementPeekBonus?: number;
  /** 자기 차례가 끝날 때 (돈 벨) */
  onTurnEnd?: (ctx: ModCtx) => Frame[];
  /** 누군가 맥주를 낼 때마다 (마담 이토). 목숨 회복·금덩이·살아남기 모두 */
  onBeerPlayed?: (ctx: ModCtx, by: PlayerId) => Frame[];
  /** 차례에 한 번, 장비 하나를 싸게 산다 (프리티 루제나) */
  goldDiscount?: GoldDiscount;
  /** 금덩이를 내고 쓰는 능력 (재키·조시·래디·사금채취판·배낭) */
  goldAbilities?: GoldAbility[];
  /** 이 카드가 나에게 효과가 없는가 (칼루멧: 남이 낸 ♦) */
  immuneToCard?: (ctx: ModCtx, card: CardId, source: PlayerId) => boolean;

  // --- 이벤트 전용 --------------------------------------------------------
  /** 캐릭터 능력을 통째로 죽인다 (숙취) */
  disablesCharacterAbilities?: boolean;
  /** 차례 진행 방향 (골드러시 -1) */
  turnDirection?: 1 | -1;
  /** 제거된 플레이어도 자기 차례에 되살아난다 (유령도시) */
  resurrectsEliminated?: boolean;
  /** 앞에 놓인 카드(골드 장비 포함)의 효과를 전부 없앤다 (올가미) */
  disablesEquipment?: boolean;
};
