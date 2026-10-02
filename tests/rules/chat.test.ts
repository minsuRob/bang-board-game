/**
 * firestore.rules 검증. 에뮬레이터가 있어야 돈다.
 *
 *   npm run test:rules
 *
 * 기본 `npm test` 에는 들어가지 않는다 (vitest.rules.config.mts 만 이 폴더를 본다).
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
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CHAT_MAX_LENGTH, cleanChatText } from '../../src/firebase/chat-model';

const CODE = 'ROOM01';
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

// alice(호스트, 0번) · bob(1번) 이 앉아 있고 2번은 AI. carol 은 로그인만 했다.
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'rooms', CODE), {
      code: CODE,
      hostUid: 'alice',
      status: 'playing',
      playerCount: 4,
      eventExpansion: null,
      tier: 'medium',
      seats: [
        { uid: 'alice', nick: '앨리스', ai: false },
        { uid: 'bob', nick: '밥', ai: false },
        { uid: null, nick: 'AI 3', ai: true },
        { uid: null, nick: 'AI 4', ai: true },
      ],
      seed: 1,
      actionCount: 0,
      deadChat: true,
    });
    for (const uid of ['alice', 'bob']) {
      await setDoc(doc(db, 'rooms', CODE, 'members', uid), { nick: uid, lastSeen: Date.now() });
    }
  });
});

const as = (uid: string | null): Firestore =>
  (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore() as unknown as Firestore;

const chat = (db: Firestore) => collection(db, 'rooms', CODE, 'chat');

const say = (db: Firestore, data: Record<string, unknown>) =>
  addDoc(chat(db), { ts: serverTimestamp(), ...data });

describe('채팅 보내기', () => {
  it('자기 자리 이름으로는 말할 수 있다', async () => {
    await assertSucceeds(say(as('alice'), { uid: 'alice', seat: 0, text: '안녕' }));
    await assertSucceeds(say(as('bob'), { uid: 'bob', seat: 1, text: '뱅!' }));
  });

  it('로그인하지 않았으면 못 쓴다', async () => {
    await assertFails(say(as(null), { uid: 'alice', seat: 0, text: '안녕' }));
  });

  it('남의 자리로 사칭할 수 없다', async () => {
    await assertFails(say(as('alice'), { uid: 'alice', seat: 1, text: '나는 밥' }));
  });

  it('AI 자리로 말할 수 없다', async () => {
    await assertFails(say(as('alice'), { uid: 'alice', seat: 2, text: 'AI 인 척' }));
  });

  it('남의 uid 를 적을 수 없다', async () => {
    await assertFails(say(as('alice'), { uid: 'bob', seat: 1, text: '밥인 척' }));
  });

  it('자리 번호는 범위 안의 정수여야 한다', async () => {
    const db = as('alice');
    await assertFails(say(db, { uid: 'alice', seat: -1, text: 'x' }));
    await assertFails(say(db, { uid: 'alice', seat: 4, text: 'x' }));
    await assertFails(say(db, { uid: 'alice', seat: '0', text: 'x' }));
    await assertFails(say(db, { uid: 'alice', seat: 0.5, text: 'x' }));
  });

  it('참가하지 않은 사람은 못 쓴다', async () => {
    await assertFails(say(as('carol'), { uid: 'carol', seat: 0, text: '끼어들기' }));
    // members 표식만 만들어도 자리가 없으면 안 된다
    const carol = as('carol');
    await assertSucceeds(setDoc(doc(carol, 'rooms', CODE, 'members', 'carol'), { nick: 'c', lastSeen: 1 }));
    await assertFails(say(carol, { uid: 'carol', seat: 0, text: '끼어들기' }));
  });

  it('빈 글·너무 긴 글·문자열이 아닌 글은 막는다', async () => {
    const db = as('alice');
    await assertFails(say(db, { uid: 'alice', seat: 0, text: '' }));
    await assertFails(say(db, { uid: 'alice', seat: 0, text: 'a'.repeat(CHAT_MAX_LENGTH + 1) }));
    await assertFails(say(db, { uid: 'alice', seat: 0, text: 42 }));
    await assertSucceeds(say(db, { uid: 'alice', seat: 0, text: 'a'.repeat(CHAT_MAX_LENGTH) }));
  });

  it('규칙은 글자 수를 UTF-16 단위로 센다 (이모지 하나가 2)', async () => {
    const db = as('alice');
    await assertSucceeds(say(db, { uid: 'alice', seat: 0, text: '뱅'.repeat(CHAT_MAX_LENGTH) }));
    await assertSucceeds(say(db, { uid: 'alice', seat: 0, text: '🔫'.repeat(CHAT_MAX_LENGTH / 2) }));
    await assertFails(say(db, { uid: 'alice', seat: 0, text: '🔫'.repeat(CHAT_MAX_LENGTH / 2 + 1) }));
  });

  it('클라이언트가 다듬은 가장 긴 글은 한글·이모지·섞인 글 모두 통과한다', async () => {
    const db = as('alice');
    const long = [
      '뱅'.repeat(CHAT_MAX_LENGTH + 50),
      '🔫'.repeat(CHAT_MAX_LENGTH),
      // 자르는 자리가 이모지 한가운데에 걸린다
      'a' + '🔫'.repeat(CHAT_MAX_LENGTH),
    ];
    for (const raw of long) {
      const text = cleanChatText(raw)!;
      expect(text.length).toBeLessThanOrEqual(CHAT_MAX_LENGTH);
      await assertSucceeds(say(db, { uid: 'alice', seat: 0, text }));
    }
  });

  it('정해진 필드만 쓴다 (직업을 몰래 적을 수 없다)', async () => {
    await assertFails(say(as('alice'), { uid: 'alice', seat: 0, text: 'x', role: 'sheriff' }));
  });

  it('시각은 서버 시각이어야 한다', async () => {
    const db = as('alice');
    await assertFails(addDoc(chat(db), { uid: 'alice', seat: 0, text: 'x' }));
    await assertFails(
      addDoc(chat(db), { uid: 'alice', seat: 0, text: 'x', ts: Timestamp.fromMillis(0) }),
    );
  });

  it('쓴 글은 고치거나 지울 수 없다', async () => {
    const alice = as('alice');
    const ref = await say(alice, { uid: 'alice', seat: 0, text: '원래 글' });
    await assertFails(updateDoc(doc(alice, ref.path), { text: '고친 글' }));
    await assertFails(deleteDoc(doc(alice, ref.path)));
    await assertFails(deleteDoc(doc(as('bob'), ref.path)));
  });
});

describe('채팅 읽기', () => {
  it('로그인한 사람은 읽고, 안 한 사람은 못 읽는다', async () => {
    await say(as('alice'), { uid: 'alice', seat: 0, text: '안녕' });
    await assertSucceeds(getDocs(chat(as('bob'))));
    await assertSucceeds(getDocs(chat(as('carol'))));
    await assertFails(getDocs(chat(as(null))));
  });
});

describe('방 설정 (기존 규칙 회귀)', () => {
  it('탈락자 채팅 설정은 호스트만 바꾼다', async () => {
    await assertSucceeds(updateDoc(doc(as('alice'), 'rooms', CODE), { deadChat: false }));
    await assertFails(updateDoc(doc(as('bob'), 'rooms', CODE), { deadChat: true }));
  });

  it('참가자는 여전히 액션을 덧붙일 수 있다', async () => {
    await assertSucceeds(
      setDoc(doc(as('bob'), 'rooms', CODE, 'actions', '1'), {
        seq: 1,
        uid: 'bob',
        action: { type: 'endTurn', pid: 'p1' },
        ts: serverTimestamp(),
      }),
    );
  });
});
