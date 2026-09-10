/**
 * 방 관리.
 *
 * 방 코드가 곧 문서 id 다. 색인 없이 코드만으로 바로 찾을 수 있고,
 * 같은 코드가 두 번 만들어지는 것은 트랜잭션이 막는다.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import type { AiTier } from '../game/ai/types';
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/data/roles';
import { getDb } from './config';
import type { Identity } from './auth';
import type { RoomDoc, RoomMember, RoomSeat } from './room-model';

export { PRESENCE_TIMEOUT_MS, pickDriver } from './room-model';
export type { RoomDoc, RoomMember, RoomSeat } from './room-model';

/** 헷갈리는 글자(0/O, 1/I)는 뺐다 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function randomCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

function emptySeats(count: number, host: Identity): RoomSeat[] {
  return Array.from({ length: count }, (_, i) =>
    i === 0
      ? { uid: host.uid, nick: host.nickname, ai: false }
      : { uid: null, nick: '', ai: false },
  );
}

export type CreateRoomOptions = {
  playerCount: number;
  highnoon: boolean;
  tier: AiTier;
};

export async function createRoom(host: Identity, options: CreateRoomOptions): Promise<string> {
  const db = getDb();
  const count = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, options.playerCount));

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    const ref = doc(db, 'rooms', code);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;

    const room: RoomDoc = {
      code,
      hostUid: host.uid,
      status: 'lobby',
      playerCount: count,
      highnoon: options.highnoon,
      tier: options.tier,
      seats: emptySeats(count, host),
      seed: Math.floor(Math.random() * 1_000_000),
      actionCount: 0,
    };
    await setDoc(ref, { ...room, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await touchMember(code, host);
    return code;
  }
  throw new Error('방 코드를 만들지 못했다. 잠시 뒤 다시 시도해라.');
}

/** 빈 자리에 앉는다. 이미 앉아 있으면 그 자리를 그대로 돌려준다. */
export async function joinRoom(code: string, me: Identity): Promise<number> {
  const db = getDb();
  const ref = doc(db, 'rooms', code.toUpperCase());

  const seat = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('그런 방이 없다.');
    const room = snap.data() as RoomDoc;

    const mine = room.seats.findIndex((s) => s.uid === me.uid);
    if (mine >= 0) return mine;
    if (room.status !== 'lobby') throw new Error('이미 시작된 방이다.');

    const free = room.seats.findIndex((s) => s.uid === null);
    if (free < 0) throw new Error('자리가 다 찼다.');

    const seats = room.seats.map((s, i) =>
      i === free ? { uid: me.uid, nick: me.nickname, ai: false } : s,
    );
    tx.update(ref, { seats, updatedAt: serverTimestamp() });
    return free;
  });

  await touchMember(code.toUpperCase(), me);
  return seat;
}

export async function leaveRoom(code: string, uid: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'rooms', code.toUpperCase());

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as RoomDoc;
    // 시작된 판에서는 자리를 비우지 않는다. 자리를 비우면 판이 깨진다.
    if (room.status !== 'lobby') return;

    const seats = room.seats.map((s) =>
      s.uid === uid ? { uid: null, nick: '', ai: false } : s,
    );
    tx.update(ref, { seats, updatedAt: serverTimestamp() });
  });

  await deleteDoc(doc(db, 'rooms', code.toUpperCase(), 'members', uid)).catch(() => {});
}

/** 호스트만 설정을 바꾼다. */
export async function updateRoomSettings(
  code: string,
  patch: Partial<Pick<RoomDoc, 'playerCount' | 'highnoon' | 'tier' | 'seed'>>,
): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'rooms', code.toUpperCase());

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('그런 방이 없다.');
    const room = snap.data() as RoomDoc;

    let seats = room.seats;
    if (patch.playerCount && patch.playerCount !== room.playerCount) {
      const next = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, patch.playerCount));
      seats =
        next > room.seats.length
          ? [
              ...room.seats,
              ...Array.from({ length: next - room.seats.length }, () => ({
                uid: null,
                nick: '',
                ai: false,
              })),
            ]
          : room.seats.slice(0, next);
    }
    tx.update(ref, { ...patch, seats, updatedAt: serverTimestamp() });
  });
}

/** 남은 빈 자리를 AI 로 채우고 판을 연다. */
export async function markStarted(code: string): Promise<RoomDoc> {
  const db = getDb();
  const ref = doc(db, 'rooms', code.toUpperCase());

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('그런 방이 없다.');
    const room = snap.data() as RoomDoc;
    if (room.status !== 'lobby') return room;

    const seats = room.seats.map((s, i) =>
      s.uid ? s : { uid: null, nick: `AI ${i + 1}`, ai: true },
    );
    const next: RoomDoc = { ...room, seats, status: 'playing' };
    tx.update(ref, { seats, status: 'playing', updatedAt: serverTimestamp() });
    return next;
  });
}

export function watchRoom(
  code: string,
  onChange: (room: RoomDoc | null) => void,
  onError?: (err: Error) => void,
): () => void {
  const ref = doc(getDb(), 'rooms', code.toUpperCase());
  return onSnapshot(
    ref,
    (snap) => onChange(snap.exists() ? (snap.data() as RoomDoc) : null),
    (err) => onError?.(err),
  );
}

export function watchMembers(
  code: string,
  onChange: (members: Record<string, RoomMember>) => void,
): () => void {
  const ref = collection(getDb(), 'rooms', code.toUpperCase(), 'members');
  return onSnapshot(ref, (snap) => {
    const out: Record<string, RoomMember> = {};
    snap.forEach((d) => {
      out[d.id] = d.data() as RoomMember;
    });
    onChange(out);
  });
}

/** 살아 있다고 알린다. 15초마다 부르면 된다. */
export async function touchMember(code: string, me: Identity): Promise<void> {
  await setDoc(
    doc(getDb(), 'rooms', code.toUpperCase(), 'members', me.uid),
    { nick: me.nickname, lastSeen: Date.now() },
    { merge: true },
  );
}

export async function markEnded(code: string): Promise<void> {
  await updateDoc(doc(getDb(), 'rooms', code.toUpperCase()), {
    status: 'ended',
    updatedAt: serverTimestamp(),
  });
}
