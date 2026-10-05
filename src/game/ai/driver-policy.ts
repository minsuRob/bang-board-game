/**
 * AI 자리를 굴리는 규칙 (시드 공식과 누가 둘 차례인지).
 *
 * 클라이언트의 ai-driver 와 서버의 판 검증기(economy/verify)가 같은 함수를 쓴다.
 * 공식이 한 곳에만 있어야 "클라이언트가 둔 수 = 서버가 다시 계산한 수" 가 유지된다.
 * 여기 숫자를 바꾸면 이미 올라간 기록은 검증을 통과하지 못한다.
 */

import { actorsOf } from '../engine/legal';
import type { Action, GameState, PlayerId } from '../engine/types';
import { decide } from './index';
import type { AiTier } from './types';

/** 캐릭터 드래프트의 시드. 좌석 번호(= state.players 인덱스)로 가른다 */
export function draftSeed(seed: number, seatIndex: number): number {
  return seed * 7919 + seatIndex * 131;
}

/** 일반 수의 시드. 직전 상태의 seq 로 가른다 */
export function moveSeed(seed: number, seq: number): number {
  return seed * 7919 + seq;
}

export type SeatTier = { id: PlayerId; human: boolean; tier: AiTier };

export function tierOf(seats: readonly SeatTier[], pid: PlayerId): AiTier {
  return seats.find((s) => s.id === pid)?.tier ?? 'medium';
}

/**
 * 드래프트 중 AI 자리들이 고를 캐릭터. 모두 같은 state 스냅숏으로 한꺼번에 계산한다.
 * (ai-driver 가 그렇게 하므로 검증기도 같은 스냅숏을 써야 한다)
 */
export function aiDraftActions(
  state: GameState,
  seats: readonly SeatTier[],
  controlled: readonly PlayerId[],
  seed: number,
  budget?: number,
): Action[] {
  if (!state.draft) return [];
  const out: Action[] = [];
  for (const pid of actorsOf(state)) {
    if (controlled.includes(pid)) continue;
    const seat = state.players.findIndex((p) => p.id === pid);
    const action = decide(state, pid, tierOf(seats, pid), draftSeed(seed, seat), budget);
    if (action) out.push(action);
  }
  return out;
}

/** 드래프트 밖에서 지금 둘 AI 의 수. 둘 사람이 없거나 사람 차례면 null */
export function aiNextAction(
  state: GameState,
  seats: readonly SeatTier[],
  controlled: readonly PlayerId[],
  seed: number,
  budget?: number,
): Action | null {
  if (state.result || state.draft) return null;
  const actor = actorsOf(state)[0];
  if (!actor || controlled.includes(actor)) return null;
  return decide(state, actor, tierOf(seats, actor), moveSeed(seed, state.seq), budget);
}
