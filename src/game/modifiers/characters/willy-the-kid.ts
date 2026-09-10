/**
 * 윌리 더 키드 — <뱅!>을 원하는 만큼 사용할 수 있다.
 *
 * 볼캐닉과 같은 효과지만 무기와 무관하다.
 */
import type { Modifier } from '../../engine/modifier';

export const willyTheKid: Modifier = {
  id: 'char:willyTheKid',
  from: 'character',
  bangLimit: () => Number.POSITIVE_INFINITY,
};
