/**
 * 투코 프란치스카너 — 카드 가져오기 단계에 앞에 놓인 파랑 카드가 없으면 2장을 더 가져온다.
 * 갈증(1장)·기차도착(+1)과는 순서대로 겹친다.
 */
import { playerOf } from '../../engine/cards';
import type { Modifier } from '../../engine/modifier';

export const tucoFranziskaner: Modifier = {
  id: 'char:tucoFranziskaner',
  from: 'character',
  drawCount: (base, { state, pid }) =>
    playerOf(state, pid).equipment.length === 0 ? base + 2 : base,
};
