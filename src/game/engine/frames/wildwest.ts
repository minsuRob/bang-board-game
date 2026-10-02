/**
 * 와일드 웨스트 쇼 캐릭터가 만드는 프레임: 그레고리 덱의 캐릭터 빌리기, 율 그리너의 선물.
 * 이벤트(달링 발렌타인·헬레나 존테로·묘지)가 손패와 역할을 바꾸는 일도 여기서 한다.
 */

import { CHARACTERS, charactersFor } from '../../data/characters';
import type { CharacterId } from '../../data/types';
import { inPlay, log, nameOf, playerOf, popFrame, pushSeq, replaceTop, toDiscard, updatePlayer } from '../cards';
import { nextInt, shuffle } from '../rng';
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

// ---------------------------------------------------------------------------
// 와일드 웨스트 쇼 이벤트
// ---------------------------------------------------------------------------

/** 달링 발렌타인: 손패를 모두 버리고 같은 장수를 덱에서 새로 가져온다 */
export function resolveHandRedraw(state: GameState, frame: Frame & { k: 'handRedraw' }): GameState {
  let cur = popFrame(state);
  const p = playerOf(cur, frame.pid);
  if (!inPlay(p) || p.hand.length === 0) return cur;
  const n = p.hand.length;
  cur = updatePlayer(cur, frame.pid, (x) => ({ ...x, hand: [] }));
  cur = toDiscard(cur, p.hand);
  cur = log(cur, {
    t: 'darlingValentine',
    pid: frame.pid,
    cards: p.hand,
    text: `달링 발렌타인: ${ga(nameOf(cur, frame.pid))} 손패 ${n}장을 버리고 새로 가져온다.`,
  });
  return pushSeq(cur, [{ k: 'drawCards', pid: frame.pid, count: n, reason: 'darlingValentine' }]);
}

/** 헬레나 존테로: 보안관을 뺀 살아 있는 사람의 역할을 섞어 다시 나눈다 */
export function shuffleLivingRoles(state: GameState): GameState {
  const ids = state.players.filter((p) => p.alive && p.role !== 'sheriff').map((p) => p.id);
  if (ids.length < 2) return state;
  const rolled = shuffle(state.rng, ids.map((id) => playerOf(state, id).role));
  let cur: GameState = { ...state, rng: rolled.rng };
  ids.forEach((id, i) => {
    cur = updatePlayer(cur, id, (x) => ({ ...x, role: rolled.value[i], roleRevealed: false }));
  });
  return log(cur, {
    t: 'rolesShuffled',
    text: '헬레나 존테로: 보안관을 뺀 살아 있는 사람들의 역할을 섞어 다시 나눴다.',
  });
}

/**
 * 묘지: 제거된 사람이 자기 차례에 목숨 1로 돌아온다.
 * 역할은 제거된 사람들의 역할 중 하나를 무작위로 받는다. 받은 역할의 주인과 역할을 맞바꾸므로
 * 역할 묶음은 그대로다. 돌아온 사람의 역할은 다시 가린다.
 */
export function reviveFromBoneOrchard(state: GameState, pid: PlayerId): GameState {
  const pool = state.players.filter((p) => !p.alive && !p.ghost);
  const rolled = nextInt(state.rng, Math.max(1, pool.length));
  let cur: GameState = { ...state, rng: rolled.rng };
  const other = pool[rolled.value];
  if (other && other.id !== pid) {
    const mine = playerOf(cur, pid).role;
    cur = updatePlayer(cur, other.id, (x) => ({ ...x, role: mine }));
    cur = updatePlayer(cur, pid, (x) => ({ ...x, role: other.role }));
  }
  cur = updatePlayer(cur, pid, (x) => ({ ...x, alive: true, ghost: false, hp: 1, roleRevealed: false }));
  return log(cur, {
    t: 'rolesShuffled',
    pid,
    text: `묘지: ${ga(nameOf(cur, pid))} 목숨 1로 돌아왔다. 역할은 제거된 사람들의 것 중에서 다시 받았다.`,
  });
}
