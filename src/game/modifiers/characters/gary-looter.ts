/**
 * 게리 루터 — 다른 플레이어가 차례 끝에 초과분으로 버린 카드를 모두 가져온다.
 *
 * 능력은 4장(엔진)에서 붙인다. 지금은 등록만 해 둔다.
 */
import type { Modifier } from '../../engine/modifier';

export const garyLooter: Modifier = { id: 'char:garyLooter', from: 'character' };
