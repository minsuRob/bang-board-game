/**
 * 효과 스택 해결 루프.
 *
 * 스택이 빌 때까지, 또는 입력 대기가 걸릴 때까지, 또는 '멈추는 프레임'
 * (카드 사용 단계·버리기 단계)에 닿을 때까지 프레임을 하나씩 해결한다.
 */

import { heldAsGhost, inPlay, log, nameOf, playerOf, toDiscard, topFrame, updatePlayer } from './cards';
import { resolveFrame } from './frames';
import { handLimitOf, onHandEmptyFrames, resurrectsEliminated } from './hooks';
import type { GameState } from './types';

/** 안전장치. 정상적인 판은 한 액션에 이 근처도 못 간다. */
const MAX_STEPS = 20000;

/**
 * 엔진이 여기서 멈추고 플레이어의 액션을 기다리는가.
 *
 * - 카드 사용 단계: 액티브 플레이어가 endTurn 을 낼 때까지
 * - 버리기 단계: 손패가 목숨 이하가 될 때까지
 */
export function isBlocked(state: GameState): boolean {
  const f = topFrame(state);
  if (!f) return false;
  if (f.k === 'playPhase') {
    // 자기 차례에 죽는 경우가 있다 (자기가 건 결투에서 지거나, 인디언을 맞고 쓰러지거나).
    // 그때는 멈추면 안 된다. 아무도 둘 수 없는 상태로 게임이 굳는다.
    return state.turn.phase === 'play' && inPlay(playerOf(state, f.pid));
  }
  if (f.k === 'discardPhase') {
    const p = playerOf(state, f.pid);
    // 유령(유령도시)은 목숨이 0 이라 손패 제한이 0 장이 된다. 어차피 차례가 끝나면 카드를
    // 전부 잃으므로(EC-101) 버리기를 건너뛴다. 수지 라파예트 유령이 버리고 뽑기를
    // 끝없이 되풀이하던 문제.
    if (p.ghost) return false;
    return state.turn.phase === 'discard' && inPlay(p) && p.hand.length > handLimitOf(state, p.id);
  }
  return false;
}

/**
 * 손패가 빈 사람에게 훅을 울린다 (수지 라파예트).
 *
 * 손패가 비는 경로는 카드 사용·버림·강탈당함·감옥 설치·결투 응답 등 아주 많다.
 * 특정 시점에 매달지 않고 스택 루프의 상시 점검으로 두어야 새는 경로가 없다.
 * 이미 같은 이유의 드로우가 스택에 있으면 다시 밀어넣지 않는다.
 */
export function sweepHandEmpty(state: GameState): GameState {
  let cur = state;
  for (const p of state.players) {
    if (!inPlay(p) || p.hand.length > 0) continue;

    const frames = onHandEmptyFrames(cur, p.id);
    for (const f of frames) {
      const already = cur.stack.some(
        (x) => x.k === 'drawCards' && f.k === 'drawCards' && x.pid === f.pid && x.reason === f.reason,
      );
      if (!already) cur = { ...cur, stack: [...cur.stack, f] };
    }
  }
  return cur;
}

/**
 * 유령 카드를 잃은 유령은 다시 제거된다 (강탈·캣 벌로우·달톤 형제·조니 키시 어느 경로든).
 * 유령도시 중에는 건너뛴다. 그때의 유령은 turnEnd 가 정리한다.
 */
export function sweepGhosts(state: GameState): GameState {
  // 유령도시 중에는 카드 없는 유령이 정상이다. 그 유령은 자기 차례 끝에 사라진다 (turnEnd).
  if (resurrectsEliminated(state)) return state;
  let cur = state;
  for (const p of state.players) {
    if (p.alive || !p.ghost || heldAsGhost(p)) continue;
    const cards = [...p.hand, ...p.equipment];
    cur = updatePlayer(cur, p.id, (x) => ({ ...x, ghost: false, hand: [], equipment: [] }));
    cur = toDiscard(cur, cards);
    cur = log(cur, { t: 'ghostLeave', pid: p.id, text: `${nameOf(cur, p.id)}의 유령이 사라졌다.` });
  }
  return cur;
}

export function resolveStack(state: GameState): GameState {
  let cur = state;

  for (let step = 0; step < MAX_STEPS; step++) {
    if (cur.result || cur.awaiting || cur.draft) return cur;

    const swept = sweepHandEmpty(sweepGhosts(cur));
    if (swept !== cur) {
      cur = swept;
      continue;
    }
    if (cur.stack.length === 0 || isBlocked(cur)) return cur;

    const frame = topFrame(cur)!;
    const next = resolveFrame(cur, frame);
    if (next === cur) {
      throw new Error(`프레임이 진행되지 않는다: ${JSON.stringify(frame)}`);
    }
    cur = next;
  }
  throw new Error('효과 스택 해결이 끝나지 않는다 (무한 루프 의심)');
}
