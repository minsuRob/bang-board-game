/**
 * 레모네이드 짐 — 다른 사람이 맥주를 낼 때마다, 손패 1장을 버리고 나도 목숨 1을 회복할 수 있다.
 * 차례에 낸 맥주도, 쓰러질 때 살아나려고 낸 맥주도 센다 (원문 "Each time another player plays a Beer card").
 * 병·위스키처럼 맥주 카드가 아닌 것은 세지 않는다.
 */
import type { Modifier } from '../../engine/modifier';

export const lemonadeJim: Modifier = {
  id: 'char:lemonadeJim',
  from: 'character',
  onOtherPlaysCard: ({ pid }, _player, kind) => (kind === 'beer' ? [{ k: 'lemonadeJim', pid }] : []),
};
