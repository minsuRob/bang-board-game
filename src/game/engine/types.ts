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
  GoldCardId,
  Role,
  Suit,
} from '../data/types';
import type { RngState } from './rng';

export type PlayerId = string;

export type Phase = 'draw' | 'play' | 'discard';

export type Player = {
  id: PlayerId;
  /**
   * 착석 번호. 배열 인덱스와 늘 같다 (거리 계산의 기준).
   * 레이디 로즈 오브 텍사스로 두 사람이 자리를 바꿀 때만 배열 자리와 함께 바뀐다.
   */
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
  /** 골드 러시 금덩이. 확장을 안 쓰면 없다 */
  nuggets?: number;
  /** 골드 러시 장비(검정)와 앞에 놓인 수배. 파랑 카드와 영역이 따로라 강탈·캣 벌로우가 닿지 않는다 */
  goldEquipment?: GoldCardId[];
  /** 그레고리 덱이 차례 시작에 뽑아 능력을 빌린 기본판 캐릭터 */
  borrowed?: CharacterId[];
  /** 레이디 로즈 오브 텍사스에게 자리를 빼앗겨 다음 차례를 건너뛴다 */
  skipsNextTurn?: boolean;
};

export type GameConfig = {
  playerCount: number;
  expansions: Expansion[];
  /**
   * 개발용: 이 이벤트를 덱 맨 앞에 두고 보안관의 첫 차례에 바로 공개한다 (?devEvent=).
   * 설정에 들어 있으므로 저장·리플레이·온라인 락스텝이 그대로 맞는다.
   */
  devEvent?: EventCardId;
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
  /** 추가로 얻은 차례인가 (돈 벨·황금 러시·복수). 추가 차례 끝에는 다시 얻지 않는다 */
  extra?: boolean;
  /** 감옥에 갇혀 이번 차례를 건너뛰었는가. 차례 끝 능력(돈 벨)을 막는다 */
  skipped?: boolean;
  /** 이 차례가 끝나면 한 번 더 차례를 받을 사람 */
  extraTurnFor?: PlayerId | null;
  /** 서부의 법(한줌의 카드): 낼 수 있으면 이번 차례에 반드시 내야 하는 카드 */
  mustPlay?: CardId;
  /** 이번 차례에 방금 낸 갈색 카드의 종류. 다른 카드를 내면 바뀐다 (리 반 클리프) */
  lastBrown?: CardKind;
  /** 이번 차례에 차례인 사람이 손에서 낸 카드 장수 (미스 수잔나) */
  cardsPlayed?: number;
};

/** 골드 러시 장비 덱. 플레잉 카드와 섞이지 않는다 */
export type GoldState = {
  /** 맨 뒤가 맨 위 */
  deck: GoldCardId[];
  /** 앞면으로 펼친 상점 (최대 3장) */
  shop: GoldCardId[];
  discard: GoldCardId[];
};

/** 갈색 골드 카드를 어떻게 쓸지 (병·동업자의 종류, 대상) */
export type GoldUse = { as?: CardKind; target?: PlayerId };

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
  /** 방울뱀: ♠ 면 목숨 1을 잃는다 */
  | 'rattlesnake'
  /** 콜로라도 빌: ♠ 면 그 뱅!은 피할 수 없다 */
  | 'coloradoBill'
  /** 돈 벨: 차례 끝에 ♥·♦ 면 차례를 한 번 더 */
  | 'donBell'
  /** 복수(한줌의 카드): 차례 끝에 ♥ 면 차례를 한 번 더 */
  | 'vendetta'
  /** 테렌 킬: 제거되기 직전에 ♠ 가 아니면 목숨 1로 버틴다 */
  | 'terenKill'
  /** 헬레나 존테로(와일드 웨스트 쇼): 공개될 때 ♥·♦ 면 보안관을 뺀 역할을 다시 나눈다 */
  | 'helenaZontero';

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
  // 그림자의 계곡
  | 'tomahawk'
  | 'fanning'
  | 'backfire'
  | 'evelyn'
  | 'henryBlock'
  | 'rattlesnake'
  | 'bandidos'
  // 한줌의 카드
  /** 차례 시작에 손패 장수만큼 맞는, 쏜 사람 없는 뱅! */
  | 'fistful'
  | 'russianRoulette'
  | 'bloodBrothers'
  // 와일드 웨스트 쇼
  /** 미스 수잔나: 차례에 카드를 3장 내지 못했다 */
  | 'missSusanna';

export type Frame =
  // 턴 흐름
  /** reveal: 라운드와 상관없이 이벤트를 공개한다 (개발용 devEvent 의 첫 차례) */
  | { k: 'turnStart'; pid: PlayerId; extra?: boolean; reveal?: boolean }
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
      /** 맞았을 때 잃는 목숨 (조준 2). 없으면 1 */
      damage?: number;
      /** 피할 수 없다 (콜로라도 빌 ♠) */
      unavoidable?: boolean;
    }
  | { k: 'gatling'; source: PlayerId; queue: PlayerId[] }
  /** asked: queue[0] 에게 탈출 여부를 이미 물었다 */
  | { k: 'indians'; source: PlayerId; queue: PlayerId[]; asked?: boolean }
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
      /** 구조!를 낼 사람에게 이미 물었다 */
      savedAsked?: boolean;
    }
  | { k: 'checkDeath'; target: PlayerId; source: PlayerId | null }
  /** lastChance: 제거 직전 판정(테렌 킬)을 이미 걸었다 */
  | { k: 'eliminate'; target: PlayerId; killer: PlayerId | null; lastChance?: boolean }
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
  // 그림자의 계곡
  /** 반디도스. left 가 있으면 queue[0] 이 버리기를 고른 뒤 남은 장수 */
  | { k: 'bandidos'; source: PlayerId; queue: PlayerId[]; left?: number; asked?: boolean }
  /** 포커. pot 은 엎어 낸 카드(어느 영역에도 없다). left 가 있으면 낸 사람이 고르는 중 */
  | { k: 'poker'; source: PlayerId; queue: PlayerId[]; pot: CardId[]; left?: number }
  | { k: 'tornado'; queue: PlayerId[] }
  /**
   * 탈출·믹 디펜더: 뱅!이 아닌 갈색 카드의 대상이 된 사람이 피할지 고른다.
   * 피하면 then 을 버리고, 안 피하면 then 으로 바뀐다. 피할 카드가 있을 때만 끼운다.
   */
  | { k: 'evade'; pid: PlayerId; source: PlayerId; kind: CardKind; then: Frame }
  /** 구조!: 목숨을 잃으려는 target 을 구할지 queue 의 사람들에게 차례로 묻는다 */
  | { k: 'savedOffer'; target: PlayerId; queue: PlayerId[] }
  /** 구조! 보상: target 이 살아남았으면 saver 가 2장을 가져온다 */
  | { k: 'savedReward'; saver: PlayerId; target: PlayerId }
  /** 이블린 쉬뱅: 가져오기를 한 장씩 포기하고 그만큼 서로 다른 사람에게 뱅! */
  | { k: 'evelyn'; pid: PlayerId; remaining: number; shot: PlayerId[] }
  /** 레모네이드 짐: 남이 맥주를 냈을 때 1장 버리고 회복할지 */
  | { k: 'lemonadeJim'; pid: PlayerId }
  /** 샷건에 맞은 사람이 손패 1장을 골라 버린다 */
  | { k: 'shotgunDiscard'; pid: PlayerId }
  // 골드 러시
  /** 수배가 붙은 사람을 제거한 사람: 카드 2장 + 금덩이 1 */
  | { k: 'wantedReward'; killer: PlayerId | null; victim: PlayerId }
  /** 더치 윌: 뽑은 카드 중 1장을 버린다 */
  | { k: 'dutchWill'; pid: PlayerId; candidates: CardId[]; count?: number }
  /** 갈색 골드 카드를 쓰는 방법을 고른다 (조시 맥클라우드가 덱에서 뽑았을 때) */
  | { k: 'goldUse'; pid: PlayerId; card: GoldCardId }
  /** 금덩이를 받는다 (시미언 피코스·부적) */
  | { k: 'gainNuggets'; pid: PlayerId; amount: number; reason: string }
  // 한줌의 카드
  /** 한줌의 카드: 남은 뱅! 횟수만큼 쏜 사람 없는 뱅!을 하나씩 쌓는다 */
  | { k: 'fistfulBangs'; pid: PlayerId; remaining: number }
  /** 러시안 룰렛: queue[i] 가 빗나감!을 버릴 차례다. 한 바퀴 돌면 처음부터 */
  | { k: 'russianRoulette'; queue: PlayerId[]; i: number }
  | { k: 'bloodBrothers'; pid: PlayerId }
  | { k: 'hardLiquor'; pid: PlayerId }
  /** 피요테: guessed 면 이미 한 번 맞혀서 이제 그만둘 수 있다 */
  | { k: 'peyote'; pid: PlayerId; guessed?: boolean }
  /** 목장: 버릴 카드를 한 장씩 골라 picked 에 담고, pass 로 확정한다 */
  | { k: 'ranch'; pid: PlayerId; picked: CardId[] }
  /** 서부의 법: 두 번째로 가져온 카드를 보여 주고 의무를 건다 */
  | { k: 'lawOfTheWest'; pid: PlayerId; card: CardId }
  /** 리코체: target 앞의 card 를 노린다. target 이 빗나감!을 내지 않으면 버려진다 */
  | { k: 'ricochet'; source: PlayerId; target: PlayerId; card: CardId }
  // 와일드 웨스트 쇼
  /** 그레고리 덱: 기본판 캐릭터를 count 명 뽑아 능력을 빌린다. 이미 빌린 게 있으면 바꿀지 묻는다 */
  | { k: 'borrowCharacters'; pid: PlayerId; count: number }
  /** 율 그리너: 손패가 pid 보다 많은 사람이 1장씩 준다. queue 는 처음 해결될 때 정한다 */
  | { k: 'gifts'; pid: PlayerId; queue?: PlayerId[] }
  /** 달링 발렌타인: 손패를 모두 버리고 같은 장수를 새로 가져온다 */
  | { k: 'handRedraw'; pid: PlayerId }
  // 승리 판정
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
  /** 강탈·캣 벌로우: 대상의 카드 1장 선택 (손패는 뒷면이라 인덱스로 고른다) */
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
  /** 이블린 쉬뱅: 카드 1장 대신 쏠 사람을 고르거나(player), 나머지를 가져온다(pass) */
  | { k: 'evelyn'; pid: PlayerId; targets: PlayerId[]; remaining: number }
  /** 구조!: target 이 목숨 1을 잃는 것을 막을지 */
  | { k: 'saved'; pid: PlayerId; target: PlayerId; options: CardId[] }
  /** 구조! 보상: 예 = target 의 손에서 2장, 아니오 = 덱에서 2장 */
  | { k: 'savedReward'; pid: PlayerId; target: PlayerId }
  /** 탈출·믹 디펜더: 이 카드의 효과를 피할지 */
  | { k: 'evade'; pid: PlayerId; source: PlayerId; kind: CardKind; options: CardId[] }
  /** 손패에서 골라 버린다 (반디도스·포커·토네이도·샷건). canPass 면 버리지 않을 수 있다 */
  | {
      k: 'discardChoice';
      pid: PlayerId;
      options: CardId[];
      remaining: number;
      canPass: boolean;
      reason: 'bandidos' | 'poker' | 'tornado' | 'shotgun' | 'lemonadeJim';
    }
  /** 더치 윌: 뽑은 카드 중 버릴 1장 */
  | { k: 'dutchWill'; pid: PlayerId; options: CardId[] }
  /** 갈색 골드 카드를 어떻게 쓸지 */
  | { k: 'goldUse'; pid: PlayerId; card: GoldCardId; options: GoldUse[] }
  /** 러시안 룰렛: 빗나감!을 버리거나 목숨 2를 잃는다 */
  | { k: 'russianRoulette'; pid: PlayerId; options: CardId[] }
  /** 의형제: 목숨 1을 넘겨줄 사람을 고르거나 넘긴다 */
  | { k: 'bloodBrothers'; pid: PlayerId; targets: PlayerId[] }
  /** 독한 술: 카드 가져오기를 건너뛰고 목숨 1 회복할지 */
  | { k: 'hardLiquor'; pid: PlayerId }
  /** 피요테: 덱 맨 위 카드 색 맞히기. canStop 이면 pass 로 그만둔다 (한 번 맞힌 뒤) */
  | { k: 'peyote'; pid: PlayerId; canStop?: boolean }
  /** 목장: 더 버릴 카드를 고르거나 pass 로 확정한다 */
  | { k: 'ranch'; pid: PlayerId; options: CardId[]; picked: CardId[] }
  /** 리코체: 노려진 카드를 지키려면 빗나감!을 낸다 */
  | { k: 'ricochet'; pid: PlayerId; source: PlayerId; card: CardId; options: CardId[] }
  /** 그레고리 덱: 빌린 캐릭터를 새로 뽑을지 */
  | { k: 'borrowCharacters'; pid: PlayerId; current: CharacterId[] }
  /** 율 그리너: to 에게 줄 손패 1장 */
  | { k: 'giveCard'; pid: PlayerId; to: PlayerId; options: CardId[] };

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
  /** 골드 러시 카드 (산 카드·치운 카드). 플레잉 카드 id 와 섞지 않으려고 따로 둔다 */
  gold?: GoldCardId;
  amount?: number;
  /**
   * 카드 펼치기 결과 (판정·블랙 잭·피요테). suit 는 효과 무늬라 축복·저주면 인쇄 무늬와 다를 수 있다.
   * hit 는 카드의 조건이 맞았다는 뜻이다. 좋은 결과인지는 목적마다 다르다 (다이너마이트 hit = 폭발)
   */
  reveal?: { suit: Suit; hit: boolean; purpose?: JudgementPurpose };
  /** UI 에 그대로 보여줄 한국어 문장 */
  text: string;
  /**
   * 몇 사람만 아는 내용 (강탈로 손패에서 가져간 카드). viewFor 가 to 에게만 text·card 를
   * 이것으로 바꿔 보여 주고, 나머지에게서는 지운다
   */
  secret?: { to: PlayerId[]; card: CardId; text: string };
  /** 캣 벌로우가 장비가 아니라 손패에서 뽑아 버렸다. card 는 버린 더미에 앞면으로 놓여 공개된다 */
  fromHand?: boolean;
  /** 이 로그를 만든 액션의 순번 */
  seq: number;
};

// ---------------------------------------------------------------------------
// 액션
// ---------------------------------------------------------------------------

/** 강탈·캣 벌로우 대상 지정 */
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
      /** 강탈·캣 벌로우가 가져갈 카드. 뱅!에 붙으면 리코체(한줌의 카드)로 노릴 앞의 카드 */
      pick?: StealPick;
      /** 칼라미티 자넷처럼 다른 카드로 취급해 사용할 때 */
      as?: CardKind;
      /** 패닝: 첫 표적에서 거리 1인 두 번째 표적 */
      target2?: PlayerId;
      /** 조준: 뱅!과 함께 내는 카드 */
      extra?: CardId;
      /** 저격수(한줌의 카드): 함께 버리는 두 번째 뱅! */
      also?: CardId;
      /** 차례당 한 번 능력으로 낼 때 그 능력 key (블랙 플라워·더 스팟·엉클 윌) */
      ability?: string;
    }
  /** 입력 대기에 대한 응답 */
  | { type: 'respond'; pid: PlayerId; choice: Choice }
  /** 언제든 쓸 수 있는 능력 (시드 케첨) */
  | { type: 'useAbility'; pid: PlayerId; ability: string; cards?: CardId[] }
  /**
   * 이벤트가 주는 차례당 한 번 행동 (와일드 웨스트 쇼).
   * - ladyRose: 오른쪽 사람과 자리를 바꾼다
   * - dorothyRage: forced 에게 kind 카드를 target 에게 내게 한다 (손에 없으면 아무 일도 없다)
   */
  | {
      type: 'eventAbility';
      pid: PlayerId;
      ability: EventAbilityKind;
      forced?: PlayerId;
      kind?: CardKind;
      target?: PlayerId;
    }
  /** 버리기 단계에서 손패 버림 */
  | { type: 'discardCard'; pid: PlayerId; card: CardId }
  /** 차례 마치기 */
  | { type: 'endTurn'; pid: PlayerId }
  /** 캐릭터 드래프트: 받은 후보 중 하나를 고른다 */
  | { type: 'pickCharacter'; pid: PlayerId; character: CharacterId }
  /** 제한시간 만료. 구동기가 발행하며 기본 행동을 대신 수행한다. */
  | { type: 'timeout'; pid: PlayerId }
  // --- 골드 러시 (카드 사용 단계) ---
  /** 상점의 장비를 산다. 갈색이면 곧바로 쓴다 */
  | { type: 'buyGold'; pid: PlayerId; card: GoldCardId; use?: GoldUse }
  /** 남의 앞에 있는 장비를 값+1 을 내고 버리게 한다 */
  | { type: 'removeGold'; pid: PlayerId; target: PlayerId; card: GoldCardId }
  /** 맥주를 목숨 대신 금덩이 1개로 바꾼다 */
  | { type: 'beerForGold'; pid: PlayerId; card: CardId }
  /** 금덩이를 내는 능력 (캐릭터·장비). 배낭은 죽기 직전에도 쓴다 */
  | { type: 'goldAbility'; pid: PlayerId; ability: string; target?: PlayerId };

export type EventAbilityKind = 'ladyRose' | 'dorothyRage';

export type Choice =
  /** 반응하지 않음 / 능력 사용 안 함 */
  | { c: 'pass' }
  /** 카드 1장 지목 */
  | { c: 'card'; card: CardId }
  /** 강탈·캣 벌로우 대상 지정 */
  | { c: 'pick'; pick: StealPick }
  /** 무늬 선언 */
  | { c: 'suit'; suit: Suit }
  /** 예/아니오 */
  | { c: 'yes' }
  /** 제시 존스: 특정 플레이어의 손에서 */
  | { c: 'player'; pid: PlayerId }
  /** 갈색 골드 카드 사용법 */
  | { c: 'goldUse'; use: GoldUse }
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
  /** 골드 러시 장비 덱·상점. 확장을 안 쓰면 없거나 null */
  gold?: GoldState | null;
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
