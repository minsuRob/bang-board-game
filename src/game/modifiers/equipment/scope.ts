/**
 * 조준경(MIRINO) — 다른 사람을 볼 때 거리가 1 가까워진다.
 */
import type { CardId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

export const scope = (card: CardId): Modifier => ({
  id: `equip:scope:${card}`,
  from: 'equipment',
  card,
  distanceAsViewer: 1,
});
