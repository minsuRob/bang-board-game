/**
 * 카드가 오가는 프레임: 가져오기 · 뺏기 · 잡화점 · 캐릭터별 드로우 변형.
 */

import type { CardId } from '../../data/types';
import { RED_SUITS, SUIT_GLYPH } from '../../data/types';
import {
  defOf,
  drawFromDeck,
  effectiveSuit,
  giveCards,
  inPlay,
  kindOf,
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
import { afterDrawFrames, drawsFromDiscard, onCardTakenFrames } from '../hooks';
import { nextInt } from '../rng';
import type { Choice, Frame, GameState, PlayerId } from '../types';
import { eul, ga } from '../josa';

export function resolveDrawCards(
  state: GameState,
  frame: Frame & { k: 'drawCards' },
): GameState {
  let cur = popFrame(state);
  const p = playerOf(cur, frame.pid);
  if (!inPlay(p) || frame.count <= 0) return cur;

  // 폐광: 정규 드로우는 버린 더미 맨 위부터 가져오고, 모자란 만큼만 덱에서 가져온다.
  const fromDiscard =
    frame.reason === 'drawPhase' && drawsFromDiscard(cur)
      ? cur.discard.slice(-frame.count).reverse()
      : [];
  if (fromDiscard.length > 0) {
    cur = { ...cur, discard: cur.discard.slice(0, cur.discard.length - fromDiscard.length) };
  }
  const drawn = drawFromDeck(cur, frame.count - fromDiscard.length);
  const cards = [...fromDiscard, ...drawn.cards];
  cur = giveCards(drawn.state, frame.pid, cards);
  cur = log(cur, {
    t: 'draw',
    pid: frame.pid,
    amount: cards.length,
    text:
      fromDiscard.length > 0
        ? `${ga(nameOf(cur, frame.pid))} 버린 더미에서 ${fromDiscard.length}장` +
          (drawn.cards.length ? `, 덱에서 ${drawn.cards.length}장을 가져왔다.` : '을 가져왔다.')
        : `${ga(nameOf(cur, frame.pid))} 카드 ${cards.length}장을 가져왔다.`,
  });

  // 블랙 잭처럼 뽑은 카드를 보고 반응하는 훅은 정규 드로우 단계에서만 울린다.
  if (frame.reason === 'drawPhase') {
    return pushSeq(cur, afterDrawFrames(cur, frame.pid, cards));
  }
  return cur;
}

/**
 * 헨리 블록처럼 카드를 빼앗기면 반응하는 능력. 반응이 있으면 그 반응을 먼저 쌓고
 * then(같은 카드 이동을 '반응 끝남'으로 표시한 프레임)을 그 뒤에 둔다.
 * VoS 룰 5쪽: "The card is drawn (or discarded) only after the automatic BANG! is resolved."
 */
function reactFirst(state: GameState, victim: PlayerId, taker: PlayerId, then: Frame): GameState | null {
  const reactions = onCardTakenFrames(state, victim, taker);
  return reactions.length > 0 ? pushSeq(state, [...reactions, then]) : null;
}

/** 남의 손에서 무작위로 가져온다 (엘 그링고·제시 존스·구조! 보상). */
export function resolveDrawFromPlayer(
  state: GameState,
  frame: Frame & { k: 'drawFromPlayer' },
): GameState {
  let cur = popFrame(state);
  const taker = playerOf(cur, frame.pid);
  // 헨리 블록의 뱅!에 쓰러졌으면 가져가지 않는다
  if (!inPlay(taker)) return cur;
  if (playerOf(cur, frame.from).hand.length === 0) return cur;

  // 엘 그링고 같은 자동 능력에는 헨리 블록이 반응하지 않는다 (VoS 룰 5쪽)
  if (!frame.auto && !frame.reacted) {
    const reacted = reactFirst(cur, frame.from, frame.pid, { ...frame, reacted: true });
    if (reacted) return reacted;
  }

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
    text: `${ga(nameOf(cur, frame.pid))} ${nameOf(cur, frame.from)}의 손에서 ${taken.length}장을 가져갔다.`,
  });
}

/**
 * 플린트 웨스트우드: 남의 손에서 무작위로 take 장을 먼저 가져오고, 내 카드 1장을 준다.
 * 먼저 뽑아야 방금 준 카드를 도로 뽑아 오지 않는다. 헨리 블록의 자동 뱅!은 이 프레임 앞에 쌓인다.
 */
export function resolveSwapCards(state: GameState, frame: Frame & { k: 'swapCards' }): GameState {
  let cur = popFrame(state);
  const { pid, target, card } = frame;
  // 헨리 블록의 뱅!에 쓰러졌거나 줄 카드가 손에 없으면 맞바꾸지 않는다
  if (!inPlay(playerOf(cur, pid)) || !playerOf(cur, pid).hand.includes(card)) return cur;
  if (!inPlay(playerOf(cur, target))) return cur;

  cur = updatePlayer(cur, pid, (p) => ({ ...p, hand: p.hand.filter((c) => c !== card) }));
  const taken: CardId[] = [];
  for (let i = 0; i < frame.take; i++) {
    const victim = playerOf(cur, target);
    if (victim.hand.length === 0) break;
    const rolled = nextInt(cur.rng, victim.hand.length);
    const pick = victim.hand[rolled.value];
    cur = updatePlayer({ ...cur, rng: rolled.rng }, target, (p) => ({
      ...p,
      hand: p.hand.filter((c) => c !== pick),
    }));
    taken.push(pick);
  }
  cur = giveCards(cur, pid, taken);
  cur = giveCards(cur, target, [card]);
  return log(cur, {
    t: 'flintWestwood',
    pid,
    target,
    amount: taken.length,
    text: `${ga(nameOf(cur, pid))} ${nameOf(cur, target)}에게 카드 1장을 주고 ${taken.length}장을 가져왔다.`,
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
    text: `${ga(nameOf(cur, frame.pid))} ${nameOf(cur, frame.from)}의 카드 ${cards.length}장을 챙겼다.`,
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
  // 한 장만 남았으면 고를 것이 없다. 묻지 않고 그 사람 손으로 넘긴다.
  if (revealed.length === 1) {
    return respondGeneralStore(cur, { ...frame, revealed, queue }, { c: 'card', card: revealed[0] });
  }
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
    text: `${ga(nameOf(cur, pid))} 잡화점에서 ${eul(defOf(card).nameKo)} 골랐다.`,
  });
  return replaceTop(cur, {
    ...frame,
    revealed: frame.revealed.filter((c) => c !== card),
    queue: frame.queue.slice(1),
  });
}

// ---------------------------------------------------------------------------
// 조니 키시 — 같은 이름의 다른 카드를 모두 버린다
//
// 누구 앞에 있든 버린다. 방금 내려놓은 카드 자신만 남는다.
// ---------------------------------------------------------------------------

export function resolveDiscardSameName(
  state: GameState,
  frame: Frame & { k: 'discardSameName' },
): GameState {
  let cur = popFrame(state);
  const kind = kindOf(frame.card);
  const owners: PlayerId[] = [];
  const discarded: CardId[] = [];

  for (const p of cur.players) {
    const same = p.equipment.filter((c) => c !== frame.card && kindOf(c) === kind);
    if (same.length === 0) continue;
    owners.push(p.id);
    discarded.push(...same);
    cur = updatePlayer(cur, p.id, (x) => ({
      ...x,
      equipment: x.equipment.filter((c) => !same.includes(c)),
    }));
  }
  if (discarded.length === 0) return cur;

  cur = toDiscard(cur, discarded);
  const where = owners.map((id) => nameOf(cur, id)).join('·');
  return log(cur, {
    t: 'discardSameName',
    pid: frame.pid,
    card: frame.card,
    cards: discarded,
    text: `${ga(nameOf(cur, frame.pid))} ${eul(defOf(frame.card).nameKo)} 내려놓아 ${where} 앞의 같은 카드가 버려졌다.`,
  });
}

// ---------------------------------------------------------------------------
// 강탈 · 캣 벌로우
// ---------------------------------------------------------------------------

/**
 * 고를 수 있는 손패 장수. 자기 자신에게 쓰면 0 이다: 자기 앞의 카드를 치우는 것만 된다
 * (결정 I). 자기 손패를 버리는 것은 자발적 버리기라 금지다 (기본판 FAQ Q12).
 */
function stealableHand(frame: Frame & { k: 'steal' }, hand: readonly string[]): number {
  return frame.target === frame.source ? 0 : hand.length;
}

export function resolveSteal(state: GameState, frame: Frame & { k: 'steal' }): GameState {
  if (frame.picked) {
    // 헨리 블록의 뱅!이 끝났다. 그 사이 쓰러졌거나 카드가 이미 떠났으면 아무 일도 없다
    const { card, fromEquipment } = frame.picked;
    const cur = popFrame(state);
    const victim = playerOf(cur, frame.target);
    const still = fromEquipment ? victim.equipment.includes(card) : victim.hand.includes(card);
    if (!inPlay(playerOf(cur, frame.source)) || !still) return cur;
    return moveStolen(cur, frame, card, fromEquipment);
  }
  const t = playerOf(state, frame.target);
  const handCount = stealableHand(frame, t.hand);
  if (!inPlay(t) || (handCount === 0 && t.equipment.length === 0)) {
    return popFrame(state);
  }
  return {
    ...state,
    awaiting: {
      k: 'stealCard',
      pid: frame.source,
      target: frame.target,
      mode: frame.mode,
      handCount,
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
  const hand = t.hand.slice(0, stealableHand(frame, t.hand));
  let rng = state.rng;
  // 손패는 무작위 1장이다 ("a random card from his hand", 기본판 룰). 손패 순서는 받은 순서라
  // 고른 번호를 그대로 쓰면 공개된 경로로 들어온 카드를 노릴 수 있다. 번호는 '손패 쪽'이라는 뜻만 쓴다.
  // 사카가웨이로 손패가 펼쳐져 있어도 마찬가지다 (와일드 웨스트 쇼 FAQ Q17).
  const randomFromHand = (): string | null => {
    if (hand.length === 0) return null;
    const rolled = nextInt(rng, hand.length);
    rng = rolled.rng;
    return hand[rolled.value];
  };
  let card: string | null = null;
  let fromEquipment = false;

  if (choice.c === 'pick') {
    if (choice.pick.zone === 'hand') {
      card = randomFromHand();
    } else if (t.equipment.includes(choice.pick.card)) {
      card = choice.pick.card;
      fromEquipment = true;
    }
  }
  if (!card) {
    card = randomFromHand() ?? t.equipment[0] ?? null;
    fromEquipment = !hand.length && Boolean(card);
  }
  const cur = popFrame({ ...state, rng });
  if (!card) return cur;
  // 헨리 블록: 내 카드를 가져가거나 버리게 한 사람은 뱅!의 표적이 된다. 카드는 그 뱅! 뒤에 옮긴다
  const reacted = reactFirst(cur, frame.target, frame.source, { ...frame, picked: { card, fromEquipment } });
  if (reacted) return reacted;
  return moveStolen(cur, frame, card, fromEquipment);
}

function moveStolen(
  state: GameState,
  frame: Frame & { k: 'steal' },
  picked: CardId,
  fromEquipment: boolean,
): GameState {
  let cur = updatePlayer(state, frame.target, (p) =>
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
      // 장비는 원래 앞면이라 공개해도 된다. 손패에서 뽑은 카드는 남긴다면 정보가 샌다.
      // 가져간 사람과 빼앗긴 사람은 무슨 카드인지 안다
      ...(fromEquipment
        ? { card: picked }
        : {
            secret: {
              to: [frame.source, frame.target],
              card: picked,
              text: `${ga(nameOf(cur, frame.source))} ${nameOf(cur, frame.target)}의 "${defOf(picked).nameKo}"${eul(defOf(picked).nameKo).slice(-1)} 강탈했다.`,
            },
          }),
      text: `${ga(nameOf(cur, frame.source))} ${nameOf(cur, frame.target)}의 ${fromEquipment ? eul(defOf(picked).nameKo) : '카드를'} 강탈했다.`,
    });
  }
  cur = toDiscard(cur, [picked]);
  return log(cur, {
    t: 'catBalou',
    pid: frame.source,
    target: frame.target,
    // 버린 카드는 버린 더미에 앞면으로 놓이므로 손패에서 뽑았어도 이름을 밝힌다
    card: picked,
    ...(fromEquipment ? {} : { fromHand: true }),
    text: `${ga(nameOf(cur, frame.source))} ${nameOf(cur, frame.target)}의 ${fromEquipment ? eul(defOf(picked).nameKo) : `"${defOf(picked).nameKo}"${eul(defOf(picked).nameKo).slice(-1)}`} 버리게 했다.`,
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
      text: `${ga(nameOf(cur, frame.pid))} 버린 더미에서 ${eul(defOf(card).nameKo)} 가져왔다.`,
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
    reveal: { suit, hit: bonus },
    text: `${nameOf(cur, frame.pid)}의 두 번째 카드 공개 ${SUIT_GLYPH[suit]} ${bonus ? '— 한 장 더!' : '— 그대로'}`,
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
