/**
 * 와일드 웨스트 쇼 캐릭터가 만드는 프레임: 그레고리 덱의 캐릭터 빌리기, 율 그리너의 선물.
 */

import { CHARACTERS, charactersFor } from '../../data/characters';
import type { CharacterId } from '../../data/types';
import { inPlay, log, nameOf, playerOf, popFrame, replaceTop, updatePlayer } from '../cards';
import { shuffle } from '../rng';
import type { Choice, Frame, GameState, PlayerId } from '../types';
import { ga, neun } from '../josa';

// ---------------------------------------------------------------------------
// 그레고리 덱 — 기본판 캐릭터를 뽑아 능력을 빌린다
// ---------------------------------------------------------------------------

export function resolveBorrowCharacters(
  state: GameState,
  frame: Frame & { k: 'borrowCharacters' },
): GameState {
  const p = playerOf(state, frame.pid);
  if (!inPlay(p)) return popFrame(state);
  // 처음에는 묻지 않고 뽑는다. 빌린 게 있으면 새로 뽑을지 묻는다
  if (!p.borrowed || p.borrowed.length === 0) {
    return borrow(popFrame(state), frame.pid, frame.count);
  }
  return {
    ...state,
    awaiting: { k: 'borrowCharacters', pid: frame.pid, current: p.borrowed },
  };
}

export function respondBorrowCharacters(
  state: GameState,
  frame: Frame & { k: 'borrowCharacters' },
  choice: Choice,
): GameState {
  const cur = popFrame(state);
  if (choice.c === 'yes') return borrow(cur, frame.pid, frame.count);
  return log(cur, {
    t: 'borrowKeep',
    pid: frame.pid,
    text: `${neun(nameOf(cur, frame.pid))} 빌린 능력을 그대로 둔다.`,
  });
}

function borrow(state: GameState, pid: PlayerId, count: number): GameState {
  // 기본판 캐릭터 중 지금 아무도 쓰지 않는 것
  const taken = new Set<CharacterId>();
  for (const p of state.players) {
    taken.add(p.character);
    if (p.id !== pid) for (const c of p.borrowed ?? []) taken.add(c);
  }
  const pool = charactersFor([]).filter((c) => !taken.has(c));
  const rolled = shuffle(state.rng, pool);
  const picked = rolled.value.slice(0, count);

  const cur = updatePlayer({ ...state, rng: rolled.rng }, pid, (p) => ({ ...p, borrowed: picked }));
  const names = picked.map((c) => CHARACTERS[c].nameKo).join(', ');
  return log(cur, {
    t: 'borrowCharacters',
    pid,
    text: `${ga(nameOf(cur, pid))} ${names}의 능력을 빌렸다.`,
  });
}

// ---------------------------------------------------------------------------
// 율 그리너 — 손패가 더 많은 사람이 1장씩 준다
// ---------------------------------------------------------------------------

export function resolveGifts(state: GameState, frame: Frame & { k: 'gifts' }): GameState {
  const me = playerOf(state, frame.pid);
  if (!inPlay(me)) return popFrame(state);

  // 누가 줄지는 처음 한 번만 센다
  const queue =
    frame.queue ??
    othersInSeatOrder(state, frame.pid).filter((id) => playerOf(state, id).hand.length > me.hand.length);

  const rest = queue.filter((id) => {
    const p = playerOf(state, id);
    return p.alive && !p.ghost && p.hand.length > 0;
  });
  if (rest.length === 0) return popFrame(state);

  const giver = rest[0];
  return {
    ...replaceTop(state, { ...frame, queue: rest }),
    awaiting: {
      k: 'giveCard',
      pid: giver,
      to: frame.pid,
      options: [...new Set(playerOf(state, giver).hand)],
    },
  };
}

export function respondGifts(
  state: GameState,
  frame: Frame & { k: 'gifts' },
  choice: Choice,
): GameState {
  const queue = frame.queue ?? [];
  const giver = queue[0];
  if (!giver) return popFrame(state);
  const hand = playerOf(state, giver).hand;
  const card = choice.c === 'card' && hand.includes(choice.card) ? choice.card : hand[0];

  let cur = replaceTop(state, { ...frame, queue: queue.slice(1) });
  if (card === undefined) return cur;
  cur = updatePlayer(cur, giver, (p) => ({ ...p, hand: p.hand.filter((c) => c !== card) }));
  cur = updatePlayer(cur, frame.pid, (p) => ({ ...p, hand: [...p.hand, card] }));
  // 손패에서 건넨 카드라 로그에 카드를 남기지 않는다
  return log(cur, {
    t: 'youlGrinner',
    pid: giver,
    target: frame.pid,
    text: `${ga(nameOf(cur, giver))} ${nameOf(cur, frame.pid)}에게 카드 1장을 건넸다.`,
  });
}

/** pid 다음 자리부터 시계 방향으로, 살아 있는 다른 사람들 */
function othersInSeatOrder(state: GameState, pid: PlayerId): PlayerId[] {
  const n = state.players.length;
  const seat = playerOf(state, pid).seat;
  const out: PlayerId[] = [];
  for (let i = 1; i < n; i++) {
    const p = state.players[(seat + i) % n];
    if (p.alive && !p.ghost) out.push(p.id);
  }
  return out;
}
