/**
 * 역할 추정.
 *
 * 뱅!의 재미는 "누가 무법자인가"에 있고, AI 도 그걸 추론해야 한다.
 * 보이는 것만으로 판단한다: 누가 누구를 겨눴고, 누가 누구를 도왔는가.
 *
 * 증거는 '결과'가 아니라 '의도'로 센다. 빗나간 뱅!도 보안관을 노렸다는 사실은 같다.
 * 반대로 기관총·인디언처럼 모두를 치는 카드는 누구를 노렸는지 알려 주지 않는다.
 *
 * 초반의 사격은 대개 어림짐작이다. 그래서 정체를 모르는 사람을 친 것은 그 순간
 * 대상이 어느 편으로 보였는지만큼만 센다. 판이 흐를수록 대상의 정체가 드러나고,
 * 그 사람을 쳤는지 도왔는지가 점점 무거운 증거가 된다.
 */

import { ROLE_DISTRIBUTION } from '../data/roles';
import type { CardKind, Role } from '../data/types';
import { kindOf, type GameState, type PlayerId } from '../engine';
import { lastOneStanding } from '../engine/hooks';
import type { RngState } from '../engine/rng';
import { nextInt } from '../engine/rng';

/**
 * 어디까지 읽는가.
 *
 * - public: 공개된 역할과 남은 역할 수만 본다 (시뮬레이션 안의 상대용, 빠르다)
 * - direct: 행동을 시간 순서대로 읽는다. 보안관을 겨눈 사람, 그 사람을 친 사람
 * - full:   direct 에 뒤늦게 드러난 정체로 지난 행동을 다시 읽고, 역할 수 제약까지 건다
 */
export type InferDepth = 'public' | 'direct' | 'full';

export type RoleProbs = Record<Role, number>;

export type Belief = {
  /** 역할이 이미 공개되었는가 (나 자신 포함) */
  known: boolean;
  role: Role | null;
  /** 각 역할일 확률. 합은 1 */
  probs: RoleProbs;
  /** +1 에 가까울수록 보안관 편, -1 에 가까울수록 보안관의 적 */
  alignment: number;
  /** 이 사람이 나를 몇 번 겨눴는가 */
  hostilityToMe: number;
  /** 이 사람이 보안관을 몇 번 겨눴는가 */
  threatToSheriff: number;
  /** 역할별 증거 점수 (로그 가능도). 상 난이도가 역할을 지어낼 때 다시 쓴다 */
  scores: RoleProbs;
};

export type Beliefs = Record<PlayerId, Belief>;

const ROLES: readonly Role[] = ['sheriff', 'deputy', 'outlaw', 'renegade'];

/** 한 사람을 겨누는 카드의 세기 */
const ATTACK_WEIGHT: Partial<Record<CardKind, number>> = {
  bang: 1,
  // 대상과 함께 나온 빗나감!은 칼라미티 자넷의 뱅!이다
  missed: 1,
  duel: 1,
  jail: 0.8,
};
/** 강탈·캣 발루로 남의 카드를 빼앗거나 버리게 한 것 */
const STEAL_WEIGHT = 0.6;
/** 감옥·다이너마이트를 떼어 준 것은 돕는 행동이다 */
const RESCUE_WEIGHT = 0.8;
/** 정체를 모르는 사람을 친 것은 대상이 보인 성향만큼만 센다 */
const INDIRECT = 0.7;
/** 광역 카드는 누구를 노렸는지 알려 주지 않는다. 아주 약한 신호만 */
const AREA_ANTI = 0.1;
/** 무법자를 처치하면 현상금. 무법자끼리도 받으므로 약하게 (EC-55) */
const BOUNTY_LAW = 0.3;

type Evidence = { law: number; anti: number; threat: number; toMe: number };

function blank(): Evidence {
  return { law: 0, anti: 0, threat: 0, toMe: 0 };
}

/**
 * 성향 점수에서 역할별 점수로.
 *
 * 부관은 보안관 편만 치고, 무법자는 보안관 편만 친다. 배신자는 양쪽을 다 친다.
 * 그래서 두 증거가 함께 쌓이는 것이 배신자의 지문이다.
 */
function roleScores(e: Evidence): RoleProbs {
  const { law, anti } = e;
  return {
    sheriff: 0,
    deputy: law - 1.5 * anti,
    outlaw: anti - 0.8 * law,
    renegade: 0.9 * Math.min(law, anti) + 0.2 * law - 0.3 * anti,
  };
}

/** 성향 증거를 -1(보안관의 적) ~ +1(보안관 편) 로 */
function leanOf(e: Evidence): number {
  return clamp((e.law - e.anti) / 2, -1, 1);
}

/** 확률 분포에서 성향으로 */
function leanOfProbs(p: RoleProbs): number {
  return p.sheriff + p.deputy - p.outlaw - 0.5 * p.renegade;
}

function oneHot(role: Role): RoleProbs {
  return { sheriff: 0, deputy: 0, outlaw: 0, renegade: 0, [role]: 1 };
}

/** 아직 정체가 드러나지 않은 사람들에게 남은 역할 묶음 */
export function hiddenRolePool(view: GameState, me: PlayerId): Role[] {
  const pool = [...(ROLE_DISTRIBUTION[view.config.playerCount] ?? [])];
  for (const p of view.players) {
    if (p.id !== me && !p.roleRevealed) continue;
    const i = pool.indexOf(p.role);
    if (i >= 0) pool.splice(i, 1);
  }
  return pool;
}

export function analyze(view: GameState, me: PlayerId, depth: InferDepth = 'full'): Beliefs {
  const pool = hiddenRolePool(view, me);
  const unknown = view.players.filter((p) => p.id !== me && !p.roleRevealed).map((p) => p.id);

  const evidence: Record<PlayerId, Evidence> = {};
  for (const p of view.players) evidence[p.id] = blank();

  if (depth !== 'public') {
    // 1차: 시간 순서대로, 그때까지 보인 성향으로 읽는다
    readLog(view, me, evidence, null);
    if (depth === 'full') {
      // 2차: 판 전체에서 드러난 성향으로 지난 행동을 다시 읽는다.
      // 초반에 아무나 쏜 것처럼 보였던 사격이, 대상의 정체가 드러나면서 의미를 갖는다.
      const hindsight = marginals(unknown, pool, evidence, true);
      for (const id of Object.keys(evidence)) evidence[id] = blank();
      readLog(view, me, evidence, hindsight);
    }
  }

  const probs = marginals(unknown, pool, evidence, depth === 'full');

  const out: Beliefs = {};
  for (const p of view.players) {
    const known = p.id === me || p.roleRevealed;
    const e = evidence[p.id];
    const pr = known ? oneHot(p.role) : probs[p.id];
    out[p.id] = {
      known,
      role: known ? p.role : null,
      probs: pr,
      alignment: leanOfProbs(pr),
      hostilityToMe: e.toMe,
      threatToSheriff: e.threat,
      scores: roleScores(e),
    };
  }
  return out;
}

/**
 * 로그를 훑어 증거를 쌓는다.
 *
 * hindsight 가 없으면 대상의 성향은 '그 순간까지' 쌓인 증거로 본다.
 * 있으면 판 전체에서 추정한 확률로 본다.
 */
function readLog(
  view: GameState,
  me: PlayerId,
  evidence: Record<PlayerId, Evidence>,
  hindsight: Record<PlayerId, RoleProbs> | null,
): void {
  const byId = new Map(view.players.map((p) => [p.id, p]));
  const sheriffId = view.players.find((p) => p.role === 'sheriff' && p.roleRevealed)?.id;

  /** 이 사람이 보안관 편으로 보이는 정도 (-1 ~ 1). 알려진 역할이면 확실하다 */
  const leanOfTarget = (id: PlayerId): { lean: number; certain: boolean } => {
    const p = byId.get(id);
    if (!p) return { lean: 0, certain: false };
    // 탈락해 드러난 역할은 과거의 사격에도 소급해 적용한다
    if (p.id === me || p.roleRevealed) {
      // 배신자를 친 것은 보안관 편 쪽이 조금 더 자주 한다
      if (p.role === 'renegade') return { lean: -0.5, certain: true };
      return { lean: leanOfProbs(oneHot(p.role)), certain: true };
    }
    if (hindsight?.[id]) return { lean: leanOfProbs(hindsight[id]), certain: false };
    return { lean: leanOf(evidence[id]), certain: false };
  };

  /** actor 가 target 을 세기 w 로 쳤다 (w < 0 이면 도왔다) */
  const act = (actor: PlayerId, target: PlayerId, w: number) => {
    const e = evidence[actor];
    if (!e) return;
    if (target === me && w > 0) e.toMe += 1;
    if (target === sheriffId && w > 0) e.threat += 1;
    // 보안관도 추측하며 쏜다. 보안관의 행동은 누구의 정체도 말해 주지 않는다
    if (actor === sheriffId) return;

    const t = leanOfTarget(target);
    const k = t.certain ? 1 : INDIRECT;
    // 보안관 편을 치거나 적을 도우면 anti, 적을 치거나 보안관 편을 도우면 law
    const signal = -w * t.lean * k;
    if (signal > 0) e.law += signal;
    else e.anti -= signal;
  };

  // 헬레나 존테로·묘지로 역할을 다시 나눴으면 그 전의 행동은 지금 역할을 말해 주지 않는다
  let from = 0;
  for (let i = view.log.length - 1; i >= 0; i--) {
    if (view.log[i].t === 'rolesShuffled') {
      from = i + 1;
      break;
    }
  }
  for (const ev of view.log.slice(from)) {
    const actor = ev.pid;
    if (!actor || !evidence[actor]) continue;

    switch (ev.t) {
      case 'playCard': {
        if (!ev.card || ev.card === '?') break;
        const kind = ev.as ?? kindOf(ev.card);
        if (kind === 'gatling' || kind === 'indians') {
          evidence[actor].anti += AREA_ANTI;
          break;
        }
        // 강탈·캣 발루는 실제로 무엇을 가져갔는지 보고 판단한다 (아래 panic/catBalou)
        const w = ATTACK_WEIGHT[kind];
        if (w && ev.target && ev.target !== actor) act(actor, ev.target, w);
        break;
      }
      case 'panic':
      case 'catBalou': {
        if (!ev.target || ev.target === actor) break;
        const removed = ev.card ? kindOf(ev.card) : null;
        // 감옥이나 다이너마이트를 떼어 준 것은 구해 준 것이다
        if (removed === 'jail' || removed === 'dynamite') act(actor, ev.target, -RESCUE_WEIGHT);
        else act(actor, ev.target, STEAL_WEIGHT);
        break;
      }
      case 'bounty':
        if (actor !== sheriffId) evidence[actor].law += BOUNTY_LAW;
        break;
    }
  }
}

/**
 * 증거를 역할 확률로 바꾼다.
 *
 * constrained 면 남은 역할 묶음을 정체 모를 사람들에게 나눠 주는 모든 경우를 따진다.
 * 무법자 셋이 다 드러났다면 남은 사람은 무법자일 수 없고, 한 사람이 무법자일 게
 * 확실해지면 다른 사람이 무법자일 확률은 그만큼 준다.
 */
function marginals(
  unknown: PlayerId[],
  pool: Role[],
  evidence: Record<PlayerId, Evidence>,
  constrained: boolean,
): Record<PlayerId, RoleProbs> {
  const scores = unknown.map((id) => roleScores(evidence[id]));
  const out: Record<PlayerId, RoleProbs> = {};

  if (constrained && pool.length === unknown.length && unknown.length > 0) {
    const acc = unknown.map(() => zero());
    let total = 0;
    forEachAssignment(pool, unknown.length, (roles) => {
      let logW = 0;
      for (let i = 0; i < roles.length; i++) logW += scores[i][roles[i]];
      const w = Math.exp(logW);
      total += w;
      for (let i = 0; i < roles.length; i++) acc[i][roles[i]] += w;
    });
    if (total > 0) {
      unknown.forEach((id, i) => {
        out[id] = normalize(acc[i], total);
      });
      return out;
    }
  }

  // 제약 없이 사람마다 따로. 남은 역할 수를 사전확률로 쓴다
  const counts = zero();
  for (const r of pool) counts[r]++;
  unknown.forEach((id, i) => {
    const w = zero();
    let total = 0;
    for (const r of ROLES) {
      if (counts[r] === 0) continue;
      w[r] = counts[r] * Math.exp(scores[i][r]);
      total += w[r];
    }
    out[id] = total > 0 ? normalize(w, total) : { ...counts };
  });
  return out;
}

/** 역할 묶음을 n 자리에 나눠 주는 서로 다른 모든 방법 (7인이면 많아야 60가지) */
function forEachAssignment(pool: Role[], n: number, visit: (roles: Role[]) => void): void {
  const counts = zero();
  for (const r of pool) counts[r]++;
  const cur: Role[] = [];
  const walk = () => {
    if (cur.length === n) {
      visit(cur);
      return;
    }
    for (const r of ROLES) {
      if (counts[r] === 0) continue;
      counts[r]--;
      cur.push(r);
      walk();
      cur.pop();
      counts[r]++;
    }
  };
  walk();
}

/**
 * 믿음에 맞춰 감춰진 역할을 하나 지어낸다 (상 난이도의 결정화용).
 * 반환값은 정체 모를 사람 id → 역할.
 */
export function sampleRoles(
  view: GameState,
  me: PlayerId,
  beliefs: Beliefs,
  rng: RngState,
): { roles: Record<PlayerId, Role>; rng: RngState } {
  const pool = hiddenRolePool(view, me);
  const unknown = view.players.filter((p) => p.id !== me && !p.roleRevealed).map((p) => p.id);
  const options: Role[][] = [];
  const weights: number[] = [];
  let total = 0;
  if (pool.length === unknown.length) {
    forEachAssignment(pool, unknown.length, (roles) => {
      let logW = 0;
      for (let i = 0; i < roles.length; i++) logW += beliefs[unknown[i]]?.scores[roles[i]] ?? 0;
      const w = Math.exp(logW);
      options.push([...roles]);
      weights.push(w);
      total += w;
    });
  }
  if (options.length === 0 || !(total > 0)) return { roles: {}, rng };

  const rolled = nextInt(rng, 1_000_000);
  let x = (rolled.value / 1_000_000) * total;
  let pick = options.length - 1;
  for (let i = 0; i < options.length; i++) {
    x -= weights[i];
    if (x < 0) {
      pick = i;
      break;
    }
  }
  const roles: Record<PlayerId, Role> = {};
  unknown.forEach((id, i) => {
    roles[id] = options[pick][i];
  });
  return { roles, rng: rolled.rng };
}

// ---------------------------------------------------------------------------
// 국면
// ---------------------------------------------------------------------------

export type Situation = {
  /** 나를 뺀 생존자 중 각 역할의 기대 인원 */
  alive: RoleProbs;
  /** 보안관 편(보안관+부관)과 무법자 쪽의 기대 전력 (나 제외) */
  lawPower: number;
  outlawPower: number;
  sheriffId: PlayerId | null;
  sheriffHp: number;
  othersAlive: number;
};

function powerOf(p: GameState['players'][number]): number {
  return p.hp * 2 + p.hand.length * 0.5 + p.equipment.length * 0.5;
}

export function situation(view: GameState, me: PlayerId, beliefs: Beliefs): Situation {
  const alive = zero();
  let lawPower = 0;
  let outlawPower = 0;
  let othersAlive = 0;
  const sheriff = view.players.find((p) => p.role === 'sheriff' && p.roleRevealed);
  for (const p of view.players) {
    if (!p.alive || p.id === me) continue;
    othersAlive++;
    const pr = beliefs[p.id]?.probs;
    if (!pr) continue;
    for (const r of ROLES) alive[r] += pr[r];
    const power = powerOf(p);
    lawPower += (pr.sheriff + pr.deputy) * power;
    outlawPower += pr.outlaw * power;
  }
  return {
    alive,
    lawPower,
    outlawPower,
    sheriffId: sheriff?.alive ? sheriff.id : null,
    sheriffHp: sheriff?.alive ? sheriff.hp : 0,
    othersAlive,
  };
}

// ---------------------------------------------------------------------------
// 적대도
// ---------------------------------------------------------------------------

/**
 * 내가 이 사람을 얼마나 때리고 싶은가. 0 이면 관심 없음, 1 이 최대.
 * 상대가 각 역할일 확률로 가중한 기댓값이다. 역할별로 셈법이 완전히 다르다.
 */
export function hostility(
  view: GameState,
  me: PlayerId,
  target: PlayerId,
  beliefs: Beliefs,
  sit: Situation = situation(view, me, beliefs),
): number {
  if (target === me) return 0;
  // 와일드 웨스트 쇼: 역할과 상관없이 모두가 적이다. 나를 노린 사람을 조금 더 친다
  if (lastOneStanding(view)) return Math.min(1.2, 0.85 + 0.08 * Math.min(2, beliefs[target]?.hostilityToMe ?? 0));
  const myRole = view.players.find((p) => p.id === me)?.role;
  const them = beliefs[target];
  if (!myRole || !them) return 0;
  const pr = them.probs;
  const isSheriff = target === sit.sheriffId;
  // 배신자는 무법자가 남아 있는 동안은 무법자를 같이 쳐 준다. 급한 적이 아니다
  const outlawsLeft = sit.alive.outlaw > 0.5;
  const renegadeThreat = outlawsLeft ? 0.55 : 1;

  let h: number;
  switch (myRole) {
    case 'sheriff':
      // 부관을 쏘면 손패와 장비를 전부 잃는다. 부관일 가능성은 크게 뺀다
      h = pr.outlaw + pr.renegade * renegadeThreat - pr.deputy * 1.2;
      break;
    case 'deputy': {
      if (isSheriff) return 0;
      h = pr.outlaw + pr.renegade * renegadeThreat - pr.deputy;
      // 보안관을 겨눈 적이 있는 사람은 먼저 막는다
      h += 0.15 * Math.min(2, them.threatToSheriff);
      if (sit.sheriffHp > 0 && sit.sheriffHp <= 2) h += 0.1 * Math.min(2, them.threatToSheriff);
      break;
    }
    case 'outlaw':
      // 보안관을 쏜 사람은 동료로 본다
      h = pr.sheriff + pr.deputy * 0.75 + pr.renegade * 0.4 + pr.outlaw * 0.02;
      break;
    case 'renegade':
      h = renegadeHostility(pr, isSheriff, sit);
      break;
  }
  // 나를 겨눈 사람에게는 되갚는다. 다만 보안관은 (배신자·보안관 편에게) 예외
  if (!(isSheriff && myRole !== 'outlaw')) h += 0.08 * Math.min(2, them.hostilityToMe);
  return clamp01(h);
}

/**
 * 배신자는 '마지막까지 혼자' 남아야 이긴다.
 *
 * 무법자가 살아 있는 동안 보안관이 죽으면 무법자가 이기고 배신자는 진다.
 * 반대로 보안관 편이 무법자를 다 치우면 배신자 혼자 보안관 편 전체를 상대해야 한다.
 * 그래서 두 세력이 비슷하게 깎여 나가도록 약한 쪽을 돕고 강한 쪽을 친다.
 */
function renegadeHostility(pr: RoleProbs, isSheriff: boolean, sit: Situation): number {
  const nonSheriffLeft = sit.othersAlive - (sit.sheriffId ? 1 : 0);
  if (sit.othersAlive === 1) return 1; // 단둘이 남았다. 누구든 죽이면 이긴다
  if (isSheriff) return nonSheriffLeft === 0 ? 1 : 0.02; // 보안관은 마지막까지 남겨 둔다

  const outlawsLeft = sit.alive.outlaw > 0.5;
  if (!outlawsLeft) {
    // 무법자가 다 떨어졌다. 이제 부관을 정리할 차례
    return pr.deputy + pr.renegade * 0.8 + pr.outlaw * 0.8;
  }

  if (sit.sheriffHp > 0 && sit.sheriffHp <= 2) {
    // 보안관이 위험하다. 보안관을 도와 무법자를 친다
    return pr.outlaw * 0.9 + pr.deputy * 0.1 + pr.renegade * 0.5;
  }
  // 강한 쪽을 친다. edge > 0 이면 무법자 쪽이 세다
  const total = sit.lawPower + sit.outlawPower;
  const edge = total > 0 ? sit.outlawPower / total - 0.5 : 0;
  // 부관을 대놓고 치면 정체가 드러나 보안관 편 전체의 표적이 된다. 부관 쪽은 조금 낮게
  const vsOutlaw = clamp01(0.6 + 3 * edge);
  const vsDeputy = clamp01(0.3 - 3 * edge);
  return pr.outlaw * vsOutlaw + pr.deputy * vsDeputy + pr.renegade * 0.4;
}

// ---------------------------------------------------------------------------

function zero(): RoleProbs {
  return { sheriff: 0, deputy: 0, outlaw: 0, renegade: 0 };
}

function normalize(p: RoleProbs, total: number): RoleProbs {
  return {
    sheriff: p.sheriff / total,
    deputy: p.deputy / total,
    outlaw: p.outlaw / total,
    renegade: p.renegade / total,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function clamp01(v: number): number {
  return clamp(v, 0, 1);
}
