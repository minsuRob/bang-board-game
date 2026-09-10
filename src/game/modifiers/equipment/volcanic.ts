/**
 * 볼캐닉(VOLCANIC) — 사정거리 1. 자기 차례에 뱅!을 횟수 제한 없이 쓸 수 있다.
 *
 * 사정거리 자체는 카드 정의(weaponRange)에서 읽는다. 여기서는 횟수 제한만 푼다.
 */
import type { CardId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

export const volcanic = (card: CardId): Modifier => ({
  id: `equip:volcanic:${card}`,
  from: 'equipment',
  card,
  bangLimit: () => Number.POSITIVE_INFINITY,
});
