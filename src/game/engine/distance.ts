/**
 * 거리 계산.
 *
 * 착석 순서 원형 배열에서 시계/반시계 중 짧은 쪽이 기본 거리다.
 * 게임에서 제거된 사람은 원에서 빠진다 (원본 맵 v0.4, v0.60 패치노트).
 * 유령도시로 되살아난 유령은 원에 남는다 (v0.227).
 *
 * 여기에 훅을 합산한다:
 *   - 표적 쪽 +  : 야생마, 폴 리그렛
 *   - 보는 쪽 -  : 조준경, 로즈 둘란
 * 결과는 1 아래로 내려가지 않는다.
 */

import { defOf, inPlay, playerOf } from './cards';
import { getModifiers } from './hooks';
import type { GameState, Player, PlayerId } from './types';

/** 맨손 사정거리 */
export const BARE_HAND_RANGE = 1;

/** 자리에 앉아 있는 사람들 (착석 순서 유지) */
export function seatRing(state: GameState): Player[] {
  return state.players.filter(inPlay);
}

/**
 * 훅을 빼고 순수하게 자리로만 잰 거리.
 * 두 사람 모두 원 안에 있어야 한다.
 */
export function baseDistance(state: GameState, from: PlayerId, to: PlayerId): number {
  if (from === to) return 0;
  const ring = seatRing(state);
  const i = ring.findIndex((p) => p.id === from);
  const j = ring.findIndex((p) => p.id === to);
  if (i < 0 || j < 0) {
    throw new Error(`거리를 잴 수 없다: ${from} → ${to} (원 안에 없음)`);
  }
  const forward = (j - i + ring.length) % ring.length;
  return Math.min(forward, ring.length - forward);
}

/** 실제 거리. 장비와 캐릭터 능력을 합산한다. */
export function distance(state: GameState, from: PlayerId, to: PlayerId): number {
  if (from === to) return 0;

  let d = baseDistance(state, from, to);
  for (const m of getModifiers(state, to)) d += m.distanceAsTarget ?? 0;
  for (const m of getModifiers(state, from)) d -= m.distanceAsViewer ?? 0;

  return Math.max(1, d);
}

/** 장착한 무기의 사정거리 (맨손 1) */
export function weaponRangeOf(state: GameState, pid: PlayerId): number {
  const p = playerOf(state, pid);
  let range = BARE_HAND_RANGE;
  for (const card of p.equipment) {
    const def = defOf(card);
    if (def.equip === 'weapon' && def.weaponRange) range = Math.max(range, def.weaponRange);
  }
  return range;
}

/** 뱅!이 닿는가 (사정거리 기준) */
export function canReachWithBang(state: GameState, from: PlayerId, to: PlayerId): boolean {
  if (from === to) return false;
  return distance(state, from, to) <= weaponRangeOf(state, from);
}

/**
 * 강탈처럼 '거리 N 이내' 를 요구하는 카드가 닿는가.
 * 장착 무기는 고려하지 않는다 (도감 심벌 ① 의 정의).
 */
export function canReachAtRange(
  state: GameState,
  from: PlayerId,
  to: PlayerId,
  range: number,
): boolean {
  if (from === to) return false;
  return distance(state, from, to) <= range;
}
