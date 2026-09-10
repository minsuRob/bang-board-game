/**
 * 차례 흐름 프레임.
 *
 * 한 차례는 언제나 이 순서로 쌓인다:
 *   turnStart → (revealEvent) → eventTurnStart → drawPhase → playPhase
 *             → discardPhase → turnEnd → checkWin → advanceTurn
 *
 * playPhase / discardPhase 는 '멈추는' 프레임이다. 이 둘이 스택 맨 위에 있는 동안
 * 엔진은 해결을 멈추고 플레이어의 액션을 기다린다.
 */

import { HIGHNOON_EVENTS } from '../../data/cards.highnoon';
import { CHARACTERS } from '../../data/characters';
import { SUIT_GLYPH, type Suit } from '../../data/types';
import {
  inPlay,
  log,
  nameOf,
  playerOf,
  popFrame,
  pushSeq,
  toDiscard,
  updatePlayer,
} from '../cards';
import {
  afterDrawFrames,
  drawCountOf,
  drawPhaseOverride,
  onDrawPhaseEndFrames,
  onEventEnterFrames,
  onTurnStartFrames,
  resurrectsEliminated,
  turnDirectionOf,
} from '../hooks';
import type { Choice, Frame, GameState, PlayerId } from '../types';
import { ga, neun } from '../josa';

/** 감옥에 걸려 차례를 건너뛸 때, 이번 차례의 남은 단계를 스택에서 걷어낸다. */
export function skipRestOfTurn(state: GameState, pid: PlayerId): GameState {
  return {
    ...state,
    stack: state.stack.filter(
      (f) =>
        !(
          (f.k === 'drawPhase' || f.k === 'playPhase' || f.k === 'discardPhase') &&
          f.pid === pid
        ),
    ),
  };
}

export function resolveTurnStart(state: GameState, frame: Frame & { k: 'turnStart' }): GameState {
  const { pid } = frame;
  const p = playerOf(state, pid);
  let cur = popFrame(state);

  const isSheriff = p.role === 'sheriff';
  const round = isSheriff ? cur.turn.round + 1 : cur.turn.round;

  cur = {
    ...cur,
    turn: {
      active: pid,
      phase: 'draw',
      bangsPlayed: 0,
      round,
      handcuffsSuit: null,
      drawn: false,
    },
  };
  cur = updatePlayer(cur, pid, (x) => ({ ...x, usedThisTurn: [] }));
  cur = log(cur, { t: 'turnStart', pid, text: `${p.name}의 차례.` });

  // 이벤트는 보안관의 두 번째 차례부터 공개된다.
  const shouldReveal = Boolean(cur.event) && isSheriff && round >= 2;

  const frames: Frame[] = [];
  if (shouldReveal) frames.push({ k: 'revealEvent' });
  frames.push({ k: 'eventTurnStart', pid });
  frames.push({ k: 'drawPhase', pid, done: 0 });
  frames.push({ k: 'playPhase', pid });
  frames.push({ k: 'discardPhase', pid });
  frames.push({ k: 'turnEnd', pid });

  return pushSeq(cur, frames);
}

export function resolveRevealEvent(state: GameState): GameState {
  let cur = popFrame(state);
  const ev = cur.event;
  if (!ev) return cur;

  if (ev.deck.length === 0) {
    // 하이 눈 카드가 마지막이다. 더 공개할 것이 없으면 그대로 둔다.
    return cur;
  }
  const [next, ...rest] = ev.deck;
  cur = {
    ...cur,
    event: {
      deck: rest,
      current: next,
      past: ev.current ? [...ev.past, ev.current] : ev.past,
    },
  };
  cur = log(cur, { t: 'event', card: next, text: `이벤트 공개 — ${HIGHNOON_EVENTS[next].nameKo}` });

  return pushSeq(cur, onEventEnterFrames(cur));
}

export function resolveEventTurnStart(
  state: GameState,
  frame: Frame & { k: 'eventTurnStart' },
): GameState {
  const cur = popFrame(state);
  if (!inPlay(playerOf(cur, frame.pid))) return cur;
  return pushSeq(cur, onTurnStartFrames(cur, frame.pid));
}

export function resolveDrawPhase(state: GameState, frame: Frame & { k: 'drawPhase' }): GameState {
  const { pid } = frame;
  let cur = popFrame(state);
  if (!inPlay(playerOf(cur, pid))) return cur;

  cur = { ...cur, turn: { ...cur.turn, phase: 'draw', drawn: true } };

  const count = drawCountOf(cur, pid);
  const frames: Frame[] = [];

  const override = drawPhaseOverride(cur, pid, count);
  if (override) {
    frames.push(...override);
  } else if (count > 0) {
    frames.push({ k: 'drawCards', pid, count, reason: 'drawPhase' });
    // 블랙 잭처럼 뽑은 카드를 보고 반응하는 훅은 drawCards 프레임이 처리한다.
  }
  frames.push(...onDrawPhaseEndFrames(cur, pid));

  return pushSeq(cur, frames);
}

export function resolvePlayPhase(state: GameState, frame: Frame & { k: 'playPhase' }): GameState {
  const p = playerOf(state, frame.pid);
  if (!inPlay(p)) return popFrame(state);
  if (state.turn.phase === 'play') return state; // 이미 멈춰 있다 (호출되지 않아야 정상)
  return { ...state, turn: { ...state.turn, phase: 'play' } };
}

export function resolveDiscardPhase(
  state: GameState,
  frame: Frame & { k: 'discardPhase' },
): GameState {
  const p = playerOf(state, frame.pid);
  if (!inPlay(p)) return popFrame(state);
  if (state.turn.phase !== 'discard') {
    return { ...state, turn: { ...state.turn, phase: 'discard' } };
  }
  // 손패가 목숨 이하가 되면 단계가 끝난다.
  return popFrame(state);
}

export function resolveTurnEnd(state: GameState, frame: Frame & { k: 'turnEnd' }): GameState {
  const { pid } = frame;
  let cur = popFrame(state);
  const p = playerOf(cur, pid);

  if (p.ghost) {
    // 유령은 차례가 끝나면 다시 사라진다. 들고 있던 카드는 전부 버려진다.
    const cards = [...p.hand, ...p.equipment];
    cur = updatePlayer(cur, pid, (x) => ({ ...x, ghost: false, hand: [], equipment: [] }));
    cur = toDiscard(cur, cards);
    cur = log(cur, { t: 'ghostLeave', pid, text: `${p.name}의 유령이 사라졌다.` });
  }

  return pushSeq(cur, [{ k: 'checkWin' }, { k: 'advanceTurn', from: pid }]);
}

export function resolveAdvanceTurn(
  state: GameState,
  frame: Frame & { k: 'advanceTurn' },
): GameState {
  let cur = popFrame(state);
  const dir = turnDirectionOf(cur);
  const ghosts = resurrectsEliminated(cur);
  const n = cur.players.length;
  const fromSeat = playerOf(cur, frame.from).seat;

  for (let i = 1; i <= n; i++) {
    const seat = (((fromSeat + dir * i) % n) + n) % n;
    const cand = cur.players[seat];
    if (cand.alive) {
      return pushSeq(cur, [{ k: 'turnStart', pid: cand.id }]);
    }
    if (ghosts && !cand.ghost) {
      cur = updatePlayer(cur, cand.id, (x) => ({ ...x, ghost: true }));
      cur = log(cur, {
        t: 'ghostRise',
        pid: cand.id,
        text: `${ga(cand.name)} 유령으로 되살아났다.`,
      });
      return pushSeq(cur, [{ k: 'turnStart', pid: cand.id }]);
    }
  }
  // 아무도 차례를 받을 수 없다. 승리 판정에 맡긴다.
  return pushSeq(cur, [{ k: 'checkWin' }]);
}

// ---------------------------------------------------------------------------
// 새로운 신분 (하이 눈)
// ---------------------------------------------------------------------------

export function resolveNewIdentity(
  state: GameState,
  frame: Frame & { k: 'newIdentity' },
): GameState {
  const p = playerOf(state, frame.pid);
  if (!inPlay(p) || !p.spareCharacter) return popFrame(state);
  return {
    ...state,
    awaiting: { k: 'newIdentity', pid: frame.pid, spare: p.spareCharacter },
  };
}

export function respondNewIdentity(
  state: GameState,
  frame: Frame & { k: 'newIdentity' },
  choice: Choice,
): GameState {
  let cur = popFrame(state);
  const p = playerOf(cur, frame.pid);
  if (choice.c !== 'yes' || !p.spareCharacter) {
    return log(cur, {
      t: 'newIdentity',
      pid: frame.pid,
      text: `${neun(p.name)} 신분을 그대로 유지했다.`,
    });
  }
  const next = p.spareCharacter;
  const bonus = p.role === 'sheriff' ? 1 : 0;
  cur = updatePlayer(cur, frame.pid, (x) => ({
    ...x,
    character: next,
    spareCharacter: p.character,
    maxHp: CHARACTERS[next].maxHp + bonus,
    hp: 2,
  }));
  return log(cur, {
    t: 'newIdentity',
    pid: frame.pid,
    text: `${ga(p.name)} ${CHARACTERS[next].nameKo}(으)로 신분을 바꿨다 (목숨 2).`,
  });
}

// ---------------------------------------------------------------------------
// 수갑 (하이 눈)
// ---------------------------------------------------------------------------

export function resolveDeclareSuit(
  state: GameState,
  frame: Frame & { k: 'declareSuit' },
): GameState {
  if (!inPlay(playerOf(state, frame.pid))) return popFrame(state);
  return { ...state, awaiting: { k: 'declareSuit', pid: frame.pid } };
}

export function respondDeclareSuit(
  state: GameState,
  frame: Frame & { k: 'declareSuit' },
  choice: Choice,
): GameState {
  const cur = popFrame(state);
  const suit: Suit = choice.c === 'suit' ? choice.suit : 'hearts';
  return log(
    { ...cur, turn: { ...cur.turn, handcuffsSuit: suit } },
    {
      t: 'declareSuit',
      pid: frame.pid,
      text: `${ga(nameOf(cur, frame.pid))} 무늬 ${SUIT_GLYPH[suit]}를 선언했다.`,
    },
  );
}

// ---------------------------------------------------------------------------
// 달톤 형제 (하이 눈)
// ---------------------------------------------------------------------------

export function resolveDaltonsDiscard(
  state: GameState,
  frame: Frame & { k: 'daltonsDiscard' },
): GameState {
  const queue = frame.queue.filter((id) => {
    const p = playerOf(state, id);
    return p.alive && p.equipment.length > 0;
  });
  if (queue.length === 0) return popFrame(state);

  const pid = queue[0];
  return {
    ...state,
    stack: [...state.stack.slice(0, -1), { k: 'daltonsDiscard', queue }],
    awaiting: { k: 'daltonsDiscard', pid, options: playerOf(state, pid).equipment },
  };
}

export function respondDaltonsDiscard(
  state: GameState,
  frame: Frame & { k: 'daltonsDiscard' },
  choice: Choice,
): GameState {
  const pid = frame.queue[0];
  const p = playerOf(state, pid);
  const card =
    choice.c === 'card' && p.equipment.includes(choice.card) ? choice.card : p.equipment[0];

  let cur = updatePlayer(state, pid, (x) => ({
    ...x,
    equipment: x.equipment.filter((c) => c !== card),
  }));
  cur = toDiscard(cur, [card]);
  cur = log(cur, {
    t: 'daltons',
    pid,
    card,
    text: `달톤 형제: ${ga(p.name)} 장착 카드 1장을 버렸다.`,
  });

  return {
    ...cur,
    stack: [...cur.stack.slice(0, -1), { k: 'daltonsDiscard', queue: frame.queue.slice(1) }],
  };
}
