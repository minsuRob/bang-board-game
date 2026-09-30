/**
 * 조니 키시 — 카드를 앞에 내려놓을 때마다, 누구 앞에 있든 같은 이름의 다른 카드를 모두 버린다.
 *
 * 자기 앞에 장착하는 파랑 카드와 남에게 거는 감옥 모두 해당한다.
 * 다이너마이트가 넘어오는 것처럼 '내려놓지 않은' 이동은 해당하지 않는다.
 * (docs/edge-cases.md EC-120)
 */
import type { Modifier } from '../../engine/modifier';

export const johnnyKisch: Modifier = {
  id: 'char:johnnyKisch',
  from: 'character',
  onPutInPlay: ({ pid }, card) => [{ k: 'discardSameName', pid, card }],
};
