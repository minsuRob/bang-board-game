import { beforeEach, describe, expect, it } from 'vitest';

import { pickDriver, type RoomDoc, type RoomMember } from '../../firebase/room-model';
import type { Action } from '../engine';
import { createLocalTransport } from './local-transport';
import { selectActor, useGameStore } from './game-store';
import type { Transport } from './transport';

const seats = Array.from({ length: 4 }, (_, i) => ({
  id: `p${i}`,
  name: `P${i}`,
  human: i === 0,
  tier: 'medium' as const,
}));

function startLocal(transport?: Transport) {
  useGameStore.getState().start({
    seed: 42,
    config: { playerCount: 4, expansions: [] },
    seats,
    controlled: ['p0'],
    transport,
  });
}

describe('게임 스토어', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('시작하면 액션 로그를 접어 상태를 만든다', () => {
    startLocal();
    const state = useGameStore.getState().state;
    expect(state).not.toBeNull();
    expect(state!.players).toHaveLength(4);
    expect(state!.turn.phase).toBe('play');
  });

  it('제출한 액션이 트랜스포트를 돌아 상태에 반영된다', () => {
    startLocal();
    const before = useGameStore.getState().state!;
    const actor = selectActor(before)!;
    expect(before.turn.phase).toBe('play');

    useGameStore.getState().submit({ type: 'endTurn', pid: actor });
    const after = useGameStore.getState().state!;
    // 손패가 목숨보다 많으면 버리기 단계에서 멈추고, 아니면 다음 사람으로 넘어간다.
    expect(after.turn.phase === 'discard' || after.turn.active !== actor).toBe(true);
  });

  it('불법 액션은 상태를 바꾸지 않고 로그만 남긴다', () => {
    startLocal();
    const before = useGameStore.getState().state!;
    const other = before.players.find((p) => p.id !== before.turn.active)!;

    useGameStore.getState().submit({ type: 'endTurn', pid: other.id });
    const after = useGameStore.getState().state!;
    expect(after.turn.active).toBe(before.turn.active);
    expect(after.log.some((e) => e.t === 'rejected')).toBe(true);
  });

  it('reset 하면 트랜스포트를 끊고 상태를 비운다', () => {
    startLocal();
    useGameStore.getState().reset();
    expect(useGameStore.getState().state).toBeNull();
    expect(useGameStore.getState().status).toBe('closed');
  });
});

describe('락스텝 되감기', () => {
  it('같은 액션 열을 다시 접으면 같은 상태가 나온다', () => {
    // 네트워크가 액션을 나중에 한꺼번에 흘려보내는 상황을 흉내낸다.
    const recorded: Action[] = [];
    const recorder: Transport = {
      submit(action) {
        recorded.push(action);
        for (const fn of listeners) fn(action);
      },
      subscribe(cb) {
        listeners.push(cb);
        return () => {
          listeners = listeners.filter((f) => f !== cb);
        };
      },
      close() {
        listeners = [];
      },
    };
    let listeners: ((a: Action) => void)[] = [];

    startLocal(recorder);
    for (let i = 0; i < 6; i++) {
      const state = useGameStore.getState().state!;
      if (state.result) break;
      const actor = selectActor(state)!;
      useGameStore.getState().submit({ type: 'timeout', pid: actor });
    }
    const live = JSON.stringify(useGameStore.getState().state);

    // 같은 로그를 새 트랜스포트로 다시 흘려보낸다.
    useGameStore.getState().reset();
    const replay = createLocalTransport();
    useGameStore.getState().start({
      seed: 42,
      config: { playerCount: 4, expansions: [] },
      seats,
      controlled: ['p0'],
      transport: replay,
      submitStart: false,
    });
    for (const action of recorded) replay.submit(action);

    expect(JSON.stringify(useGameStore.getState().state)).toBe(live);
  });
});

describe('드라이버 선출', () => {
  const room = (uids: (string | null)[]): RoomDoc => ({
    code: 'ABC123',
    hostUid: 'u0',
    status: 'playing',
    playerCount: uids.length,
    highnoon: false,
    tier: 'medium',
    seats: uids.map((uid) => ({ uid, nick: uid ?? '', ai: uid === null })),
    seed: 1,
    actionCount: 0,
  });

  const fresh = (uids: string[], now: number): Record<string, RoomMember> =>
    Object.fromEntries(uids.map((u) => [u, { nick: u, lastSeen: now }]));

  it('살아 있는 사람 중 좌석 번호가 가장 작은 사람이 굴린다', () => {
    const now = 1_000_000;
    expect(pickDriver(room(['u0', 'u1', null, 'u2']), fresh(['u0', 'u1', 'u2'], now), now)).toBe('u0');
  });

  it('앞자리가 끊기면 다음 사람이 이어받는다', () => {
    const now = 1_000_000;
    const members = {
      u0: { nick: 'u0', lastSeen: now - 60_000 },
      u1: { nick: 'u1', lastSeen: now },
    };
    expect(pickDriver(room(['u0', 'u1', null, null]), members, now)).toBe('u1');
  });

  it('아무도 없으면 굴리지 않는다', () => {
    const now = 1_000_000;
    const stale = { u0: { nick: 'u0', lastSeen: now - 60_000 } };
    expect(pickDriver(room(['u0', null]), stale, now)).toBeNull();
  });
});
