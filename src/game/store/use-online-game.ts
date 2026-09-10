/**
 * 온라인 판 하나를 붙잡고 있는 훅.
 *
 * 방 문서를 지켜보다가 판이 열리면 락스텝 트랜스포트로 스토어를 띄운다.
 * 새로고침해도 액션 로그를 처음부터 다시 접기 때문에 그대로 이어진다.
 */

import { useEffect, useMemo, useState } from 'react';

import { getIdentity, type Identity } from '../../firebase/auth';
import {
  markStarted,
  watchMembers,
  watchRoom,
  type RoomDoc,
  type RoomMember,
} from '../../firebase/rooms';
import { createFirebaseTransport } from './firebase-transport';
import { useGameStore, type SeatSetup } from './game-store';
import { useDriverElection, useHeartbeat } from './online-driver';

export type OnlineGame = {
  identity: Identity | null;
  room: RoomDoc | null;
  members: Record<string, RoomMember>;
  mySeat: number | null;
  isHost: boolean;
  error: string | null;
};

export function useRoomConnection(code: string | null): OnlineGame {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [members, setMembers] = useState<Record<string, RoomMember>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 로컬 대전에서는 이 훅이 code 없이 불린다. 그때는 로그인도 하지 않는다.
    if (!code) return;
    let alive = true;
    getIdentity()
      .then((id) => alive && setIdentity(id))
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [code]);

  useEffect(() => {
    if (!code) return;
    const stopRoom = watchRoom(code, setRoom, (err) => setError(err.message));
    const stopMembers = watchMembers(code, setMembers);
    return () => {
      stopRoom();
      stopMembers();
    };
  }, [code]);

  useHeartbeat(code, identity);
  useDriverElection(room, members, identity?.uid ?? null);

  const mySeat = useMemo(() => {
    if (!room || !identity) return null;
    const i = room.seats.findIndex((s) => s.uid === identity.uid);
    return i >= 0 ? i : null;
  }, [room, identity]);

  return {
    identity,
    room,
    members,
    mySeat,
    isHost: Boolean(room && identity && room.hostUid === identity.uid),
    error,
  };
}

/** 방이 'playing' 이 되면 스토어를 락스텝 트랜스포트로 띄운다. */
export function useOnlineGameSession(code: string | null, conn: OnlineGame) {
  const start = useGameStore((s) => s.start);
  const reset = useGameStore((s) => s.reset);
  const { room, identity, mySeat, isHost } = conn;

  const ready = Boolean(code && room && identity && room.status !== 'lobby');

  useEffect(() => {
    if (!ready || !code || !room || !identity) return;

    const seats: SeatSetup[] = room.seats.map((s, i) => ({
      id: `p${i}`,
      name: s.uid ? s.nick || `P${i}` : s.nick || `AI ${i + 1}`,
      human: Boolean(s.uid),
      tier: room.tier,
    }));

    start({
      seed: room.seed,
      config: {
        playerCount: room.playerCount,
        expansions: room.highnoon ? ['highnoon'] : [],
      },
      seats,
      controlled: mySeat === null ? [] : [`p${mySeat}`],
      transport: createFirebaseTransport(code, identity.uid),
      // 판을 여는 액션은 호스트 하나만 넣는다.
      submitStart: isHost && room.actionCount === 0,
      drives: false,
    });

    return () => reset();
    // room.seed / playerCount 가 바뀌면 다른 판이므로 다시 띄운다.
  }, [ready, code, room?.seed, room?.playerCount, room?.highnoon, identity?.uid, mySeat, isHost, start, reset, room, identity]);

  return ready;
}

export { markStarted };
