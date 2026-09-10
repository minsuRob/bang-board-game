/**
 * 다이너마이트(DINAMITE) — 차례 시작에 판정한다.
 * ♠2~9면 목숨 3을 잃고 버려지며, 아니면 다음 사람에게 넘어간다.
 *
 * 폭발은 연쇄 탈락을 만든다. 탈락 처리 도중에 또 탈락이 일어나는 재진입을
 * 견뎌야 한다. 감옥보다 먼저 판정한다.
 */
import type { CardId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

export const DYNAMITE_ORDER = 10;

export const dynamite = (card: CardId): Modifier => ({
  id: `equip:dynamite:${card}`,
  from: 'equipment',
  card,
  order: DYNAMITE_ORDER,
  onTurnStart: ({ pid }) => [
    { k: 'judgement', pid, purpose: 'dynamite', candidates: [] },
  ],
});
