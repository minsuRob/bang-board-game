/**
 * 로컬(AI 대전) 판 기록 올리기와 정산 지켜보기.
 *
 * 문서는 본인이 한 번만 만들 수 있고 (firestore.rules), Cloud Functions 가 status 를 바꾼다.
 */

import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

import { isMatchDoc, makeMatchUpload, type MatchDoc, type MatchUploadInput } from '../game/economy/model';
import { getDb } from './config';

export type UploadOutcome = 'created' | 'exists';

/** 기록을 올린다. 같은 시드로 이미 올렸으면 'exists' */
export async function uploadLocalMatch(input: MatchUploadInput): Promise<{ id: string; outcome: UploadOutcome }> {
  const { id, doc: body } = makeMatchUpload(input);
  try {
    await setDoc(doc(getDb(), 'matches', id), { ...body, createdAt: serverTimestamp() });
    return { id, outcome: 'created' };
  } catch (err) {
    if ((err as { code?: string }).code === 'permission-denied') return { id, outcome: 'exists' };
    throw err;
  }
}

export function watchMatch(id: string, cb: (doc: MatchDoc | null) => void, onError?: (err: Error) => void): () => void {
  return onSnapshot(
    doc(getDb(), 'matches', id),
    (snap) => {
      const data = snap.data();
      cb(snap.exists() && isMatchDoc(data) ? data : null);
    },
    (err) => onError?.(err),
  );
}
