/**
 * 포상금(TAGLIA) — 놓인 사람이 뱅!에 맞으면 쏜 사람이 덱에서 1장 가져온다.
 */
import type { CardId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';
import { BANG_CAUSES } from './bang-causes';

export const bounty = (card: CardId): Modifier => ({
  id: `equip:bounty:${card}`,
  from: 'equipment',
  card,
  onDamaged: ({ pid }, _amount, source, cause) =>
    source && source !== pid && cause && BANG_CAUSES.includes(cause)
      ? [{ k: 'drawCards', pid: source, count: 1, reason: 'bounty' }]
      : [],
});
