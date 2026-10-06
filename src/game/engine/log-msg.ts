/**
 * 진행 기록 한 줄의 내용. 문장이 아니라 "무슨 일이 있었나"를 id 로만 남긴다.
 *
 * 순수 타입이다 (react·i18n 을 쓰지 않는다). 문장은 화면 쪽 렌더러(src/i18n/log/{ko,en,it}.ts)가
 * 현재 언어로 만든다. 그래서 이름·조사·복수형이 엔진에 들어오지 않는다.
 *
 * - `who` 처럼 사람을 가리키는 값은 PlayerId 다. 렌더러가 그 사람의 캐릭터 이름을 찾는다.
 * - 카드는 CardKind 로 남긴다 (가려진 카드의 종류는 비밀 로그의 msg 에만 싣는다).
 * - 같은 사건인데 문장이 갈리는 곳은 갈래를 불리언·열거 매개변수로 넘긴다.
 */

import type { CardKind, CharacterId, EventCardId, GoldCardKind, Rank, Role, Suit } from '../data/types';
import type { JudgementPurpose, PlayerId, ResultReason } from './types';

export type LogMsg =
  /** 옛 저장 파일의 한국어 문장. GameEvent.legacyText 를 그대로 보인다 */
  | { k: 'legacy' }
  // 덱·진행
  | { k: 'gameStart'; count: number; sheriff: PlayerId }
  | { k: 'reshuffle'; amount: number }
  | { k: 'goldReshuffle'; amount: number }
  | { k: 'rejected'; action: string }
  | { k: 'timeout' }
  | { k: 'turnStart'; who: PlayerId }
  | { k: 'extraTurn'; who: PlayerId }
  | { k: 'event'; event: EventCardId; by?: PlayerId }
  | { k: 'gameEnd'; reason: ResultReason; roles: Role[]; ids: PlayerId[]; byPlayer: boolean }
  // 드래프트
  | { k: 'draftPick'; who: PlayerId }
  | { k: 'draftDone'; picks: { who: PlayerId; character: CharacterId }[] }
  // 카드 내기
  | { k: 'played'; who: PlayerId; card: CardKind; as?: CardKind; to?: PlayerId; ricochet?: boolean; again?: boolean }
  | { k: 'playedWith'; who: PlayerId; card: CardKind; sniper?: boolean }
  | { k: 'discard'; who: PlayerId; onDeck: boolean }
  | { k: 'draw'; who: PlayerId; fromDiscard: number; fromDeck: number }
  | { k: 'steal'; who: PlayerId; from: PlayerId; amount: number }
  | { k: 'panic'; who: PlayerId; target: PlayerId; fromHand: boolean; card?: CardKind }
  | { k: 'catBalou'; who: PlayerId; target: PlayerId; fromHand: boolean; card: CardKind }
  | { k: 'generalStore'; amount: number }
  | { k: 'generalStorePick'; who: PlayerId; card: CardKind }
  // 전투
  | { k: 'missed'; who: PlayerId }
  | { k: 'playMissed'; who: PlayerId; card: CardKind; backfireTo?: PlayerId }
  | { k: 'ghostImmune'; who: PlayerId; from: 'bullet' | 'damage' }
  | { k: 'indiansBang'; who: PlayerId }
  | { k: 'duelBang'; who: PlayerId }
  | { k: 'duelLoss'; who: PlayerId }
  | { k: 'damage'; who: PlayerId; amount: number; left: number }
  | { k: 'heal'; who: PlayerId; hp: number }
  | { k: 'beerSurvive'; who: PlayerId }
  | { k: 'eliminate'; who: PlayerId; role: Role }
  | { k: 'bounty'; who: PlayerId; cards: number }
  | { k: 'penalty'; who: PlayerId }
  // 판정
  | { k: 'judgement'; who: PlayerId; purpose: JudgementPurpose; rank: Rank; suit: Suit }
  | { k: 'dodge'; purpose: JudgementPurpose }
  | { k: 'rattlesnake'; who: PlayerId }
  | { k: 'dynamite'; who: PlayerId }
  | { k: 'dynamitePass'; to: PlayerId }
  | { k: 'jailEscape'; who: PlayerId }
  | { k: 'jailSkip'; who: PlayerId }
  | { k: 'blackJack'; who: PlayerId; suit: Suit; bonus: boolean }
  // 캐릭터
  | { k: 'sidKetchum'; who: PlayerId }
  | { k: 'garyLooter'; who: PlayerId; from: PlayerId }
  | { k: 'vultureSam'; who: PlayerId; from: PlayerId; amount: number }
  | { k: 'flintWestwood'; who: PlayerId; target: PlayerId; amount: number }
  | { k: 'discardSameName'; who: PlayerId; card: CardKind; owners: PlayerId[] }
  | { k: 'pedroRamirez'; who: PlayerId; card: CardKind }
  | { k: 'johnPain'; who: PlayerId; card: CardKind }
  | { k: 'coloradoBill'; who: PlayerId }
  | { k: 'donBell'; who: PlayerId }
  | { k: 'vendetta'; who: PlayerId }
  | { k: 'terenKill'; who: PlayerId }
  | { k: 'bandidosHit'; who: PlayerId }
  | { k: 'bandidosDiscard'; who: PlayerId }
  | { k: 'evelyn'; who: PlayerId; target: PlayerId }
  | { k: 'lemonadeJim'; who: PlayerId }
  | { k: 'dutchWill'; who: PlayerId }
  | { k: 'youlGrinner'; who: PlayerId; to: PlayerId }
  | { k: 'borrowCharacters'; who: PlayerId; characters: CharacterId[] }
  | { k: 'borrowKeep'; who: PlayerId }
  | { k: 'evade'; who: PlayerId; card: CardKind; from: CardKind }
  | { k: 'saved'; who: PlayerId; target: PlayerId }
  | { k: 'ricochetSave'; who: PlayerId }
  | { k: 'ricochetHit'; target: PlayerId; card: CardKind }
  // 유령
  | { k: 'ghostRise'; who: PlayerId; fromCard: boolean }
  | { k: 'ghostLeave'; who: PlayerId }
  | { k: 'ghostDiscard'; who: PlayerId; amount: number }
  // 하이 눈·한줌의 카드
  | { k: 'newIdentityKeep'; who: PlayerId }
  | { k: 'newIdentitySwap'; from: CharacterId; to: CharacterId }
  | { k: 'declareSuit'; who: PlayerId; suit: Suit }
  | { k: 'daltons'; who: PlayerId; card: CardKind }
  | { k: 'missSusanna'; who: PlayerId; played: number }
  | { k: 'deadMan'; who: PlayerId; hp: number }
  | { k: 'fistfulBang'; who: PlayerId; left: number }
  | { k: 'russianRoulette'; who: PlayerId }
  | { k: 'rouletteLoss'; who: PlayerId }
  | { k: 'bloodBrothers'; who: PlayerId; to: PlayerId }
  | { k: 'hardLiquor'; who: PlayerId }
  | { k: 'peyote'; who: PlayerId; color: 'red' | 'black'; right: boolean }
  | { k: 'peyoteStop'; who: PlayerId }
  | { k: 'ranch'; who: PlayerId; amount: number }
  | { k: 'lawOfTheWest'; who: PlayerId }
  | { k: 'ladyRose'; who: PlayerId; other: PlayerId }
  | { k: 'ladyRoseSkip'; who: PlayerId }
  | { k: 'dorothyRage'; who: PlayerId; forced: PlayerId; card: CardKind; to?: PlayerId }
  | { k: 'dorothyRageMiss'; who: PlayerId; card: CardKind; hand: CardKind[] }
  | { k: 'darlingValentine'; who: PlayerId; amount: number }
  | { k: 'helenaKeep' }
  | { k: 'rolesShuffled' }
  | { k: 'boneOrchard'; who: PlayerId }
  // 그림자의 계곡
  | { k: 'pokerBet'; who: PlayerId }
  | { k: 'pokerReveal'; ace: boolean }
  | { k: 'pokerTake'; who: PlayerId; card: CardKind }
  | { k: 'tornadoDiscard'; who: PlayerId }
  | { k: 'shotgun'; who: PlayerId }
  // 골드 러시
  | { k: 'nugget'; who: PlayerId; amount: number }
  | { k: 'buyGold'; who: PlayerId; gold: GoldCardKind; price: number }
  | { k: 'removeGold'; who: PlayerId; target: PlayerId; gold: GoldCardKind; price: number }
  | { k: 'beerForGold'; who: PlayerId }
  | { k: 'goldAbility'; who: PlayerId; ability: string; cost: number; to?: PlayerId }
  | { k: 'goldDup'; who: PlayerId; gold: GoldCardKind }
  | { k: 'goldAs'; who: PlayerId; gold: GoldCardKind; as: CardKind; to?: PlayerId }
  | { k: 'goldRush'; who: PlayerId }
  | { k: 'wantedPlaced'; to: PlayerId }
  | { k: 'wanted'; who: PlayerId }
  | { k: 'rhum'; count: number; suits: number }
  | { k: 'joshDraw'; gold: GoldCardKind };
