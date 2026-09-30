/**
 * 판 안 채팅. rooms/{CODE}/chat/{autoId} 에 덧붙이기만 한다.
 *
 * 순서는 서버 시각으로 정한다. 막 보낸 내 글은 서버 시각이 아직 없으므로
 * 추정값으로 곧바로 보여 준다.
 */

import {
  addDoc,
  collection,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';

import { CHAT_HISTORY, type ChatDoc, type ChatMessage } from './chat-model';
import { getDb } from './config';

export * from './chat-model';

function chatRef(code: string) {
  return collection(getDb(), 'rooms', code.toUpperCase(), 'chat');
}

export async function sendChat(code: string, message: ChatDoc): Promise<void> {
  await addDoc(chatRef(code), { ...message, ts: serverTimestamp() });
}

export function watchChat(
  code: string,
  onChange: (messages: ChatMessage[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    query(chatRef(code), orderBy('ts'), limitToLast(CHAT_HISTORY)),
    (snap) => {
      onChange(
        snap.docs.map((d) => {
          const data = d.data({ serverTimestamps: 'estimate' });
          return {
            id: d.id,
            uid: data.uid,
            seat: data.seat,
            text: data.text,
            ts: (data.ts as Timestamp | null)?.toMillis() ?? Date.now(),
          };
        }),
      );
    },
    (err) => onError?.(err),
  );
}
