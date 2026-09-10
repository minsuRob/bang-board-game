/**
 * 벌쳐 샘 — 게임에서 제거되는 인물이 생길 때마다 그 사람의 모든 카드를
 * 가져와 손에 둔다.
 *
 * 손패뿐 아니라 앞에 놓인 파랑 카드까지 전부 가져온다. (원본 맵 v0.43 패치노트)
 * 자기 자신이 제거될 때는 발동하지 않는다.
 */
import type { Modifier } from '../../engine/modifier';

export const vultureSam: Modifier = {
  id: 'char:vultureSam',
  from: 'character',
  onEliminated: ({ pid }, victim) =>
    victim === pid ? [] : [{ k: 'takeAllCards', pid, from: victim }],
};
