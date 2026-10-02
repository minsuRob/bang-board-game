/**
 * 한줌의 카드 이벤트가 만드는 프레임.
 *
 * feat/fistful-of-cards 브랜치에서 옮겼다. docs/edge-cases.md 에는 아직 한줌의 카드 절이 없다.
 */

import { RED_SUITS } from '../../data/types';
import {
  alivePlayers,
  drawFromDeck,
  effectiveSuit,
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
import { drawCountOf, drawPhaseOverride, playableAs } from '../hooks';
import type { Choice, Frame, GameState } from '../types';
import { ga, neun } from '../josa';
import { discardFromHand } from './combat';

// ---------------------------------------------------------------------------
// 한줌의 카드 — 차례 시작에 손패 장수만큼 가해자 없는 뱅!
// ---------------------------------------------------------------------------

export function resolveFistfulBangs(
  state: GameState,
  frame: Frame & { k: 'fistfulBangs' },
): GameState {
  const p = playerOf(state, frame.pid);
  if (frame.remaining <= 0 || !p.alive) return popFrame(state);
  const cur = log(replaceTop(state, { ...frame, remaining: frame.remaining - 1 }), {
    t: 'fistfulBang',
    target: frame.pid,
    amount: frame.remaining,
    text: `한줌의 카드: ${ga(nameOf(state, frame.pid))} 뱅!을 맞는다 (남은 ${frame.remaining}발).`,
  });
  return pushSeq(cur, [
    { k: 'bang', source: null, target: frame.pid, missesRequired: 1, cause: 'fistful', dodgeChecked: false },
  ]);
}

// ---------------------------------------------------------------------------
// 러시안 룰렛 — 보안관부터 빗나감!을 버린다. 처음 못 버린 사람이 목숨 2를 잃는다
// ---------------------------------------------------------------------------

export function resolveRussianRoulette(
  state: GameState,
  frame: Frame & { k: 'russianRoulette' },
): GameState {
  const queue = frame.queue.filter((id) => playerOf(state, id).alive);
  if (queue.length === 0) return popFrame(state);
  const i = frame.i % queue.length;
  const pid = queue[i];
  const options = playableAs(state, pid, 'missed', true);
  if (options.length === 0) return rouletteLoss(state, pid);
  return {
    ...replaceTop(state, { ...frame, queue, i }),
    awaiting: { k: 'russianRoulette', pid, options },
  };
}

export function respondRussianRoulette(
  state: GameState,
  frame: Frame & { k: 'russianRoulette' },
  choice: Choice,
): GameState {
  const pid = frame.queue[frame.i];
  if (choice.c !== 'card') return rouletteLoss(state, pid);
  let cur = discardFromHand(state, pid, choice.card);
  cur = log(cur, {
    t: 'russianRoulette',
    pid,
    card: choice.card,
    text: `러시안 룰렛: ${ga(nameOf(cur, pid))} 빗나감!을 버렸다.`,
  });
  return replaceTop(cur, { ...frame, i: frame.i + 1 });
}

/** 가해자가 없으므로 현상금·벌칙이 없다 (원본 맵 v0.137) */
function rouletteLoss(state: GameState, pid: string): GameState {
  const cur = log(popFrame(state), {
    t: 'russianRoulette',
    target: pid,
    text: `러시안 룰렛: ${ga(nameOf(state, pid))} 빗나감!을 버리지 못해 목숨 2를 잃는다.`,
  });
  return pushSeq(cur, [
    { k: 'damage', target: pid, amount: 2, source: null, credit: null, cause: 'russianRoulette' },
  ]);
}

// ---------------------------------------------------------------------------
// 의형제 — 차례 시작에 목숨 1을 넘겨줄 수 있다 (마지막 목숨은 안 된다)
// ---------------------------------------------------------------------------

export function resolveBloodBrothers(
  state: GameState,
  frame: Frame & { k: 'bloodBrothers' },
): GameState {
  const p = playerOf(state, frame.pid);
  if (!p.alive || p.hp <= 1) return popFrame(state);
  const targets = alivePlayers(state)
    .filter((x) => x.id !== p.id && x.hp < x.maxHp)
    .map((x) => x.id);
  if (targets.length === 0) return popFrame(state);
  return { ...state, awaiting: { k: 'bloodBrothers', pid: p.id, targets } };
}

export function respondBloodBrothers(
  state: GameState,
  frame: Frame & { k: 'bloodBrothers' },
  choice: Choice,
): GameState {
  const cur = popFrame(state);
  if (choice.c !== 'player') return cur;
  const to = choice.pid;
  const logged = log(cur, {
    t: 'bloodBrothers',
    pid: frame.pid,
    target: to,
    text: `의형제: ${ga(nameOf(cur, frame.pid))} ${nameOf(cur, to)}에게 목숨 1을 넘겼다.`,
  });
  return pushSeq(logged, [
    { k: 'damage', target: frame.pid, amount: 1, source: null, credit: null, cause: 'bloodBrothers' },
    { k: 'heal', pid: to, amount: 1 },
  ]);
}

// ---------------------------------------------------------------------------
// 독한 술 — 카드 가져오기를 건너뛰고 목숨 1 회복할 수 있다
// ---------------------------------------------------------------------------

export function resolveHardLiquor(state: GameState, frame: Frame & { k: 'hardLiquor' }): GameState {
  if (!playerOf(state, frame.pid).alive) return popFrame(state);
  return { ...state, awaiting: { k: 'hardLiquor', pid: frame.pid } };
}

export function respondHardLiquor(
  state: GameState,
  frame: Frame & { k: 'hardLiquor' },
  choice: Choice,
): GameState {
  const { pid } = frame;
  let cur = popFrame(state);
  if (choice.c === 'yes') {
    cur = log(cur, {
      t: 'hardLiquor',
      pid,
      text: `독한 술: ${neun(nameOf(cur, pid))} 카드를 가져오지 않고 목숨을 회복한다.`,
    });
    return pushSeq(cur, [{ k: 'heal', pid, amount: 1 }]);
  }
  // 거절하면 캐릭터 능력까지 포함한 평소 방식으로 가져온다.
  const count = drawCountOf(cur, pid);
  const override = drawPhaseOverride(cur, pid, count, true);
  if (override) return pushSeq(cur, override);
  return count > 0 ? pushSeq(cur, [{ k: 'drawCards', pid, count, reason: 'drawPhase' }]) : cur;
}

// ---------------------------------------------------------------------------
// 피요테 — 카드 가져오기 대신 덱 맨 위 카드의 색을 맞힌다
// ---------------------------------------------------------------------------

export function resolvePeyote(state: GameState, frame: Frame & { k: 'peyote' }): GameState {
  if (!playerOf(state, frame.pid).alive) return popFrame(state);
  return { ...state, awaiting: { k: 'peyote', pid: frame.pid } };
}

export function respondPeyote(
  state: GameState,
  frame: Frame & { k: 'peyote' },
  choice: Choice,
): GameState {
  const { pid } = frame;
  const guess = choice.c === 'color' ? choice.color : 'red';
  const drawn = drawFromDeck(state, 1);
  const card = drawn.cards[0];
  if (!card) return popFrame(drawn.state);

  const red = RED_SUITS.includes(effectiveSuit(drawn.state, card));
  const right = (guess === 'red') === red;
  const said = guess === 'red' ? '빨강' : '검정';
  if (right) {
    // 맞히면 카드를 갖고 한 번 더 맞힌다. 프레임은 그대로 남는다.
    const cur = giveCards(drawn.state, pid, [card]);
    return log(cur, {
      t: 'peyote',
      pid,
      card,
      text: `피요테: ${ga(nameOf(cur, pid))} ${said}을 맞혀 카드를 가져왔다.`,
    });
  }
  const cur = toDiscard(popFrame(drawn.state), [card]);
  return log(cur, {
    t: 'peyote',
    pid,
    card,
    text: `피요테: ${ga(nameOf(cur, pid))} ${said}을 불렀지만 틀렸다.`,
  });
}

// ---------------------------------------------------------------------------
// 목장 — 가져오기가 끝나면 한 번, 원하는 만큼 버리고 그만큼 새로 가져온다
// ---------------------------------------------------------------------------

export function resolveRanch(state: GameState, frame: Frame & { k: 'ranch' }): GameState {
  const p = playerOf(state, frame.pid);
  if (!p.alive) return popFrame(state);
  const options = p.hand.filter((c) => !frame.picked.includes(c));
  if (options.length === 0 && frame.picked.length === 0) return popFrame(state);
  return { ...state, awaiting: { k: 'ranch', pid: p.id, options, picked: frame.picked } };
}

export function respondRanch(
  state: GameState,
  frame: Frame & { k: 'ranch' },
  choice: Choice,
): GameState {
  const { pid } = frame;
  const p = playerOf(state, pid);
  if (choice.c === 'card' && p.hand.includes(choice.card) && !frame.picked.includes(choice.card)) {
    return replaceTop(state, { ...frame, picked: [...frame.picked, choice.card] });
  }
  let cur = popFrame(state);
  const picked = frame.picked.filter((c) => p.hand.includes(c));
  if (picked.length === 0) return cur;
  cur = updatePlayer(cur, pid, (x) => ({ ...x, hand: x.hand.filter((c) => !picked.includes(c)) }));
  cur = toDiscard(cur, picked);
  cur = log(cur, {
    t: 'ranch',
    pid,
    cards: picked,
    text: `목장: ${ga(nameOf(cur, pid))} ${picked.length}장을 버리고 새로 가져온다.`,
  });
  return pushSeq(cur, [{ k: 'drawCards', pid, count: picked.length, reason: 'ranch' }]);
}

// ---------------------------------------------------------------------------
// 서부의 법 — 두 번째로 가져온 카드를 보여 주고, 낼 수 있으면 차례 안에 반드시 낸다
//
// 즉시 낼 필요는 없다. 차례를 마치기 전까지만 내면 된다 (원본 맵 v0.504).
// 차례 마치기를 막는 것은 legal.ts 가 한다.
// ---------------------------------------------------------------------------

export function resolveLawOfTheWest(
  state: GameState,
  frame: Frame & { k: 'lawOfTheWest' },
): GameState {
  const cur = popFrame(state);
  const p = playerOf(cur, frame.pid);
  if (!p.alive || !p.hand.includes(frame.card)) return cur;
  return log(
    { ...cur, turn: { ...cur.turn, mustPlay: frame.card } },
    {
      t: 'lawOfTheWest',
      pid: frame.pid,
      card: frame.card,
      text: `서부의 법: ${ga(nameOf(cur, frame.pid))} 두 번째로 가져온 카드를 보여 줬다.`,
    },
  );
}

// ---------------------------------------------------------------------------
// 리코체 — 뱅!을 버려 앞에 놓인 카드 1장을 노린다. 주인이 빗나감!을 내면 지킨다
//
// 사람이 아니라 카드를 노리므로 술통은 통하지 않는다.
// ---------------------------------------------------------------------------

export function resolveRicochet(state: GameState, frame: Frame & { k: 'ricochet' }): GameState {
  const t = playerOf(state, frame.target);
  if (!inPlay(t) || !t.equipment.includes(frame.card)) return popFrame(state);
  const options = playableAs(state, t.id, 'missed', true);
  if (options.length === 0) return ricochetHit(state, frame);
  return {
    ...state,
    awaiting: { k: 'ricochet', pid: t.id, source: frame.source, card: frame.card, options },
  };
}

export function respondRicochet(
  state: GameState,
  frame: Frame & { k: 'ricochet' },
  choice: Choice,
): GameState {
  if (choice.c !== 'card') return ricochetHit(state, frame);
  const cur = discardFromHand(popFrame(state), frame.target, choice.card);
  return log(cur, {
    t: 'playMissed',
    pid: frame.target,
    card: choice.card,
    text: `${ga(nameOf(cur, frame.target))} 빗나감!으로 카드를 지켰다.`,
  });
}

function ricochetHit(state: GameState, frame: Frame & { k: 'ricochet' }): GameState {
  let cur = updatePlayer(popFrame(state), frame.target, (x) => ({
    ...x,
    equipment: x.equipment.filter((c) => c !== frame.card),
  }));
  cur = toDiscard(cur, [frame.card]);
  return log(cur, {
    t: 'ricochet',
    pid: frame.source,
    target: frame.target,
    card: frame.card,
    text: `리코체: ${nameOf(cur, frame.target)} 앞의 카드가 버려졌다.`,
  });
}
