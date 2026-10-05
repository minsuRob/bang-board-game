/**
 * 트랜잭션 안에서 한 사람의 지갑에 보상을 적는다.
 * 산술은 economy/wallet 의 applyCredit 하나뿐이다. 여기서는 읽고 쓰기만 한다.
 */

import type { Firestore, Transaction } from 'firebase-admin/firestore';

import { isWallet, type LedgerEntry, type Wallet } from '../../src/game/economy/model';
import type { Credit } from '../../src/game/economy/settle';
import { applyCredit, dayKeyOf, type Applied } from '../../src/game/economy/wallet';

export function walletRef(db: Firestore, uid: string) {
  return db.doc(`users/${uid}/wallet/main`);
}

export async function readWallets(db: Firestore, tx: Transaction, uids: string[]) {
  const snaps = await Promise.all(uids.map((uid) => tx.get(walletRef(db, uid))));
  return new Map<string, Wallet | null>(
    uids.map((uid, i) => {
      const data = snaps[i].data();
      return [uid, snaps[i].exists && isWallet(data) ? data : null];
    }),
  );
}

export function writeCredit(
  db: Firestore,
  tx: Transaction,
  credit: Credit,
  current: Wallet | null,
  ledger: { id: string; kind: LedgerEntry['kind']; ref: string },
  nowMs: number,
): Applied {
  const dayKey = dayKeyOf(nowMs);
  const { wallet, applied } = applyCredit(current, credit, dayKey, nowMs);
  tx.set(walletRef(db, credit.uid), wallet);
  const entry: LedgerEntry = {
    kind: ledger.kind,
    ref: ledger.ref,
    cash: applied.cash,
    xp: applied.xp,
    won: applied.won,
    capped: applied.capped,
    at: nowMs,
  };
  tx.set(db.doc(`users/${credit.uid}/ledger/${ledger.id}`), entry);
  return applied;
}
