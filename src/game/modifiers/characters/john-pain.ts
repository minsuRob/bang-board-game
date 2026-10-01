/**
 * 존 페인 — 손이 6장 미만이면, 누가 펼치든 펼친 카드를 손에 넣는다.
 *
 * 능력은 4장(엔진)에서 붙인다. 지금은 등록만 해 둔다.
 */
import type { Modifier } from '../../engine/modifier';

export const johnPain: Modifier = { id: 'char:johnPain', from: 'character' };
