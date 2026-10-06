/**
 * 계정 상태 (uid·닉네임·로그인 방식·지갑).
 *
 * 첫 화면과 설정창이 startAccountSync() 로 켠다. 한 번 켜면 앱이 끝날 때까지 구독을 유지한다.
 * Firebase 구성이 비어 있으면 아무것도 하지 않는다 ('offline').
 */

import { onAuthStateChanged } from 'firebase/auth';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { Wallet } from '../game/economy/model';
import { providerOf, type Provider } from './account';
import { ensureSignedIn } from './auth';
import { getAuthClient, isFirebaseConfigured } from './config';
import { ensureProfile, updateNick, watchProfile, watchWallet } from './profile';
import { getT } from '../i18n/use-t';

export type AccountStatus = 'offline' | 'idle' | 'syncing' | 'ready' | 'error';

export type AccountState = {
  status: AccountStatus;
  uid: string | null;
  nick: string;
  provider: Provider;
  wallet: Wallet | null;
  error: string | null;
};

const defaultNick = () => getT().infra.nick.anonymous;

export const accountStore = createStore<AccountState>(() => ({
  status: isFirebaseConfigured() ? 'idle' : 'offline',
  uid: null,
  nick: defaultNick(),
  provider: 'anonymous',
  wallet: null,
  error: null,
}));

let started = false;
let stopWatchers: (() => void) | null = null;

export function startAccountSync(): void {
  if (started || !isFirebaseConfigured()) return;
  started = true;
  accountStore.setState({ status: 'syncing' });

  ensureSignedIn()
    .then(async (user) => {
      const profile = await ensureProfile(user.uid, defaultNick());
      accountStore.setState({
        uid: user.uid,
        nick: profile.nick,
        provider: providerOf(user),
        status: 'ready',
        error: null,
      });
      stopWatchers?.();
      const stopProfile = watchProfile(user.uid, (p) => {
        if (p) accountStore.setState({ nick: p.nick });
      });
      const stopWallet = watchWallet(user.uid, (wallet) => accountStore.setState({ wallet }));
      // Google 연결 뒤 providerData 가 바뀌면 따라간다
      const stopAuth = onAuthStateChanged(getAuthClient(), (u) => {
        if (u) accountStore.setState({ provider: providerOf(u) });
      });
      stopWatchers = () => {
        stopProfile();
        stopWallet();
        stopAuth();
      };
    })
    .catch((err: unknown) => {
      accountStore.setState({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
      started = false;
    });
}

/** 닉네임을 바꾼다. 다듬은 결과를 돌려준다 (비면 null) */
export async function changeNick(raw: string): Promise<string | null> {
  const { uid } = accountStore.getState();
  if (!uid) return null;
  const nick = await updateNick(uid, raw);
  if (nick) accountStore.setState({ nick });
  return nick;
}

export function refreshProvider(): void {
  try {
    accountStore.setState({ provider: providerOf(getAuthClient().currentUser) });
  } catch {
    /* 구성이 없으면 그대로 */
  }
}

export function useAccount(): AccountState {
  return useStore(accountStore);
}
