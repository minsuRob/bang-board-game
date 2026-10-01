/**
 * 테렌 킬 — 제거될 때마다 펼친다. 스페이드가 아니면 목숨 1로 남고 카드 1장을 가져온다.
 *
 * 능력은 4장(엔진)에서 붙인다. 지금은 등록만 해 둔다.
 */
import type { Modifier } from '../../engine/modifier';

export const terenKill: Modifier = { id: 'char:terenKill', from: 'character' };
