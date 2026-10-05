/**
 * 프로필·지갑·판 기록 규칙 검증. 에뮬레이터가 있어야 돈다 (npm run test:rules).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

import { matchId } from '../../src/game/economy/model';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-bang',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', 'alice'), { nick: '앨리스' });
    await setDoc(doc(db, 'users', 'alice', 'wallet', 'main'), {
      cash: 30, xp: 70, games: 2, wins: 1, day: '2026-10-04', dayCash: 30, updatedAt: 1,
    });
    await setDoc(doc(db, 'users', 'alice', 'ledger', 'local_1'), {
      kind: 'local', ref: '1', cash: 10, xp: 20, won: false, capped: false, at: 1,
    });
  });
});

const as = (uid: string | null): Firestore =>
  (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore() as unknown as Firestore;

describe('users/{uid}', () => {
  it('본인만 읽는다', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'users', 'alice')));
    await assertFails(getDoc(doc(as('bob'), 'users', 'alice')));
    await assertFails(getDoc(doc(as(null), 'users', 'alice')));
  });

  it('본인이 닉네임을 만들고 고친다', async () => {
    await assertSucceeds(
      setDoc(doc(as('bob'), 'users', 'bob'), { nick: '밥', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(updateDoc(doc(as('alice'), 'users', 'alice'), { nick: '앨리', updatedAt: serverTimestamp() }));
  });

  it('13자 닉네임·빈 닉네임·남의 프로필·다른 필드는 막는다', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'users', 'alice'), { nick: '가나다라마바사아자차카타파' }));
    await assertFails(updateDoc(doc(as('alice'), 'users', 'alice'), { nick: '' }));
    await assertFails(updateDoc(doc(as('bob'), 'users', 'alice'), { nick: '해킹' }));
    await assertFails(updateDoc(doc(as('alice'), 'users', 'alice'), { nick: '앨리', cash: 9999 }));
    await assertFails(deleteDoc(doc(as('alice'), 'users', 'alice')));
  });
});

describe('지갑·원장', () => {
  it('본인은 읽기만, 쓰기는 누구도 못 한다', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'users', 'alice', 'wallet', 'main')));
    await assertSucceeds(getDoc(doc(as('alice'), 'users', 'alice', 'ledger', 'local_1')));
    await assertFails(getDoc(doc(as('bob'), 'users', 'alice', 'wallet', 'main')));
    await assertFails(updateDoc(doc(as('alice'), 'users', 'alice', 'wallet', 'main'), { cash: 999999 }));
    await assertFails(setDoc(doc(as('alice'), 'users', 'alice', 'ledger', 'fake'), { cash: 10 }));
    await assertFails(deleteDoc(doc(as('alice'), 'users', 'alice', 'ledger', 'local_1')));
  });
});

describe('matches/{uid_seed}', () => {
  const good = () => ({
    uid: 'alice',
    seed: 42,
    seats: [
      { id: 'p0', name: '나', human: true, tier: 'medium' },
      { id: 'p1', name: 'AI', human: false, tier: 'medium' },
      { id: 'p2', name: 'AI', human: false, tier: 'medium' },
      { id: 'p3', name: 'AI', human: false, tier: 'medium' },
    ],
    controlled: ['p0'],
    log: '[]',
    actions: 0,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  const ref = (uid: string | null, id = matchId('alice', 42)) => doc(as(uid), 'matches', id);

  it('본인이 pending 으로 한 번 만든다', async () => {
    await assertSucceeds(setDoc(ref('alice'), good()));
    await assertSucceeds(getDoc(ref('alice')));
    await assertFails(getDoc(ref('bob')));
  });

  it('만든 뒤에는 누구도 고치거나 지우지 못한다', async () => {
    await assertSucceeds(setDoc(ref('alice'), good()));
    await assertFails(updateDoc(ref('alice'), { status: 'settled', credit: { cash: 999 } }));
    await assertFails(setDoc(ref('alice'), good()));
    await assertFails(deleteDoc(ref('alice')));
  });

  it('id·uid·status·사람 수·크기가 어긋나면 막는다', async () => {
    await assertFails(setDoc(ref('alice', 'alice_43'), good()));
    await assertFails(setDoc(ref('bob'), good()));
    await assertFails(setDoc(ref('alice'), { ...good(), status: 'settled' }));
    await assertFails(setDoc(ref('alice'), { ...good(), controlled: ['p0', 'p1'] }));
    await assertFails(setDoc(ref('alice'), { ...good(), seats: good().seats.slice(0, 3) }));
    await assertFails(setDoc(ref('alice'), { ...good(), credit: { cash: 999 } }));
    await assertFails(setDoc(ref('alice'), { ...good(), createdAt: 123 }));
    await assertFails(setDoc(ref('alice'), { ...good(), log: 'x'.repeat(900_001) }));
  });
});
