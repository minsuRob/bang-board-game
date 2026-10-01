import { describe, expect, it } from 'vitest';

import { decide } from '../ai';
import { actorsOf, reduce, type GameState } from '../engine';
import { createDeviceSaveBackend, type KeyValueStore } from './save-backend';
import {
  canSaveGame,
  makeSaveRecord,
  MAX_SAVE_BYTES,
  readSaveRecord,
  saveSummary,
  SaveError,
  utf8Length,
  type SavedSeat,
} from './save-model';

const seats: SavedSeat[] = Array.from({ length: 5 }, (_, i) => ({
  id: `p${i}`,
  name: i === 0 ? '나' : `AI${i}`,
  human: i === 0,
  tier: 'medium',
}));

/** 한 수 둔다. 드래프트는 시간 초과로 모두 첫 후보를 고른다 */
function step(state: GameState, seed: number): GameState {
  if (state.draft) {
    let s = state;
    for (const pid of actorsOf(state)) s = reduce(s, { type: 'timeout', pid });
    return s;
  }
  const actor = actorsOf(state)[0];
  const action = decide(state, actor, 'medium', seed * 7919 + state.seq);
  return reduce(state, action ?? { type: 'timeout', pid: actor });
}

function newGame(seed: number, highnoon = false): GameState {
  return reduce(null, {
    type: 'startGame',
    seed,
    config: { playerCount: 5, expansions: highnoon ? ['highnoon'] : [] },
    seats: seats.map((s) => ({ id: s.id, name: s.name })),
  });
}

/** p0 이 탈락할 때까지 둔다. 끝까지 살아남으면 null */
function untilHumanOut(seed: number, highnoon = false): GameState | null {
  let s = newGame(seed, highnoon);
  for (let i = 0; i < 6000 && !s.result; i++) {
    s = step(s, seed);
    if (canSaveGame(s, ['p0'])) return s;
  }
  return null;
}

function findHumanOut(highnoon = false): { seed: number; state: GameState } {
  for (let seed = 1; seed < 60; seed++) {
    const state = untilHumanOut(seed, highnoon);
    if (state) return { seed, state };
  }
  throw new Error('p0 이 먼저 탈락하는 판을 찾지 못했다');
}

function record(state: GameState, controlled = ['p0'], id = 'a') {
  return makeSaveRecord({ id, savedAt: 1000, seed: 7, seats, controlled, state, elapsedMs: 65_000 });
}

describe('저장할 수 있는가', () => {
  it('드래프트 중이거나 사람이 살아 있으면 못 한다', () => {
    const s = newGame(3);
    expect(s.draft).toBeTruthy();
    expect(canSaveGame(s, ['p0'])).toBe(false);
    expect(canSaveGame(s, [])).toBe(false);

    const played = step(s, 3);
    expect(played.draft).toBeFalsy();
    expect(canSaveGame(played, ['p0'])).toBe(false);
  });

  it('관전 판은 드래프트가 끝나면 언제든 된다', () => {
    expect(canSaveGame(step(newGame(3), 3), [])).toBe(true);
  });

  it('사람 자리가 모두 탈락하면 된다. 유령으로 돌아온 동안은 안 된다', () => {
    const { state } = findHumanOut();
    expect(canSaveGame(state, ['p0'])).toBe(true);
    const ghost: GameState = {
      ...state,
      players: state.players.map((p) => (p.id === 'p0' ? { ...p, ghost: true } : p)),
    };
    expect(canSaveGame(ghost, ['p0'])).toBe(false);
  });

  it('판이 끝났으면 못 한다', () => {
    const { state } = findHumanOut();
    const ended: GameState = { ...state, result: { winners: ['sheriff'], winnerIds: [], reason: '' } };
    expect(canSaveGame(ended, ['p0'])).toBe(false);
  });
});

describe('저장 레코드', () => {
  it('요약과 본문을 만들고 그대로 되돌린다', () => {
    const { state } = findHumanOut();
    const rec = record(state);
    expect(rec.meta).toMatchObject({ id: 'a', playerCount: 5, spectate: false, elapsedMs: 65_000 });
    expect(rec.meta.alive).toBe(state.players.filter((p) => p.alive).length);
    expect(rec.meta.bytes).toBe(utf8Length(rec.body));

    const back = readSaveRecord(rec);
    expect(back.seed).toBe(7);
    expect(back.controlled).toEqual(['p0']);
    expect(back.seats).toEqual(seats);
    expect(JSON.stringify(back.state)).toBe(JSON.stringify(state));
  });

  it('이어 둔 판은 저장하지 않고 둔 판과 똑같이 흘러간다', () => {
    const { seed, state } = findHumanOut(true);
    let live = state;
    let resumed = readSaveRecord(record(state)).state;
    for (let i = 0; i < 6000 && !live.result; i++) {
      live = step(live, seed);
      resumed = step(resumed, seed);
    }
    expect(live.result).toBeTruthy();
    expect(JSON.stringify(resumed)).toBe(JSON.stringify(live));
  });

  it('긴 판도 한도 안에 든다', () => {
    const { seed, state } = findHumanOut(true);
    let s = state;
    let biggest = 0;
    for (let i = 0; i < 6000 && !s.result; i++) {
      s = step(s, seed);
      if (!s.result) biggest = Math.max(biggest, record(s).meta.bytes);
    }
    expect(biggest).toBeLessThan(MAX_SAVE_BYTES / 2);
  });

  it('형식이 다르거나 본문이 깨졌으면 거절한다', () => {
    const { state } = findHumanOut();
    const rec = record(state);
    expect(() => readSaveRecord({ ...rec, meta: { ...rec.meta, format: 0 } })).toThrow(SaveError);
    expect(() => readSaveRecord({ ...rec, body: '{' })).toThrow(SaveError);
    expect(() => readSaveRecord({ ...rec, body: '{"seed":1}' })).toThrow(SaveError);
  });

  it('목록 문구', () => {
    const { state } = findHumanOut();
    const meta = { ...record(state).meta, expansions: ['highnoon' as const], round: 4, alive: 3 };
    expect(saveSummary(meta)).toBe('5인 · 하이 눈 · 4라운드 · 3명 생존');
    expect(saveSummary({ ...meta, expansions: [], spectate: true })).toBe('5인 · 4라운드 · 3명 생존 · 관전');
  });

  it('UTF-8 바이트를 센다', () => {
    expect(utf8Length('abc')).toBe(3);
    expect(utf8Length('뱅!')).toBe(4);
    expect(utf8Length('é')).toBe(2);
    expect(utf8Length('🂡')).toBe(4);
  });
});

function memoryKv(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
}

describe('기기 저장소', () => {
  it('넣고, 목록에 보이고, 꺼내고, 지운다', async () => {
    const { state } = findHumanOut();
    const kv = memoryKv();
    const saves = createDeviceSaveBackend(kv);
    await saves.put(record(state, ['p0'], 'a'));
    await saves.put({ ...record(state, [], 'b'), meta: { ...record(state, [], 'b').meta, savedAt: 2000 } });

    expect((await saves.list()).map((m) => m.id)).toEqual(['b', 'a']);
    const loaded = await saves.load('a');
    expect(loaded && JSON.stringify(readSaveRecord(loaded).state)).toBe(JSON.stringify(state));

    await saves.remove('a');
    expect((await saves.list()).map((m) => m.id)).toEqual(['b']);
    expect(await saves.load('a')).toBeNull();
    expect([...kv.data.keys()].sort()).toEqual(['bang.save.b', 'bang.saves']);
  });

  it('같은 판은 같은 칸에 덮어쓴다', async () => {
    const { state } = findHumanOut();
    const saves = createDeviceSaveBackend(memoryKv());
    await saves.put(record(state));
    await saves.put(record(step(state, 1)));
    const list = await saves.list();
    expect(list).toHaveLength(1);
    expect(list[0].bytes).toBe(record(step(state, 1)).meta.bytes);
  });

  it('칸이 가득 차면 새 판은 거절하고 있던 칸은 덮어쓴다', async () => {
    const { state } = findHumanOut();
    const saves = createDeviceSaveBackend(memoryKv(), 2);
    await saves.put(record(state, ['p0'], 'a'));
    await saves.put(record(state, ['p0'], 'b'));
    await expect(saves.put(record(state, ['p0'], 'c'))).rejects.toThrow(SaveError);
    await expect(saves.put(record(state, ['p0'], 'a'))).resolves.toBeUndefined();
  });

  it('쓰다 실패하면 SaveError 로 알리고 목록 없는 본문을 남기지 않는다', async () => {
    const { state } = findHumanOut();
    const kv = memoryKv();
    const saves = createDeviceSaveBackend({
      ...kv,
      setItem: async (k, v) => {
        if (k === 'bang.saves') throw new Error('QuotaExceededError');
        return kv.setItem(k, v);
      },
    });
    await expect(saves.put(record(state))).rejects.toThrow(SaveError);
    expect(kv.data.size).toBe(0);
  });

  it('깨진 목록은 빈 목록으로 읽는다', async () => {
    const kv = memoryKv();
    kv.data.set('bang.saves', 'not json');
    expect(await createDeviceSaveBackend(kv).list()).toEqual([]);
  });
});
