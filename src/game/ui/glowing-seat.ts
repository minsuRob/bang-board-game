import type { GameState, PlayerId } from '../engine';

/**
 * 초록 테두리(좌석·매트)를 받을 사람. 보통은 차례 주인이지만,
 * 잡화점처럼 돌아가며 고르는 동안은 지금 고르는 사람에게 옮겨 간다.
 */
export function glowingSeat(view: Pick<GameState, 'turn' | 'awaiting'>): PlayerId {
  if (view.awaiting?.k === 'generalStore') return view.awaiting.pid;
  return view.turn.active;
}
