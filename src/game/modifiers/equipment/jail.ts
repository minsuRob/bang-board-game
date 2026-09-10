/**
 * 감옥(PRIGIONE) — 차례 시작에 판정해서 ♥가 아니면 차례를 통째로 건너뛴다.
 *
 * 보안관에게는 사용할 수 없다 (사용 시점에서 차단).
 * 다이너마이트 판정 다음에 온다. 감옥으로 차례를 건너뛰어도 다이너마이트는 터진다.
 */
import type { CardId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

export const JAIL_ORDER = 20;

export const jail = (card: CardId): Modifier => ({
  id: `equip:jail:${card}`,
  from: 'equipment',
  card,
  order: JAIL_ORDER,
  onTurnStart: ({ pid }) => [{ k: 'judgement', pid, purpose: 'jail', candidates: [] }],
});
