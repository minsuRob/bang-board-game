/**
 * 블랙 플라워 — 자기 차례에 한 번, ♣ 카드 아무거나를 추가 뱅!으로 쓸 수 있다.
 *
 * '추가'라서 차례당 뱅! 횟수를 쓰지 않는다. 능력으로 먼저 쏴도 일반 뱅!은 남는다 (원본 맵 v0.275).
 * 무늬는 실제 적용 무늬로 본다 (축복이면 전부 ♥ 라 쓸 수 없다).
 */
import type { Modifier } from '../../engine/modifier';

export const BLACK_FLOWER_ABILITY = 'blackFlower';

export const blackFlower: Modifier = {
  id: 'char:blackFlower',
  from: 'character',
  playAnyAs: { key: BLACK_FLOWER_ABILITY, label: '♣ 카드 → 추가 뱅!', as: 'bang', suit: 'clubs', extra: true },
};
