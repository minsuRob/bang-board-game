/**
 * 방울뱀(SERPENTE A SONAGLI) — 놓인 사람은 차례 시작에 판정해서 ♠면 목숨 1을 잃는다.
 * 카드는 그대로 남는다. 다이너마이트 다음, 감옥 앞에 판정한다.
 */
import type { CardId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

export const RATTLESNAKE_ORDER = 15;

export const rattlesnake = (card: CardId): Modifier => ({
  id: `equip:rattlesnake:${card}`,
  from: 'equipment',
  card,
  order: RATTLESNAKE_ORDER,
  onTurnStart: ({ pid }) => [{ k: 'judgement', pid, purpose: 'rattlesnake', candidates: [] }],
});
