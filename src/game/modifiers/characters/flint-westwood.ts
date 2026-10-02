/**
 * 플린트 웨스트우드 — 자기 차례에 한 번, 손의 카드 1장을 다른 플레이어 손의 무작위 카드 2장과 바꾼다.
 *
 * 2장을 먼저 뽑고 나서 내 카드를 준다. 준 카드를 도로 뽑아 오는 일이 없게 하려는 것이다.
 * 상대 손패가 1장뿐이면 그 1장만 가져온다.
 */
import type { Modifier } from '../../engine/modifier';

export const FLINT_WESTWOOD_ABILITY = 'flintWestwood';

export const flintWestwood: Modifier = {
  id: 'char:flintWestwood',
  from: 'character',
  swapHand: { key: FLINT_WESTWOOD_ABILITY, label: '카드 1장 ↔ 남의 손 2장', take: 2 },
};
