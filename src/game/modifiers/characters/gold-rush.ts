/**
 * 골드 러시 캐릭터 8명.
 *
 * 능력 문구는 data/characters.ts, 판정은 docs/edge-cases.md 의 골드 러시 절.
 * 금덩이를 내는 능력의 효과는 engine/gold-actions.ts 가 key 로 낸다.
 */
import { GOLD_ABILITY, PRETTY_LUZENA_DISCOUNT } from '../../engine/gold';
import type { Modifier } from '../../engine/modifier';

/**
 * 돈 벨 — 차례 끝에 판정, ♥·♦ 면 차례를 한 번 더. 추가 차례 끝에는 다시 하지 않는다.
 * 감옥에 갇혀 차례를 건너뛰었으면 판정하지 않는다 (faq-goldrush.txt Q06 "No, he can't.")
 */
export const donBell: Modifier = {
  id: 'char:donBell',
  from: 'character',
  onTurnEnd: ({ state, pid }) =>
    state.turn.extra || state.turn.skipped
      ? []
      : [{ k: 'judgement', pid, purpose: 'donBell', candidates: [] }],
};

/** 더치 윌 — 뽑은 카드 중 1장을 버리고 금덩이 1개 */
export const dutchWill: Modifier = {
  id: 'char:dutchWill',
  from: 'character',
  drawPhase: ({ pid }, count) => [{ k: 'dutchWill', pid, candidates: [], count }],
};

/** 재키 무리에타 — 금덩이 2개로 카드 없이 뱅! 한 발. 뱅! 제한과 무관하고 여러 번 쓸 수 있다 */
export const jackyMurieta: Modifier = {
  id: 'char:jackyMurieta',
  from: 'character',
  goldAbilities: [{ key: GOLD_ABILITY.jackyMurieta, label: '뱅!을 쐈다', cost: 2, target: 'bang' }],
};

/** 조시 맥클라우드 — 금덩이 2개로 장비 덱 맨 위 카드를 가져와 곧바로 쓴다 */
export const joshMcCloud: Modifier = {
  id: 'char:joshMcCloud',
  from: 'character',
  goldAbilities: [{ key: GOLD_ABILITY.joshMcCloud, label: '장비 덱 맨 위 카드를 뽑았다', cost: 2 }],
};

/** 마담 이토 — 누가 맥주를 내든 카드 한 장 (병·위스키 같은 대용은 제외) */
export const madamYto: Modifier = {
  id: 'char:madamYto',
  from: 'character',
  onBeerPlayed: ({ pid }) => [{ k: 'drawCards', pid, count: 1, reason: 'madamYto' }],
};

/** 프리티 루제나 — 차례에 한 번, 장비 하나를 금덩이 1개 싸게 산다 */
export const prettyLuzena: Modifier = {
  id: 'char:prettyLuzena',
  from: 'character',
  goldDiscount: { key: PRETTY_LUZENA_DISCOUNT, amount: 1 },
};

/** 래디 스네이크 — 금덩이 1개로 카드 한 장, 차례당 2번 */
export const raddieSnake: Modifier = {
  id: 'char:raddieSnake',
  from: 'character',
  goldAbilities: [
    { key: GOLD_ABILITY.raddieSnake, label: '카드 한 장을 가져왔다', cost: 1, perTurn: 2 },
  ],
};

/** 시미언 피코스 — 목숨 1을 잃을 때마다 금덩이 1개 (더미에서) */
export const simeonPicos: Modifier = {
  id: 'char:simeonPicos',
  from: 'character',
  onDamaged: ({ pid }, amount) =>
    amount > 0 ? [{ k: 'gainNuggets', pid, amount, reason: 'simeonPicos' }] : [],
};
