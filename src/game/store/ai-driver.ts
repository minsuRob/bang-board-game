/**
 * AI 좌석 구동기.
 *
 * 사람이 앉지 않은 자리는 이 훅이 대신 둔다. 로컬 대전에서는 항상,
 * 온라인에서는 드라이버로 뽑힌 클라이언트 하나만 이걸 돌린다.
 */

import { useEffect, useRef } from 'react';

import { decide } from '../ai';
import { fxPacing } from './fx-pacing';
import { selectActor, selectActors, seatOf, useGameStore } from './game-store';
import { setWaitDeadline } from './wait-clock';

/** 1배속에서 AI 가 한 과정(액션 하나)마다 들이는 뜸. 사람이 흐름을 따라올 수 있는 정도 */
export const AI_STEP_MS = 3000;

/** 연출 배율 상한. 혼자 하는 판의 '최대'(100배)까지 따라간다 */
export const MAX_TIME_SCALE = 100;

/**
 * 다음 AI 수까지 기다릴 시간. 연출이 더 오래 걸리면 연출이 끝난 뒤에 둔다.
 * 연출 뒤의 여유(1배속 80ms)도 4배를 넘으면 배속에 맞춰 줄인다 (최소 10ms).
 */
export function aiDelayMs(speed: number, holdMs: number): number {
  const s = Math.max(0.1, speed);
  const margin = s > 4 ? Math.max(10, 320 / s) : 80;
  return Math.max(AI_STEP_MS / s, holdMs + margin);
}

export function useAiDriver(enabled = true, speed = 1) {
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

  // 캐릭터 드래프트: AI 는 뜸 들이지 않고 모두 한꺼번에 바로 고른다.
  // 제출한 액션이 돌아오기 전에 효과가 다시 돌 수 있으니 이미 낸 자리는 기억해 둔다.
  const drafted = useRef(new Set<string>());
  useEffect(() => {
    if (!state?.draft) {
      drafted.current.clear();
      return;
    }
    if (!enabled || !drives) return;
    for (const pid of selectActors(state)) {
      if (controlled.includes(pid) || drafted.current.has(pid)) continue;
      const tier = seatOf(seats, pid)?.tier ?? 'medium';
      const seat = state.players.findIndex((p) => p.id === pid);
      const action = decide(state, pid, tier, seed * 7919 + seat * 131);
      if (!action) continue;
      drafted.current.add(pid);
      submit(action);
    }
  }, [enabled, drives, state, seats, controlled, submit, seed]);

  useEffect(() => {
    if (!enabled || !state || state.result || state.draft) return;

    const actor = selectActor(state);
    if (!actor || controlled.includes(actor)) return;

    const seat = seatOf(seats, actor);
    const tier = seat?.tier ?? 'medium';
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
      const action = decide(state, actor, tier, seed * 7919 + state.seq);
      if (action) submit(action);
    }, delay);

    return () => {
      clearTimeout(timer);
      clear();
    };
  }, [enabled, drives, state, seats, controlled, submit, seed, speed]);
}
