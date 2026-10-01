/**
 * Firestore 저장소. 아직 화면에 붙이지 않았다 (index.ts 의 getSaveBackend 참고).
 *
 * 같은 SaveRecord 를 그대로 담으므로 기기 저장소와 바꿔 끼우기만 하면 된다.
 *
 *   users/{uid}/saves/{id}        목록용 요약 (SaveMeta)
 *   users/{uid}/saveBodies/{id}   본문 { body: string }
 *
 * 목록을 그릴 때 본문(수백 KB)까지 받지 않으려고 둘로 나눴다. 쓰고 지우는 것은 한 배치로 묶는다.
 * 본문은 JSON 문자열 한 필드라 undefined·중첩 배열 제약에 걸리지 않고,
 * 1 MiB 문서 한도는 makeSaveRecord 가 MAX_SAVE_BYTES 로 먼저 막는다.
 *
 * 붙이기 전에 firestore.rules 에 본인만 읽고 쓰는 규칙을 더하고 tests/rules 로 확인한다.
 *
 *   match /users/{uid}/saves/{id} {
 *     allow read, write: if request.auth != null && request.auth.uid == uid;
 *   }
 *   match /users/{uid}/saveBodies/{id} {
 *     allow read, write: if request.auth != null && request.auth.uid == uid;
 *   }
 *
 * 익명 로그인 uid 는 기기(브라우저)마다 다르다. 기기를 넘나들며 이어 보려면 계정 연결이 먼저다.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  writeBatch,
} from 'firebase/firestore';

import { getDb } from '../../firebase/config';
import { fullSlotsMessage, type SaveBackend } from './save-backend';
import { isSaveMeta, MAX_SAVES, SaveError, type SaveMeta } from './save-model';

export function createFirestoreSaveBackend(uid: string, limit = MAX_SAVES): SaveBackend {
  const metas = () => collection(getDb(), 'users', uid, 'saves');
  const metaRef = (id: string) => doc(getDb(), 'users', uid, 'saves', id);
  const bodyRef = (id: string) => doc(getDb(), 'users', uid, 'saveBodies', id);

  async function list(): Promise<SaveMeta[]> {
    const snap = await getDocs(query(metas(), orderBy('savedAt', 'desc')));
    return snap.docs.map((d) => d.data()).filter(isSaveMeta);
  }

  return {
    kind: 'cloud',

    list,

    async load(id) {
      const [meta, body] = await Promise.all([getDoc(metaRef(id)), getDoc(bodyRef(id))]);
      const m = meta.data();
      const b = body.data()?.body;
      if (!isSaveMeta(m) || typeof b !== 'string') return null;
      return { meta: m, body: b };
    },

    async put(record) {
      const { id } = record.meta;
      const exists = (await getDoc(metaRef(id))).exists();
      if (!exists && (await list()).length >= limit) throw new SaveError(fullSlotsMessage(limit));
      const batch = writeBatch(getDb());
      batch.set(bodyRef(id), { body: record.body });
      batch.set(metaRef(id), record.meta);
      await batch.commit();
    },

    async remove(id) {
      const batch = writeBatch(getDb());
      batch.delete(metaRef(id));
      batch.delete(bodyRef(id));
      await batch.commit();
    },
  };
}
