/**
 * 시드 케첨 — 카드 두 장을 버려 생명력을 1 회복할 수 있다.
 *
 * '언제든' 능력이다. 자기 차례가 아니어도, 반응을 요구받는 도중에도 쓸 수 있다.
 * 최대 목숨을 넘겨 회복할 수는 없다.
 */
import type { Modifier } from '../../engine/modifier';

export const SID_KETCHUM_ABILITY = 'sidKetchum';

export const sidKetchum: Modifier = {
  id: 'char:sidKetchum',
  from: 'character',
  anytime: [{ key: SID_KETCHUM_ABILITY, label: '카드 2장을 버리고 목숨 1 회복' }],
};
