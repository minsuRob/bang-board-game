/**
 * 온라인 판 하나를 붙잡고 있는 훅.
 *
 * 방 문서를 지켜보다가 판이 열리면 락스텝 트랜스포트로 스토어를 띄운다.
 * 새로고침해도 액션 로그를 처음부터 다시 접기 때문에 그대로 이어진다.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { getIdentity, type Identity } from '../../firebase/auth';
import {
  markStarted,
  setDraftHoverRemote,
  watchMembers,
  watchRoom,
  type RoomDoc,
  type RoomMember,
} from '../../firebase/rooms';
import { draftUi, setDraftHover } from './draft-ui';
import { createFirebaseTransport } from './firebase-transport';
import { useGameStore, type SeatSetup } from './game-store';
import { useDriverElection } from './online-driver';
import { usePresenceReporter, usePresenceSync } from './presence';

export type OnlineGame = {
  identity: Identity | null;
  room: RoomDoc | null;
  members: Record<string, RoomMember>;
  mySeat: number | null;
  isHost: boolean;
  error: string | null;
};

/**
 * `signIn` 을 켜면 방 코드가 아직 없어도 로그인한다.
 * 방을 새로 만드는 화면은 identity 가 있어야 코드를 받아 오기 때문이다.
 */
export function useRoomConnection(
  code: string | null,
  { signIn = false }: { signIn?: boolean } = {},
): OnlineGame {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [members, setMembers] = useState<Record<string, RoomMember>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 로컬 대전에서는 이 훅이 code 없이 불린다. 그때는 로그인도 하지 않는다.
    if (!code && !signIn) return;
    let alive = true;
    getIdentity()
      .then((id) => alive && setIdentity(id))
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [code, signIn]);

  // 규칙이 로그인한 사람만 읽게 한다. 로그인 전에 구독하면 권한 오류로 끊긴다.
  const uid = identity?.uid ?? null;
  useEffect(() => {
    if (!code || !uid) return;
    const stopRoom = watchRoom(code, setRoom, (err) => setError(err.message));
    const stopMembers = watchMembers(code, setMembers);
    return () => {
      stopRoom();
      stopMembers();
    };
  }, [code, uid]);

  usePresenceReporter(code, identity);
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

  // 판을 가르는 값만 모은 열쇠. 방 문서는 액션마다 actionCount 가 바뀌어 새 객체로 오므로,
  // room 을 통째로 의존하면 액션 하나마다 스토어를 부수고 다시 띄운다
  // (화면이 통째로 다시 그려져 열어 둔 채팅·입력 중인 글이 날아간다).
  const sessionKey =
    ready && room
      ? JSON.stringify({
          seed: room.seed,
          playerCount: room.playerCount,
          highnoon: room.highnoon,
          wildwestshow: room.wildwestshow ?? false,
          valley: room.valley ?? false,
          tier: room.tier,
          seats: room.seats.map((s) => ({ uid: s.uid, nick: s.nick, ai: s.ai })),
        })
      : null;

  // 판을 여는 액션을 넣을지는 띄우는 그 순간의 값만 본다
  const actionCount = room?.actionCount ?? 0;
  const actionCountRef = useRef(actionCount);
  useEffect(() => {
    actionCountRef.current = actionCount;
  });

  const uid = identity?.uid ?? null;
  useEffect(() => {
    if (!sessionKey || !code || !uid) return;
    const session = JSON.parse(sessionKey) as Pick<
      RoomDoc,
      'seed' | 'playerCount' | 'highnoon' | 'wildwestshow' | 'valley' | 'tier' | 'seats'
    >;

    const seats: SeatSetup[] = session.seats.map((s, i) => ({
      id: `p${i}`,
      name: s.uid ? s.nick || `P${i}` : s.nick || `AI ${i + 1}`,
      human: Boolean(s.uid),
      tier: session.tier,
    }));

    start({
      seed: session.seed,
      config: {
        playerCount: session.playerCount,
        expansions: [
          ...(session.highnoon ? (['highnoon'] as const) : []),
          ...(session.wildwestshow ? (['wildwestshow'] as const) : []),
          ...(session.valley ? (['valley'] as const) : []),
        ],
      },
      seats,
      controlled: mySeat === null ? [] : [`p${mySeat}`],
      transport: createFirebaseTransport(code, uid),
      // 판을 여는 액션은 호스트 하나만 넣는다.
      submitStart: isHost && actionCountRef.current === 0,
      // 드라이버 선출(useDriverElection)이 이미 정해 둔 값을 지킨다
      drives: useGameStore.getState().drives,
    });

    return () => reset();
  }, [sessionKey, code, uid, mySeat, isHost, start, reset]);

  useDraftHoverSync(code, conn);
  usePresenceSync(ready && room ? room.seats : null, conn.members);
  return ready;
}

/** 내 hover 를 흘려보내는 최소 간격 */
const HOVER_THROTTLE_MS = 150;

/**
 * 드래프트 hover 를 members 문서로 주고받는다.
 * 액션 로그와 달리 순서·유실이 상관없는 연출이라 가벼운 채널로 충분하다.
 */
function useDraftHoverSync(code: string | null, conn: OnlineGame) {
  const { room, members, identity, mySeat } = conn;
  const drafting = useGameStore((s) => Boolean(s.state?.draft));
  const myPid = mySeat === null ? null : `p${mySeat}`;

  // 받기: 남의 좌석만 적는다. 내 hover 는 내 화면이 이미 알고 있다.
  useEffect(() => {
    if (!room || !drafting) return;
    room.seats.forEach((seat, i) => {
      const pid = `p${i}`;
      if (!seat.uid || pid === myPid) return;
      setDraftHover(pid, members[seat.uid]?.draftHover ?? null);
    });
  }, [room, members, drafting, myPid]);

  // 보내기: 바뀔 때만, 너무 잦으면 마지막 값만
  const last = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (!code || !identity || !myPid || !drafting) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      timer = null;
      const index = draftUi.getState().hover[myPid] ?? null;
      if (index === last.current) return;
      last.current = index;
      setDraftHoverRemote(code, identity.uid, index).catch(() => {});
    };
    const stop = draftUi.subscribe(() => {
      if (!timer) timer = setTimeout(flush, HOVER_THROTTLE_MS);
    });
    return () => {
      stop();
      if (timer) clearTimeout(timer);
      // 드래프트가 끝나면 남은 hover 를 지운다
      if (last.current !== null && last.current !== undefined) {
        setDraftHoverRemote(code, identity.uid, null).catch(() => {});
      }
      last.current = undefined;
    };
  }, [code, identity, myPid, drafting]);
}

export { markStarted };
