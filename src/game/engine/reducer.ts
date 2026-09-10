/**
 * 리듀서 — 엔진의 유일한 입구.
 *
 * (state, action) => state. React 도 zustand 도 모른다.
 * 같은 시드에서 같은 액션 열을 넣으면 언제나 같은 상태가 나온다.
 * 불법 액션은 상태를 바꾸지 않고 로그만 남긴다. 락스텝에서 모든 클라이언트가
 * 똑같이 거부해야 하기 때문이다.
 */

import { RANK_VALUE } from '../data/types';
import { SID_KETCHUM_ABILITY } from '../modifiers';
import {
  cardOf,
  effectiveSuit,
  kindOf,
  log,
  nameOf,
  playerOf,
  toDiscard,
  topFrame,
  updatePlayer,
} from './cards';
import { respondToFrame } from './frames';
import { actionKey, legalActions } from './legal';
import { applyPlayCard } from './play';
import { createGame } from './setup';
import { resolveStack } from './stack';
import type { Action, Choice, GameState, PlayerId } from './types';
import { ga } from './josa';

export function reduce(state: GameState | null, action: Action): GameState {
  if (action.type === 'startGame') {
    if (state) throw new Error('게임이 이미 시작되었다');
    return resolveStack(createGame(action.seed, action.config, action.seats));
  }
  if (!state) throw new Error('startGame 이 먼저 와야 한다');
  if (state.result) return state;

  const cur: GameState = { ...state, seq: state.seq + 1 };

  if (action.type === 'timeout') {
    const fallback = defaultAction(cur, action.pid);
    if (!fallback) return cur;
    return applyAction(cur, fallback, true);
  }

  const legal = legalActions(cur, action.pid);
  const key = actionKey(action);
  if (!legal.some((a) => actionKey(a) === key)) {
    return log(cur, {
      t: 'rejected',
      pid: action.pid,
      text: `허용되지 않는 행동이라 무시되었다 (${action.type}).`,
    });
  }
  return applyAction(cur, action, false);
}

function applyAction(state: GameState, action: Action, viaTimeout: boolean): GameState {
  let cur = state;
  if (viaTimeout) {
    cur = log(cur, {
      t: 'timeout',
      pid: 'pid' in action ? action.pid : undefined,
      text: `제한시간이 지나 기본 행동이 대신 수행되었다.`,
    });
  }

  switch (action.type) {
    case 'playCard': {
      const as = action.as ?? kindOf(action.card);
      cur = applyPlayCard(cur, action.pid, action.card, as, action.target);
      break;
    }
    case 'respond': {
      const frame = topFrame(cur);
      if (!frame) return cur;
      cur = respondToFrame({ ...cur, awaiting: null }, frame, action.choice);
      break;
    }
    case 'useAbility': {
      cur = applyAbility(cur, action.pid, action.ability, action.cards ?? []);
      // '언제든' 능력은 반응 대기 도중에도 쓸 수 있고, 그 과정에서 손패가 바뀐다.
      // 대기 상태에 박혀 있던 선택지는 그 순간 낡은 값이 되므로 버리고 다시 만든다.
      // (시드 케첨이 능력으로 빗나감!을 버린 뒤 그 카드를 다시 내던 버그)
      cur = { ...cur, awaiting: null };
      break;
    }
    case 'discardCard': {
      cur = updatePlayer(cur, action.pid, (p) => ({
        ...p,
        hand: p.hand.filter((c) => c !== action.card),
      }));
      cur = toDiscard(cur, [action.card]);
      cur = log(cur, {
        t: 'discard',
        pid: action.pid,
        card: action.card,
        text: `${ga(nameOf(cur, action.pid))} 카드를 버렸다.`,
      });
      break;
    }
    case 'endTurn': {
      // 카드 사용 단계 프레임을 걷어내면 아래에 있던 버리기 단계가 드러난다.
      const frame = topFrame(cur);
      if (frame?.k !== 'playPhase') return cur;
      cur = { ...cur, stack: cur.stack.slice(0, -1) };
      break;
    }
    default:
      return cur;
  }
  return resolveStack(cur);
}

/** 시드 케첨: 카드 두 장을 버리고 목숨 1 회복 */
function applyAbility(
  state: GameState,
  pid: PlayerId,
  ability: string,
  cards: string[],
): GameState {
  if (ability !== SID_KETCHUM_ABILITY) return state;

  let cur = updatePlayer(state, pid, (p) => {
    const hand = [...p.hand];
    for (const c of cards) {
      const i = hand.indexOf(c);
      if (i >= 0) hand.splice(i, 1);
    }
    return { ...p, hand, hp: Math.min(p.maxHp, p.hp + 1) };
  });
  cur = toDiscard(cur, cards);
  return log(cur, {
    t: 'sidKetchum',
    pid,
    cards,
    text: `${ga(nameOf(cur, pid))} 카드 2장을 버리고 목숨을 1 회복했다.`,
  });
}

// ---------------------------------------------------------------------------
// 제한시간 만료 시의 기본 행동
//
// 기본 행동이 비결정적이면 리플레이가 깨진다. 그래서 규칙의 일부로 못박는다.
// (docs/edge-cases.md 쟁점 L)
// ---------------------------------------------------------------------------

export function defaultAction(state: GameState, pid: PlayerId): Action | null {
  const legal = legalActions(state, pid).filter((a) => a.type !== 'useAbility');
  if (legal.length === 0) return null;

  const a = state.awaiting;
  if (a && a.pid === pid) {
    // 러키 듀크의 판정 선택만은 유리한 쪽을 자동으로 고른다.
    if (a.k === 'judgementChoice') {
      const best = favourableJudgementCard(state, a.options, a.purpose);
      const match = legal.find(
        (x) => x.type === 'respond' && x.choice.c === 'card' && x.choice.card === best,
      );
      if (match) return match;
    }
    // 그 외에는 반응하지 않는 쪽이 기본이다. 반응이 필수인 선택은 첫 번째 항목.
    const pass = legal.find((x) => x.type === 'respond' && x.choice.c === 'pass');
    return pass ?? legal[0];
  }

  // 카드 사용 단계 → 차례 마치기, 버리기 단계 → 첫 카드 버리기
  const endTurn = legal.find((x) => x.type === 'endTurn');
  if (endTurn) return endTurn;
  return legal[0];
}

/** 판정 목적에 비추어 더 나은 카드 (러키 듀크 자동 선택용) */
function favourableJudgementCard(
  state: GameState,
  options: string[],
  purpose: 'barrel' | 'jourdonnais' | 'dynamite' | 'jail',
): string {
  const score = (card: string): number => {
    const suit = effectiveSuit(state, card);
    if (purpose === 'dynamite') {
      const v = RANK_VALUE[cardOf(card).rank];
      const explodes = suit === 'spades' && v >= 2 && v <= 9;
      return explodes ? 0 : 1;
    }
    return suit === 'hearts' ? 1 : 0;
  };
  return [...options].sort((x, y) => score(y) - score(x))[0];
}

export type { Choice };
