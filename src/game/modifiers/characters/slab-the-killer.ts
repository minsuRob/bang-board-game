/**
 * 슬랩 더 킬러 — 그가 쏜 <뱅!>은 <빗나감!> 두 장으로 막아야 한다.
 *
 * 칼라미티 자넷은 <뱅!>을 <빗나감!>으로 쓸 수 있으므로 뱅! 두 장으로도 막는다.
 * (원본 맵 v0.12 패치노트)
 */
import type { Modifier } from '../../engine/modifier';

export const slabTheKiller: Modifier = {
  id: 'char:slabTheKiller',
  from: 'character',
  outgoingBangMisses: (base) => base + 1,
};
