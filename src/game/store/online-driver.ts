/**
 * 온라인 구동기.
 *
 * 두 가지를 맡는다.
 *   1. 살아 있다고 주기적으로 알린다
 *   2. 드라이버로 뽑혔으면 AI 자리와 제한시간 만료를 대신 굴린다
 *
 * 여럿이 굴리면 같은 액션이 두 번 들어가므로, 좌석 번호가 가장 작은 생존자
 * 한 명만 굴린다. 그 사람이 끊기면 다음 사람이 자동으로 이어받는다.
 */

import { useEffect, useRef } from 'react';

import type { Identity } from '../../firebase/auth';
import { touchMember } from '../../firebase/rooms';
import { pickDriver, type RoomDoc, type RoomMember } from '../../firebase/room-model';
import { selectActor, useGameStore } from './game-store';

/** 생존 신호 주기 */
const HEARTBEAT_MS = 12_000;

/**
 * 단계별 제한시간. 원본 맵 v0.128 의 '보통' 속도 값을 그대로 가져왔다.
 * 11년 동안 사람들이 실제로 쓴 값이라 감이 맞다.
 */
export const TIME_LIMIT_MS = {
  reaction: 12_000,
  play: 60_000,
  discard: 30_000,
} as const;

export function useHeartbeat(code: string | null, me: Identity | null) {
  useEffect(() => {
    if (!code || !me) return;
    touchMember(code, me).catch(() => {});
    const timer = setInterval(() => {
      touchMember(code, me).catch(() => {});
    }, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [code, me]);
}

/** 내가 드라이버인지 판단해 스토어에 반영한다. */
export function useDriverElection(
  room: RoomDoc | null,
  members: Record<string, RoomMember>,
  myUid: string | null,
) {
  const setDrives = useGameStore((s) => s.setDrives);

  useEffect(() => {
    if (!room || !myUid) {
      setDrives(false);
      return;
    }
    setDrives(pickDriver(room, members) === myUid);
  }, [room, members, myUid, setDrives]);
}

/**
 * 제한시간이 지나면 기본 행동을 대신 넣는다.
 *
 * 온라인에서 이탈은 예외가 아니라 응답의 한 종류다. 다중 대상 프레임
 * (기관총·인디언·잡화점)은 한 사람이 사라져도 끝까지 풀려야 한다.
 * 원본 맵의 패치노트에서 가장 많은 비중을 차지한 문제가 이것이다.
 */
export function useTimeoutDriver(controlled: string[]) {
  const state = useGameStore((s) => s.state);
  const drives = useGameStore((s) => s.drives);
  const submit = useGameStore((s) => s.submit);
  const startedAt = useRef<{ seq: number; at: number }>({ seq: -1, at: 0 });

  useEffect(() => {
    if (!drives || !state || state.result) return;

    const actor = selectActor(state);
    if (!actor) return;

    // 사람이 앉은 자리만 제한시간을 잰다. AI 자리는 AI 구동기가 바로 둔다.
    if (!controlled.includes(actor) && !isHumanSeat(state, actor)) return;

    if (startedAt.current.seq !== state.seq) {
      startedAt.current = { seq: state.seq, at: Date.now() };
    }
    const limit = state.awaiting
      ? TIME_LIMIT_MS.reaction
      : state.turn.phase === 'discard'
        ? TIME_LIMIT_MS.discard
        : TIME_LIMIT_MS.play;

    const elapsed = Date.now() - startedAt.current.at;
    const timer = setTimeout(
      () => submit({ type: 'timeout', pid: actor }),
      Math.max(0, limit - elapsed),
    );
    return () => clearTimeout(timer);
  }, [state, drives, submit, controlled]);
}

function isHumanSeat(state: { players: { id: string }[] }, pid: string): boolean {
  return state.players.some((p) => p.id === pid);
}
