/**
 * 율 그리너 — 카드를 가져오기 전에, 손이 그보다 많은 플레이어가 각자 고른 카드 1장씩을 준다.
 *
 * 능력은 4장(엔진)에서 붙인다. 지금은 등록만 해 둔다.
 */
import type { Modifier } from '../../engine/modifier';

export const youlGrinner: Modifier = { id: 'char:youlGrinner', from: 'character' };
