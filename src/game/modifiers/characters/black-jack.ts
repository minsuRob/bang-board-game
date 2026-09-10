/**
 * 블랙 잭 — '카드 가져오기' 단계의 두 번째 카드를 공개하고,
 * 하트나 다이아몬드면 한 장 더 가져온다.
 *
 * 공개는 실제 무늬가 아니라 '축복/저주'가 적용된 무늬로 판정한다.
 */
import type { Modifier } from '../../engine/modifier';

export const blackJack: Modifier = {
  id: 'char:blackJack',
  from: 'character',
  afterDraw: ({ pid }, drawn) =>
    drawn.length >= 2 ? [{ k: 'blackJackReveal', pid, card: drawn[1] }] : [],
};
