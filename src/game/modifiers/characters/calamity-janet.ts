/**
 * 칼라미티 자넷 — <뱅!>을 <빗나감!>으로, <빗나감!>을 <뱅!>으로 쓸 수 있다.
 *
 * 치환은 '카드를 낼 수 있는 모든 경로'에서 물어봐야 한다. 사용 시점 한 곳에서만
 * 처리하면 결투·인디언에서 샌다. (원본 맵 v0.128, v0.229 패치노트)
 * 치환해도 뱅!은 여전히 차례당 사용 제한을 받는다. (v0.12)
 */
import type { Modifier } from '../../engine/modifier';

export const calamityJanet: Modifier = {
  id: 'char:calamityJanet',
  from: 'character',
  canUseAs: (from, as) =>
    (from === 'bang' && as === 'missed') || (from === 'missed' && as === 'bang'),
};
