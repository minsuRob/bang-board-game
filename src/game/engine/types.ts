/**
 * 엔진 상태·액션·프레임 타입.
 *
 * 이 디렉터리(engine/)는 React / React Native / Expo / zustand / firebase 를
 * 절대 import 하지 않는다. 오직 ../data 와 서로만 참조한다. (boundary.test.ts 가 강제)
 *
 * GameState 는 JSON 으로 완전히 왕복 가능해야 한다. 함수·클래스·Map·Set 금지.
 * 락스텝 멀티플레이가 이 성질 위에 서 있다.
 */

import type {
  CardId,
  CardKind,
  CharacterId,
  EventCardId,
  Expansion,
  Role,
  Suit,
} from '../data/types';
import type { RngState } from './rng';

export type PlayerId = string;

export type Phase = 'draw' | 'play' | 'discard';

export type Player = {
  id: PlayerId;
  /** 착석 번호. 배열 인덱스와 같으며 게임 내내 바뀌지 않는다 (거리 계산의 기준) */
  seat: number;
  name: string;
  role: Role;
  character: CharacterId;
  /** 하이 눈 '새로운 신분'용 예비 캐릭터 */
  spareCharacter: CharacterId | null;
  hp: number;
  /** 캐릭터 총알 수. 보안관은 +1 */
  maxHp: number;
  hand: CardId[];
  /** 앞에 놓인 파랑 카드. 무기·조준경·야생마·술통·다이너마이트·감옥 전부 포함 */
  equipment: CardId[];
  alive: boolean;
  /** 유령도시로 이번 차례만 되살아난 상태 (alive 는 false 로 둔다) */
  ghost: boolean;
  /** 역할 공개 여부. 보안관은 처음부터, 나머지는 탈락할 때 */
  roleRevealed: boolean;
  /** 이번 차례에 이미 쓴 1회성 능력 키 목록 */
  usedThisTurn: string[];
};

export type GameConfig = {
  playerCount: number;
  expansions: Expansion[];
};

export type TurnState = {
  active: PlayerId;
  phase: Phase;
  /** 이번 차례에 사용한 뱅! 횟수 */
  bangsPlayed: number;
  /** 보안관이 차례를 시작한 횟수. 첫 차례가 1라운드 */
  round: number;
  /** 수갑(하이 눈)으로 선언된 무늬 */
  handcuffsSuit: Suit | null;
  /** 카드 가져오기 단계를 이미 마쳤는가 */
  drawn: boolean;
  /** 복수(한줌의 카드)로 얻은 추가 차례인가. 추가 차례에는 다시 펼치지 않는다 */
  extra?: boolean;
  /** 서부의 법(한줌의 카드): 낼 수 있으면 이번 차례에 반드시 내야 하는 카드 */
  mustPlay?: CardId;
};

export type EventState = {
  /** 남은 이벤트 덱. 맨 앞이 다음에 공개될 카드 */
  deck: EventCardId[];
  current: EventCardId | null;
  /** 지금까지 공개된 이벤트 (UI·로그용) */
  past: EventCardId[];
  /** 가장 먼저 제거된 플레이어 (망자) */
  firstOut?: PlayerId;
  /** 망자로 이미 돌아온 적이 있는가 */
  deadManUsed?: boolean;
};

export type GameResult = {
  winners: Role[];
  winnerIds: PlayerId[];
  reason: string;
};

// ---------------------------------------------------------------------------
// 판정 (카드 펼치기)
// ---------------------------------------------------------------------------

export type JudgementPurpose =
  /** 술통: ♥ 면 빗나감 1회 */
  | 'barrel'
  /** 주르도네 능력: ♥ 면 빗나감 1회 */
  | 'jourdonnais'
  /** 다이너마이트: ♠2~9 면 폭발 */
  | 'dynamite'
  /** 감옥: ♥ 면 탈출, 아니면 차례를 건너뜀 */
  | 'jail'
  /** 복수(한줌의 카드): ♥ 면 차례를 한 번 더 */
  | 'vendetta';

// ---------------------------------------------------------------------------
// 효과 스택 프레임
//
// 배열의 마지막 원소가 스택의 top 이다. 프레임은 자기 진행 상태를 직접 들고 있어서
// 입력 대기(awaiting)로 중단됐다가 재개돼도 이어서 해결된다.
// ---------------------------------------------------------------------------

export type DamageCause =
  | 'bang'
  | 'gatling'
  | 'indians'
  | 'duel'
  | 'dynamite'
  | 'highNoon'
  /** 한줌의 카드: 차례 시작에 손패 장수만큼 맞는 뱅! */
  | 'fistful'
  | 'russianRoulette'
  | 'bloodBrothers';

export type Frame =
  // 턴 흐름
  | { k: 'turnStart'; pid: PlayerId; extra?: boolean }
  | { k: 'revealEvent' }
  | { k: 'eventTurnStart'; pid: PlayerId }
  | { k: 'drawPhase'; pid: PlayerId; done: number }
  /** 카드 사용 단계. 이 프레임이 top 인 동안 엔진은 멈추고 플레이어 입력을 기다린다. */
  | { k: 'playPhase'; pid: PlayerId }
  /** 버리기 단계. 손패가 목숨 이하가 될 때까지 멈춘다. */
  | { k: 'discardPhase'; pid: PlayerId }
  | { k: 'turnEnd'; pid: PlayerId }
  | { k: 'advanceTurn'; from: PlayerId }
  // 판정
  | { k: 'judgement'; pid: PlayerId; purpose: JudgementPurpose; candidates: CardId[] }
  // 공격 체인
  | {
      k: 'bang';
      /** 쏜 사람. 한줌의 카드처럼 쏜 사람이 없는 뱅!이면 null */
      source: PlayerId | null;
      target: PlayerId;
      /** 아직 더 내야 하는 빗나감 장수 */
      missesRequired: number;
      cause: DamageCause;
      /** 술통/주르도네 판정을 이미 돌렸는가 */
      dodgeChecked: boolean;
    }
  | { k: 'gatling'; source: PlayerId; queue: PlayerId[] }
  | { k: 'indians'; source: PlayerId; queue: PlayerId[] }
  | { k: 'duel'; a: PlayerId; b: PlayerId; toPlay: PlayerId }
  // 피해와 탈락
  /**
   * source = 반격 능력(엘 그링고)이 향하는 가해자. 없을 수 있다.
   * credit = 이 피해로 죽었을 때 현상금·벌칙을 받는 사람. source 와 다를 수 있다.
   *   (자기가 신청한 결투에서 졌을 때: source 는 없고 credit 은 상대)
   */
  | {
      k: 'damage';
      target: PlayerId;
      amount: number;
      source: PlayerId | null;
      credit?: PlayerId | null;
      cause: DamageCause;
    }
  | { k: 'checkDeath'; target: PlayerId; source: PlayerId | null }
  | { k: 'eliminate'; target: PlayerId; killer: PlayerId | null }
  | { k: 'eliminateCleanup'; target: PlayerId }
  | { k: 'bountyOrPenalty'; killer: PlayerId | null; victim: PlayerId }
  // 카드 이동
  | { k: 'drawCards'; pid: PlayerId; count: number; reason: string }
  /** 남의 손에서 무작위로 가져온다 (엘 그링고·제시 존스) */
  | { k: 'drawFromPlayer'; pid: PlayerId; from: PlayerId; count: number }
  /** 그 사람의 손패와 장비를 전부 가져온다 (벌쳐 샘) */
  | { k: 'takeAllCards'; pid: PlayerId; from: PlayerId }
  /** 목숨 회복 */
  | { k: 'heal'; pid: PlayerId; amount: number }
  /** 주점: 전원 회복 */
  | { k: 'saloon'; queue: PlayerId[] }
  | { k: 'generalStore'; source: PlayerId; queue: PlayerId[]; revealed: CardId[] }
  | { k: 'steal'; source: PlayerId; target: PlayerId; mode: 'panic' | 'catBalou' }
  /** 조니 키시: 방금 내려놓은 card 와 이름이 같은 다른 카드를 모두 버린다 */
  | { k: 'discardSameName'; pid: PlayerId; card: CardId }
  // 캐릭터·이벤트가 만드는 선택
  | { k: 'kitCarlson'; pid: PlayerId; candidates: CardId[]; taken: number }
  | { k: 'jesseJonesChoice'; pid: PlayerId; rest: number }
  | { k: 'pedroRamirezChoice'; pid: PlayerId; rest: number }
  | { k: 'blackJackReveal'; pid: PlayerId; card: CardId }
  | { k: 'daltonsDiscard'; queue: PlayerId[] }
  | { k: 'newIdentity'; pid: PlayerId }
  | { k: 'declareSuit'; pid: PlayerId }
  // 한줌의 카드 이벤트
  /** 한줌의 카드: 남은 뱅! 횟수만큼 가해자 없는 뱅!을 하나씩 쌓는다 */
  | { k: 'fistfulBangs'; pid: PlayerId; remaining: number }
  /** 러시안 룰렛: queue 맨 앞 사람이 빗나감!을 버릴 차례다. 한 바퀴 돌면 처음부터 */
  | { k: 'russianRoulette'; queue: PlayerId[]; i: number }
  | { k: 'bloodBrothers'; pid: PlayerId }
  | { k: 'hardLiquor'; pid: PlayerId }
  | { k: 'peyote'; pid: PlayerId }
  /** 목장: 버릴 카드를 한 장씩 골라 picked 에 담고, pass 로 확정한다 */
  | { k: 'ranch'; pid: PlayerId; picked: CardId[] }
  /** 서부의 법: 두 번째로 가져온 카드를 보여 주고 의무를 건다 */
  | { k: 'lawOfTheWest'; pid: PlayerId; card: CardId }
  /** 리코체: target 앞의 card 를 노린다. target 이 빗나감!을 내지 않으면 버려진다 */
  | { k: 'ricochet'; source: PlayerId; target: PlayerId; card: CardId }
  | { k: 'checkWin' };

// ---------------------------------------------------------------------------
// 입력 대기
//
// awaiting 이 있는 동안에는 그 플레이어의 respond(또는 언제든 쓸 수 있는 능력)만
// 받는다. 항상 스택 top 프레임과 짝이 된다.
// ---------------------------------------------------------------------------

export type PendingInput =
  /** 빗나감! 을 내거나 포기 */
  | { k: 'missed'; pid: PlayerId; source: PlayerId | null; remaining: number; options: CardId[] }
  /** 인디언! 에 대해 뱅! 을 내거나 포기 */
  | { k: 'indiansBang'; pid: PlayerId; source: PlayerId; options: CardId[] }
  /** 결투에서 뱅! 을 내거나 포기 */
  | { k: 'duelBang'; pid: PlayerId; opponent: PlayerId; options: CardId[] }
  /** 죽음 직전에 맥주를 내거나 포기 */
  | { k: 'beerToSurvive'; pid: PlayerId; needed: number; options: CardId[] }
  /** 판정에서 펼칠 카드를 고른다 (러키 듀크가 두 장을 볼 때) */
  | { k: 'judgementChoice'; pid: PlayerId; purpose: JudgementPurpose; options: CardId[] }
  /** 잡화점: 펼쳐진 카드 중 1장 선택 */
  | { k: 'generalStore'; pid: PlayerId; options: CardId[] }
  /** 강탈·캣 발루: 대상의 카드 1장 선택 (손패는 뒷면이라 인덱스로 고른다) */
  | {
      k: 'stealCard';
      pid: PlayerId;
      target: PlayerId;
      mode: 'panic' | 'catBalou';
      /** 손패 장수 (뒷면 선택용) */
      handCount: number;
      /** 앞에 놓인 카드 (앞면이라 id 로 고른다) */
      equipment: CardId[];
    }
  /** 킷 칼슨: 3장 중 가져갈 2장을 하나씩 고른다 */
  | { k: 'kitCarlson'; pid: PlayerId; options: CardId[]; remaining: number }
  /** 제시 존스: 첫 카드를 덱에서 가져올지, 남의 손에서 가져올지 */
  | { k: 'jesseJones'; pid: PlayerId; targets: PlayerId[] }
  /** 페드로 라미레즈: 첫 카드를 덱에서 가져올지 버린 더미에서 가져올지 */
  | { k: 'pedroRamirez'; pid: PlayerId; topDiscard: CardId }
  /** 달톤 형제: 버릴 파랑 카드 1장 선택 */
  | { k: 'daltonsDiscard'; pid: PlayerId; options: CardId[] }
  /** 새로운 신분: 예비 캐릭터로 바꿀지 */
  | { k: 'newIdentity'; pid: PlayerId; spare: CharacterId }
  /** 수갑: 이번 차례에 쓸 무늬 선언 */
  | { k: 'declareSuit'; pid: PlayerId }
  /** 러시안 룰렛: 빗나감!을 버리거나 목숨 2를 잃는다 */
  | { k: 'russianRoulette'; pid: PlayerId; options: CardId[] }
  /** 의형제: 목숨 1을 넘겨줄 사람을 고르거나 넘긴다 */
  | { k: 'bloodBrothers'; pid: PlayerId; targets: PlayerId[] }
  /** 독한 술: 카드 가져오기를 건너뛰고 목숨 1 회복할지 */
  | { k: 'hardLiquor'; pid: PlayerId }
  /** 피요테: 덱 맨 위 카드 색 맞히기 */
  | { k: 'peyote'; pid: PlayerId }
  /** 목장: 더 버릴 카드를 고르거나 pass 로 확정한다 */
  | { k: 'ranch'; pid: PlayerId; options: CardId[]; picked: CardId[] }
  /** 리코체: 노려진 카드를 지키려면 빗나감!을 낸다 */
  | { k: 'ricochet'; pid: PlayerId; source: PlayerId; card: CardId; options: CardId[] };

// ---------------------------------------------------------------------------
// 로그
// ---------------------------------------------------------------------------

export type GameEvent = {
  /** 로그 종류 */
  t: string;
  /** 행위자 */
  pid?: PlayerId;
  target?: PlayerId;
  card?: CardId;
  /** 카드를 다른 종류로 취급해 냈을 때의 종류 (칼라미티 자넷·엉클 윌) */
  as?: CardKind;
  cards?: CardId[];
  amount?: number;
  /** UI 에 그대로 보여줄 한국어 문장 */
  text: string;
  /** 이 로그를 만든 액션의 순번 */
  seq: number;
};

// ---------------------------------------------------------------------------
// 액션
// ---------------------------------------------------------------------------

/** 강탈·캣 발루 대상 지정 */
export type StealPick =
  | { zone: 'hand'; index: number }
  | { zone: 'equipment'; card: CardId };

export type Action =
  /** 시스템: 게임 생성. 항상 액션 로그의 첫 항목이다. */
  | {
      type: 'startGame';
      seed: number;
      config: GameConfig;
      seats: { id: PlayerId; name: string }[];
    }
  /** 손패에서 카드 사용 */
  | {
      type: 'playCard';
      pid: PlayerId;
      card: CardId;
      target?: PlayerId;
      /** 강탈·캣 발루가 가져갈 카드. 뱅!에 붙으면 리코체(한줌의 카드)로 노릴 앞의 카드 */
      pick?: StealPick;
      /** 칼라미티 자넷처럼 다른 카드로 취급해 사용할 때 */
      as?: CardKind;
      /** 저격수(한줌의 카드): 함께 버리는 두 번째 뱅! */
      also?: CardId;
    }
  /** 입력 대기에 대한 응답 */
  | { type: 'respond'; pid: PlayerId; choice: Choice }
  /** 언제든 쓸 수 있는 능력 (시드 케첨) */
  | { type: 'useAbility'; pid: PlayerId; ability: string; cards?: CardId[] }
  /** 버리기 단계에서 손패 버림 */
  | { type: 'discardCard'; pid: PlayerId; card: CardId }
  /** 차례 마치기 */
  | { type: 'endTurn'; pid: PlayerId }
  /** 캐릭터 드래프트: 받은 후보 중 하나를 고른다 */
  | { type: 'pickCharacter'; pid: PlayerId; character: CharacterId }
  /** 제한시간 만료. 구동기가 발행하며 기본 행동을 대신 수행한다. */
  | { type: 'timeout'; pid: PlayerId };

export type Choice =
  /** 반응하지 않음 / 능력 사용 안 함 */
  | { c: 'pass' }
  /** 카드 1장 지목 */
  | { c: 'card'; card: CardId }
  /** 강탈·캣 발루 대상 지정 */
  | { c: 'pick'; pick: StealPick }
  /** 무늬 선언 */
  | { c: 'suit'; suit: Suit }
  /** 예/아니오 */
  | { c: 'yes' }
  /** 제시 존스: 특정 플레이어의 손에서 */
  | { c: 'player'; pid: PlayerId }
  /** 피요테: 덱 맨 위 카드 색 */
  | { c: 'color'; color: 'red' | 'black' };

// ---------------------------------------------------------------------------
// 상태
// ---------------------------------------------------------------------------

export type GameState = {
  config: GameConfig;
  rng: RngState;
  /** 착석 순서. 인덱스 = seat */
  players: Player[];
  turn: TurnState;
  /** 덱. 맨 뒤가 맨 위(다음에 뽑을 카드) */
  deck: CardId[];
  /** 버린 더미. 맨 뒤가 맨 위 */
  discard: CardId[];
  /** 해결 대기 스택. 맨 뒤가 top */
  stack: Frame[];
  awaiting: PendingInput | null;
  /** 확장판 이벤트 상태. 확장을 안 쓰면 null */
  event: EventState | null;
  log: GameEvent[];
  result: GameResult | null;
  /** 처리한 액션 수 */
  seq: number;
  /**
   * 게임 시작 직후의 캐릭터 드래프트. 모두가 고르면 null 이 된다.
   * 이 구간만은 여러 사람이 동시에 행동한다 (actorsOf 참고).
   * 드래프트 없이 만든 상태(테스트 시나리오)에는 이 필드가 없을 수 있다.
   */
  draft?: DraftState | null;
};

export type DraftState = {
  /** 각자 받은 후보. 셔플된 순서 그대로라 첫 장이 시간 초과 때의 기본 선택이다 */
  offers: Record<PlayerId, CharacterId[]>;
  /**
   * 고른 캐릭터. 아직이면 null.
   * viewFor 가 남의 후보와 선택을 가리므로, 남에 대해서는 null 인지만 믿는다.
   */
  picked: Record<PlayerId, CharacterId | null>;
};

/** 어떤 카드를 어떤 종류로 취급해 사용하는지 (칼라미티 자넷용) */
export type CardUse = { card: CardId; as: CardKind };

export const HAND_LIMIT_BY_HP = true;
