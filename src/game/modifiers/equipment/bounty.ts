/**
 * 포상금(TAGLIA) — 놓인 사람이 뱅! 카드에 맞으면 쏜 사람이 덱에서 1장 가져온다.
 * 카드 원문 "If that player is hit by a BANG! card". 기관총·패닝·토마호크·역화·이블린·헨리 블록의
 * 반격은 뱅! 카드가 아니라 해당하지 않는다 (VoS 룰 5쪽 해설, EC-129).
 */
import type { CardId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';
import { BANG_CARD_CAUSES } from './bang-causes';

export const bounty = (card: CardId): Modifier => ({
  id: `equip:bounty:${card}`,
  from: 'equipment',
  card,
  onDamaged: ({ pid }, _amount, source, cause) =>
    source && source !== pid && cause && BANG_CARD_CAUSES.includes(cause)
      ? [{ k: 'drawCards', pid: source, count: 1, reason: 'bounty' }]
      : [],
});
