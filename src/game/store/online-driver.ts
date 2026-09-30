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
import { syncDraftClock } from './draft-ui';
import { seatOf, selectActor, selectActors, useGameStore } from './game-store';
import { setWaitDeadline } from './wait-clock';

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
  /** 캐릭터 드래프트. 모두가 동시에 고르므로 드래프트가 열린 순간부터 한 번만 잰다 */
  draft: 30_000,
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
/** enabled 가 false 면 (일시정지) 시계를 세우고, 다시 켜지면 그 수의 시간을 처음부터 잰다 */
export function useTimeoutDriver(controlled: string[], enabled = true) {
  const state = useGameStore((s) => s.state);
  const drives = useGameStore((s) => s.drives);
  const seats = useGameStore((s) => s.seats);
  const submit = useGameStore((s) => s.submit);
  const startedAt = useRef<{ seq: number; at: number }>({ seq: -1, at: 0 });

  useEffect(() => {
    const startedAt = syncDraftClock(Boolean(state?.draft));
    if (!drives || !state?.draft || startedAt === null) return;

    // 드래프트: 시계는 액션마다 다시 재지 않는다. 끝나면 못 고른 사람 전원을 기본 선택시킨다.
    const timer = setTimeout(
      () => {
        for (const pid of selectActors(state)) submit({ type: 'timeout', pid });
      },
      Math.max(0, startedAt + TIME_LIMIT_MS.draft - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [state, drives, submit]);

  useEffect(() => {
    if (!enabled) {
      startedAt.current = { seq: -1, at: 0 };
      return;
    }
    if (!state || state.result || state.draft) return;

    const actor = selectActor(state);
    if (!actor) return;

    // 사람이 앉은 자리만 제한시간을 잰다. AI 자리는 AI 구동기가 바로 둔다.
    if (!controlled.includes(actor) && !isHumanSeat(state, actor)) return;

    // 모든 클라이언트가 같은 전이를 받으므로, 전이가 도착한 순간부터 각자 잰다.
    // 네트워크 지연만큼 드라이버와 어긋날 수 있지만 표시용으로는 충분하다.
    if (startedAt.current.seq !== state.seq) {
      startedAt.current = { seq: state.seq, at: Date.now() };
    }
    const limit = state.awaiting
      ? TIME_LIMIT_MS.reaction
      : state.turn.phase === 'discard'
        ? TIME_LIMIT_MS.discard
        : TIME_LIMIT_MS.play;

    const human = controlled.includes(actor) || seatOf(seats, actor)?.human !== false;
    if (human) setWaitDeadline(startedAt.current.at + limit);
    const clear = () => {
      if (human) setWaitDeadline(null);
    };
    if (!drives) return clear;

    const elapsed = Date.now() - startedAt.current.at;
    const timer = setTimeout(
      () => submit({ type: 'timeout', pid: actor }),
      Math.max(0, limit - elapsed),
    );
    return () => {
      clearTimeout(timer);
      clear();
    };
  }, [state, drives, submit, controlled, enabled, seats]);
}

function isHumanSeat(state: { players: { id: string }[] }, pid: string): boolean {
  return state.players.some((p) => p.id === pid);
}
