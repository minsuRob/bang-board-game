/**
 * 방 데이터 모양과 순수 규칙.
 *
 * Firebase 도 React Native 도 import 하지 않는다. 그래야 테스트에서 그대로 돌릴 수 있고,
 * 나중에 서버(Cloud Functions)로 옮겨도 같은 코드를 쓴다.
 */

import type { AiTier } from '../game/ai/types';

/** 이 시간 안에 소식이 없으면 자리를 비운 것으로 본다 */
export const PRESENCE_TIMEOUT_MS = 30_000;

export type RoomSeat = {
  /** 사람이 앉아 있으면 uid, 비어 있으면 null */
  uid: string | null;
  nick: string;
  /** 게임이 시작될 때 AI 가 맡은 자리인가 */
  ai: boolean;
};

export type RoomDoc = {
  code: string;
  hostUid: string;
  status: 'lobby' | 'playing' | 'ended';
  playerCount: number;
  highnoon: boolean;
  tier: AiTier;
  seats: RoomSeat[];
  seed: number;
  actionCount: number;
};

export type RoomMember = {
  nick: string;
  /** 마지막으로 살아 있다고 알린 시각 (ms) */
  lastSeen: number;
};

/**
 * 지금 AI 자리와 제한시간을 굴려야 하는 사람.
 *
 * 살아 있는 참가자 중 좌석 번호가 가장 작은 사람 하나만 굴린다.
 * 여럿이 굴리면 같은 액션이 두 번 들어간다.
 * 그 사람이 끊기면 다음 사람이 자동으로 이어받는다. 따로 합의할 것이 없다.
 */
export function pickDriver(
  room: RoomDoc,
  members: Record<string, RoomMember>,
  now = Date.now(),
): string | null {
  for (const seat of room.seats) {
    if (!seat.uid) continue;
    const member = members[seat.uid];
    if (member && now - member.lastSeen < PRESENCE_TIMEOUT_MS) return seat.uid;
  }
  return null;
}
