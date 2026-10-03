/**
 * 빅 스펜서 — 카드 5장으로 시작한다. 빗나감! 카드를 낼 수 없다.
 *
 * 막는 것은 손에 든 **빗나감! 카드**다. 반응(뱅!·러시안 룰렛·리코체)도 마찬가지다.
 * 빗나감!으로 치는 다른 카드는 낼 수 있다:
 * - 결전 중 뱅!을 빗나감!으로 ("Big Spencer may use BANG! as they were Missed!", 와일드 웨스트 쇼 해설)
 * - 역화 같은 빗나감! 효과 카드 (와일드 웨스트 쇼 FAQ Q07 "restricted to Missed! cards only")
 * 술통처럼 카드를 내지 않고 피하는 길도 열어 둔다.
 */
import { kindOf } from '../../engine/cards';
import type { Modifier } from '../../engine/modifier';

export const bigSpencer: Modifier = {
  id: 'char:bigSpencer',
  from: 'character',
  startingHand: 5,
  canPlay: (_ctx, _kind, card) => kindOf(card) !== 'missed',
};
