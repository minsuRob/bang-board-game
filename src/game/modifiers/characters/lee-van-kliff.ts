/**
 * 리 반 클리프 — 자기 차례에 뱅! 1장을 버려 방금 낸 갈색 카드의 효과를 한 번 더 낸다.
 *
 * 뱅!(패닝 포함)은 다시 낼 수 없다. 다시 낸 효과는 또 다시 낼 수 없다.
 * 대상은 새로 고른다.
 */
import type { Modifier } from '../../engine/modifier';

export const LEE_VAN_KLIFF_ABILITY = 'leeVanKliff';

export const leeVanKliff: Modifier = {
  id: 'char:leeVanKliff',
  from: 'character',
  repeatBrown: { key: LEE_VAN_KLIFF_ABILITY, label: '뱅!을 버려 한 번 더', from: 'bang' },
};
