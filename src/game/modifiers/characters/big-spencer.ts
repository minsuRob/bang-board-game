/**
 * 빅 스펜서 — 카드 5장으로 시작한다. 빗나감!을 낼 수 없다.
 *
 * 빗나감!으로 내는 것을 모두 막는다. 반응(뱅!·러시안 룰렛·리코체)도 마찬가지다.
 * 술통처럼 카드를 내지 않고 피하는 길은 열어 둔다.
 */
import type { Modifier } from '../../engine/modifier';

export const bigSpencer: Modifier = {
  id: 'char:bigSpencer',
  from: 'character',
  startingHand: 5,
  canPlay: (_ctx, kind) => kind !== 'missed',
};
