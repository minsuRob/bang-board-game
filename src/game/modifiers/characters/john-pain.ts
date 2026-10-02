/**
 * 존 페인 — 손이 6장 미만이면, 누가 펼치든 펼친 카드를 손에 넣는다.
 *
 * 판정 결과는 그대로 적용되고, 카드만 버린 더미 대신 존 페인의 손으로 간다.
 */
import type { Modifier } from '../../engine/modifier';

export const johnPain: Modifier = {
  id: 'char:johnPain',
  from: 'character',
  takesJudgementCards: 6,
};
