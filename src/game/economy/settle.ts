/**
 * 판 결과 → 누가 얼마를 받는가.
 *
 * 좌석마다 사람이면 uid, AI 면 null 이다. AI 자리는 아무것도 받지 않는다.
 * 승자는 winnerIds(좌석 id) 로 본다. 레이디 로즈로 자리가 바뀌어도 id 는 그대로다.
 */

import type { GameResult, PlayerId } from '../engine/types';
import { CASH_PLAY, CASH_WIN, XP_PLAY, XP_WIN } from './constants';

export type SeatUid = { pid: PlayerId; uid: string | null };

export type Credit = {
  uid: string;
  pid: PlayerId;
  won: boolean;
  cash: number;
  xp: number;
};

export function creditFor(uid: string, pid: PlayerId, won: boolean): Credit {
  return {
    uid,
    pid,
    won,
    cash: CASH_PLAY + (won ? CASH_WIN : 0),
    xp: XP_PLAY + (won ? XP_WIN : 0),
  };
}

export function settleResult(result: GameResult, seats: readonly SeatUid[]): Credit[] {
  const out: Credit[] = [];
  for (const seat of seats) {
    if (!seat.uid) continue;
    out.push(creditFor(seat.uid, seat.pid, result.winnerIds.includes(seat.pid)));
  }
  return out;
}
