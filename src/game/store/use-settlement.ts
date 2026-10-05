/**
 * 판이 끝나면 보상 정산을 요청하고 그 결과를 지켜본다.
 *
 * 로컬(AI 대전): 스토어가 남긴 액션 기록을 matches/{uid}_{seed} 로 올리고, Cloud Functions 가
 *   status 를 settled / rejected 로 바꿀 때까지 문서를 구독한다.
 * 온라인: 자리에 앉은 모두가 settleRoom 을 부른다 (서버가 한 번만 적는다).
 *   정산 결과는 방 문서의 settlement 에 실려 watchRoom 으로 들어온다.
 *
 * 보상이 없는 판(관전·저장본 이어 보기·devEvent·Firebase 미설정)은 'none' 이다.
 */

import { useEffect, useRef, useState } from 'react';

import { currentUid, ensureSignedIn } from '../../firebase/auth';
import { isFirebaseConfigured } from '../../firebase/config';
import { uploadLocalMatch, watchMatch } from '../../firebase/matches';
import { settleRoom } from '../../firebase/settle';
import { EconomyError, matchId, type RejectReason, type RoomSettlement } from '../economy/model';
import type { Applied } from '../economy/wallet';
import type { GameState } from '../engine';
import { useGameStore } from './game-store';

export type SettlementView =
  | { status: 'none' }
  | { status: 'pending' }
  | { status: 'settled'; credit: Applied }
  | { status: 'rejected'; reason: RejectReason | null; message?: string };

type Args = {
  online: boolean;
  code: string | null;
  room: { settlement?: RoomSettlement } | null;
  state: GameState | null;
  uid: string | null;
};

export function useSettlement({ online, code, room, state, uid }: Args): SettlementView {
  const [local, setLocal] = useState<SettlementView>({ status: 'none' });
  const fired = useRef<string | null>(null);
  const finished = Boolean(state?.result);

  // 판이 끝나는 순간 한 번만 요청한다
  useEffect(() => {
    if (!finished || !isFirebaseConfigured()) return;
    const key = online ? `room:${code}` : `local:${useGameStore.getState().seed}`;
    if (fired.current === key) return;
    fired.current = key;

    if (online) {
      if (!code) return;
      // 결과는 방 문서의 settlement 로 돌아온다. 호출 실패는 다른 사람이 메운다
      settleRoom(code).catch(() => {});
      return;
    }

    const snap = useGameStore.getState();
    const humans = snap.seats.filter((s) => s.human);
    const eligible =
      snap.historyComplete &&
      snap.controlled.length === 1 &&
      humans.length === 1 &&
      humans[0].id === snap.controlled[0] &&
      !snap.state?.config.devEvent;
    // 초기값이 'none' 이므로 자격이 없으면 그대로 둔다
    if (!eligible) return;

    let stop: (() => void) | null = null;
    let alive = true;
    // 혼자 하는 판은 로그인 없이도 열리므로 여기서 (익명) 로그인을 확실히 한다.
    // currentUser 는 저장된 세션을 비동기로 되살리므로 바로 읽으면 비어 있을 수 있다.
    Promise.resolve()
      .then(() => setLocal({ status: 'pending' }))
      .then(ensureSignedIn)
      .then((user) =>
        uploadLocalMatch({
          uid: user.uid,
          seed: snap.seed,
          seats: snap.seats,
          controlled: snap.controlled,
          actions: snap.history,
        }),
      )
      .then(({ id, outcome }) => {
        if (!alive) return;
        if (outcome === 'exists') {
          setLocal({ status: 'rejected', reason: null, message: '같은 시드로 이미 보상을 받은 판이다.' });
          return;
        }
        stop = watchMatch(
          id,
          (doc) => {
            if (!doc) return;
            if (doc.status === 'settled' && doc.credit) setLocal({ status: 'settled', credit: doc.credit });
            else if (doc.status === 'rejected') setLocal({ status: 'rejected', reason: doc.reason ?? null });
          },
          () => setLocal({ status: 'rejected', reason: null, message: '정산 결과를 읽지 못했다.' }),
        );
      })
      .catch((err: unknown) => {
        if (!alive) return;
        const message =
          err instanceof EconomyError ? err.message : err instanceof Error ? err.message : '기록을 올리지 못했다.';
        setLocal({ status: 'rejected', reason: null, message });
      });

    return () => {
      alive = false;
      stop?.();
    };
  }, [finished, online, code, uid]);

  if (!finished) return { status: 'none' };
  if (!online) return local;

  // 온라인: 방 문서의 정산 기록을 내 uid 로 읽는다
  const settlement = room?.settlement;
  const me = uid ?? currentUid();
  if (!isFirebaseConfigured() || !me) return { status: 'none' };
  if (!settlement) return { status: 'pending' };
  if (settlement.rejected) return { status: 'rejected', reason: settlement.rejected };
  const credit = settlement.credits[me];
  return credit ? { status: 'settled', credit } : { status: 'none' };
}

export { matchId };
