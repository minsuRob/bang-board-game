/**
 * 골드 러시 장비(검정 카드)의 훅 등록소.
 *
 * 골드 장비는 파랑 카드와 영역이 따로(Player.goldEquipment)라, 카드 id 대신
 * 종류(GoldCardKind)로 훅을 찾는다. 갈색 카드는 사는 순간 쓰고 버리므로 훅이 없다.
 * 캐릭터 8명의 훅은 characters/gold-rush.ts 에 있다.
 */

import type { GoldCardId, GoldCardKind } from '../../data/types';
import { effectiveSuit, playerOf } from '../../engine/cards';
import { GOLD_ABILITY, woundsBeforeLast } from '../../engine/gold';
import type { ModCtx, Modifier } from '../../engine/modifier';

/** 방금 잃은 목숨 중 마지막 한 점을 뺀 수 (장화·부적) */
function woundsNow({ state, pid }: ModCtx, amount: number): number {
  const hpAfter = playerOf(state, pid).hp;
  return woundsBeforeLast(hpAfter + amount, amount);
}

const base = (kind: GoldCardKind, card: GoldCardId): Pick<Modifier, 'id' | 'from' | 'card'> => ({
  id: `gold:${kind}`,
  from: 'equipment',
  card,
});

export const GOLD_MODIFIERS: Partial<Record<GoldCardKind, (card: GoldCardId) => Modifier>> = {
  /** 칼루멧 — 남이 낸 ♦ 카드는 나에게 효과가 없다. 결투는 예외 (legal·play 에서 거른다) */
  calumet: (card) => ({
    ...base('calumet', card),
    immuneToCard: ({ state }, played) => effectiveSuit(state, played) === 'diamonds',
  }),
  /** 탄띠 — 차례를 마칠 때 손패 8장까지 */
  gunBelt: (card) => ({ ...base('gunBelt', card), handLimit: () => 8 }),
  /** 편자 — 판정마다 한 장 더 펼치고 고른다 */
  horseshoe: (card) => ({ ...base('horseshoe', card), judgementPeekBonus: 1 }),
  /** 곡괭이 — 카드 가져오기 단계에 한 장 더 */
  pickaxe: (card) => ({ ...base('pickaxe', card), drawCount: (n) => n + 1 }),
  /** 사금채취판 — 금덩이 1개로 카드 한 장, 차례당 2번 */
  goldPan: (card) => ({
    ...base('goldPan', card),
    goldAbilities: [
      { key: GOLD_ABILITY.goldPan, label: '사금채취판으로 카드 한 장을 가져왔다', cost: 1, perTurn: 2 },
    ],
  }),
  /** 장화 — 목숨 1을 잃을 때마다 카드 한 장. 마지막 목숨은 제외 */
  boots: (card) => ({
    ...base('boots', card),
    onDamaged: (ctx, amount) => {
      const n = woundsNow(ctx, amount);
      return n > 0 ? [{ k: 'drawCards', pid: ctx.pid, count: n, reason: 'boots' }] : [];
    },
  }),
  /** 부적 — 목숨 1을 잃을 때마다 금덩이 1개. 마지막 목숨은 제외 */
  luckyCharm: (card) => ({
    ...base('luckyCharm', card),
    onDamaged: (ctx, amount) => {
      const n = woundsNow(ctx, amount);
      return n > 0 ? [{ k: 'gainNuggets', pid: ctx.pid, amount: n, reason: 'luckyCharm' }] : [];
    },
  }),
  /** 배낭 — 금덩이 2개로 목숨 1. 마지막 목숨을 잃을 때는 남의 차례에도 */
  rucksack: (card) => ({
    ...base('rucksack', card),
    goldAbilities: [
      { key: GOLD_ABILITY.rucksack, label: '배낭으로 목숨 1을 회복했다', cost: 2, whenDying: true },
    ],
  }),
};
