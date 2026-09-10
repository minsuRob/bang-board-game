/**
 * 로즈 둘란 — 다른 사람을 볼 때 거리가 1 가까워진다.
 *
 * 조준경과 겹치면 합산된다. 거리는 1 아래로는 내려가지 않는다.
 */
import type { Modifier } from '../../engine/modifier';

export const roseDoolan: Modifier = {
  id: 'char:roseDoolan',
  from: 'character',
  distanceAsViewer: 1,
};
