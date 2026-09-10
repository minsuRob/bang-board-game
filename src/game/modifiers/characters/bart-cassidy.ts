/**
 * 바트 캐시디 — 생명력 1을 잃을 때마다 카드 더미에서 카드 한 장을 가져온다.
 *
 * 잃은 목숨 수만큼 뽑는다. 기관총 한 방에 1, 다이너마이트 폭발이면 3장.
 */
import type { Modifier } from '../../engine/modifier';

export const bartCassidy: Modifier = {
  id: 'char:bartCassidy',
  from: 'character',
  onDamaged: ({ pid }, amount) =>
    amount > 0 ? [{ k: 'drawCards', pid, count: amount, reason: 'bartCassidy' }] : [],
};
