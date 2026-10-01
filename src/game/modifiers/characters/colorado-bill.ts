/**
 * 콜로라도 빌 — 뱅! 카드를 낼 때마다 카드를 펼쳐 ♠면 그 총알은 피할 수 없다.
 * 판정이 뱅! 프레임보다 먼저 해결되어, ♠면 그 프레임에 unavoidable 을 건다 (frames/judgement.ts).
 */
import type { Modifier } from '../../engine/modifier';

export const coloradoBill: Modifier = {
  id: 'char:coloradoBill',
  from: 'character',
  onPlayBang: ({ pid }) => [{ k: 'judgement', pid, purpose: 'coloradoBill', candidates: [] }],
};
