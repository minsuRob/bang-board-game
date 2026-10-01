/**
 * 그레고리 덱 — 차례 시작에 캐릭터 2장을 무작위로 뽑아 그 능력을 모두 가질 수 있다.
 *
 * 능력은 4장(엔진)에서 붙인다. 지금은 등록만 해 둔다.
 */
import type { Modifier } from '../../engine/modifier';

export const greygoryDeck: Modifier = { id: 'char:greygoryDeck', from: 'character' };
