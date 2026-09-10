/**
 * 제시 존스 — '카드 가져오기' 단계에서 첫 번째 카드를 다른 사람의 손에서
 * 가져올 수도 있다.
 *
 * 손패가 있는 상대가 하나도 없으면 선택지가 없으므로 평범하게 덱에서 뽑는다.
 */
import type { Modifier } from '../../engine/modifier';

export const jesseJones: Modifier = {
  id: 'char:jesseJones',
  from: 'character',
  drawPhase: ({ state, pid }, count) => {
    const hasVictim = state.players.some(
      (p) => p.id !== pid && (p.alive || p.ghost) && p.hand.length > 0,
    );
    if (!hasVictim || count < 1) return null;
    return [{ k: 'jesseJonesChoice', pid, rest: count - 1 }];
  },
};
