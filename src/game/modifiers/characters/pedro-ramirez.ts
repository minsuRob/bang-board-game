/**
 * 페드로 라미레즈 — '카드 가져오기' 단계에서 첫 번째 카드를
 * 버려진 카드 더미에서 가져올 수도 있다.
 *
 * 버린 더미가 비어 있으면 선택지가 없다.
 */
import type { Modifier } from '../../engine/modifier';

export const pedroRamirez: Modifier = {
  id: 'char:pedroRamirez',
  from: 'character',
  drawPhase: ({ state, pid }, count) => {
    if (state.discard.length === 0 || count < 1) return null;
    return [{ k: 'pedroRamirezChoice', pid, rest: count - 1 }];
  },
};
