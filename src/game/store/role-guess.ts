/**
 * 남의 숨은 직업을 내가 짐작해 적어 두는 메모.
 *
 * 나만 보는 표시라 GameState 에도 액션 로그에도 넣지 않는다.
 * 판 화면이 사라지면 비운다. 직업이 공개되면 라벨이 진짜 직업을 그리므로 메모는 안 보인다.
 */

import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { ROLE_DISTRIBUTION } from '../data/roles';
import type { Role } from '../data/types';
import type { PlayerId } from '../engine';

export const roleGuess = createStore<Record<PlayerId, Role>>(() => ({}));

export function useRoleGuess(pid: PlayerId): Role | null {
  return useStore(roleGuess, (s) => s[pid] ?? null);
}

/** 숨은 채로 짐작할 수 있는 직업. 보안관은 늘 공개라 빠진다 */
export function guessableRoles(playerCount: number): Role[] {
  const roles = ROLE_DISTRIBUTION[playerCount] ?? ROLE_DISTRIBUTION[7];
  return [...new Set(roles)].filter((r) => r !== 'sheriff');
}

/** ??? → 첫 직업 → … → 마지막 직업 → ??? 순으로 돈다 */
export function cycleRoleGuess(pid: PlayerId, playerCount: number) {
  const roles = guessableRoles(playerCount);
  const now = roleGuess.getState()[pid];
  const next = now ? roles[roles.indexOf(now) + 1] : roles[0];
  roleGuess.setState((s) => {
    const rest = { ...s };
    delete rest[pid];
    return next ? { ...rest, [pid]: next } : rest;
  }, true);
}

export function clearRoleGuesses() {
  roleGuess.setState({}, true);
}
