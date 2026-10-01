/**
 * 레모네이드 짐 — 다른 사람이 맥주를 낼 때마다, 손패 1장을 버리고 나도 목숨 1을 회복할 수 있다.
 * 카드 사용으로 낸 맥주만 센다. 죽음을 피하려 마신 맥주는 해당하지 않는다.
 */
import type { Modifier } from '../../engine/modifier';

export const lemonadeJim: Modifier = {
  id: 'char:lemonadeJim',
  from: 'character',
  onOtherPlaysCard: ({ pid }, _player, kind) => (kind === 'beer' ? [{ k: 'lemonadeJim', pid }] : []),
};
