/**
 * 러키 듀크 — '카드 펼치기'를 할 때마다 두 장을 보고 원하는 한 장을 펼친다.
 *
 * 판정을 함수가 아니라 프레임으로 만든 이유가 이 캐릭터다.
 * 고르지 않은 카드도 버린 더미로 간다.
 */
import type { Modifier } from '../../engine/modifier';

export const luckyDuke: Modifier = {
  id: 'char:luckyDuke',
  from: 'character',
  judgementPeek: 2,
};
