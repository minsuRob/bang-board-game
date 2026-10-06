/**
 * 엉클 윌 — 자기 차례에 한 번, 손의 카드 아무거나 한 장을 <잡화점>으로 쓸 수 있다.
 *
 * 파랑 카드도 잡화점으로 낼 수 있고, 그때는 장착되지 않고 버려진다.
 * 설교·목사는 '내는 종류'를 막으므로 뱅!·맥주를 잡화점으로 내는 것은 막지 않는다.
 * 수갑은 실제 카드의 무늬로 판정한다. (docs/edge-cases.md EC-119)
 */
import type { Modifier } from '../../engine/modifier';

export const UNCLE_WILL_ABILITY = 'uncleWill';

export const uncleWill: Modifier = {
  id: 'char:uncleWill',
  from: 'character',
  playAnyAs: { key: UNCLE_WILL_ABILITY, as: 'generalStore' },
};
