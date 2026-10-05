/**
 * 계정 연결.
 *
 * 익명 uid 를 Google 계정에 묶는다. uid 가 그대로라 지갑도 그대로 따라온다.
 * 지금은 웹 팝업만 된다. 앱은 expo-auth-session 으로 자격 증명을 받아 linkWithCredential 하면 되지만
 * 아직 붙이지 않았다 (설정창에 안내만 보인다).
 */

import { GoogleAuthProvider, linkWithPopup, type User } from 'firebase/auth';
import { Platform } from 'react-native';

import { getAuthClient } from './config';

export type Provider = 'anonymous' | 'google' | 'other';

export const PROVIDER_LABEL: Record<Provider, string> = {
  anonymous: '익명',
  google: '구글',
  other: '기타',
};

export function providerOf(user: User | null): Provider {
  if (!user || user.isAnonymous) return 'anonymous';
  if (user.providerData.some((p) => p.providerId === 'google.com')) return 'google';
  return 'other';
}

export const GOOGLE_LINK_SUPPORTED = Platform.OS === 'web';

export const GOOGLE_LINK_HINT = '앱에서는 아직 연결할 수 없다. 웹에서 같은 계정으로 열어 연결해라.';

export type LinkResult = { ok: true; provider: Provider } | { ok: false; message: string };

/** 지금 로그인한 익명 계정에 Google 을 연결한다 (웹만) */
export async function linkGoogle(): Promise<LinkResult> {
  if (!GOOGLE_LINK_SUPPORTED) return { ok: false, message: GOOGLE_LINK_HINT };
  const user = getAuthClient().currentUser;
  if (!user) return { ok: false, message: '먼저 로그인해야 한다.' };
  if (!user.isAnonymous) return { ok: false, message: '이미 연결된 계정이다.' };
  try {
    const cred = await linkWithPopup(user, new GoogleAuthProvider());
    return { ok: true, provider: providerOf(cred.user) };
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'auth/credential-already-in-use') {
      return { ok: false, message: '그 Google 계정은 이미 다른 총잡이에게 묶여 있다.' };
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return { ok: false, message: '연결을 취소했다.' };
    }
    return { ok: false, message: err instanceof Error ? err.message : '연결하지 못했다.' };
  }
}
