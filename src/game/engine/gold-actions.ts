/**
 * 골드 러시 액션: 열거(legal 이 부른다)와 적용(reducer 가 부른다), 그리고 두 프레임.
 *
 * 액션은 전부 카드 사용 단계에서만 나온다. 배낭만 예외로, 목숨이 0 이하가 되어
 * 맥주를 물을 때도 쓸 수 있다 (goldDyingActions).
 */

import { goldDefOf } from '../data/cards.goldrush';
import type { CardId, GoldCardId } from '../data/types';
import {
  alivePlayers,
  drawFromDeck,
  giveCards,
  kindOf,
  log,
  nameOf,
  playerOf,
  popFrame,
  pushSeq,
  replaceTop,
  seatedPlayers,
  toDiscard,
  updatePlayer,
} from './cards';
import { canReachWithBang } from './distance';
import {
  GOLD_ABILITY,
  addNuggets,
  discardGold,
  drawGold,
  goldEquipOf,
  hasGoldKind,
  nuggetsOf,
  takeFromShop,
  takeGoldEquip,
} from './gold';
import { applyGoldCard, goldCostOf, goldUseOptions, isGoldUseValid } from './gold-cards';
import { canPlayCard, goldAbilitiesOf, goldDiscountOf, onBeerPlayedFrames } from './hooks';
import type { Action, Choice, Frame, GameState, PlayerId } from './types';
import { eul, ga } from './josa';

type GoldAction = Extract<
  Action,
  { type: 'buyGold' } | { type: 'removeGold' } | { type: 'beerForGold' } | { type: 'goldAbility' }
>;

export function isGoldAction(action: Action): action is GoldAction {
  return (
    action.type === 'buyGold' ||
    action.type === 'removeGold' ||
    action.type === 'beerForGold' ||
    action.type === 'goldAbility'
  );
}

function usedCount(state: GameState, pid: PlayerId, key: string): number {
  return playerOf(state, pid).usedThisTurn.filter((k) => k === key).length;
}

function markUsed(state: GameState, pid: PlayerId, key: string): GameState {
  return updatePlayer(state, pid, (p) => ({ ...p, usedThisTurn: [...p.usedThisTurn, key] }));
}

/** 이번 구매에 실제로 내는 값 (프리티 루제나 할인 반영) */
export function buyPriceOf(state: GameState, pid: PlayerId, card: GoldCardId): number {
  const discount = goldDiscountOf(state, pid)?.amount ?? 0;
  return Math.max(0, goldCostOf(card) - discount);
}

// ---------------------------------------------------------------------------
// 열거
// ---------------------------------------------------------------------------

/** 카드 사용 단계에서 낼 수 있는 골드 러시 액션 */
export function goldPlayActions(state: GameState, pid: PlayerId): Action[] {
  if (!state.gold) return [];
  const me = playerOf(state, pid);
  const gold = nuggetsOf(me);
  const out: Action[] = [];

  // 사기
  for (const card of state.gold.shop) {
    if (buyPriceOf(state, pid, card) > gold) continue;
    const def = goldDefOf(card);
    if (def.category === 'black') {
      if (!hasGoldKind(state, pid, def.kind)) out.push({ type: 'buyGold', pid, card });
      continue;
    }
    for (const use of goldUseOptions(state, pid, card)) {
      out.push(
        use.as || use.target ? { type: 'buyGold', pid, card, use } : { type: 'buyGold', pid, card },
      );
    }
  }

  // 남의 장비 치우기 (값 + 1)
  for (const t of seatedPlayers(state)) {
    if (t.id === pid) continue;
    for (const card of goldEquipOf(t)) {
      if (goldCostOf(card) + 1 <= gold) out.push({ type: 'removeGold', pid, target: t.id, card });
    }
  }

  // 맥주 → 금덩이
  for (const card of new Set(me.hand)) {
    if (kindOf(card) === 'beer' && canPlayCard(state, pid, 'beer', card, false)) {
      out.push({ type: 'beerForGold', pid, card });
    }
  }

  // 금덩이 능력
  for (const ab of goldAbilitiesOf(state, pid)) {
    if (gold < ab.cost) continue;
    if (ab.perTurn !== undefined && usedCount(state, pid, ab.key) >= ab.perTurn) continue;
    if (ab.key === GOLD_ABILITY.rucksack && (me.hp >= me.maxHp || me.ghost)) continue;
    if (ab.key === GOLD_ABILITY.joshMcCloud) {
      const g = state.gold;
      if (g.deck.length === 0 && g.discard.length === 0) continue;
    }
    if (ab.target === 'bang') {
      for (const t of alivePlayers(state)) {
        if (t.id !== pid && canReachWithBang(state, pid, t.id)) {
          out.push({ type: 'goldAbility', pid, ability: ab.key, target: t.id });
        }
      }
      continue;
    }
    out.push({ type: 'goldAbility', pid, ability: ab.key });
  }
  return out;
}

/** 목숨이 0 이하가 되어 맥주를 물을 때 쓸 수 있는 골드 능력 (배낭) */
export function goldDyingActions(state: GameState, pid: PlayerId): Action[] {
  const a = state.awaiting;
  if (!state.gold || !a || a.k !== 'beerToSurvive' || a.pid !== pid) return [];
  const gold = nuggetsOf(playerOf(state, pid));
  return goldAbilitiesOf(state, pid)
    .filter((ab) => ab.whenDying && gold >= ab.cost)
    .map((ab) => ({ type: 'goldAbility' as const, pid, ability: ab.key }));
}

// ---------------------------------------------------------------------------
// 적용
// ---------------------------------------------------------------------------

export function applyGoldAction(state: GameState, action: GoldAction): GameState {
  const pid = action.pid;
  switch (action.type) {
    case 'buyGold': {
      const def = goldDefOf(action.card);
      const discount = goldDiscountOf(state, pid);
      const price = buyPriceOf(state, pid, action.card);
      let cur = addNuggets(state, pid, -price);
      if (discount && price < def.cost) cur = markUsed(cur, pid, discount.key);
      cur = takeFromShop(cur, action.card);
      cur = log(cur, {
        t: 'buyGold',
        pid,
        gold: action.card,
        amount: price,
        text: `${ga(nameOf(cur, pid))} 금덩이 ${price}개로 ${eul(def.nameKo)} 샀다.`,
      });
      const use = action.use ?? {};
      if (def.category === 'brown' && !isGoldUseValid(cur, pid, action.card, use)) {
        return discardGold(cur, [action.card]);
      }
      return applyGoldCard(cur, pid, action.card, use);
    }
    case 'removeGold': {
      const def = goldDefOf(action.card);
      const price = def.cost + 1;
      let cur = addNuggets(state, pid, -price);
      cur = takeGoldEquip(cur, action.target, action.card);
      cur = discardGold(cur, [action.card]);
      return log(cur, {
        t: 'removeGold',
        pid,
        target: action.target,
        gold: action.card,
        amount: price,
        text: `${ga(nameOf(cur, pid))} 금덩이 ${price}개를 내고 ${nameOf(cur, action.target)}의 ${eul(def.nameKo)} 버리게 했다.`,
      });
    }
    case 'beerForGold': {
      let cur = updatePlayer(state, pid, (p) => ({
        ...p,
        hand: p.hand.filter((c) => c !== action.card),
      }));
      cur = toDiscard(cur, [action.card]);
      cur = addNuggets(cur, pid, 1);
      cur = log(cur, {
        t: 'beerForGold',
        pid,
        card: action.card,
        text: `${ga(nameOf(cur, pid))} 맥주를 금덩이 1개로 바꿨다.`,
      });
      return pushSeq(cur, onBeerPlayedFrames(cur, pid));
    }
    case 'goldAbility':
      return applyGoldAbility(state, pid, action.ability, action.target);
  }
}

function applyGoldAbility(
  state: GameState,
  pid: PlayerId,
  key: string,
  target: PlayerId | undefined,
): GameState {
  const ab = goldAbilitiesOf(state, pid).find((x) => x.key === key);
  if (!ab) return state;
  let cur = addNuggets(state, pid, -ab.cost);
  cur = markUsed(cur, pid, key);
  cur = log(cur, {
    t: 'goldAbility',
    pid,
    target,
    amount: ab.cost,
    text:
      `${ga(nameOf(cur, pid))} 금덩이 ${ab.cost}개를 내고 ${ab.label}` +
      (target ? ` → ${nameOf(cur, target)}.` : '.'),
  });

  switch (key) {
    case GOLD_ABILITY.jackyMurieta:
      if (!target) return cur;
      return pushSeq(cur, [
        { k: 'bang', source: pid, target, missesRequired: 1, cause: 'bang', dodgeChecked: false },
      ]);
    case GOLD_ABILITY.joshMcCloud:
      return joshDraw(cur, pid);
    case GOLD_ABILITY.raddieSnake:
    case GOLD_ABILITY.goldPan:
      return pushSeq(cur, [{ k: 'drawCards', pid, count: 1, reason: key }]);
    case GOLD_ABILITY.rucksack:
      return pushSeq(cur, [{ k: 'heal', pid, amount: 1 }]);
    default:
      return cur;
  }
}

/** 조시 맥클라우드: 장비 덱 맨 위를 가져와 곧바로 쓴다 */
function joshDraw(state: GameState, pid: PlayerId): GameState {
  const drawn = drawGold(state);
  let cur = drawn.state;
  const card = drawn.card;
  if (!card) return cur;
  const def = goldDefOf(card);
  cur = log(cur, {
    t: 'joshDraw',
    pid,
    gold: card,
    text: `장비 덱에서 ${eul(def.nameKo)} 가져왔다.`,
  });
  if (def.category === 'black') return applyGoldCard(cur, pid, card, {});

  const options = goldUseOptions(cur, pid, card);
  if (options.length === 0) return discardGold(cur, [card]);
  if (options.length === 1) return applyGoldCard(cur, pid, card, options[0]);
  return pushSeq(cur, [{ k: 'goldUse', pid, card }]);
}

// ---------------------------------------------------------------------------
// 프레임
// ---------------------------------------------------------------------------

export function resolveGoldUse(state: GameState, frame: Frame & { k: 'goldUse' }): GameState {
  const options = goldUseOptions(state, frame.pid, frame.card);
  if (options.length === 0) return discardGold(popFrame(state), [frame.card]);
  return { ...state, awaiting: { k: 'goldUse', pid: frame.pid, card: frame.card, options } };
}

export function respondGoldUse(
  state: GameState,
  frame: Frame & { k: 'goldUse' },
  choice: Choice,
): GameState {
  const cur = popFrame(state);
  const options = goldUseOptions(cur, frame.pid, frame.card);
  if (options.length === 0) return discardGold(cur, [frame.card]);
  const use =
    choice.c === 'goldUse' && isGoldUseValid(cur, frame.pid, frame.card, choice.use)
      ? choice.use
      : options[0];
  return applyGoldCard(cur, frame.pid, frame.card, use);
}

/** 더치 윌: count 장을 뽑아(처음 한 번) 그중 1장을 버리고 금덩이 1개 */
export function resolveDutchWill(state: GameState, frame: Frame & { k: 'dutchWill' }): GameState {
  if (frame.candidates.length === 0) {
    const drawn = drawFromDeck(state, frame.count ?? 2);
    let cur = giveCards(drawn.state, frame.pid, drawn.cards);
    if (drawn.cards.length < 2) {
      // 덱이 바닥나 한 장 이하만 왔다. 버릴 것 없이 금덩이만 받는다.
      return gainDutchNugget(popFrame(cur), frame.pid);
    }
    cur = replaceTop(cur, { ...frame, candidates: drawn.cards });
    return { ...cur, awaiting: { k: 'dutchWill', pid: frame.pid, options: drawn.cards } };
  }
  return { ...state, awaiting: { k: 'dutchWill', pid: frame.pid, options: frame.candidates } };
}

export function respondDutchWill(
  state: GameState,
  frame: Frame & { k: 'dutchWill' },
  choice: Choice,
): GameState {
  const hand = playerOf(state, frame.pid).hand;
  const pick: CardId | undefined =
    choice.c === 'card' && frame.candidates.includes(choice.card) && hand.includes(choice.card)
      ? choice.card
      : frame.candidates.find((c) => hand.includes(c));
  let cur = popFrame(state);
  if (pick) {
    cur = updatePlayer(cur, frame.pid, (p) => ({ ...p, hand: p.hand.filter((c) => c !== pick) }));
    cur = toDiscard(cur, [pick]);
  }
  return gainDutchNugget(cur, frame.pid);
}

function gainDutchNugget(state: GameState, pid: PlayerId): GameState {
  const cur = addNuggets(state, pid, 1);
  return log(cur, {
    t: 'dutchWill',
    pid,
    text: `${ga(nameOf(cur, pid))} 카드 1장을 버리고 금덩이 1개를 받았다.`,
  });
}

/** 금덩이를 받는다 (시미언 피코스·부적). 더미에서 받으므로 누구에게서 빼앗지 않는다 */
export function resolveGainNuggets(
  state: GameState,
  frame: Frame & { k: 'gainNuggets' },
): GameState {
  const cur = popFrame(state);
  const p = playerOf(cur, frame.pid);
  if ((!p.alive && !p.ghost) || frame.amount <= 0) return cur;
  return log(addNuggets(cur, frame.pid, frame.amount), {
    t: 'nugget',
    pid: frame.pid,
    amount: frame.amount,
    text: `${ga(nameOf(cur, frame.pid))} 금덩이 ${frame.amount}개를 받았다.`,
  });
}
