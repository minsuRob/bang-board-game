/**
 * 폴 리그렛 — 다른 사람이 볼 때 거리가 1 멀어진다.
 *
 * 총알 3개. 야생마와 겹치면 합산된다.
 */
import type { Modifier } from '../../engine/modifier';

export const paulRegret: Modifier = {
  id: 'char:paulRegret',
  from: 'character',
  distanceAsTarget: 1,
};
