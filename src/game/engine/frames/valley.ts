/**
 * 그림자의 계곡 갈색 카드: 반디도스 · 포커 · 토네이도.
 *
 * 셋 다 '여러 사람이 차례로 손패를 골라 버리는' 흐름이라 입력 대기 하나(discardChoice)를 같이 쓴다.
 * 프레임이 큐와 진행 상태를 직접 들고 있어서 중간에 멈췄다 재개돼도 이어진다.
 * 원문은 docs/valley-of-shadows.md.
 */

import { CARD_DEFS } from '../../data/cards.base';
import { RANK_VALUE } from '../../data/types';
import {
  cardOf,
  giveCards,
  inPlay,
  log,
  nameOf,
  playerOf,
  popFrame,
  pushSeq,
  replaceTop,
  toDiscard,
  updatePlayer,
} from '../cards';
import { canReachWithBang } from '../distance';
import { canPlayCard, evadeOptions } from '../hooks';
import type { Choice, Frame, GameState, PlayerId } from '../types';
import { eul, ga } from '../josa';

function takeFromHand(state: GameState, pid: PlayerId, card: string): GameState {
  return updatePlayer(state, pid, (p) => ({ ...p, hand: p.hand.filter((c) => c !== card) }));
}

/** 선택이 손에 없는 카드면 첫 장으로 되돌린다 (시간 초과·잘못된 입력) */
function chosenCard(state: GameState, pid: PlayerId, choice: Choice): string | null {
  const hand = playerOf(state, pid).hand;
  if (choice.c === 'card' && hand.includes(choice.card)) return choice.card;
  return hand[0] ?? null;
}

// ---------------------------------------------------------------------------
// 반디도스 — 다른 모든 플레이어는 손패 2장(1장뿐이면 1장)을 버리거나 목숨 1을 잃는다
// ---------------------------------------------------------------------------

export function resolveBandidos(state: GameState, frame: Frame & { k: 'bandidos' }): GameState {
  // 유령은 목숨을 잃지 않으니 고를 것이 없다.
  const queue = frame.queue.filter((id) => playerOf(state, id).alive);
  if (queue.length === 0) return popFrame(state);

  const pid = queue[0];
  if (!frame.asked && frame.left === undefined && evadeOptions(state, pid, 'bandidos').length > 0) {
    return pushSeq(replaceTop(state, { ...frame, queue: queue.slice(1) }), [
      {
        k: 'evade',
        pid,
        source: frame.source,
        kind: 'bandidos',
        then: { k: 'bandidos', source: frame.source, queue: [pid], asked: true },
      },
    ]);
  }
  const hand = playerOf(state, pid).hand;
  const cur = replaceTop(state, { ...frame, queue });

  if (frame.left !== undefined && frame.left > 0 && hand.length > 0) {
    return {
      ...cur,
      awaiting: { k: 'discardChoice', pid, options: hand, remaining: frame.left, canPass: false, reason: 'bandidos' },
    };
  }
  if (frame.left !== undefined) {
    // 버릴 만큼 다 버렸다.
    return replaceTop(cur, { ...frame, queue: queue.slice(1), left: undefined });
  }
  if (hand.length === 0) {
    return pushSeq(replaceTop(cur, { ...frame, queue: queue.slice(1) }), [
      { k: 'damage', target: pid, amount: 1, source: frame.source, credit: frame.source, cause: 'bandidos' },
    ]);
  }
  return {
    ...cur,
    awaiting: {
      k: 'discardChoice',
      pid,
      options: hand,
      remaining: Math.min(2, hand.length),
      canPass: true,
      reason: 'bandidos',
    },
  };
}

export function respondBandidos(
  state: GameState,
  frame: Frame & { k: 'bandidos' },
  choice: Choice,
): GameState {
  const pid = frame.queue[0];
  if (choice.c === 'pass' && frame.left === undefined) {
    const cur = log(state, {
      t: 'bandidosHit',
      pid,
      text: `${ga(nameOf(state, pid))} 카드를 버리지 않고 목숨을 내놓았다.`,
    });
    return pushSeq(replaceTop(cur, { ...frame, queue: frame.queue.slice(1) }), [
      { k: 'damage', target: pid, amount: 1, source: frame.source, credit: frame.source, cause: 'bandidos' },
    ]);
  }
  const card = chosenCard(state, pid, choice);
  if (!card) return replaceTop(state, { ...frame, queue: frame.queue.slice(1), left: undefined });

  const before = playerOf(state, pid).hand.length;
  const left = (frame.left ?? Math.min(2, before)) - 1;
  let cur = toDiscard(takeFromHand(state, pid, card), [card]);
  cur = log(cur, {
    t: 'bandidosDiscard',
    pid,
    card,
    text: `${ga(nameOf(cur, pid))} 반디도스에 카드를 버렸다.`,
  });
  return replaceTop(cur, { ...frame, left });
}

// ---------------------------------------------------------------------------
// 포커 — 다른 모든 플레이어가 손패 1장씩 버린다. 에이스가 없으면 낸 사람이 2장까지 가져온다
//
// 원작은 '동시에' 버린다. 여기서는 차례로 고르되 판돈(pot)은 끝날 때까지 공개하지 않는다.
// ---------------------------------------------------------------------------

export function resolvePoker(state: GameState, frame: Frame & { k: 'poker' }): GameState {
  const queue = frame.queue.filter((id) => {
    const p = playerOf(state, id);
    return inPlay(p) && p.hand.length > 0;
  });
  if (queue.length > 0) {
    const pid = queue[0];
    return {
      ...replaceTop(state, { ...frame, queue }),
      awaiting: {
        k: 'discardChoice',
        pid,
        options: playerOf(state, pid).hand,
        remaining: 1,
        canPass: false,
        reason: 'poker',
      },
    };
  }

  // 모두 냈다. 판돈을 공개한다.
  const cur = popFrame(state);
  if (frame.pot.length === 0) return cur;
  if (frame.left === undefined) {
    const ace = frame.pot.some((c) => RANK_VALUE[cardOf(c).rank] === 1);
    const revealed = log(cur, {
      t: 'pokerReveal',
      pid: frame.source,
      cards: frame.pot,
      text: ace ? '포커: 에이스가 나와 모두 버려졌다.' : '포커: 에이스가 없다.',
    });
    if (ace || !inPlay(playerOf(cur, frame.source))) return toDiscard(revealed, frame.pot);
    return pushSeq(revealed, [{ ...frame, queue: [], left: Math.min(2, frame.pot.length) }]);
  }
  if (frame.left <= 0) return toDiscard(cur, frame.pot);

  // 낸 사람이 판돈에서 고른다.
  return {
    ...state,
    awaiting: { k: 'generalStore', pid: frame.source, options: frame.pot },
  };
}

export function respondPoker(
  state: GameState,
  frame: Frame & { k: 'poker' },
  choice: Choice,
): GameState {
  if (frame.left === undefined) {
    const pid = frame.queue[0];
    const card = chosenCard(state, pid, choice);
    if (!card) return replaceTop(state, { ...frame, queue: frame.queue.slice(1) });
    const cur = log(takeFromHand(state, pid, card), {
      t: 'pokerBet',
      pid,
      text: `${ga(nameOf(state, pid))} 포커에 카드 1장을 엎어 냈다.`,
    });
    return replaceTop(cur, { ...frame, queue: frame.queue.slice(1), pot: [...frame.pot, card] });
  }

  const card =
    choice.c === 'card' && frame.pot.includes(choice.card) ? choice.card : frame.pot[0];
  let cur = giveCards(state, frame.source, [card]);
  cur = log(cur, {
    t: 'pokerTake',
    pid: frame.source,
    card,
    text: `${ga(nameOf(cur, frame.source))} 판돈에서 ${eul(nameOfCard(card))} 가져갔다.`,
  });
  return replaceTop(cur, { ...frame, pot: frame.pot.filter((c) => c !== card), left: frame.left - 1 });
}

function nameOfCard(card: string): string {
  return CARD_DEFS[cardOf(card).kind].nameKo;
}

// ---------------------------------------------------------------------------
// 토네이도 — 모두 손패 1장을 버리고(가능하면) 덱에서 2장을 가져온다
// ---------------------------------------------------------------------------

export function resolveTornado(state: GameState, frame: Frame & { k: 'tornado' }): GameState {
  const queue = frame.queue.filter((id) => inPlay(playerOf(state, id)));
  if (queue.length === 0) return popFrame(state);
  const pid = queue[0];
  const hand = playerOf(state, pid).hand;
  if (hand.length === 0) {
    return pushSeq(replaceTop(state, { ...frame, queue: queue.slice(1) }), [
      { k: 'drawCards', pid, count: 2, reason: 'tornado' },
    ]);
  }
  return {
    ...replaceTop(state, { ...frame, queue }),
    awaiting: { k: 'discardChoice', pid, options: hand, remaining: 1, canPass: false, reason: 'tornado' },
  };
}

export function respondTornado(
  state: GameState,
  frame: Frame & { k: 'tornado' },
  choice: Choice,
): GameState {
  const pid = frame.queue[0];
  const card = chosenCard(state, pid, choice);
  let cur = replaceTop(state, { ...frame, queue: frame.queue.slice(1) });
  if (card) {
    cur = toDiscard(takeFromHand(cur, pid, card), [card]);
    cur = log(cur, { t: 'tornadoDiscard', pid, card, text: `${ga(nameOf(cur, pid))} 토네이도에 카드를 버렸다.` });
  }
  return pushSeq(cur, [{ k: 'drawCards', pid, count: 2, reason: 'tornado' }]);
}

// ---------------------------------------------------------------------------
// 샷건 — 맞은 사람이 손패 1장을 골라 버린다
// ---------------------------------------------------------------------------

export function resolveShotgunDiscard(
  state: GameState,
  frame: Frame & { k: 'shotgunDiscard' },
): GameState {
  const p = playerOf(state, frame.pid);
  if (!inPlay(p) || p.hand.length === 0) return popFrame(state);
  return {
    ...state,
    awaiting: { k: 'discardChoice', pid: p.id, options: p.hand, remaining: 1, canPass: false, reason: 'shotgun' },
  };
}

export function respondShotgunDiscard(
  state: GameState,
  frame: Frame & { k: 'shotgunDiscard' },
  choice: Choice,
): GameState {
  const card = chosenCard(state, frame.pid, choice);
  let cur = popFrame(state);
  if (!card) return cur;
  cur = toDiscard(takeFromHand(cur, frame.pid, card), [card]);
  return log(cur, { t: 'shotgun', pid: frame.pid, card, text: `샷건: ${ga(nameOf(cur, frame.pid))} 카드 1장을 버렸다.` });
}

// ---------------------------------------------------------------------------
// 탈출 · 믹 디펜더 — 뱅!이 아닌 갈색 카드의 효과를 피한다
// ---------------------------------------------------------------------------

export function resolveEvade(state: GameState, frame: Frame & { k: 'evade' }): GameState {
  const p = playerOf(state, frame.pid);
  if (!inPlay(p)) return popFrame(state);
  const options = evadeOptions(state, frame.pid, frame.kind);
  if (options.length === 0) return replaceTop(state, frame.then);
  return {
    ...state,
    awaiting: { k: 'evade', pid: frame.pid, source: frame.source, kind: frame.kind, options },
  };
}

export function respondEvade(
  state: GameState,
  frame: Frame & { k: 'evade' },
  choice: Choice,
): GameState {
  const hand = playerOf(state, frame.pid).hand;
  if (choice.c !== 'card' || !hand.includes(choice.card)) return replaceTop(state, frame.then);
  const cur = toDiscard(takeFromHand(popFrame(state), frame.pid, choice.card), [choice.card]);
  return log(cur, {
    t: 'evade',
    pid: frame.pid,
    card: choice.card,
    target: frame.source,
    text: `${ga(nameOf(cur, frame.pid))} ${eul(nameOfCard(choice.card))} 내서 ${CARD_DEFS[frame.kind].nameKo}의 효과를 피했다.`,
  });
}

// ---------------------------------------------------------------------------
// 구조! — 다른 사람이 목숨 1을 잃는 것을 막는다. 그 사람이 살아남으면 2장을 가져온다
// ---------------------------------------------------------------------------

/** 구조!를 낼 수 있는 사람들. 대상 본인은 쓸 수 없다 (원본 맵 v0.335). 대상 왼쪽부터 */
export function saversFor(state: GameState, target: PlayerId): PlayerId[] {
  const n = state.players.length;
  const start = playerOf(state, target).seat;
  const out: PlayerId[] = [];
  for (let i = 1; i < n; i++) {
    const p = state.players[(start + i) % n];
    if (!inPlay(p) || p.id === target) continue;
    if (savedCards(state, p.id).length > 0) out.push(p.id);
  }
  return out;
}

function savedCards(state: GameState, pid: PlayerId): string[] {
  return playerOf(state, pid).hand.filter(
    (c) => cardOf(c).kind === 'saved' && canPlayCard(state, pid, 'saved', c, true),
  );
}

export function resolveSavedOffer(state: GameState, frame: Frame & { k: 'savedOffer' }): GameState {
  const queue = frame.queue.filter((id) => inPlay(playerOf(state, id)) && savedCards(state, id).length > 0);
  if (queue.length === 0 || !playerOf(state, frame.target).alive) return popFrame(state);
  return {
    ...replaceTop(state, { ...frame, queue }),
    awaiting: { k: 'saved', pid: queue[0], target: frame.target, options: savedCards(state, queue[0]) },
  };
}

export function respondSavedOffer(
  state: GameState,
  frame: Frame & { k: 'savedOffer' },
  choice: Choice,
): GameState {
  const saver = frame.queue[0];
  if (choice.c !== 'card' || !playerOf(state, saver).hand.includes(choice.card)) {
    return replaceTop(state, { ...frame, queue: frame.queue.slice(1) });
  }
  let cur = toDiscard(takeFromHand(popFrame(state), saver, choice.card), [choice.card]);
  cur = log(cur, {
    t: 'saved',
    pid: saver,
    target: frame.target,
    card: choice.card,
    text: `${ga(nameOf(cur, saver))} 구조!로 ${nameOf(cur, frame.target)}의 목숨 1을 지켰다.`,
  });
  // 바로 아래가 막으려던 피해다. 1 줄이고, 그 피해가 다 해결된 뒤에 보상을 준다.
  const top = cur.stack[cur.stack.length - 1];
  if (top?.k !== 'damage') return cur;
  const rest = cur.stack.slice(0, -1);
  const reward: Frame = { k: 'savedReward', saver, target: frame.target };
  const left = top.amount - 1;
  return { ...cur, stack: left > 0 ? [...rest, reward, { ...top, amount: left }] : [...rest, reward] };
}

export function resolveSavedReward(state: GameState, frame: Frame & { k: 'savedReward' }): GameState {
  const target = playerOf(state, frame.target);
  if (!target.alive || !inPlay(playerOf(state, frame.saver))) return popFrame(state);
  if (target.hand.length === 0) {
    return pushSeq(popFrame(state), [{ k: 'drawCards', pid: frame.saver, count: 2, reason: 'saved' }]);
  }
  return { ...state, awaiting: { k: 'savedReward', pid: frame.saver, target: frame.target } };
}

export function respondSavedReward(
  state: GameState,
  frame: Frame & { k: 'savedReward' },
  choice: Choice,
): GameState {
  const cur = popFrame(state);
  if (choice.c === 'yes') {
    return pushSeq(cur, [{ k: 'drawFromPlayer', pid: frame.saver, from: frame.target, count: 2 }]);
  }
  return pushSeq(cur, [{ k: 'drawCards', pid: frame.saver, count: 2, reason: 'saved' }]);
}

// ---------------------------------------------------------------------------
// 이블린 쉬뱅 — 가져오기를 한 장씩 포기하고, 그만큼 서로 다른 사람에게 뱅!
// ---------------------------------------------------------------------------

function evelynTargets(state: GameState, frame: Frame & { k: 'evelyn' }): PlayerId[] {
  return state.players
    .filter((t) => t.alive && t.id !== frame.pid && !frame.shot.includes(t.id))
    .filter((t) => canReachWithBang(state, frame.pid, t.id))
    .map((t) => t.id);
}

export function resolveEvelyn(state: GameState, frame: Frame & { k: 'evelyn' }): GameState {
  if (!inPlay(playerOf(state, frame.pid)) || frame.remaining <= 0) return popFrame(state);
  const targets = evelynTargets(state, frame);
  if (targets.length === 0) {
    return pushSeq(popFrame(state), [
      { k: 'drawCards', pid: frame.pid, count: frame.remaining, reason: 'drawPhase' },
    ]);
  }
  return { ...state, awaiting: { k: 'evelyn', pid: frame.pid, targets, remaining: frame.remaining } };
}

export function respondEvelyn(
  state: GameState,
  frame: Frame & { k: 'evelyn' },
  choice: Choice,
): GameState {
  if (choice.c !== 'player' || !evelynTargets(state, frame).includes(choice.pid)) {
    return pushSeq(popFrame(state), [
      { k: 'drawCards', pid: frame.pid, count: frame.remaining, reason: 'drawPhase' },
    ]);
  }
  const target = choice.pid;
  const cur = log(replaceTop(state, { ...frame, remaining: frame.remaining - 1, shot: [...frame.shot, target] }), {
    t: 'evelyn',
    pid: frame.pid,
    target,
    text: `${ga(nameOf(state, frame.pid))} 카드 1장을 포기하고 ${nameOf(state, target)}에게 뱅!을 쏜다.`,
  });
  return pushSeq(cur, [
    { k: 'bang', source: frame.pid, target, missesRequired: 1, cause: 'evelyn', dodgeChecked: false },
  ]);
}

// ---------------------------------------------------------------------------
// 레모네이드 짐 — 남이 맥주를 내면 1장 버리고 나도 목숨 1 회복
// ---------------------------------------------------------------------------

export function resolveLemonadeJim(state: GameState, frame: Frame & { k: 'lemonadeJim' }): GameState {
  const p = playerOf(state, frame.pid);
  if (!p.alive || p.hp >= p.maxHp || p.hand.length === 0) return popFrame(state);
  return {
    ...state,
    awaiting: { k: 'discardChoice', pid: p.id, options: p.hand, remaining: 1, canPass: true, reason: 'lemonadeJim' },
  };
}

export function respondLemonadeJim(
  state: GameState,
  frame: Frame & { k: 'lemonadeJim' },
  choice: Choice,
): GameState {
  const cur = popFrame(state);
  const hand = playerOf(cur, frame.pid).hand;
  if (choice.c !== 'card' || !hand.includes(choice.card)) return cur;
  const after = log(toDiscard(takeFromHand(cur, frame.pid, choice.card), [choice.card]), {
    t: 'lemonadeJim',
    pid: frame.pid,
    card: choice.card,
    text: `${ga(nameOf(cur, frame.pid))} 카드 1장을 버리고 같이 한잔했다.`,
  });
  return pushSeq(after, [{ k: 'heal', pid: frame.pid, amount: 1 }]);
}
