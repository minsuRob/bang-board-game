/**
 * 이블린 쉬뱅 — 카드 가져오기 단계에서 카드를 덜 가져올 수 있다.
 * 안 가져온 한 장마다 사정거리 안의 서로 다른 사람에게 뱅!을 쏜다.
 *
 * 뱅! 카드가 아니라 뱅! 효과다. 차례당 뱅! 횟수를 쓰지 않는다.
 * 갈증·기차도착으로 바뀐 장수가 그대로 쏠 수 있는 최대 수가 된다.
 */
import type { Modifier } from '../../engine/modifier';

export const evelynShebang: Modifier = {
  id: 'char:evelynShebang',
  from: 'character',
  drawPhase: ({ pid }, count) => (count > 0 ? [{ k: 'evelyn', pid, remaining: count, shot: [] }] : null),
};
