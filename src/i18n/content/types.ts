import type {
  AbilityKey,
  CardKind,
  CharacterId,
  EventCardId,
  Expansion,
  GoldCardKind,
  Role,
} from '../../game/data/types';
import type { RejectReason } from '../../game/economy/model';
import type { JudgementPurpose, ResultReason } from '../../game/engine/types';
import type { AiTier } from '../../game/ai/types';

/**
 * 게임 내용 사전. ko 가 원본이고 en·it 는 같은 모양을 채운다 (키가 빠지면 typecheck 가 실패한다).
 *
 * - cards/characters/events/gold 의 `name` 은 그 언어로 부르는 이름이다. 카드에 인쇄된 원어는 data 의 `name` 이다.
 * - 순수 폴더(engine/data/modifiers/ai/economy)는 이 사전을 import 하지 않는다. 키만 들고 있다.
 */
export type Entry = { name: string; text: string };

export type Content = {
  cards: Record<CardKind, Entry>;
  /** `text` 는 능력 설명 */
  characters: Record<CharacterId, Entry>;
  events: Record<EventCardId, Entry>;
  gold: Record<GoldCardKind, Entry>;
  roles: Record<Role, { name: string; goal: string }>;
  expansions: Record<Expansion, string>;
  /** Modifier 능력 id → 버튼·로그에 쓰는 짧은 설명 */
  abilities: Record<AbilityKey, string>;
  /** 판정 목적 이름 ("술통 판정") */
  judgement: Record<JudgementPurpose, string>;
  /** 게임이 끝난 까닭. lastStanding 은 마지막 생존자 이름을 받는다 */
  resultReason: Record<Exclude<ResultReason, 'lastStanding'>, string> & { lastStanding: (name: string) => string };
  /** 보상을 못 받은 까닭 */
  rejectReason: Record<RejectReason, string>;
  /** AI 등급 칩 */
  aiTier: Record<AiTier, string>;
  /** 배속 칩. 100 이상은 '최대' */
  aiSpeed: (speed: number) => string;
};
