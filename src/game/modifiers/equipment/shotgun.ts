/**
 * 샷건(SHOTGUN) — 사정거리 1. 내가 누군가에게 뱅!으로 목숨을 잃게 할 때마다
 * 그 사람은 손패 1장을 골라 버린다.
 */
import type { CardId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';
import { BANG_CAUSES } from './bang-causes';

export const shotgun = (card: CardId): Modifier => ({
  id: `equip:shotgun:${card}`,
  from: 'equipment',
  card,
  onDealtDamage: (_ctx, target, _amount, cause) =>
    BANG_CAUSES.includes(cause) ? [{ k: 'shotgunDiscard', pid: target }] : [],
});
