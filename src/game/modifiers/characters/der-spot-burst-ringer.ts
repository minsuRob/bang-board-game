/**
 * 더 스팟 버스트 링거 — 자기 차례에 한 번, 뱅! 카드를 기관총으로 쓸 수 있다.
 * 기관총이 되므로 뱅! 횟수를 쓰지 않는다.
 */
import type { Modifier } from '../../engine/modifier';

export const DER_SPOT_ABILITY = 'derSpotBurstRinger';

export const derSpotBurstRinger: Modifier = {
  id: 'char:derSpotBurstRinger',
  from: 'character',
  playAnyAs: { key: DER_SPOT_ABILITY, as: 'gatling', from: ['bang'] },
};
