/**
 * 카드가 오가는 프레임: 가져오기 · 뺏기 · 잡화점 · 캐릭터별 드로우 변형.
 */

import { RED_SUITS } from '../../data/types';
import {
  drawFromDeck,
  effectiveSuit,
  giveCards,
  inPlay,
  log,
  nameOf,
  playerOf,
  popFrame,
  pushSeq,
  putOnDeck,
  replaceTop,
  seatedPlayers,
  toDiscard,
  updatePlayer,
} from '../cards';
import { afterDrawFrames } from '../hooks';
import { nextInt } from '../rng';
import type { Choice, Frame, GameState, PlayerId } from '../types';

export function resolveDrawCards(
  state: GameState,
  frame: Frame & { k: 'drawCards' },
): GameState {
  let cur = popFrame(state);
  const p = playerOf(cur, frame.pid);
  if (!inPlay(p) || frame.count <= 0) return cur;

  const drawn = drawFromDeck(cur, frame.count);
  cur = giveCards(drawn.state, frame.pid, drawn.cards);
  cur = log(cur, {
    t: 'draw',
    pid: frame.pid,
    amount: drawn.cards.length,
    text: `${p.name}이(가) 카드 ${drawn.cards.length}장을 가져왔다.`,
  });

  // 블랙 잭처럼 뽑은 카드를 보고 반응하는 훅은 정규 드로우 단계에서만 울린다.
  if (frame.reason === 'drawPhase') {
    return pushSeq(cur, afterDrawFrames(cur, frame.pid, drawn.cards));
  }
  return cur;
}

/** 남의 손에서 무작위로 가져온다 (엘 그링고·제시 존스). */
export function resolveDrawFromPlayer(
  state: GameState,
  frame: Frame & { k: 'drawFromPlayer' },
): GameState {
  let cur = popFrame(state);
  const taker = playerOf(cur, frame.pid);
  if (!inPlay(taker)) return cur;

  const taken: string[] = [];
  for (let i = 0; i < frame.count; i++) {
    const victim = playerOf(cur, frame.from);
    if (victim.hand.length === 0) break;
    const rolled = nextInt(cur.rng, victim.hand.length);
    const card = victim.hand[rolled.value];
    cur = updatePlayer({ ...cur, rng: rolled.rng }, frame.from, (p) => ({
      ...p,
      hand: p.hand.filter((c) => c !== card),
    }));
    taken.push(card);
  }
  if (taken.length === 0) return cur;

  cur = giveCards(cur, frame.pid, taken);
  return log(cur, {
    t: 'steal',
    pid: frame.pid,
    target: frame.from,
    amount: taken.length,
    text: `${taker.name}이(가) ${nameOf(cur, frame.from)}의 손에서 ${taken.length}장을 가져갔다.`,
  });
}

/** 제거된 사람의 카드를 전부 가져온다 (벌쳐 샘). 파랑 카드까지 포함한다. */
export function resolveTakeAllCards(
  state: GameState,
  frame: Frame & { k: 'takeAllCards' },
): GameState {
  let cur = popFrame(state);
  const victim = playerOf(cur, frame.from);
  const cards = [...victim.hand, ...victim.equipment];
  if (cards.length === 0) return cur;

  cur = updatePlayer(cur, frame.from, (p) => ({ ...p, hand: [], equipment: [] }));
  cur = giveCards(cur, frame.pid, cards);
  return log(cur, {
    t: 'vultureSam',
    pid: frame.pid,
    target: frame.from,
    amount: cards.length,
    text: `${nameOf(cur, frame.pid)}이(가) ${victim.name}의 카드 ${cards.length}장을 챙겼다.`,
  });
}

// ---------------------------------------------------------------------------
// 잡화점 — 생존자 수만큼 펼치고 사용자부터 한 장씩 고른다
// ---------------------------------------------------------------------------

export function resolveGeneralStore(
  state: GameState,
  frame: Frame & { k: 'generalStore' },
): GameState {
  let cur = state;
  let { revealed, queue } = frame;

  if (revealed.length === 0 && queue.length > 0) {
    const drawn = drawFromDeck(cur, queue.length);
    cur = drawn.state;
    revealed = drawn.cards;
    cur = log(cur, {
      t: 'generalStore',
      pid: frame.source,
      cards: revealed,
      text: `잡화점: 카드 ${revealed.length}장이 펼쳐졌다.`,
    });
  }

  queue = queue.filter((id) => inPlay(playerOf(cur, id)));
  if (queue.length === 0 || revealed.length === 0) {
    // 고를 사람이 없으면 남은 카드는 버린 더미로.
    return toDiscard(popFrame(cur), revealed);
  }

  cur = replaceTop(cur, { ...frame, revealed, queue });
  return { ...cur, awaiting: { k: 'generalStore', pid: queue[0], options: revealed } };
}

export function respondGeneralStore(
  state: GameState,
  frame: Frame & { k: 'generalStore' },
  choice: Choice,
): GameState {
  const pid = frame.queue[0];
  const card =
    choice.c === 'card' && frame.revealed.includes(choice.card)
      ? choice.card
      : frame.revealed[0];

  let cur = giveCards(state, pid, [card]);
  cur = log(cur, {
    t: 'generalStorePick',
    pid,
    card,
    text: `${nameOf(cur, pid)}이(가) 잡화점에서 카드를 골랐다.`,
  });
  return replaceTop(cur, {
    ...frame,
    revealed: frame.revealed.filter((c) => c !== card),
    queue: frame.queue.slice(1),
  });
}

// ---------------------------------------------------------------------------
// 강탈 · 캣 발루
// ---------------------------------------------------------------------------

export function resolveSteal(state: GameState, frame: Frame & { k: 'steal' }): GameState {
  const t = playerOf(state, frame.target);
  if (!inPlay(t) || (t.hand.length === 0 && t.equipment.length === 0)) {
    return popFrame(state);
  }
  return {
    ...state,
    awaiting: {
      k: 'stealCard',
      pid: frame.source,
      target: frame.target,
      mode: frame.mode,
      handCount: t.hand.length,
      equipment: t.equipment,
    },
  };
}

export function respondSteal(
  state: GameState,
  frame: Frame & { k: 'steal' },
  choice: Choice,
): GameState {
  const t = playerOf(state, frame.target);
  let card: string | null = null;
  let fromEquipment = false;

  if (choice.c === 'pick') {
    if (choice.pick.zone === 'hand') {
      card = t.hand[choice.pick.index] ?? t.hand[0] ?? null;
    } else if (t.equipment.includes(choice.pick.card)) {
      card = choice.pick.card;
      fromEquipment = true;
    }
  }
  if (!card) {
    card = t.hand[0] ?? t.equipment[0] ?? null;
    fromEquipment = !t.hand.length && Boolean(card);
  }
  let cur = popFrame(state);
  if (!card) return cur;

  const picked = card;
  cur = updatePlayer(cur, frame.target, (p) =>
    fromEquipment
      ? { ...p, equipment: p.equipment.filter((c) => c !== picked) }
      : { ...p, hand: p.hand.filter((c) => c !== picked) },
  );

  if (frame.mode === 'panic') {
    cur = giveCards(cur, frame.source, [picked]);
    return log(cur, {
      t: 'panic',
      pid: frame.source,
      target: frame.target,
      text: `${nameOf(cur, frame.source)}이(가) ${t.name}의 카드를 강탈했다.`,
    });
  }
  cur = toDiscard(cur, [picked]);
  return log(cur, {
    t: 'catBalou',
    pid: frame.source,
    target: frame.target,
    text: `${nameOf(cur, frame.source)}이(가) ${t.name}의 카드를 버리게 했다.`,
  });
}

// ---------------------------------------------------------------------------
// 킷 칼슨 — 맨 위 세 장을 보고 두 장을 고른다
// ---------------------------------------------------------------------------

export function resolveKitCarlson(
  state: GameState,
  frame: Frame & { k: 'kitCarlson' },
): GameState {
  let cur = state;
  let candidates = frame.candidates;

  if (candidates.length === 0) {
    const drawn = drawFromDeck(cur, frame.taken + 1);
    cur = drawn.state;
    candidates = drawn.cards;
  }
  if (frame.taken <= 0 || candidates.length === 0) {
    // 남은 카드는 덱 맨 위로 되돌린다.
    return putOnDeck(popFrame(cur), [...candidates].reverse());
  }
  cur = replaceTop(cur, { ...frame, candidates });
  return {
    ...cur,
    awaiting: { k: 'kitCarlson', pid: frame.pid, options: candidates, remaining: frame.taken },
  };
}

export function respondKitCarlson(
  state: GameState,
  frame: Frame & { k: 'kitCarlson' },
  choice: Choice,
): GameState {
  const card =
    choice.c === 'card' && frame.candidates.includes(choice.card)
      ? choice.card
      : frame.candidates[0];
  const cur = giveCards(state, frame.pid, [card]);
  return replaceTop(cur, {
    ...frame,
    candidates: frame.candidates.filter((c) => c !== card),
    taken: frame.taken - 1,
  });
}

// ---------------------------------------------------------------------------
// 제시 존스 — 첫 카드를 남의 손에서
// ---------------------------------------------------------------------------

export function resolveJesseJones(
  state: GameState,
  frame: Frame & { k: 'jesseJonesChoice' },
): GameState {
  const targets = state.players
    .filter((p) => p.id !== frame.pid && inPlay(p) && p.hand.length > 0)
    .map((p) => p.id);
  if (targets.length === 0) {
    return pushSeq(popFrame(state), [
      { k: 'drawCards', pid: frame.pid, count: frame.rest + 1, reason: 'drawPhase' },
    ]);
  }
  return { ...state, awaiting: { k: 'jesseJones', pid: frame.pid, targets } };
}

export function respondJesseJones(
  state: GameState,
  frame: Frame & { k: 'jesseJonesChoice' },
  choice: Choice,
): GameState {
  const cur = popFrame(state);
  if (choice.c === 'player') {
    return pushSeq(cur, [
      { k: 'drawFromPlayer', pid: frame.pid, from: choice.pid, count: 1 },
      ...(frame.rest > 0
        ? [{ k: 'drawCards', pid: frame.pid, count: frame.rest, reason: 'jesseJones' } as Frame]
        : []),
    ]);
  }
  return pushSeq(cur, [
    { k: 'drawCards', pid: frame.pid, count: frame.rest + 1, reason: 'drawPhase' },
  ]);
}

// ---------------------------------------------------------------------------
// 페드로 라미레즈 — 첫 카드를 버린 더미에서
// ---------------------------------------------------------------------------

export function resolvePedroRamirez(
  state: GameState,
  frame: Frame & { k: 'pedroRamirezChoice' },
): GameState {
  if (state.discard.length === 0) {
    return pushSeq(popFrame(state), [
      { k: 'drawCards', pid: frame.pid, count: frame.rest + 1, reason: 'drawPhase' },
    ]);
  }
  return {
    ...state,
    awaiting: {
      k: 'pedroRamirez',
      pid: frame.pid,
      topDiscard: state.discard[state.discard.length - 1],
    },
  };
}

export function respondPedroRamirez(
  state: GameState,
  frame: Frame & { k: 'pedroRamirezChoice' },
  choice: Choice,
): GameState {
  let cur = popFrame(state);
  if (choice.c === 'yes' && cur.discard.length > 0) {
    const card = cur.discard[cur.discard.length - 1];
    cur = { ...cur, discard: cur.discard.slice(0, -1) };
    cur = giveCards(cur, frame.pid, [card]);
    cur = log(cur, {
      t: 'pedroRamirez',
      pid: frame.pid,
      card,
      text: `${nameOf(cur, frame.pid)}이(가) 버린 더미에서 카드를 가져왔다.`,
    });
    return frame.rest > 0
      ? pushSeq(cur, [
          { k: 'drawCards', pid: frame.pid, count: frame.rest, reason: 'pedroRamirez' },
        ])
      : cur;
  }
  return pushSeq(cur, [
    { k: 'drawCards', pid: frame.pid, count: frame.rest + 1, reason: 'drawPhase' },
  ]);
}

// ---------------------------------------------------------------------------
// 블랙 잭 — 두 번째 카드를 공개하고 ♥/♦ 면 한 장 더
// ---------------------------------------------------------------------------

export function resolveBlackJackReveal(
  state: GameState,
  frame: Frame & { k: 'blackJackReveal' },
): GameState {
  const cur = popFrame(state);
  const suit = effectiveSuit(cur, frame.card);
  const bonus = RED_SUITS.includes(suit);

  const logged = log(cur, {
    t: 'blackJack',
    pid: frame.pid,
    card: frame.card,
    text: `${nameOf(cur, frame.pid)}의 두 번째 카드 공개: ${suit}${bonus ? ' — 한 장 더!' : ''}`,
  });
  return bonus
    ? pushSeq(logged, [{ k: 'drawCards', pid: frame.pid, count: 1, reason: 'blackJack' }])
    : logged;
}

/**
 * 잡화점이 펼칠 카드 수 = 지금 자리에 앉아 있는 사람 수.
 *
 * '생존자 수'가 아니라 '링 참여자 수'다. 유령도시로 되살아난 유령은 생존자가
 * 아니지만 자리에는 앉아 있으므로 한 장을 고른다. 이 둘을 뭉뚱그리면
 * 카드가 모자라거나 남는다. (원본 맵 v0.275 / v0.418 패치노트)
 */
export function generalStoreQueue(state: GameState, source: PlayerId): PlayerId[] {
  const ring = seatedPlayers(state);
  const start = ring.findIndex((p) => p.id === source);
  if (start < 0) return ring.map((p) => p.id);
  return [...ring.slice(start), ...ring.slice(0, start)].map((p) => p.id);
}
