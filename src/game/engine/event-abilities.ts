/**
 * 이벤트가 주는 차례당 한 번 행동 (와일드 웨스트 쇼).
 *
 * - 레이디 로즈 오브 텍사스: 오른쪽 사람과 자리를 바꾼다. 그 사람은 다음 차례를 건너뛴다.
 * - 도로시 레이지: 다른 사람에게 카드 종류와 대상을 정해 그 카드를 내게 한다.
 *   그 카드가 손에 없거나 그 대상에게 낼 수 없으면 그 사람이 손패를 모두에게 보여 준다
 *   (공식 해설 "he must show his hand", FAQ Q20 "All players."). 시킨 기회는 쓴 것이다.
 *
 * 무엇을 할 수 있는지는 legal.ts 가 정하고, 여기서는 받은 행동을 그대로 처리한다.
 */

import { CARD_DEFS } from '../data/cards.base';
import type { CardKind } from '../data/types';
import { defOf, log, nameOf, playerOf, updatePlayer } from './cards';
import { rightNeighborOf } from './distance';
import { turnDirectionOf } from './hooks';
import { eventAbilityKey, forcedPlayOf } from './legal';
import { applyPlayCard } from './play';
import type { Action, GameState, PlayerId } from './types';
import { ga, eul, neun, wa } from './josa';
import { nameKo } from './legacy-ko';

export function applyEventAbility(state: GameState, action: Extract<Action, { type: 'eventAbility' }>): GameState {
  const { pid, ability } = action;
  const cur = updatePlayer(state, pid, (p) => ({
    ...p,
    usedThisTurn: [...p.usedThisTurn, eventAbilityKey(ability)],
  }));
  if (ability === 'ladyRose') return swapWithRight(cur, pid);
  if (!action.forced || !action.kind) return cur;
  return forcePlay(cur, pid, action.forced, action.kind, action.target);
}

/** 오른쪽 사람과 자리(배열 자리와 seat)를 맞바꾼다 */
function swapWithRight(state: GameState, pid: PlayerId): GameState {
  const other = rightNeighborOf(state, pid, turnDirectionOf(state));
  if (!other) return state;
  const a = playerOf(state, pid).seat;
  const b = playerOf(state, other).seat;
  const players = [...state.players];
  players[a] = { ...state.players[b], seat: a, skipsNextTurn: true };
  players[b] = { ...state.players[a], seat: b };
  return log(
    { ...state, players },
    {
      t: 'ladyRose',
      pid,
      target: other,
      text: `레이디 로즈 오브 텍사스: ${ga(nameOf(state, pid))} ${wa(nameOf(state, other))} 자리를 바꿨다. ${neun(nameOf(state, other))} 다음 차례를 건너뛴다.`,
    },
  );
}

/** 도로시 레이지: forced 가 kind 를 target 에게 낸다. 차례인 사람의 뱅! 횟수·방금 낸 카드는 건드리지 않는다 */
function forcePlay(
  state: GameState,
  pid: PlayerId,
  forced: PlayerId,
  kind: CardKind,
  target: PlayerId | undefined,
): GameState {
  const name = nameKo(CARD_DEFS[kind]);
  const aim = target ? ` → ${nameOf(state, target)}` : '';
  let cur = log(state, {
    t: 'dorothyRage',
    pid,
    target: forced,
    text: `도로시 레이지: ${ga(nameOf(state, pid))} ${nameOf(state, forced)}에게 ${eul(name)} 내라고 시켰다${aim}.`,
  });
  const play = forcedPlayOf(cur, forced, kind, target);
  if (!play) {
    // 공식 해설: 시킨 카드가 없으면 손패를 보여 준다. 누구에게나 (FAQ Q20 "All players.")
    // 공개 로그(secret 없음)라 viewFor 가 가리지 않는다.
    const hand = playerOf(cur, forced).hand;
    const shown = hand.length ? hand.map((c) => nameKo(defOf(c))).join(', ') : '없음';
    return log(cur, {
      t: 'dorothyRageMiss',
      pid: forced,
      cards: [...hand],
      text: `${neun(nameOf(cur, forced))} ${eul(name)} 낼 수 없어 손패를 모두에게 보여 줬다: ${shown}.`,
    });
  }
  const { bangsPlayed, lastBrown } = cur.turn;
  cur = applyPlayCard(cur, forced, play.card, kind, play.target);
  const { lastBrown: _forced, ...turn } = cur.turn;
  return { ...cur, turn: { ...turn, bangsPlayed, ...(lastBrown ? { lastBrown } : {}) } };
}
