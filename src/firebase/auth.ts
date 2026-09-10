/**
 * 익명 로그인과 닉네임.
 *
 * 가입 절차 없이 방 코드만으로 들어올 수 있어야 한다.
 * uid 는 Firebase 가, 닉네임은 이 기기가 들고 있는다.
 */

import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';

import { getAuthClient } from './config';
import { loadNickname, saveNickname } from './storage';

export type Identity = { uid: string; nickname: string };

let pending: Promise<User> | null = null;

/** 이미 로그인되어 있으면 그대로, 아니면 익명으로 로그인한다. */
export function ensureSignedIn(): Promise<User> {
  if (pending) return pending;

  pending = new Promise<User>((resolve, reject) => {
    const auth = getAuthClient();
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsubscribe();
          resolve(user);
          return;
        }
        signInAnonymously(auth).catch((err) => {
          unsubscribe();
          reject(err);
        });
      },
      (err) => {
        unsubscribe();
        reject(err);
      },
    );
  });

  pending.catch(() => {
    pending = null;
  });
  return pending;
}

export async function getIdentity(fallbackNickname = '이름 없는 총잡이'): Promise<Identity> {
  const user = await ensureSignedIn();
  const stored = await loadNickname();
  return { uid: user.uid, nickname: stored ?? fallbackNickname };
}

export async function setNickname(nickname: string): Promise<void> {
  await saveNickname(nickname.trim().slice(0, 12));
}

export function currentUid(): string | null {
  try {
    return getAuthClient().currentUser?.uid ?? null;
  } catch {
    return null;
  }
}
