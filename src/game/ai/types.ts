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

/** AI 가 두는 빠르기. 방장이 판 도중에 고른다 (1배 = 한 수에 3초) */
export type AiSpeed = 1 | 2 | 3 | 4;

export const AI_SPEEDS: AiSpeed[] = [1, 2, 3, 4];

/**
 * 혼자 하는 판에서만 고를 수 있는 배속. 검증할 때 판을 빨리 넘기려는 것이다.
 * 100 은 '최대': AI 계산과 화면 그리기가 따라오는 만큼 빠르게 둔다. 온라인 방은 AiSpeed 만 쓴다.
 */
export type LocalAiSpeed = AiSpeed | 8 | 16 | 32 | 100;

export const LOCAL_AI_SPEEDS: LocalAiSpeed[] = [1, 2, 4, 8, 16, 32, 100];

/** 배속 칩에 적는 글자 */
export function speedLabel(speed: number): string {
  return speed >= 100 ? '최대' : `${speed}×`;
}

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
