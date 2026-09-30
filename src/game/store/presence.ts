/**
 * 온라인 접속 상태.
 *
 * 두 방향이 있다.
 *   1. 알리기: 내 상태(보는 중·자리 비움·나감)를 members 문서에 적는다.
 *      12초마다 생존 신호를 보내고, 상태가 바뀌면 그 자리에서 한 번 더 보낸다.
 *   2. 보기: 남의 members 문서를 좌석별 상태로 바꿔 화면용 스토어에 둔다.
 *      좌석 컴포넌트가 좌석 id 로 꺼내 초록·노랑·빨강 점을 그린다.
 *
 * 판의 결과와 상관없는 표시라 GameState 에도 액션 로그에도 넣지 않는다.
 */

import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { Identity } from '../../firebase/auth';
import { markLeft, touchMember } from '../../firebase/rooms';
import { seatPresence, type Presence, type RoomMember } from '../../firebase/room-model';
import type { PlayerId } from '../engine';

/** 생존 신호 주기 */
export const HEARTBEAT_MS = 12_000;
/** 이만큼 아무 입력이 없으면 자리 비움. 카드 사용 제한시간과 같다 */
export const IDLE_MS = 60_000;
/** 화면을 떠난 뒤 '나감' 을 보내기까지. 대기실 → 판 화면처럼 같은 방을 다시 잡으면 거둔다 */
const LEAVE_GRACE_MS = 1_500;
/** 시간 초과로 바뀌는 상태(소식 끊김)를 다시 재는 주기 */
const PRESENCE_TICK_MS = 2_000;

const INPUT_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;

let pendingLeave: { code: string; timer: ReturnType<typeof setTimeout> } | null = null;

function cancelPendingLeave(code: string) {
  if (pendingLeave?.code !== code) return;
  clearTimeout(pendingLeave.timer);
  pendingLeave = null;
}

/** 웹에서만 입력·페이지 수명 이벤트를 받는다. 네이티브는 AppState 만 본다 */
function webWindow(): Window | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return typeof window.addEventListener === 'function' ? window : null;
}

/** 내 접속 상태를 알린다. 방 화면과 판 화면이 같은 방 코드로 부른다. */
export function usePresenceReporter(code: string | null, me: Identity | null) {
  // 로그인이 끝나기 전에도 같은 방을 다시 잡았다는 것만으로 '나감' 예약을 거둔다
  useEffect(() => {
    if (code) cancelPendingLeave(code);
  }, [code]);

  useEffect(() => {
    if (!code || !me) return;
    cancelPendingLeave(code);

    const win = webWindow();
    let lastInput = Date.now();
    let leaving = false;

    const compute = (): Presence => {
      if (AppState.currentState !== 'active') return 'away';
      // 네이티브는 입력을 훑지 않으므로 한가함으로 자리 비움을 정하지 않는다
      if (win && Date.now() - lastInput >= IDLE_MS) return 'away';
      return 'active';
    };

    let presence = compute();
    const send = () => {
      if (!leaving) touchMember(code, me, presence).catch(() => {});
    };
    const refresh = () => {
      const next = compute();
      if (next === presence) return;
      presence = next;
      send();
    };

    send();
    const beat = setInterval(() => {
      presence = compute();
      send();
    }, HEARTBEAT_MS);
    // 한가함은 신호 주기보다 촘촘히 잰다. 바뀔 때만 쓰므로 비용은 없다
    const idle = setInterval(refresh, PRESENCE_TICK_MS);
    const appState = AppState.addEventListener('change', refresh);

    const onInput = () => {
      lastInput = Date.now();
      if (presence === 'away') refresh();
    };
    // 탭을 닫거나 새로고침하는 순간. 닿지 못할 수 있어 시간 초과가 뒤를 받친다
    const onPageHide = () => {
      leaving = true;
      markLeft(code, me.uid).catch(() => {});
    };
    // 뒤로 가기 캐시에서 되살아난 경우
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      leaving = false;
      lastInput = Date.now();
      presence = compute();
      send();
    };

    const listen = { passive: true, capture: true } as const;
    for (const type of INPUT_EVENTS) win?.addEventListener(type, onInput, listen);
    win?.addEventListener('pagehide', onPageHide);
    win?.addEventListener('pageshow', onPageShow);

    return () => {
      clearInterval(beat);
      clearInterval(idle);
      appState.remove();
      for (const type of INPUT_EVENTS) win?.removeEventListener(type, onInput, listen);
      win?.removeEventListener('pagehide', onPageHide);
      win?.removeEventListener('pageshow', onPageShow);
      if (leaving) return;

      // 화면을 떠났다. 곧바로 같은 방을 다시 잡지 않으면 나간 것이다
      cancelPendingLeave(code);
      const timer = setTimeout(() => {
        if (pendingLeave?.timer === timer) pendingLeave = null;
        markLeft(code, me.uid).catch(() => {});
      }, LEAVE_GRACE_MS);
      pendingLeave = { code, timer };
    };
  }, [code, me]);
}

/** 좌석별 접속 상태. 사람이 앉은 온라인 좌석만 들어 있다 (혼자 하는 판은 비어 있다) */
export const presenceUi = createStore<{ bySeat: Record<PlayerId, Presence> }>(() => ({
  bySeat: {},
}));

export function usePresence(pid: PlayerId): Presence | null {
  return useStore(presenceUi, (s) => s.bySeat[pid] ?? null);
}

function setSeatPresence(next: Record<PlayerId, Presence>) {
  const prev = presenceUi.getState().bySeat;
  const keys = Object.keys(next);
  const same =
    keys.length === Object.keys(prev).length && keys.every((k) => prev[k] === next[k]);
  if (!same) presenceUi.setState({ bySeat: next });
}

/** 판 화면에서 members 문서를 좌석별 상태로 옮겨 둔다. */
export function usePresenceSync(
  seats: { uid: string | null }[] | null,
  members: Record<string, RoomMember>,
) {
  // 방 문서는 액션마다 새로 오므로 좌석 구성만 열쇠로 쓴다
  const key = seats ? JSON.stringify(seats.map((s) => s.uid)) : null;

  useEffect(() => {
    if (!key) return;
    const uids = JSON.parse(key) as (string | null)[];
    const update = () => setSeatPresence(seatPresence(uids, members, Date.now()));
    update();
    const timer = setInterval(update, PRESENCE_TICK_MS);
    return () => clearInterval(timer);
  }, [key, members]);

  useEffect(() => {
    if (!key) return;
    return () => setSeatPresence({});
  }, [key]);
}
