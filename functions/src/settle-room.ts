/**
 * 온라인 방 정산. 판이 끝나면 자리에 앉은 아무나 부른다 (멱등).
 *
 * rooms/{code}/actions 를 seq 순으로 읽어 같은 리듀서로 다시 접고, 사람 자리마다 지갑에 적는다.
 * 정산은 rooms/{code}.settlement 에 한 번만 남는다. 두 번째 호출부터는 그것을 돌려준다.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import type { RoomSettlement as Settlement } from '../../src/game/economy/model';
import { verifyRoomLog } from '../../src/game/economy/verify';
import type { Action } from '../../src/game/engine/types';
import { readWallets, writeCredit } from './credit';

type Seat = { uid: string | null; nick: string; ai: boolean };

export function settleRoomHandler(db: Firestore) {
  return onCall({ memory: '512MiB', timeoutSeconds: 120 }, async (request): Promise<Settlement> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요하다.');
    const code = String(request.data?.code ?? '').toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(code)) throw new HttpsError('invalid-argument', '방 코드가 이상하다.');

    const roomRef = db.doc(`rooms/${code}`);
    const roomSnap = await roomRef.get();
    if (!roomSnap.exists) throw new HttpsError('not-found', '방이 없다.');
    const room = roomSnap.data() as {
      status: string;
      seats: Seat[];
      actionCount: number;
      settlement?: Settlement;
    };
    if (room.settlement) return room.settlement;
    if (room.status === 'lobby') throw new HttpsError('failed-precondition', '아직 시작하지 않은 방이다.');
    if (!room.seats.some((s) => s.uid === uid)) throw new HttpsError('permission-denied', '이 방의 자리가 아니다.');

    const actionsSnap = await roomRef.collection('actions').orderBy('seq').get();
    const actions: Action[] = [];
    actionsSnap.docs.forEach((d, i) => {
      const data = d.data() as { seq: number; action: Action };
      if (data.seq !== i + 1) throw new HttpsError('failed-precondition', `액션 순번이 비어 있다 (${i + 1}).`);
      actions.push(data.action);
    });
    if (actions.length !== room.actionCount) {
      throw new HttpsError('failed-precondition', '액션 수가 방 문서와 다르다.');
    }

    const seatUids = room.seats.map((s) => (s.ai ? null : s.uid));
    const verdict = verifyRoomLog(actions, seatUids);
    const now = Date.now();

    return db.runTransaction(async (tx) => {
      const fresh = await tx.get(roomRef);
      const existing = (fresh.data() as { settlement?: Settlement }).settlement;
      if (existing) return existing;

      let settlement: Settlement;
      if (!verdict.ok) {
        settlement = { at: now, seq: actions.length, credits: {}, rejected: verdict.reason };
      } else {
        const uids = verdict.credits.map((c) => c.uid);
        const wallets = await readWallets(db, tx, uids);
        settlement = { at: now, seq: actions.length, credits: {} };
        for (const credit of verdict.credits) {
          settlement.credits[credit.uid] = writeCredit(
            db,
            tx,
            credit,
            wallets.get(credit.uid) ?? null,
            { id: `room_${code}`, kind: 'room', ref: code },
            now,
          );
        }
      }
      tx.update(roomRef, { settlement, status: 'ended' });
      return settlement;
    });
  });
}
