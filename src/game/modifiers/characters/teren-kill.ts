/**
 * 테렌 킬 — 제거될 때마다 펼친다. 스페이드가 아니면 목숨 1로 남고 카드 1장을 가져온다.
 *
 * 맥주로도 못 버틴 뒤, 제거 프레임이 판정을 먼저 건다 (frames/damage.ts).
 */
import type { Modifier } from '../../engine/modifier';

export const terenKill: Modifier = {
  id: 'char:terenKill',
  from: 'character',
  cheatsDeath: true,
};
