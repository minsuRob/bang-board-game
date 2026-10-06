/**
 * 골드 러시: 금덩이와 장비 덱을 다루는 순수 헬퍼.
 *
 * 장비 덱은 플레잉 카드 덱과 완전히 따로 논다. 버린 장비는 gold.discard 로 가고,
 * 덱이 비면 그 더미를 섞어 새 덱을 만든다. 금덩이 더미는 수를 세지 않는다
 * (설명서: 모자라면 아무거나로 대신한다).
 */

import { GOLD_SHOP_SIZE, goldKindOf } from '../data/cards.goldrush';
import type { GoldCardId, GoldCardKind } from '../data/types';
import { log, playerOf, updatePlayer } from './cards';
import { shuffle } from './rng';
import type { GameState, GoldState, Player, PlayerId } from './types';

export function goldEnabled(state: GameState): boolean {
  return Boolean(state.gold);
}

export function nuggetsOf(p: Player): number {
  return p.nuggets ?? 0;
}

export function goldEquipOf(p: Player): GoldCardId[] {
  return p.goldEquipment ?? [];
}

/** 이 사람 앞에 이 종류의 골드 카드가 있는가 */
export function hasGoldKind(state: GameState, pid: PlayerId, kind: GoldCardKind): boolean {
  return goldEquipOf(playerOf(state, pid)).some((c) => goldKindOf(c) === kind);
}

/** 금덩이를 더하거나(양수) 뺀다(음수). 0 아래로는 내려가지 않는다 */
export function addNuggets(state: GameState, pid: PlayerId, n: number): GameState {
  if (n === 0) return state;
  return updatePlayer(state, pid, (p) => ({ ...p, nuggets: Math.max(0, nuggetsOf(p) + n) }));
}

export function giveGoldEquip(state: GameState, pid: PlayerId, card: GoldCardId): GameState {
  return updatePlayer(state, pid, (p) => ({ ...p, goldEquipment: [...goldEquipOf(p), card] }));
}

export function takeGoldEquip(state: GameState, pid: PlayerId, card: GoldCardId): GameState {
  return updatePlayer(state, pid, (p) => ({
    ...p,
    goldEquipment: goldEquipOf(p).filter((c) => c !== card),
  }));
}

function withGold(state: GameState, patch: (g: GoldState) => GoldState): GameState {
  if (!state.gold) return state;
  return { ...state, gold: patch(state.gold) };
}

export function discardGold(state: GameState, cards: GoldCardId[]): GameState {
  if (cards.length === 0) return state;
  return withGold(state, (g) => ({ ...g, discard: [...g.discard, ...cards] }));
}

/** 장비 덱 맨 위 한 장. 덱이 비면 버린 장비를 섞어 채운다. 그래도 없으면 null */
export function drawGold(state: GameState): { state: GameState; card: GoldCardId | null } {
  let cur = state;
  const g = cur.gold;
  if (!g) return { state: cur, card: null };
  if (g.deck.length === 0 && g.discard.length > 0) {
    const { value, rng } = shuffle(cur.rng, g.discard);
    cur = { ...cur, rng, gold: { ...g, deck: value, discard: [] } };
    cur = log(cur, {
      t: 'goldReshuffle',
      amount: value.length,
      msg: { k: 'goldReshuffle', amount: value.length },
    });
  }
  const deck = cur.gold!.deck;
  if (deck.length === 0) return { state: cur, card: null };
  const card = deck[deck.length - 1];
  return {
    state: withGold(cur, (x) => ({ ...x, deck: x.deck.slice(0, -1) })),
    card,
  };
}

/** 상점을 3장까지 채운다 */
export function refillShop(state: GameState): GameState {
  let cur = state;
  while (cur.gold && cur.gold.shop.length < GOLD_SHOP_SIZE) {
    const drawn = drawGold(cur);
    if (!drawn.card) return drawn.state;
    const card = drawn.card;
    cur = withGold(drawn.state, (g) => ({ ...g, shop: [...g.shop, card] }));
  }
  return cur;
}

/** 상점에서 한 장을 집고 곧바로 빈자리를 채운다 */
export function takeFromShop(state: GameState, card: GoldCardId): GameState {
  const cur = withGold(state, (g) => ({ ...g, shop: g.shop.filter((c) => c !== card) }));
  return refillShop(cur);
}

/**
 * 목숨을 amount 만큼 잃었을 때, '마지막 목숨'을 뺀 점수.
 * 상처 금덩이·장화·부적이 같은 식을 쓴다. 죽는 한 점은 세지 않는다.
 */
export function woundsBeforeLast(hpBefore: number, amount: number): number {
  return Math.min(amount, Math.max(0, hpBefore - 1));
}

/** 금덩이 능력 key. modifiers 가 이 값으로 goldAbilities 를 선언하고, gold-actions 가 효과를 낸다 */
export const GOLD_ABILITY = {
  jackyMurieta: 'jackyMurieta',
  joshMcCloud: 'joshMcCloud',
  raddieSnake: 'raddieSnake',
  goldPan: 'goldPan',
  rucksack: 'rucksack',
} as const;

/** 프리티 루제나의 차례당 한 번 할인 key */
export const PRETTY_LUZENA_DISCOUNT = 'prettyLuzena';
