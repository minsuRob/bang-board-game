/**
 * 상 난이도 — 결정화 몬테카를로.
 *
 * 숨은 정보(남의 손패·감춰진 역할·덱 순서)를 믿음에 맞춰 여러 번 '지어내고',
 * 각 후보 수를 순수 리듀서로 끝까지 굴려 본 뒤 평균 점수가 가장 높은 수를 고른다.
 * 리듀서가 순수 함수라서 이 방법이 공짜로 나온다.
 */

import { BASE_DECK } from '../data/cards.base';
import { ROLE_DISTRIBUTION } from '../data/roles';
import type { CardId, Role } from '../data/types';
import {
  legalActions,
  reduce,
  type Action,
  type GameState,
  type PlayerId,
} from '../engine';
import { shuffle, type RngState } from '../engine/rng';
import { nextInt } from '../engine/rng';
import { evaluate } from './evaluate';
import { beliefsFor, scoreAction } from './policy';

/** 후보를 몇 개까지 시뮬레이션할지 */
const TOP_CANDIDATES = 5;
/**
 * 한 판을 몇 수까지 굴릴지.
 *
 * 길게 굴릴수록 오차가 쌓인다. 한 바퀴 남짓(대략 한 라운드) 보고 끊는 편이
 * 표본을 더 많이 뽑는 것보다 낫다.
 */
const ROLLOUT_PLIES = 30;

/**
 * 시야에서 숨은 정보를 지어내 완전한 상태 하나를 만든다.
 *
 * 남의 손패 장수·장비·버린 더미·펼쳐진 카드는 실제 값이므로 그대로 두고,
 * 나머지 카드를 섞어 손패와 덱에 배분한다.
 */
export function determinize(view: GameState, me: PlayerId, rng: RngState): {
  state: GameState;
  rng: RngState;
} {
  const seen = new Set<CardId>();
  const my = view.players.find((p) => p.id === me);
  for (const c of my?.hand ?? []) seen.add(c);
  for (const p of view.players) for (const c of p.equipment) seen.add(c);
  for (const c of view.discard) seen.add(c);
  // 스택에 이미 펼쳐져 있는 카드도 실제 값이다.
  for (const f of view.stack) {
    if (f.k === 'judgement') for (const c of f.candidates) seen.add(c);
    if (f.k === 'generalStore') for (const c of f.revealed) seen.add(c);
    if (f.k === 'kitCarlson') for (const c of f.candidates) seen.add(c);
  }

  const pool = BASE_DECK.map((c) => c.id).filter((c) => !seen.has(c));
  const shuffled = shuffle(rng, pool);
  let cur = shuffled.rng;
  const bag = shuffled.value;
  let at = 0;

  const players = view.players.map((p) => {
    if (p.id === me) return p;
    const hand = bag.slice(at, at + p.hand.length);
    at += p.hand.length;
    return { ...p, hand };
  });

  // 감춰진 역할을 남은 역할 중에서 뽑아 채운다.
  const all = [...(ROLE_DISTRIBUTION[view.config.playerCount] ?? [])];
  for (const p of players) {
    if (p.id === me || p.roleRevealed) {
      const i = all.indexOf(p.role);
      if (i >= 0) all.splice(i, 1);
    }
  }
  const rolled = shuffle(cur, all);
  cur = rolled.rng;
  let roleAt = 0;
  const withRoles = players.map((p) => {
    if (p.id === me || p.roleRevealed) return p;
    const role: Role = rolled.value[roleAt++] ?? p.role;
    return { ...p, role };
  });

  return {
    state: { ...view, players: withRoles, deck: bag.slice(at) },
    rng: cur,
  };
}

/**
 * 지어낸 상태를 휴리스틱 정책으로 굴린다.
 *
 * 상대가 항상 최선을 둔다고 가정하면 표본이 전부 같은 줄기로 흘러 정보가 없다.
 * 그래서 점수에 잡음을 섞어 근소한 차이는 뒤집히게 둔다.
 */
const ROLLOUT_NOISE = 4;

function rollout(state: GameState, me: PlayerId, rng: RngState, plies: number): number {
  let cur = state;
  let r = rng;

  for (let i = 0; i < plies && !cur.result; i++) {
    const actor = cur.awaiting ? cur.awaiting.pid : cur.turn.active;
    const legal = legalActions(cur, actor).filter((a) => a.type !== 'useAbility');
    if (legal.length === 0) break;

    // 굴리는 동안 상대는 중 난이도로 둔다고 본다 (공개된 역할만 보고 판단)
    const beliefs = beliefsFor(cur, actor, true);
    let best = legal[0];
    let bestScore = -Infinity;
    for (const a of legal) {
      const rolled = nextInt(r, 1000);
      r = rolled.rng;
      const s = scoreAction(cur, actor, a, beliefs) + (rolled.value / 1000) * ROLLOUT_NOISE;
      if (s > bestScore) {
        bestScore = s;
        best = a;
      }
    }
    const next = reduce(cur, best);
    if (next === cur) break;
    cur = next;
  }
  return evaluate(cur, me);
}

/** 휴리스틱 점수를 시뮬레이션 값과 같은 자릿수로 올리는 계수 */
const HEURISTIC_WEIGHT = 3;

export function chooseHard(
  view: GameState,
  me: PlayerId,
  seed: number,
  budget: number,
): Action | null {
  const legal = legalActions(view, me);
  if (legal.length === 0) return null;
  if (legal.length === 1) return legal[0];

  const beliefs = beliefsFor(view, me);
  const ranked = legal
    .map((action) => ({ action, score: scoreAction(view, me, action, beliefs) }))
    .sort((a, b) => b.score - a.score);

  const candidates = ranked.slice(0, TOP_CANDIDATES);
  if (budget <= 0) return candidates[0].action;

  let rng: RngState = { seed: (seed ^ view.seq * 2654435761) | 0, n: 0 };
  let best = candidates[0];
  let bestValue = -Infinity;

  for (const cand of candidates) {
    let total = 0;
    for (let i = 0; i < budget; i++) {
      const guess = determinize(view, me, rng);
      rng = guess.rng;
      const after = reduce(guess.state, cand.action);
      // 수를 둔 직후의 값과 한 라운드 굴린 뒤의 값을 함께 본다.
      // 직후 값은 잡음이 거의 없고, 굴린 값은 반격까지 담는다.
      total += evaluate(after, me) * 0.6 + rollout(after, me, rng, ROLLOUT_PLIES) * 0.4;
      rng = { ...rng, n: rng.n + ROLLOUT_PLIES * 4 };
    }
    // 표본이 적을 때는 휴리스틱이 시뮬레이션보다 믿을 만하다. 둘을 같은 자릿수로 섞는다.
    const value = total / budget + cand.score * HEURISTIC_WEIGHT;
    if (value > bestValue) {
      bestValue = value;
      best = cand;
    }
  }
  return best.action;
}
