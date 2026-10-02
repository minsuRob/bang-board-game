/**
 * 율 그리너 — 카드를 가져오기 전에, 손이 그보다 많은 플레이어가 각자 고른 카드 1장씩을 준다.
 *
 * 누가 줄지는 가져오기 단계가 시작될 때 한 번 정한다. 주는 도중 장수가 바뀌어도 다시 세지 않는다.
 */
import type { Modifier } from '../../engine/modifier';

export const youlGrinner: Modifier = {
  id: 'char:youlGrinner',
  from: 'character',
  beforeDraw: ({ pid }) => [{ k: 'gifts', pid }],
};
