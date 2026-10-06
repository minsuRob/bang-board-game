/**
 * 골드 러시 카드의 효과.
 *
 * 갈색은 사는(또는 조시 맥클라우드가 뽑는) 순간 쓰고 장비 버린 더미로 간다.
 * 수배만 대상 앞에 남는다. 검정은 산 사람 앞에 놓인다.
 *
 * 병·동업자는 다른 카드와 '같은 효과'일 뿐 그 카드가 아니다 (설명서 FAQ).
 * 그래서 병의 뱅!은 차례당 한 번 제한에 들지 않고, 병의 맥주는 마담 이토를 부르지 않는다.
 */

import { CARD_DEFS } from '../data/cards.base';
import { GOLD_CARD_DEFS, goldDefOf, goldKindOf } from '../data/cards.goldrush';
import type { CardKind, GoldCardId } from '../data/types';
import { alivePlayers, defOf, drawFromDeck, effectiveSuit, giveCards, log, playerOf, pushSeq, seatedPlayers, toDiscard, updatePlayer, kindOf } from './cards';
import { canReachAtRange, canReachWithBang } from './distance';
import { generalStoreQueue } from './frames/cards';
import { discardGold, giveGoldEquip, hasGoldKind } from './gold';
import { judgementCardTaker, rhumFlipCountOf } from './hooks';
import type { Frame, GameState, GoldUse, PlayerId } from './types';

function hasCards(state: GameState, pid: PlayerId): boolean {
  const p = playerOf(state, pid);
  return p.hand.length > 0 || p.equipment.length > 0;
}

/** 강탈·캣 벌로우 효과를 걸 수 있는 대상 (range 1 이면 강탈) */
function stealTargets(state: GameState, pid: PlayerId, range: number | null): PlayerId[] {
  const out: PlayerId[] = [];
  for (const t of seatedPlayers(state)) {
    if (t.id === pid) {
      if (t.equipment.length > 0) out.push(pid);
      continue;
    }
    if (!hasCards(state, t.id)) continue;
    if (range !== null && !canReachAtRange(state, pid, t.id, range)) continue;
    out.push(t.id);
  }
  return out;
}

/**
 * 이 골드 카드를 지금 쓸 수 있는 방법들.
 * 대상이 없는 카드는 [{}] 하나, 쓸 곳이 없으면 [] 다. 검정 카드는 늘 [{}].
 */
export function goldUseOptions(state: GameState, pid: PlayerId, card: GoldCardId): GoldUse[] {
  const kind = goldKindOf(card);
  const me = playerOf(state, pid);
  const others = alivePlayers(state).filter((p) => p.id !== pid);

  switch (kind) {
    case 'shot':
      return alivePlayers(state)
        .filter((p) => p.hp < p.maxHp)
        .map((p) => ({ target: p.id }));
    case 'bottle': {
      const out: GoldUse[] = [];
      for (const t of stealTargets(state, pid, 1)) out.push({ as: 'panic', target: t });
      if (me.hp < me.maxHp && !me.ghost) out.push({ as: 'beer' });
      for (const t of others) {
        if (canReachWithBang(state, pid, t.id)) out.push({ as: 'bang', target: t.id });
      }
      return out;
    }
    case 'pardner': {
      const out: GoldUse[] = [{ as: 'generalStore' }];
      for (const t of others) out.push({ as: 'duel', target: t.id });
      for (const t of stealTargets(state, pid, null)) out.push({ as: 'catBalou', target: t });
      return out;
    }
    case 'wanted':
      // "Play on any player." — 자기 앞에도 (골드 러시 FAQ Q07)
      return alivePlayers(state)
        .filter((t) => !hasGoldKind(state, t.id, 'wanted'))
        .map((t) => ({ target: t.id }));
    default:
      return [{}];
  }
}

/** 이 사용법이 지금 유효한가 */
export function isGoldUseValid(
  state: GameState,
  pid: PlayerId,
  card: GoldCardId,
  use: GoldUse,
): boolean {
  return goldUseOptions(state, pid, card).some(
    (o) => (o.as ?? '') === (use.as ?? '') && (o.target ?? '') === (use.target ?? ''),
  );
}

/**
 * 골드 카드 한 장을 쓴다. 카드는 이미 상점이나 덱에서 떼어진 상태로 들어온다.
 * 갈색은 효과를 쌓고 버린다(수배는 대상 앞에). 검정은 앞에 놓는다(같은 이름이 있으면 버린다).
 */
export function applyGoldCard(
  state: GameState,
  pid: PlayerId,
  card: GoldCardId,
  use: GoldUse,
): GameState {
  const def = goldDefOf(card);
  let cur = state;

  if (def.category === 'black') {
    if (hasGoldKind(cur, pid, def.kind)) {
      cur = discardGold(cur, [card]);
      return log(cur, {
        t: 'goldDup',
        pid,
        msg: { k: 'goldDup', who: pid, gold: def.kind },
      });
    }
    return giveGoldEquip(cur, pid, card);
  }

  const frames: Frame[] = [];
  const target = use.target;

  switch (def.kind) {
    case 'shot':
      if (target) frames.push({ k: 'heal', pid: target, amount: 1 });
      break;
    case 'bottle':
    case 'pardner':
      frames.push(...asFrames(cur, pid, use.as, target));
      if (use.as) {
        cur = log(cur, {
          t: 'goldAs',
          pid,
          as: use.as,
          target,
          msg: { k: 'goldAs', who: pid, gold: def.kind, as: use.as, ...(target ? { to: target } : {}) },
        });
      }
      break;
    case 'goldRush': {
      // 카드 사용 단계를 끝낸다. 버리기 단계는 목숨을 다 채운 뒤에 그대로 진행한다.
      cur = updatePlayer(cur, pid, (p) => (p.ghost ? p : { ...p, hp: p.maxHp }));
      cur = {
        ...cur,
        stack: cur.stack.filter((f) => !(f.k === 'playPhase' && f.pid === pid)),
        turn: { ...cur.turn, extraTurnFor: pid },
      };
      cur = log(cur, {
        t: 'goldRush',
        pid,
        msg: { k: 'goldRush', who: pid },
      });
      break;
    }
    case 'wanted':
      if (!target) return discardGold(cur, [card]);
      cur = giveGoldEquip(cur, target, card);
      return log(cur, {
        t: 'wantedPlaced',
        pid,
        target,
        msg: { k: 'wantedPlaced', to: target },
      });
    case 'rhum': {
      const drawn = drawFromDeck(cur, rhumFlipCountOf(cur, pid));
      const suits = new Set(drawn.cards.map((c) => effectiveSuit(drawn.state, c)));
      cur = log(drawn.state, {
        t: 'rhum',
        pid,
        cards: drawn.cards,
        amount: suits.size,
        msg: { k: 'rhum', count: drawn.cards.length, suits: suits.size },
      });
      // 펼친 카드도 판정 카드다. 존 페인은 손패가 찰 때까지 한 장씩 가져간다 (골드 러시 FAQ Q12)
      for (const c of drawn.cards) {
        const taker = judgementCardTaker(cur, pid);
        if (!taker) {
          cur = toDiscard(cur, [c]);
          continue;
        }
        cur = giveCards(cur, taker, [c]);
        cur = log(cur, {
          t: 'johnPain',
          pid: taker,
          card: c,
          msg: { k: 'johnPain', who: taker, card: kindOf(c) },
        });
      }
      if (suits.size > 0) frames.push({ k: 'heal', pid, amount: suits.size });
      break;
    }
    case 'unionPacific':
      frames.push({ k: 'drawCards', pid, count: 4, reason: 'unionPacific' });
      break;
    default:
      break;
  }

  cur = discardGold(cur, [card]);
  return pushSeq(cur, frames);
}

/** 병·동업자가 흉내 내는 카드의 효과 프레임 */
function asFrames(
  state: GameState,
  pid: PlayerId,
  as: CardKind | undefined,
  target: PlayerId | undefined,
): Frame[] {
  switch (as) {
    case 'panic':
      return target ? [{ k: 'steal', source: pid, target, mode: 'panic' }] : [];
    case 'catBalou':
      return target ? [{ k: 'steal', source: pid, target, mode: 'catBalou' }] : [];
    case 'beer':
      return [{ k: 'heal', pid, amount: 1 }];
    case 'bang':
      return target
        ? [{ k: 'bang', source: pid, target, missesRequired: 1, cause: 'bang', dodgeChecked: false }]
        : [];
    case 'duel':
      return target ? [{ k: 'duel', a: pid, b: target, toPlay: target }] : [];
    case 'generalStore':
      return [{ k: 'generalStore', source: pid, queue: generalStoreQueue(state, pid), revealed: [] }];
    default:
      return [];
  }
}

/** 이 카드를 사는 값 (할인 전) */
export function goldCostOf(card: GoldCardId): number {
  return GOLD_CARD_DEFS[goldKindOf(card)].cost;
}
