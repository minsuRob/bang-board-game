/**
 * 술통(BARILE) — 뱅!의 표적이 될 때마다 판정한다. ♥가 나오면 빗나감! 효과.
 *
 * 기관총에 맞을 때도 판정한다. (원본 맵 v0.4 패치노트)
 * 주르도네가 술통을 장착하면 판정 기회는 두 번이다.
 */
import type { Modifier } from '../../engine/modifier';
import type { CardId } from '../../data/types';

export const barrel = (card: CardId): Modifier => ({
  id: `equip:barrel:${card}`,
  from: 'equipment',
  card,
  onTargetedByBang: ({ pid }) => [
    { k: 'judgement', pid, purpose: 'barrel', candidates: [] },
  ],
});
