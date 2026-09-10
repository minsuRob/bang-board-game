/**
 * Firebase 락스텝 트랜스포트.
 *
 * 서버에는 상태를 저장하지 않는다. 액션 로그만 순서대로 쌓고, 모든 클라이언트가
 * 같은 순수 리듀서로 그 로그를 접어 같은 판을 만든다.
 * 그래서 Cloud Functions 없이 무료 플랜으로도 돌아간다.
 *
 * 한계는 분명하다. 락스텝이라 손패와 덱 순서가 클라이언트에 존재한다.
 * 친구끼리 하는 전제이며, 뜯어보는 사람을 막지는 못한다.
 * 서버 권위로 옮기려면 같은 리듀서를 서버에서 돌리면 된다 (docs/multiplayer.md).
 */

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

import { getDb } from '../../firebase/config';
import type { Action } from '../engine';
import type { Transport, TransportStatus } from './transport';

type ActionDoc = {
  seq: number;
  uid: string;
  action: Action;
};

/** Firestore 는 undefined 를 거부한다. 비어 있는 필드를 걷어낸다. */
function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clean) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = clean(v);
    }
    return out as T;
  }
  return value;
}

export function createFirebaseTransport(code: string, uid: string): Transport {
  const db = getDb();
  const roomRef = doc(db, 'rooms', code.toUpperCase());
  const actionsRef = collection(roomRef, 'actions');

  let listeners: ((action: Action) => void)[] = [];
  let statusListeners: ((status: TransportStatus, detail?: string) => void)[] = [];
  let delivered = 0;
  let unsubscribe: (() => void) | null = null;

  const emitStatus = (status: TransportStatus, detail?: string) => {
    for (const fn of [...statusListeners]) fn(status, detail);
  };

  const listen = () => {
    if (unsubscribe) return;
    emitStatus('connecting');
    unsubscribe = onSnapshot(
      query(actionsRef, orderBy('seq')),
      (snap) => {
        const docs = snap.docs.map((d) => d.data() as ActionDoc);
        // seq 는 1부터 빈틈없이 이어진다. 앞이 비어 있으면 아직 도착하지 않은 것이므로 기다린다.
        for (let i = delivered; i < docs.length; i++) {
          if (docs[i].seq !== i + 1) return;
          delivered = i + 1;
          for (const fn of [...listeners]) fn(docs[i].action);
        }
        emitStatus('ready');
      },
      (err) => emitStatus('error', err.message),
    );
  };

  return {
    async submit(action: Action) {
      try {
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(roomRef);
          if (!snap.exists()) throw new Error('방이 사라졌다.');
          const count = (snap.data().actionCount as number) ?? 0;
          const seq = count + 1;

          tx.set(doc(actionsRef, String(seq)), {
            seq,
            uid,
            action: clean(action),
            ts: serverTimestamp(),
          });
          tx.update(roomRef, { actionCount: seq });
        });
      } catch (err) {
        // 순서 경쟁에서 밀리면 다른 액션이 그 자리를 가져간 것이다.
        // 상태는 그대로 두고 다음 스냅숏을 따른다.
        emitStatus('error', (err as Error).message);
      }
    },

    subscribe(onAction) {
      listeners.push(onAction);
      listen();
      return () => {
        listeners = listeners.filter((fn) => fn !== onAction);
      };
    },

    onStatus(cb) {
      statusListeners.push(cb);
      return () => {
        statusListeners = statusListeners.filter((fn) => fn !== cb);
      };
    },

    close() {
      unsubscribe?.();
      unsubscribe = null;
      listeners = [];
      statusListeners = [];
      delivered = 0;
    },
  };
}
