/**
 * 게리 루터 — 다른 플레이어가 차례 끝에 손패 초과로 버린 카드를 모두 가져온다.
 *
 * 버리기 단계의 버림만 해당한다. 반디도스·샷건처럼 효과로 버린 카드는 아니다.
 */
import type { Modifier } from '../../engine/modifier';

export const garyLooter: Modifier = {
  id: 'char:garyLooter',
  from: 'character',
  takesExcessDiscards: true,
};
