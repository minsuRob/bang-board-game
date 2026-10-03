/**
 * 리 반 클리프 — 자기 차례에 뱅! 1장을 버려 방금 낸 갈색 카드의 효과를 한 번 더 낸다.
 *
 * 갈색 카드마다 한 번씩이라 한 차례에 여러 번 쓸 수 있다. 다시 낸 효과는 또 다시 낼 수 없다.
 * 뱅!도 다시 낼 수 있고, 다시 낸 뱅!은 차례당 뱅! 횟수를 쓰지 않는다. 빗나감!·조준은 다시 못 낸다.
 * 결전 중에는 아무 카드나 버려 쓴다. 대상은 새로 고른다.
 */
import type { Modifier } from '../../engine/modifier';

export const LEE_VAN_KLIFF_ABILITY = 'leeVanKliff';

export const leeVanKliff: Modifier = {
  id: 'char:leeVanKliff',
  from: 'character',
  repeatBrown: { key: LEE_VAN_KLIFF_ABILITY, label: '뱅!을 버려 한 번 더', from: 'bang' },
};
