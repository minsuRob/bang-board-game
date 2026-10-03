/**
 * 킷 칼슨 — '카드 가져오기' 단계에서 덱 맨 위 세 장을 보고 가져갈 두 장을 고른다.
 *
 * 남은 한 장은 덱 맨 위로 되돌린다. 가져올 장수가 이벤트로 바뀌어도 보는 장수는 늘 세 장이다
 * (하이 눈 FAQ Q06). 갈증이면 세 장을 보고 한 장만 가져가고 나머지 두 장을 뽑은 순서대로 되돌린다.
 * 기차도착처럼 세 장 이상 가져오면 고를 것이 없다 — 두 장을 고르고 남긴 한 장까지 이어서
 * 가져가게 되므로, 덱 맨 위에서 그 장수를 그대로 가져온다.
 */
import type { Modifier } from '../../engine/modifier';

/** 덱 맨 위에서 보는 장수. 이보다 적게 가져올 때만 고를 것이 있다 */
const KIT_LOOK = 3;

export const kitCarlson: Modifier = {
  id: 'char:kitCarlson',
  from: 'character',
  drawPhase: ({ pid }, count) => {
    if (count < 1) return null;
    if (count >= KIT_LOOK) return [{ k: 'drawCards', pid, count, reason: 'kitCarlson' }];
    return [{ k: 'kitCarlson', pid, candidates: [], taken: count }];
  },
};
