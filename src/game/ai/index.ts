/**
 * AI 진입점.
 *
 * 세 난이도가 같은 인터페이스를 쓴다. 어느 쪽도 가려진 정보를 들여다보지 않는다.
 * 같은 국면 + 같은 시드면 같은 수를 둔다 (리플레이 재현성).
 */

import {
  legalActions,
  type Action,
  type GameState,
  type PlayerId,
} from '../engine';
import { viewFor } from '../engine/view';
import { nextInt, type RngState } from '../engine/rng';
import { chooseHard } from './hard';
import { beliefsFor, scoreAction } from './policy';
import type { AiContext, AiTier } from './types';

/** 난이도별 시뮬레이션 표본 수 */
const BUDGET: Record<AiTier, number> = { easy: 0, medium: 0, hard: 14 };

/**
 * 난이도별로 '최선이 아닌 수'를 둘 확률.
 *
 * 난이도 차이를 계산 깊이로만 두면 실력 차이가 잡음에 묻힌다 (측정해 봤다).
 * 사람이 그렇듯 실수의 빈도로 가르는 편이 확실하고, 보기에도 자연스럽다.
 * 살아남는 수(생존맥주·빗나감)만은 어느 난이도든 놓치지 않는다.
 */
const MISTAKE_CHANCE: Record<AiTier, number> = { easy: 0.85, medium: 0.2, hard: 0 };

/**
 * 난이도별로 무엇까지 보는가.
 *
 * - 하: 공개된 역할만 보고, 그마저도 거의 무시한 채 아무렇게나 둔다
 * - 중: 공개된 역할만 보고 휴리스틱대로 둔다
 * - 상: 지금까지의 행동에서 감춰진 역할을 추론하고, 그 위에서 시뮬레이션까지 돌린다
 */
const READS_HISTORY: Record<AiTier, boolean> = { easy: false, medium: false, hard: true };

/** 하 난이도가 그래도 지키는 최소한의 본능 */
const REFLEX_SCORE = 50;

export function chooseAction(ctx: AiContext): Action | null {
  const { view, me, tier, seed } = ctx;
  const legal = legalActions(view, me);
  if (legal.length === 0) return null;
  if (legal.length === 1) return legal[0];

  const rng: RngState = { seed: (seed ^ (view.seq * 2654435761)) | 0, n: 0 };

  switch (tier) {
    case 'easy':
      return chooseFallible(view, me, legal, rng, READS_HISTORY.easy, MISTAKE_CHANCE.easy);
    case 'medium':
      return chooseFallible(view, me, legal, rng, READS_HISTORY.medium, MISTAKE_CHANCE.medium);
    case 'hard':
      return chooseHard(view, me, seed, ctx.budget ?? BUDGET.hard);
  }
}

/**
 * 가끔 실수하는 플레이어.
 *
 * 살아남는 수는 언제나 챙기고, 그 밖에서는 mistakeChance 만큼 아무 수나 고른다.
 * 하 난이도는 자주, 중 난이도는 가끔 어긋난다.
 */
function chooseFallible(
  view: GameState,
  me: PlayerId,
  legal: Action[],
  rng: RngState,
  naive: boolean,
  mistakeChance: number,
): Action {
  const beliefs = beliefsFor(view, me, naive);

  // 죽지 않는 수는 어느 난이도든 놓치지 않는다
  const reflex = legal.find((a) => scoreAction(view, me, a, beliefs) >= REFLEX_SCORE);
  if (reflex) return reflex;

  const roll = nextInt(rng, 1000);
  if (roll.value / 1000 < mistakeChance) {
    return legal[nextInt(roll.rng, legal.length).value];
  }
  return chooseBest(view, me, legal, roll.rng, naive);
}

/** 휴리스틱 점수가 가장 높은 수. 동점이면 결정적으로 흔든다. */
function chooseBest(
  view: GameState,
  me: PlayerId,
  legal: Action[],
  rng: RngState,
  naive: boolean,
): Action {
  const beliefs = beliefsFor(view, me, naive);
  let cur = rng;
  let best = legal[0];
  let bestScore = -Infinity;

  for (const action of legal) {
    const rolled = nextInt(cur, 1000);
    cur = rolled.rng;
    const score = scoreAction(view, me, action, beliefs) + rolled.value / 1000;
    if (score > bestScore) {
      bestScore = score;
      best = action;
    }
  }
  return best;
}

/**
 * 전체 상태에서 곧바로 수를 고른다.
 * 시야 투영을 여기서 걸어 주므로 호출자가 실수로 전체 상태를 넘겨도 안전하다.
 */
export function decide(
  state: GameState,
  me: PlayerId,
  tier: AiTier,
  seed: number,
  budget?: number,
): Action | null {
  return chooseAction({ view: viewFor(state, me), me, tier, seed, budget });
}

export { AI_TIERS, AI_TIER_LABEL } from './types';
export type { AiTier, AiContext } from './types';
export { analyze, hostility } from './belief';
export { evaluate, cardValue, danger } from './evaluate';
export { beliefsFor, scoreAction, reachableEnemies } from './policy';
