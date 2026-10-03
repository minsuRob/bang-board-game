/**
 * 엘 그링고 — 남이 낸 카드로 생명력 1을 잃을 때마다 그 사람의 손에서 카드 한 장을 무작위로 가져온다.
 *
 * 총알 3개짜리 캐릭터. 가해자가 없는 피해(다이너마이트·하이 눈)에는 발동하지 않고,
 * 가해자의 손이 비어 있으면 아무 일도 없다.
 * 자동으로 발동하는 능력이라 헨리 블록이 반응하지 않는다 (VoS 룰 5쪽 헨리 블록 해설:
 * "not against automatic abilities like El Gringo’s").
 */
import type { Modifier } from '../../engine/modifier';

export const elGringo: Modifier = {
  id: 'char:elGringo',
  from: 'character',
  onDamaged: ({ pid }, amount, source) =>
    source && source !== pid && amount > 0
      ? [{ k: 'drawFromPlayer', pid, from: source, count: amount, auto: true }]
      : [],
};
