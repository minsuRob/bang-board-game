/**
 * 주르도네 — <뱅!>의 표적이 될 때마다 '카드 펼치기'를 할 수 있고,
 * 하트가 나오면 총알이 빗나간다.
 *
 * 술통을 함께 장착하고 있으면 판정 기회는 두 번이다 (능력과 술통은 별개).
 * 기관총에 맞을 때도 발동한다. (원본 맵 v0.4 패치노트)
 */
import type { Modifier } from '../../engine/modifier';

export const jourdonnais: Modifier = {
  id: 'char:jourdonnais',
  from: 'character',
  onTargetedByBang: ({ pid }) => [
    { k: 'judgement', pid, purpose: 'jourdonnais', candidates: [] },
  ],
};
