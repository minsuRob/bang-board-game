/**
 * 플린트 웨스트우드 — 자기 차례에 손의 카드 1장을 다른 플레이어 손의 무작위 카드 2장과 바꿀 수 있다.
 *
 * 능력은 4장(엔진)에서 붙인다. 지금은 등록만 해 둔다.
 */
import type { Modifier } from '../../engine/modifier';

export const flintWestwood: Modifier = { id: 'char:flintWestwood', from: 'character' };
