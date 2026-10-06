/**
 * 계정 연결.
 *
 * 익명 uid 를 Google 계정에 묶는다. uid 가 그대로라 지갑도 그대로 따라온다.
 * 지금은 웹 팝업만 된다. 앱은 expo-auth-session 으로 자격 증명을 받아 linkWithCredential 하면 되지만
 * 아직 붙이지 않았다 (설정창에 안내만 보인다).
 */

import { GoogleAuthProvider, linkWithPopup, type User } from 'firebase/auth';
import { Platform } from 'react-native';

import { getT } from '../i18n/use-t';
import { getAuthClient } from './config';

export type Provider = 'anonymous' | 'google' | 'other';

/** 로그인 방식 이름. 읽을 때마다 현재 언어로 돌려준다 */
export const PROVIDER_LABEL: Record<Provider, string> = {
  get anonymous() {
    return getT().infra.account.provider.anonymous;
  },
  get google() {
    return getT().infra.account.provider.google;
  },
  get other() {
    return getT().infra.account.provider.other;
  },
};

export function providerOf(user: User | null): Provider {
  if (!user || user.isAnonymous) return 'anonymous';
  if (user.providerData.some((p) => p.providerId === 'google.com')) return 'google';
  return 'other';
}

export const GOOGLE_LINK_SUPPORTED = Platform.OS === 'web';

/** 호출할 때마다 현재 언어로 읽는다 */
export function googleLinkHint(): string {
  return getT().infra.account.googleHint;
}

export type LinkResult = { ok: true; provider: Provider } | { ok: false; message: string };

/** 지금 로그인한 익명 계정에 Google 을 연결한다 (웹만) */
export async function linkGoogle(): Promise<LinkResult> {
  if (!GOOGLE_LINK_SUPPORTED) return { ok: false, message: googleLinkHint() };
  const user = getAuthClient().currentUser;
  if (!user) return { ok: false, message: getT().infra.account.signInFirst };
  if (!user.isAnonymous) return { ok: false, message: getT().infra.account.alreadyLinked };
  try {
    const cred = await linkWithPopup(user, new GoogleAuthProvider());
    return { ok: true, provider: providerOf(cred.user) };
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'auth/credential-already-in-use') {
      return { ok: false, message: getT().infra.account.credentialInUse };
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return { ok: false, message: getT().infra.account.linkCancelled };
    }
    return { ok: false, message: err instanceof Error ? err.message : getT().infra.account.linkFailed };
  }
}
