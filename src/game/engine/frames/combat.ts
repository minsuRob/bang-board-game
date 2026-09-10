/**
 * 공격 체인: 뱅! · 기관총 · 인디언! · 결투.
 *
 * 뱅! 한 장이 만드는 실제 흐름:
 *   뱅! → (술통·주르도네 판정) → 빗나감 N장 요구 → 미제출 시 피해 1
 *       → 바트 캐시디 / 엘 그링고 → 목숨 0 → 생존맥주 → 탈락 → 벌쳐 샘 → 현상금
 *
 * 이걸 if 문으로 짜면 무너진다. 각 단계가 독립된 프레임이고, 프레임은 자기
 * 진행 상태(남은 빗나감 장수, 남은 대상 큐)를 직접 들고 있다.
 */

import {
  inPlay,
  kindOf,
  log,
  nameOf,
  playerOf,
  popFrame,
  pushSeq,
  replaceTop,
  toDiscard,
  updatePlayer,
} from '../cards';
import { onTargetedByBangFrames, playableAs } from '../hooks';
import type { Choice, Frame, GameState, PlayerId } from '../types';

/**
 * 손에서 카드 한 장을 버린 더미로 보낸다.
 *
 * 손에 없는 카드는 그냥 무시한다. 없는 카드를 버린 더미에 넣으면 카드가 복제된다.
 */
function discardFromHand(state: GameState, pid: PlayerId, card: string): GameState {
  if (!playerOf(state, pid).hand.includes(card)) return state;
  const cur = updatePlayer(state, pid, (p) => ({
    ...p,
    hand: p.hand.filter((c) => c !== card),
  }));
  return toDiscard(cur, [card]);
}

// ---------------------------------------------------------------------------
// 뱅! (기관총의 개별 발사도 이 프레임을 쓴다)
// ---------------------------------------------------------------------------

export function resolveBang(state: GameState, frame: Frame & { k: 'bang' }): GameState {
  const t = playerOf(state, frame.target);
  if (!inPlay(t)) return popFrame(state);
  if (t.ghost) {
    return log(popFrame(state), {
      t: 'ghostImmune',
      target: t.id,
      text: `${t.name}은(는) 유령이라 총알이 통하지 않는다.`,
    });
  }

  // 술통과 주르도네 판정은 빗나감을 요구하기 전에 딱 한 번 돌린다.
  if (!frame.dodgeChecked) {
    const dodges = onTargetedByBangFrames(state, frame.target, frame.source);
    return pushSeq(replaceTop(state, { ...frame, dodgeChecked: true }), dodges);
  }

  if (frame.missesRequired <= 0) {
    return log(popFrame(state), {
      t: 'missed',
      target: t.id,
      text: `${t.name}이(가) 총알을 피했다.`,
    });
  }

  const options = playableAs(state, frame.target, 'missed', true);
  if (options.length === 0) {
    return pushSeq(popFrame(state), [
      {
        k: 'damage',
        target: frame.target,
        amount: 1,
        source: frame.source,
        credit: frame.source,
        cause: frame.cause,
      },
    ]);
  }

  return {
    ...state,
    awaiting: {
      k: 'missed',
      pid: frame.target,
      source: frame.source,
      remaining: frame.missesRequired,
      options,
    },
  };
}

export function respondBang(
  state: GameState,
  frame: Frame & { k: 'bang' },
  choice: Choice,
): GameState {
  if (choice.c !== 'card') {
    return pushSeq(popFrame(state), [
      {
        k: 'damage',
        target: frame.target,
        amount: 1,
        source: frame.source,
        credit: frame.source,
        cause: frame.cause,
      },
    ]);
  }

  let cur = discardFromHand(state, frame.target, choice.card);
  cur = log(cur, {
    t: 'playMissed',
    pid: frame.target,
    card: choice.card,
    text: `${nameOf(cur, frame.target)}이(가) 빗나감!을 냈다.`,
  });
  return replaceTop(cur, { ...frame, missesRequired: frame.missesRequired - 1 });
}

// ---------------------------------------------------------------------------
// 기관총 — 자신을 제외한 전원에게 뱅!
//
// 뱅! '효과'이지 뱅! '카드'가 아니다. 그래서 슬랩의 2장 요구를 받지 않고,
// 차례당 뱅! 횟수도 소비하지 않는다. 술통과 주르도네는 정상 작동한다.
// ---------------------------------------------------------------------------

export function resolveGatling(state: GameState, frame: Frame & { k: 'gatling' }): GameState {
  const queue = frame.queue.filter((id) => playerOf(state, id).alive);
  if (queue.length === 0) return popFrame(state);

  const target = queue[0];
  return pushSeq(replaceTop(state, { ...frame, queue: queue.slice(1) }), [
    {
      k: 'bang',
      source: frame.source,
      target,
      missesRequired: 1,
      cause: 'gatling',
      dodgeChecked: false,
    },
  ]);
}

// ---------------------------------------------------------------------------
// 인디언! — 전원이 뱅!을 버리거나 목숨 1을 잃는다
//
// 빗나감!이 아니라 뱅!을 요구한다. 술통은 통하지 않는다.
// ---------------------------------------------------------------------------

export function resolveIndians(state: GameState, frame: Frame & { k: 'indians' }): GameState {
  const queue = frame.queue.filter((id) => playerOf(state, id).alive);
  if (queue.length === 0) return popFrame(state);

  const pid = queue[0];
  const options = playableAs(state, pid, 'bang', true);
  const advanced = replaceTop(state, { ...frame, queue });

  if (options.length === 0) {
    return pushSeq(replaceTop(advanced, { ...frame, queue: queue.slice(1) }), [
      {
        k: 'damage',
        target: pid,
        amount: 1,
        source: frame.source,
        credit: frame.source,
        cause: 'indians',
      },
    ]);
  }
  return {
    ...advanced,
    awaiting: { k: 'indiansBang', pid, source: frame.source, options },
  };
}

export function respondIndians(
  state: GameState,
  frame: Frame & { k: 'indians' },
  choice: Choice,
): GameState {
  const pid = frame.queue[0];
  const rest = frame.queue.slice(1);

  if (choice.c !== 'card') {
    return pushSeq(replaceTop(state, { ...frame, queue: rest }), [
      {
        k: 'damage',
        target: pid,
        amount: 1,
        source: frame.source,
        credit: frame.source,
        cause: 'indians',
      },
    ]);
  }
  let cur = discardFromHand(state, pid, choice.card);
  cur = log(cur, {
    t: 'indiansBang',
    pid,
    card: choice.card,
    text: `${nameOf(cur, pid)}이(가) 뱅!을 버려 인디언을 물리쳤다.`,
  });
  return replaceTop(cur, { ...frame, queue: rest });
}

// ---------------------------------------------------------------------------
// 결투 — 지목당한 쪽부터 번갈아 뱅!을 버린다
//
// 먼저 내지 못하는 쪽이 목숨 1을 잃는다. 자기가 신청한 결투에서 진 경우
// 엘 그링고의 반격은 발동하지 않는다 (docs/edge-cases.md 쟁점 A).
// ---------------------------------------------------------------------------

export function resolveDuel(state: GameState, frame: Frame & { k: 'duel' }): GameState {
  const cur = playerOf(state, frame.toPlay);
  const opponent = frame.toPlay === frame.a ? frame.b : frame.a;

  // 유령도 결투에 참가한다. 지더라도 목숨을 잃지 않을 뿐이고, 그 면역은
  // damage 프레임이 처리한다. 여기서 통째로 빼면 결투가 흔적 없이 증발한다.
  if (!inPlay(cur)) return popFrame(state);

  const options = playableAs(state, frame.toPlay, 'bang', true);
  if (options.length === 0) return duelLoss(state, frame, frame.toPlay);

  return {
    ...state,
    awaiting: { k: 'duelBang', pid: frame.toPlay, opponent, options },
  };
}

export function respondDuel(
  state: GameState,
  frame: Frame & { k: 'duel' },
  choice: Choice,
): GameState {
  if (choice.c !== 'card') return duelLoss(state, frame, frame.toPlay);

  let cur = discardFromHand(state, frame.toPlay, choice.card);
  cur = log(cur, {
    t: 'duelBang',
    pid: frame.toPlay,
    card: choice.card,
    text: `${nameOf(cur, frame.toPlay)}이(가) 결투에서 뱅!을 냈다.`,
  });
  const next = frame.toPlay === frame.a ? frame.b : frame.a;
  return replaceTop(cur, { ...frame, toPlay: next });
}

function duelLoss(
  state: GameState,
  frame: Frame & { k: 'duel' },
  loser: PlayerId,
): GameState {
  const winner = loser === frame.a ? frame.b : frame.a;
  // 결투를 신청한 쪽이 졌다면 '공격당한 것'이 아니므로 반격 능력은 발동하지 않는다.
  const source = loser === frame.a ? null : winner;

  const cur = log(popFrame(state), {
    t: 'duelLoss',
    pid: winner,
    target: loser,
    text: `${nameOf(state, loser)}이(가) 결투에서 졌다.`,
  });
  return pushSeq(cur, [
    { k: 'damage', target: loser, amount: 1, source, credit: winner, cause: 'duel' },
  ]);
}

export { discardFromHand };
