/**
 * 프로필(닉네임)과 지갑 읽기.
 *
 *   users/{uid}               닉네임. 본인이 쓴다
 *   users/{uid}/wallet/main   돈·경험치·전적. Cloud Functions 만 쓴다. 여기서는 읽기만
 *
 * 닉네임은 기기(AsyncStorage)에도 같이 남겨 오프라인·로그인 전에도 쓸 수 있게 한다.
 */

import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { cleanNick, isProfile, isWallet, type UserProfile, type Wallet } from '../game/economy/model';
import { getDb } from './config';
import { loadNickname, saveNickname } from './storage';
import { getT } from '../i18n/use-t';

const profileRef = (uid: string) => doc(getDb(), 'users', uid);
const walletRef = (uid: string) => doc(getDb(), 'users', uid, 'wallet', 'main');

/** 프로필이 없으면 기기 닉네임(없으면 fallback)으로 만든다. 있으면 그대로 돌려준다 */
export async function ensureProfile(uid: string, fallbackNick: string): Promise<UserProfile> {
  const snap = await getDoc(profileRef(uid));
  const data = snap.data();
  if (snap.exists() && isProfile(data)) return data;
  const stored = await loadNickname();
  const nick = cleanNick(stored ?? '') ?? cleanNick(fallbackNick) ?? getT().infra.nick.short;
  const profile: UserProfile = { nick, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await setDoc(profileRef(uid), profile);
  return { nick };
}

export async function readProfileNick(uid: string): Promise<string | null> {
  try {
    const data = (await getDoc(profileRef(uid))).data();
    return isProfile(data) ? data.nick : null;
  } catch {
    return null;
  }
}

/** 닉네임을 Firestore 와 기기에 함께 저장한다. 다듬은 결과를 돌려준다 (비면 null) */
export async function updateNick(uid: string, raw: string): Promise<string | null> {
  const nick = cleanNick(raw);
  if (!nick) return null;
  await saveNickname(nick);
  const ref = profileRef(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) await updateDoc(ref, { nick, updatedAt: serverTimestamp() });
  else await setDoc(ref, { nick, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return nick;
}

export function watchProfile(uid: string, cb: (profile: UserProfile | null) => void): () => void {
  return onSnapshot(
    profileRef(uid),
    (snap) => {
      const data = snap.data();
      cb(snap.exists() && isProfile(data) ? data : null);
    },
    () => cb(null),
  );
}

export function watchWallet(
  uid: string,
  cb: (wallet: Wallet | null) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    walletRef(uid),
    (snap) => {
      const data = snap.data();
      cb(snap.exists() && isWallet(data) ? data : null);
    },
    (err) => onError?.(err),
  );
}
