/**
 * 방울뱀(SERPENTE A SONAGLI) — 놓인 사람은 차례 시작에 판정해서 ♠면 목숨 1을 잃는다.
 * 카드는 그대로 남는다.
 *
 * 판정 순서는 다이너마이트 → 감옥 → 방울뱀이다 (valley.txt 6쪽 "The check order is: Dynamite > Jail >
 * Rattlesnake."). 감옥에 갇혀도 방울뱀 판정은 한다 (감옥이 걷어내는 것은 가져오기·사용·버리기 단계뿐).
 */
import type { CardId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

export const RATTLESNAKE_ORDER = 25;

export const rattlesnake = (card: CardId): Modifier => ({
  id: `equip:rattlesnake:${card}`,
  from: 'equipment',
  card,
  order: RATTLESNAKE_ORDER,
  onTurnStart: ({ pid }) => [{ k: 'judgement', pid, purpose: 'rattlesnake', candidates: [] }],
});
