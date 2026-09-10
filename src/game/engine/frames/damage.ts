/**
 * 피해 · 죽음 회피 · 탈락.
 *
 * 탈락은 연쇄를 만든다. 다이너마이트 한 방으로 여러 명이 죽고, 그 탈락이
 * 벌쳐 샘의 카드 회수를 부르고, 회수한 카드가 또 다른 판정을 만든다.
 * 그래서 전 과정을 프레임으로 쪼개 재진입에 견디게 한다.
 *
 * 탈락 처리 순서는 docs/edge-cases.md 쟁점 K 에서 고정했다:
 *   벌쳐 샘 회수 → 현상금 → 보안관 벌칙 → 승리 판정
 */

import { BOUNTY_CARDS } from '../../data/roles';
import {
  alivePlayers,
  inPlay,
  log,
  playerOf,
  popFrame,
  pushSeq,
  toDiscard,
  updatePlayer,
} from '../cards';
import { anytimeAbilitiesOf, canPlayCard, onDamagedFrames, onEliminatedFrames } from '../hooks';
import { kindOf } from '../cards';
import type { Choice, Frame, GameState } from '../types';

export function resolveDamage(state: GameState, frame: Frame & { k: 'damage' }): GameState {
  let cur = popFrame(state);
  const p = playerOf(cur, frame.target);
  if (!p.alive && !p.ghost) return cur;

  if (p.ghost) {
    // 유령에게는 목숨이 없다. 피해도 회복도 적용되지 않는다.
    return log(cur, {
      t: 'ghostImmune',
      target: p.id,
      text: `${p.name}은(는) 유령이라 피해를 받지 않는다.`,
    });
  }

  // 0 에서 자르지 않는다. 다이너마이트로 -2 가 되면 살아나는 데 맥주가 3장 필요하고,
  // 여기서 잘라 버리면 그 계산이 무너진다. (원본 맵 v0.36 패치노트)
  const hp = p.hp - frame.amount;
  cur = updatePlayer(cur, p.id, (x) => ({ ...x, hp }));
  cur = log(cur, {
    t: 'damage',
    pid: frame.source ?? undefined,
    target: p.id,
    amount: frame.amount,
    text: `${p.name}이(가) 목숨 ${frame.amount}을(를) 잃었다 (남은 목숨 ${Math.max(0, hp)}).`,
  });

  // 능력이 먼저 울린다. 바트 캐시디가 뽑은 카드에 맥주가 있을 수 있기 때문이다.
  const frames: Frame[] = onDamagedFrames(cur, p.id, frame.amount, frame.source);
  if (hp <= 0) {
    frames.push({ k: 'checkDeath', target: p.id, source: frame.credit ?? frame.source ?? null });
  }
  return pushSeq(cur, frames);
}

export function resolveHeal(state: GameState, frame: Frame & { k: 'heal' }): GameState {
  const cur = popFrame(state);
  const p = playerOf(cur, frame.pid);
  // 유령은 회복되지 않는다. (docs/edge-cases.md 쟁점 E)
  if (!p.alive || p.ghost) return cur;

  const hp = Math.min(p.maxHp, p.hp + frame.amount);
  if (hp === p.hp) return cur;
  return log(updatePlayer(cur, p.id, (x) => ({ ...x, hp })), {
    t: 'heal',
    target: p.id,
    amount: hp - p.hp,
    text: `${p.name}이(가) 목숨을 회복했다 (${hp}).`,
  });
}

export function resolveSaloon(state: GameState, frame: Frame & { k: 'saloon' }): GameState {
  const cur = popFrame(state);
  return pushSeq(
    cur,
    frame.queue.map((pid): Frame => ({ k: 'heal', pid, amount: 1 })),
  );
}

/**
 * 목숨이 0 이하가 된 순간. 맥주를 내서 살아날 기회를 준다.
 *
 * 생존자가 2명뿐이면 맥주로 살아날 수 없다 (원작 룰 + 원본 맵 v0.30/v0.42).
 * 유령은 애초에 죽지 않는다.
 */
export function resolveCheckDeath(
  state: GameState,
  frame: Frame & { k: 'checkDeath' },
): GameState {
  const p = playerOf(state, frame.target);
  if (!p.alive || p.ghost) return popFrame(state);
  if (p.hp > 0) return popFrame(state);

  const survivors = alivePlayers(state).length;
  const needed = 1 - p.hp;
  const beers = survivors > 2 ? survivableBeers(state, frame.target) : [];
  // 시드 케첨은 맥주 카드가 아니므로 목사 중에도, 맥주가 모자라도 살아날 길이 된다.
  const canUseAbility = anytimeAbilitiesOf(state, frame.target).length > 0 && p.hand.length >= 2;

  // 살아날 가능성이 없으면 물어보지 않는다.
  if (beers.length < needed && !canUseAbility) {
    return pushSeq(popFrame(state), [
      { k: 'eliminate', target: frame.target, killer: frame.source },
    ]);
  }
  return {
    ...state,
    awaiting: {
      k: 'beerToSurvive',
      pid: frame.target,
      needed,
      options: beers,
    },
  };
}

/** 지금 쓸 수 있는 맥주 카드. 목사가 걸려 있으면 하나도 못 쓴다. */
function survivableBeers(state: GameState, pid: string): string[] {
  return playerOf(state, pid).hand.filter(
    (c) => kindOf(c) === 'beer' && canPlayCard(state, pid, 'beer', c),
  );
}

export function respondCheckDeath(
  state: GameState,
  frame: Frame & { k: 'checkDeath' },
  choice: Choice,
): GameState {
  const p = playerOf(state, frame.target);

  if (choice.c !== 'card') {
    return pushSeq(popFrame(state), [
      { k: 'eliminate', target: frame.target, killer: frame.source },
    ]);
  }
  const card = choice.card;
  let cur = updatePlayer(state, p.id, (x) => ({
    ...x,
    hand: x.hand.filter((c) => c !== card),
    hp: x.hp + 1,
  }));
  cur = toDiscard(cur, [card]);
  cur = log(cur, {
    t: 'beerSurvive',
    pid: p.id,
    card,
    text: `${p.name}이(가) 맥주를 마시고 버텼다.`,
  });
  // 프레임은 그대로 둔다. 아직 목숨이 0 이하면 다시 물어본다.
  return cur;
}

export function resolveEliminate(
  state: GameState,
  frame: Frame & { k: 'eliminate' },
): GameState {
  let cur = popFrame(state);
  const p = playerOf(cur, frame.target);
  if (!p.alive) return cur;

  cur = updatePlayer(cur, p.id, (x) => ({
    ...x,
    alive: false,
    ghost: false,
    hp: 0,
    roleRevealed: true,
  }));
  cur = log(cur, {
    t: 'eliminate',
    target: p.id,
    pid: frame.killer ?? undefined,
    text: `${p.name}이(가) 게임에서 제거되었다. 역할은 ${p.role}.`,
  });

  return pushSeq(cur, [
    ...onEliminatedFrames(cur, p.id),
    { k: 'eliminateCleanup', target: p.id },
    { k: 'bountyOrPenalty', killer: frame.killer, victim: p.id },
    { k: 'checkWin' },
  ]);
}

/** 벌쳐 샘이 가져가고 남은 카드는 전부 버린다. */
export function resolveEliminateCleanup(
  state: GameState,
  frame: Frame & { k: 'eliminateCleanup' },
): GameState {
  let cur = popFrame(state);
  const p = playerOf(cur, frame.target);
  const cards = [...p.hand, ...p.equipment];
  if (cards.length === 0) return cur;

  cur = updatePlayer(cur, p.id, (x) => ({ ...x, hand: [], equipment: [] }));
  return toDiscard(cur, cards);
}

/**
 * 현상금과 벌칙.
 * - 무법자를 처치하면 카드 3장 (보안관도 받는다, 원본 맵 v0.141)
 * - 보안관이 부관을 처치하면 손패와 장비를 전부 버린다
 */
export function resolveBountyOrPenalty(
  state: GameState,
  frame: Frame & { k: 'bountyOrPenalty' },
): GameState {
  let cur = popFrame(state);
  const victim = playerOf(cur, frame.victim);
  if (!frame.killer || frame.killer === frame.victim) return cur;

  const killer = playerOf(cur, frame.killer);
  if (!killer.alive) return cur;

  if (victim.role === 'outlaw') {
    cur = log(cur, {
      t: 'bounty',
      pid: killer.id,
      text: `${killer.name}이(가) 무법자를 처치해 현상금 ${BOUNTY_CARDS}장을 받는다.`,
    });
    return pushSeq(cur, [
      { k: 'drawCards', pid: killer.id, count: BOUNTY_CARDS, reason: 'bounty' },
    ]);
  }

  if (victim.role === 'deputy' && killer.role === 'sheriff') {
    const cards = [...killer.hand, ...killer.equipment];
    cur = updatePlayer(cur, killer.id, (x) => ({ ...x, hand: [], equipment: [] }));
    cur = toDiscard(cur, cards);
    return log(cur, {
      t: 'penalty',
      pid: killer.id,
      text: `보안관이 부관을 쏘았다. ${killer.name}은(는) 손패와 장비를 전부 잃는다.`,
    });
  }
  return cur;
}
