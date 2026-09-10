/**
 * 야생마(MUSTANG) — 다른 사람이 볼 때 거리가 1 멀어진다.
 */
import type { CardId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

export const mustang = (card: CardId): Modifier => ({
  id: `equip:mustang:${card}`,
  from: 'equipment',
  card,
  distanceAsTarget: 1,
});
