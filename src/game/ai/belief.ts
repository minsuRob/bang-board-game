/**
 * 역할 추정.
 *
 * 뱅!의 재미는 "누가 무법자인가"에 있고, AI 도 그걸 추론해야 한다.
 * 보이는 것만으로 판단한다: 누가 누구를 쐈고, 누가 누구를 살렸는가.
 */

import { ROLE_DISTRIBUTION } from '../data/roles';
import type { Role } from '../data/types';
import type { GameState, PlayerId } from '../engine';

export type Belief = {
  /** +1 에 가까울수록 보안관 편, -1 에 가까울수록 보안관의 적 */
  alignment: number;
  /** 이 사람이 나를 얼마나 노렸는가 */
  hostilityToMe: number;
  /** 역할이 이미 공개되었는가 */
  known: boolean;
  role: Role | null;
};

export type Beliefs = Record<PlayerId, Belief>;

/** 로그 한 줄이 성향 점수에 주는 가중치 */
const WEIGHT = {
  damagedSheriff: -1.0,
  damagedKnownEnemy: 0.6,
  damagedKnownAlly: -0.5,
  healedOther: 0.15,
  bountyTaken: 0.8,
  sheriffPenalty: 0.4,
};

/**
 * naive = true 면 로그를 읽지 않는다.
 *
 * 난이도는 '얼마나 잘 계산하는가'가 아니라 '무엇까지 보는가'로 가른다.
 * 중 난이도는 공개된 역할만 보고, 상 난이도는 지금까지의 행동에서 역할을 추론한다.
 * 이렇게 두면 상이 중의 상위집합이라 실력 순서가 설계상 보장된다.
 */
export function analyze(view: GameState, me: PlayerId, naive = false): Beliefs {
  const out: Beliefs = {};
  const sheriff = view.players.find((p) => p.role === 'sheriff' && p.roleRevealed);

  for (const p of view.players) {
    const known = p.id === me || p.roleRevealed;
    out[p.id] = {
      alignment: known ? alignmentOf(p.role) : 0,
      hostilityToMe: 0,
      known,
      role: known ? p.role : null,
    };
  }

  if (naive) return out;

  for (const ev of view.log) {
    const actor = ev.pid;
    if (!actor || !out[actor]) continue;

    if (ev.t === 'damage' && ev.target) {
      const victim = view.players.find((x) => x.id === ev.target);
      if (!victim) continue;
      if (ev.target === me) out[actor].hostilityToMe += ev.amount ?? 1;

      if (sheriff && ev.target === sheriff.id) {
        out[actor].alignment += WEIGHT.damagedSheriff * (ev.amount ?? 1);
      } else if (victim.roleRevealed) {
        out[actor].alignment +=
          victim.role === 'outlaw' || victim.role === 'renegade'
            ? WEIGHT.damagedKnownEnemy
            : WEIGHT.damagedKnownAlly;
      }
    } else if (ev.t === 'bounty') {
      out[actor].alignment += WEIGHT.bountyTaken;
    } else if (ev.t === 'heal' && ev.target && ev.target !== actor) {
      out[actor].alignment += WEIGHT.healedOther;
    } else if (ev.t === 'penalty') {
      // 보안관이 부관을 쐈다면, 맞은 쪽이 부관이었다는 사실이 공개된다.
      out[actor].alignment += WEIGHT.sheriffPenalty;
    }
  }

  for (const id of Object.keys(out)) {
    if (!out[id].known) out[id].alignment = clamp(out[id].alignment, -2, 2);
  }
  return out;
}

function alignmentOf(role: Role): number {
  return role === 'sheriff' || role === 'deputy' ? 1 : -1;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * 내가 이 사람을 얼마나 때리고 싶은가. 0 이면 관심 없음, 1 이 최대.
 * 역할별로 셈법이 완전히 다르다.
 */
export function hostility(
  view: GameState,
  me: PlayerId,
  target: PlayerId,
  beliefs: Beliefs,
): number {
  if (target === me) return 0;
  const myRole = view.players.find((p) => p.id === me)?.role;
  const them = beliefs[target];
  if (!myRole || !them) return 0;

  const sheriff = view.players.find((p) => p.role === 'sheriff' && p.roleRevealed);
  const isSheriff = sheriff?.id === target;
  const alive = view.players.filter((p) => p.alive).length;

  switch (myRole) {
    case 'sheriff':
    case 'deputy': {
      // 보안관 편은 성향이 나쁜 쪽을 친다. 확실히 아군인 사람은 절대 치지 않는다.
      if (them.known && (them.role === 'sheriff' || them.role === 'deputy')) return 0;
      if (them.known) return 1;
      return clamp01(0.35 - them.alignment * 0.35);
    }
    case 'outlaw': {
      if (isSheriff) return 1;
      if (them.known && them.role === 'outlaw') return 0.05;
      // 보안관 편으로 보이는 사람은 보안관 다음 목표
      return clamp01(0.3 + them.alignment * 0.3);
    }
    case 'renegade': {
      // 배신자는 마지막까지 혼자 남아야 한다.
      // 사람이 많을 땐 강한 쪽을, 셋 이하로 줄면 보안관을 노린다.
      if (alive <= 3) return isSheriff ? 1 : 0.6;
      if (isSheriff) return 0.15;
      return clamp01(0.4 - them.alignment * 0.2);
    }
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** 남은 인원수로 본 역할 사전 분포 (아직 안 쓰는 경우를 위한 참고값) */
export function priorRoles(playerCount: number): readonly Role[] {
  return ROLE_DISTRIBUTION[playerCount] ?? [];
}
