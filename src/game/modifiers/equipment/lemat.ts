/**
 * 르매트(LEMAT) — 사정거리 1. 자기 차례에 손의 아무 카드나 뱅!으로 쓸 수 있다.
 */
import type { CardId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

export const lemat = (card: CardId): Modifier => ({
  id: `equip:lemat:${card}`,
  from: 'equipment',
  card,
  canUseAs: (_from, as, { state, pid }) => as === 'bang' && state.turn.active === pid,
});
