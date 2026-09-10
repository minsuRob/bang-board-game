/**
 * 킷 칼슨 — '카드 가져오기' 단계에서 덱 맨 위 세 장을 보고 가져갈 두 장을 고른다.
 *
 * 남은 한 장은 덱 맨 위로 되돌린다. 가져올 장수가 이벤트로 바뀌면(갈증·기차도착)
 * 들여다보는 장수도 함께 바뀐다.
 */
import type { Modifier } from '../../engine/modifier';

export const kitCarlson: Modifier = {
  id: 'char:kitCarlson',
  from: 'character',
  drawPhase: ({ pid }, count) =>
    count >= 1 ? [{ k: 'kitCarlson', pid, candidates: [], taken: count }] : null,
};
