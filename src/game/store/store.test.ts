import { beforeEach, describe, expect, it } from 'vitest';

import {
  AWAY_TIMEOUT_MS,
  pickDriver,
  PRESENCE_TIMEOUT_MS,
  presenceOf,
  seatPresence,
  type Presence,
  type RoomDoc,
  type RoomMember,
} from '../../firebase/room-model';
import type { Action, GameState } from '../engine';
import { aiDelayMs } from './ai-driver';
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
  // 드래프트는 각자 첫 후보로 끝낸다
  let s = useGameStore.getState().state!;
  while (s.draft) {
    const pid = s.players.find((p) => s.draft!.picked[p.id] === null)!.id;
    useGameStore.getState().submit({ type: 'pickCharacter', pid, character: s.draft.offers[pid][0] });
    s = useGameStore.getState().state!;
  }
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

describe('저장본에서 이어 보기', () => {
  it('startGame 없이 그 상태에서 시작하고, 이후 액션은 그 위에 접힌다', () => {
    startLocal();
    const saved = JSON.parse(JSON.stringify(useGameStore.getState().state)) as GameState;
    const actor = selectActor(saved)!;
    useGameStore.getState().submit({ type: 'timeout', pid: actor });
    const live = JSON.stringify(useGameStore.getState().state);

    useGameStore.getState().reset();
    const submitted: Action[] = [];
    const transport = createLocalTransport();
    const spy: Transport = {
      ...transport,
      submit(action) {
        submitted.push(action);
        transport.submit(action);
      },
    };
    useGameStore.getState().start({
      seed: 42,
      config: saved.config,
      seats,
      controlled: [],
      transport: spy,
      resume: saved,
    });
    expect(submitted).toEqual([]);
    expect(useGameStore.getState().state).toEqual(saved);
    expect(useGameStore.getState().viewer).toBe('p0');

    useGameStore.getState().submit({ type: 'timeout', pid: actor });
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

  it('나간다고 알린 사람은 시간이 남아도 넘긴다', () => {
    const now = 1_000_000;
    const members: Record<string, RoomMember> = {
      u0: { nick: 'u0', lastSeen: now, presence: 'left' },
      u1: { nick: 'u1', lastSeen: now, presence: 'away' },
    };
    expect(pickDriver(room(['u0', 'u1']), members, now)).toBe('u1');
  });
});

describe('접속 상태', () => {
  const now = 1_000_000;
  const m = (presence: Presence | undefined, age: number): RoomMember => ({
    nick: 'x',
    lastSeen: now - age,
    presence,
  });

  it('스스로 알린 값을 그대로 보인다', () => {
    expect(presenceOf(m('active', 0), now)).toBe('active');
    expect(presenceOf(m('away', 0), now)).toBe('away');
    expect(presenceOf(m('left', 0), now)).toBe('left');
  });

  it('예전 문서(상태 없음)는 보는 중으로 본다', () => {
    expect(presenceOf(m(undefined, 5_000), now)).toBe('active');
  });

  it('문서가 없으면 나간 것이다', () => {
    expect(presenceOf(undefined, now)).toBe('left');
  });

  it('소식이 끊기면 나간 것이다. 자리 비움은 더 기다린다', () => {
    expect(presenceOf(m('active', PRESENCE_TIMEOUT_MS - 1), now)).toBe('active');
    expect(presenceOf(m('active', PRESENCE_TIMEOUT_MS), now)).toBe('left');
    expect(presenceOf(m('away', PRESENCE_TIMEOUT_MS + 10_000), now)).toBe('away');
    expect(presenceOf(m('away', AWAY_TIMEOUT_MS), now)).toBe('left');
  });

  it('좌석 id 별로 사람 자리만 담는다', () => {
    const members = { a: m('active', 0), b: m('away', 0) };
    expect(seatPresence(['a', null, 'b', 'gone'], members, now)).toEqual({
      p0: 'active',
      p2: 'away',
      p3: 'left',
    });
  });
});

describe('AI 박자', () => {
  it('1배속이면 한 과정에 3초, 배속만큼 줄어든다', () => {
    expect(aiDelayMs(1, 0)).toBe(3000);
    expect(aiDelayMs(2, 0)).toBe(1500);
    expect(aiDelayMs(4, 0)).toBe(750);
  });

  it('연출이 더 오래 걸리면 연출이 끝난 뒤에 둔다', () => {
    expect(aiDelayMs(4, 1500)).toBe(1580);
  });
});
