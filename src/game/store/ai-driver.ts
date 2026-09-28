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

/** 사람이 보기에 자연스러운 정도의 뜸 */
const THINK_MS = { play: 620, respond: 420 } as const;

export function useAiDriver(enabled = true, speed = 1) {
  const state = useGameStore((s) => s.state);
  const seats = useGameStore((s) => s.seats);
  const controlled = useGameStore((s) => s.controlled);
  const drives = useGameStore((s) => s.drives);
  const submit = useGameStore((s) => s.submit);
  const seed = useGameStore((s) => s.seed);

  // 관전 모드처럼 빠르게 둘 때는 연출도 그만큼 빨리 넘긴다 (최대 3배)
  useEffect(() => {
    fxPacing.setState({ timeScale: Math.min(Math.max(1, speed), 3) });
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
    if (!enabled || !drives || !state || state.result || state.draft) return;

    const actor = selectActor(state);
    if (!actor || controlled.includes(actor)) return;

    const seat = seatOf(seats, actor);
    const tier = seat?.tier ?? 'medium';
    const think = (state.awaiting ? THINK_MS.respond : THINK_MS.play) / Math.max(0.1, speed);
    // 연출이 끝나기 전에는 두지 않는다. 2D 모드에서는 busyUntil 이 0 이라 예전 그대로다.
    const hold = Math.max(0, fxPacing.getState().busyUntil - Date.now());
    const delay = Math.max(think, hold + 80);

    const timer = setTimeout(() => {
      const action = decide(state, actor, tier, seed * 7919 + state.seq);
      if (action) submit(action);
    }, delay);

    return () => clearTimeout(timer);
  }, [enabled, drives, state, seats, controlled, submit, seed, speed]);
}
