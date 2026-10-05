/**
 * 로컬(AI 대전) 판 정산. matches/{uid}_{seed} 가 생기면 돈다.
 *
 * 기록을 다시 접고 AI 수까지 다시 계산한다 (economy/verify). 하드 AI 7인 판은 분 단위가 걸린다.
 * 트리거는 한 번 이상 올 수 있으므로 트랜잭션 안에서 아직 pending 인지 다시 본다.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

import { isMatchDoc, matchId, type RejectReason } from '../../src/game/economy/model';
import { verifyLocalMatch } from '../../src/game/economy/verify';
import { readWallets, writeCredit } from './credit';

export function onMatchCreatedHandler(db: Firestore) {
  return onDocumentCreated(
    { document: 'matches/{id}', memory: '2GiB', timeoutSeconds: 540, concurrency: 1 },
    async (event) => {
      const snap = event.data;
      if (!snap) return;
      const ref = snap.ref;
      const data = snap.data();
      const now = Date.now();

      const reject = async (reason: RejectReason, detail?: string) => {
        await ref.update({ status: 'rejected', reason, settledAt: now, ...(detail ? { detail } : {}) });
      };

      if (!isMatchDoc(data)) return reject('shape');
      if (data.status !== 'pending') return;
      if (event.params.id !== matchId(data.uid, data.seed)) return reject('shape', 'id');

      const verdict = verifyLocalMatch(data);
      if (!verdict.ok) return reject(verdict.reason, verdict.detail);

      const credit = verdict.credits[0];
      if (!credit) return reject('controlled');

      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(ref);
        if (fresh.data()?.status !== 'pending') return;
        const wallets = await readWallets(db, tx, [credit.uid]);
        const applied = writeCredit(
          db,
          tx,
          credit,
          wallets.get(credit.uid) ?? null,
          { id: `local_${data.seed}`, kind: 'local', ref: String(data.seed) },
          now,
        );
        tx.update(ref, { status: 'settled', credit: applied, settledAt: now });
      });
    },
  );
}
