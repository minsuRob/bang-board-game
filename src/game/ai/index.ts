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
import { chooseDraft } from './draft';
import { chooseHard } from './hard';
import type { Beliefs, InferDepth } from './belief';
import { beliefsFor, isBetrayal, isHopelessDuel, scoreAction } from './policy';
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
const MISTAKE_CHANCE: Record<AiTier, number> = { easy: 0.7, medium: 0.2, hard: 0 };

/**
 * 난이도별로 무엇까지 읽는가.
 *
 * 하 난이도도 "누가 보안관을 쐈나"는 기억한다. 그것조차 못 하면 같은 편을 쏘고,
 * 그건 약한 게 아니라 게임이 안 되는 것이다.
 *
 * - 하: 행동을 시간 순서대로 읽는다 (누가 보안관을 겨눴고, 누가 그 사람을 쳤나)
 * - 중: 뒤늦게 드러난 정체로 지난 행동을 다시 읽고, 남은 역할 수로 좁힌다
 * - 상: 중과 같은 추론 위에서, 그 추론대로 역할을 지어내 시뮬레이션까지 돌린다
 */
const INFER_DEPTH: Record<AiTier, InferDepth> = { easy: 'direct', medium: 'full', hard: 'full' };

export function inferDepthOf(tier: AiTier): InferDepth {
  return INFER_DEPTH[tier];
}

/** 하 난이도가 그래도 지키는 최소한의 본능 */
const REFLEX_SCORE = 50;

export function chooseAction(ctx: AiContext): Action | null {
  const { view, me, tier, seed } = ctx;
  const legal = legalActions(view, me);
  if (legal.length === 0) return null;
  if (legal.length === 1) return legal[0];

  const rng: RngState = { seed: (seed ^ (view.seq * 2654435761)) | 0, n: 0 };

  if (view.draft) return chooseDraft(view, me, legal, rng, tier === 'easy');

  switch (tier) {
    case 'easy':
    case 'medium':
      return chooseFallible(view, me, legal, rng, INFER_DEPTH[tier], MISTAKE_CHANCE[tier]);
    case 'hard':
      return chooseHard(view, me, seed, ctx.budget ?? BUDGET.hard);
  }
}

/**
 * 가끔 실수하는 플레이어.
 *
 * 살아남는 수는 언제나 챙기고, 그 밖에서는 mistakeChance 만큼 아무 수나 고른다.
 * 하 난이도는 자주, 중 난이도는 가끔 어긋난다. 다만 실수를 하더라도
 * 같은 편이라고 믿는 사람을 해치는 수는 고르지 않는다.
 */
function chooseFallible(
  view: GameState,
  me: PlayerId,
  legal: Action[],
  rng: RngState,
  depth: InferDepth,
  mistakeChance: number,
): Action {
  const beliefs = beliefsFor(view, me, depth);

  // 죽지 않는 수는 어느 난이도든 놓치지 않는다
  const reflex = legal.find((a) => scoreAction(view, me, a, beliefs) >= REFLEX_SCORE);
  if (reflex) return reflex;

  const roll = nextInt(rng, 1000);
  if (roll.value / 1000 < mistakeChance) {
    const sane = legal.filter(
      (a) => !isBetrayal(view, me, a, beliefs) && !isHopelessDuel(view, me, a),
    );
    const pool = sane.length > 0 ? sane : legal;
    return pool[nextInt(roll.rng, pool.length).value];
  }
  return chooseBest(view, me, legal, roll.rng, beliefs);
}

/** 휴리스틱 점수가 가장 높은 수. 동점이면 결정적으로 흔든다. */
function chooseBest(
  view: GameState,
  me: PlayerId,
  legal: Action[],
  rng: RngState,
  beliefs: Beliefs,
): Action {
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

export { AI_TIERS } from './types';
export type { AiTier, AiContext } from './types';
export { analyze, hostility, situation } from './belief';
export type { Belief, Beliefs, InferDepth, RoleProbs } from './belief';
export { evaluate, cardValue, danger } from './evaluate';
export { beliefsFor, isBetrayal, scoreAction, reachableEnemies } from './policy';
