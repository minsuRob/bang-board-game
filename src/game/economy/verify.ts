/**
 * 올라온 판 기록을 다시 접어 보상을 줄 수 있는지 판정한다.
 *
 * Cloud Functions 가 부르지만 Firebase 를 모른다. 같은 코드가 vitest 에서 그대로 돈다.
 *
 * 로컬(AI 대전) 판은 서버에 아무것도 남지 않으므로 기록 전체를 믿을 수 없다. 그래서
 *   - 사람 자리는 정확히 하나여야 하고, 그 자리의 수만 사람이 고른 것으로 본다
 *   - AI 자리의 수는 같은 시드·같은 상태로 decide() 를 다시 돌려 똑같은지 본다
 *   - AI 자리의 시간 만료(timeout)는 거절한다. 가장 약한 수를 강제로 두게 하는 길이라서다
 * 온라인 방은 여러 사람이 같은 로그를 보고 있으므로 다시 접어 결과만 확인한다.
 */

import { aiDraftActions, aiNextAction, type SeatTier } from '../ai/driver-policy';
import { actionKey } from '../engine/legal';
import { reduce } from '../engine/reducer';
import type { Action, GameState, PlayerId } from '../engine/types';
import { MIN_ACTIONS, MIN_ROUNDS } from './constants';
import { isKnownExpansion, parseMatchLog, type MatchDoc, type RejectReason } from './model';
import { settleResult, type Credit, type SeatUid } from './settle';

export type VerifyOk = { ok: true; state: GameState; credits: Credit[] };
export type VerifyFail = { ok: false; reason: RejectReason; detail?: string };
export type Verdict = VerifyOk | VerifyFail;

function fail(reason: RejectReason, detail?: string): VerifyFail {
  return { ok: false, reason, detail };
}

/** 로그를 순서대로 접는다. 결과가 난 뒤에 더 온 액션은 거절한다 */
export function replayLog(
  actions: readonly Action[],
  onStep?: (before: GameState | null, action: Action, index: number) => RejectReason | null,
): { state: GameState } | VerifyFail {
  if (actions.length === 0 || actions[0].type !== 'startGame') return fail('shape', '첫 액션이 startGame 이 아니다');
  let state: GameState | null = null;
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (i > 0 && action.type === 'startGame') return fail('shape', 'startGame 이 두 번 있다');
    if (state?.result) return fail('shape', `결과가 난 뒤에 액션이 더 있다 (#${i})`);
    const reason = onStep?.(state, action, i);
    if (reason) return fail(reason, `#${i} ${actionKey(action)}`);
    try {
      state = reduce(state, action);
    } catch (err) {
      return fail('replay', `#${i} ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { state: state! };
}

function checkFinished(state: GameState): VerifyFail | null {
  if (!state.result) return fail('unfinished');
  if (state.turn.round < MIN_ROUNDS || state.seq < MIN_ACTIONS) {
    return fail('tooShort', `${state.turn.round}라운드 · ${state.seq}수`);
  }
  return null;
}

/** 온라인 방: 다시 접어 결과만 확인한다. seatUids[i] 는 좌석 i 의 uid (AI·빈 자리는 null) */
export function verifyRoomLog(actions: readonly Action[], seatUids: readonly (string | null)[]): Verdict {
  const replayed = replayLog(actions);
  if ('ok' in replayed) return replayed;
  const { state } = replayed;
  const unfinished = checkFinished(state);
  if (unfinished) return unfinished;
  const seats: SeatUid[] = state.players.map((p, i) => ({ pid: p.id, uid: seatUids[i] ?? null }));
  return { ok: true, state, credits: settleResult(state.result!, seats) };
}

export type VerifyLocalOptions = {
  /** 하드 AI 시뮬레이션 예산. 클라이언트와 같아야 한다 (기본값을 쓴다) */
  budget?: number;
};

/** 로컬(AI 대전) 판: 기록 전체를 다시 접고 AI 수까지 다시 계산한다 */
export function verifyLocalMatch(doc: MatchDoc, opts: VerifyLocalOptions = {}): Verdict {
  const actions = parseMatchLog(doc);
  if (!actions) return fail('shape', '로그를 풀지 못했다');
  if (actions.length !== doc.actions) return fail('shape', '액션 수가 요약과 다르다');

  const start = actions[0];
  if (!start || start.type !== 'startGame') return fail('shape', '첫 액션이 startGame 이 아니다');
  if (start.seed !== doc.seed) return fail('seed');

  const n = doc.seats.length;
  if (n < 4 || n > 8 || start.config.playerCount !== n) return fail('seats', '인원이 맞지 않는다');
  if (start.seats.length !== n) return fail('seats', '좌석 수가 다르다');
  for (let i = 0; i < n; i++) {
    if (doc.seats[i].id !== `p${i}` || start.seats[i].id !== `p${i}`) return fail('seats', `좌석 ${i}`);
  }
  if (start.config.devEvent) return fail('config', 'devEvent');
  if (!Array.isArray(start.config.expansions) || !start.config.expansions.every(isKnownExpansion)) {
    return fail('config', '모르는 확장');
  }

  const humans = doc.seats.filter((s) => s.human).map((s) => s.id);
  if (humans.length !== 1 || doc.controlled.length !== 1 || doc.controlled[0] !== humans[0]) {
    return fail('controlled');
  }
  const human: PlayerId = humans[0];
  const seats: SeatTier[] = doc.seats.map((s) => ({ id: s.id, human: s.human, tier: s.tier }));
  const controlled = [human];

  // 드래프트: ai-driver 가 드래프트가 열린 상태 하나로 모든 AI 의 선택을 한꺼번에 계산한다.
  // 그 뒤 사람이 고르면 상태가 바뀌어 seq 가 다르므로, 열린 상태로 계산한 값과
  // 직전 상태로 계산한 값 둘 중 하나와 같으면 받아들인다.
  let draftKeys: Set<string> | null = null;

  const replayed = replayLog(actions, (before, action, index) => {
    if (index === 0) return null;
    if (!before) return 'shape';
    const pid = 'pid' in action ? action.pid : null;
    if (!pid || !seats.some((s) => s.id === pid)) return 'shape';
    if (pid === human) return null;

    // AI 자리
    if (action.type === 'timeout') return 'aiTimeout';
    const key = actionKey(action);
    if (before.draft) {
      if (!draftKeys) {
        draftKeys = new Set(aiDraftActions(before, seats, controlled, doc.seed, opts.budget).map(actionKey));
      }
      if (draftKeys.has(key)) return null;
      const again = aiDraftActions(before, seats, controlled, doc.seed, opts.budget).map(actionKey);
      return again.includes(key) ? null : 'aiMismatch';
    }
    const expected = aiNextAction(before, seats, controlled, doc.seed, opts.budget);
    if (!expected || actionKey(expected) !== key) return 'aiMismatch';
    return null;
  });
  if ('ok' in replayed) return replayed;

  const { state } = replayed;
  const unfinished = checkFinished(state);
  if (unfinished) return unfinished;
  const credits = settleResult(state.result!, [{ pid: human, uid: doc.uid }]);
  return { ok: true, state, credits };
}
