/**
 * AI 좌석 구동기.
 *
 * 사람이 앉지 않은 자리는 이 훅이 대신 둔다. 로컬 대전에서는 항상,
 * 온라인에서는 드라이버로 뽑힌 클라이언트 하나만 이걸 돌린다.
 *
 * 온라인에서 남이 앉은 사람 자리는 절대 두지 않는다. 그 자리는 제한시간이 지났을 때만
 * useTimeoutDriver 가 기본 행동(timeout)을 넣는다.
 */

import { useEffect, useRef, useState } from 'react';

import { aiDraftActions, aiNextAction } from '../ai/driver-policy';
import { fxPacing } from './fx-pacing';
import { selectActor, seatOf, useGameStore, type SeatSetup } from './game-store';
import { setWaitDeadline } from './wait-clock';

/** 1배속에서 AI 가 한 과정(액션 하나)마다 들이는 뜸. 사람이 흐름을 따라올 수 있는 정도 */
export const AI_STEP_MS = 3000;

/** 연출 배율 상한. 혼자 하는 판의 '최대'(100배)까지 따라간다 */
export const MAX_TIME_SCALE = 100;

/** 온라인 드래프트에서 낸 AI 픽이 이만큼 지나도 돌아오지 않으면 다시 낸다 */
export const DRAFT_RETRY_MS = 3000;

/**
 * 다음 AI 수까지 기다릴 시간. 연출이 더 오래 걸리면 연출이 끝난 뒤에 둔다.
 * 연출 뒤의 여유(1배속 80ms)도 4배를 넘으면 배속에 맞춰 줄인다 (최소 10ms).
 */
export function aiDelayMs(speed: number, holdMs: number): number {
  const s = Math.max(0.1, speed);
  const margin = s > 4 ? Math.max(10, 320 / s) : 80;
  return Math.max(AI_STEP_MS / s, holdMs + margin);
}

/**
 * 이 클라이언트의 AI 가 이 자리를 대신 두는가.
 *
 * 로컬 대전은 내가 조작하지 않는 자리를 전부 둔다 (관전 모드는 사람 자리 p0 도 둔다).
 * 온라인은 사람이 앉은 자리를 두지 않는다. 예전에는 드라이버가 남의 사람 자리까지
 * 3초 만에 AI 로 둬서, 접속해 있는 사람의 차례·반응이 저절로 넘어갔다.
 */
export function aiPlaysSeat(
  seats: readonly Pick<SeatSetup, 'id' | 'human'>[],
  controlled: readonly string[],
  pid: string,
  online: boolean,
): boolean {
  if (controlled.includes(pid)) return false;
  if (!online) return true;
  return seats.find((s) => s.id === pid)?.human === false;
}

export function useAiDriver(enabled = true, speed = 1, online = false) {
  const state = useGameStore((s) => s.state);
  const seats = useGameStore((s) => s.seats);
  const controlled = useGameStore((s) => s.controlled);
  const drives = useGameStore((s) => s.drives);
  const submit = useGameStore((s) => s.submit);
  const seed = useGameStore((s) => s.seed);

  // 빠르게 둘 때는 연출도 그만큼 빨리 넘긴다
  useEffect(() => {
    fxPacing.setState({ timeScale: Math.min(Math.max(1, speed), MAX_TIME_SCALE) });
  }, [speed]);

  // 캐릭터 드래프트: AI 는 뜸 들이지 않고 바로 고른다.
  // 온라인에서는 한 자리씩 차례로 낸다. 한꺼번에 내면 Firestore 트랜잭션끼리 순서를 다투다
  // 몇 개가 밀려 사라지고, 그 AI 는 드래프트 시계가 다 갈 때까지 '고르는 중' 으로 남았다.
  // 낸 픽이 DRAFT_RETRY_MS 안에 돌아오지 않으면 같은 픽을 다시 낸다.
  const inFlight = useRef<{ pid: string; at: number } | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => {
    if (!state?.draft) {
      inFlight.current = null;
      return;
    }
    if (!enabled || !drives) return;
    // 시드 공식은 driver-policy 에 있다. 서버의 판 검증기가 같은 함수로 다시 계산한다
    const picks = aiDraftActions(state, seats, controlled, seed).filter(
      (a) => a.type === 'pickCharacter' && aiPlaysSeat(seats, controlled, a.pid, online),
    );
    if (picks.length === 0) {
      inFlight.current = null;
      return;
    }
    const waitFor = (ms: number) => {
      const timer = setTimeout(() => setRetryTick((n) => n + 1), ms);
      return () => clearTimeout(timer);
    };

    // 로컬은 순서 경쟁이 없다. 모두 바로 낸다
    if (!online) {
      if (inFlight.current) return;
      inFlight.current = { pid: '*', at: Date.now() };
      for (const action of picks) submit(action);
      return;
    }

    const sent = inFlight.current;
    const elapsed = sent ? Date.now() - sent.at : Infinity;
    if (sent && picks.some((a) => 'pid' in a && a.pid === sent.pid) && elapsed < DRAFT_RETRY_MS) {
      return waitFor(DRAFT_RETRY_MS - elapsed);
    }
    const next = picks[0];
    inFlight.current = { pid: 'pid' in next ? next.pid : '', at: Date.now() };
    submit(next);
    return waitFor(DRAFT_RETRY_MS);
  }, [enabled, drives, state, seats, controlled, submit, seed, online, retryTick]);

  useEffect(() => {
    if (!enabled || !state || state.result || state.draft) return;

    const actor = selectActor(state);
    if (!actor || !aiPlaysSeat(seats, controlled, actor, online)) return;

    const seat = seatOf(seats, actor);
    // 연출이 끝나기 전에는 두지 않는다. 2D 모드에서는 busyUntil 이 0 이다.
    const hold = Math.max(0, fxPacing.getState().busyUntil - Date.now());
    const delay = aiDelayMs(speed, hold);
    // AI 자리의 남은 초는 드라이버가 아니어도 모두 같은 식으로 셀 수 있다 (AI 속도는 방 전체가 같다).
    // 사람 자리의 시계는 useTimeoutDriver 가 맡는다.
    const aiSeat = !seat?.human;
    if (aiSeat) setWaitDeadline(Date.now() + delay);
    const clear = () => {
      if (aiSeat) setWaitDeadline(null);
    };
    if (!drives) return clear;

    const timer = setTimeout(() => {
      const action = aiNextAction(state, seats, controlled, seed);
      if (action) submit(action);
    }, delay);

    return () => {
      clearTimeout(timer);
      clear();
    };
  }, [enabled, drives, state, seats, controlled, submit, seed, speed, online]);
}
