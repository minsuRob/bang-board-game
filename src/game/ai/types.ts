/**
 * 게임 AI.
 *
 * AI 는 engine 의 공개 API 만 쓴다. 그리고 언제나 viewFor() 로 가려진 상태만
 * 입력으로 받는다. 남의 손패를 들여다보면 그 자리에서 터지도록 되어 있다.
 */

import type { Action, GameState, PlayerId } from '../engine';

export type AiTier = 'easy' | 'medium' | 'hard';

export const AI_TIERS: AiTier[] = ['easy', 'medium', 'hard'];

export const AI_TIER_LABEL: Record<AiTier, string> = {
  easy: '하',
  medium: '중',
  hard: '상',
};

export type AiContext = {
  /** 가려진 상태 */
  view: GameState;
  me: PlayerId;
  tier: AiTier;
  /** 결정적 난수용 시드. 같은 국면·같은 시드면 같은 수를 둔다. */
  seed: number;
  /** 하드 AI 의 시뮬레이션 예산 (표본 수). 0 이면 휴리스틱만 쓴다. */
  budget?: number;
};

export type ScoredAction = { action: Action; score: number };
