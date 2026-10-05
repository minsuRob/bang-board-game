/**
 * 익명 로그인과 닉네임.
 *
 * 가입 절차 없이 방 코드만으로 들어올 수 있어야 한다.
 * uid 는 Firebase 가 준다. 닉네임은 users/{uid} 프로필에 두고, 기기에도 사본을 남긴다
 * (profile.ts). Google 계정 연결은 account.ts.
 */

import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';

import { getAuthClient } from './config';
import { readProfileNick, updateNick } from './profile';
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
  const profile = await readProfileNick(user.uid);
  if (profile) return { uid: user.uid, nickname: profile };
  const stored = await loadNickname();
  return { uid: user.uid, nickname: stored ?? fallbackNickname };
}

/** 닉네임을 바꾼다. 로그인돼 있으면 프로필에, 아니면 기기에만 남긴다 */
export async function setNickname(nickname: string): Promise<void> {
  const uid = currentUid();
  if (uid) {
    await updateNick(uid, nickname);
    return;
  }
  await saveNickname(nickname.trim().slice(0, 12));
}

export function currentUid(): string | null {
  try {
    return getAuthClient().currentUser?.uid ?? null;
  } catch {
    return null;
  }
}
