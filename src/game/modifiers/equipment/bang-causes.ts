import type { DamageCause } from '../../engine/types';

/**
 * '뱅! 효과에 맞았다'로 치는 피해 원인. 샷건이 여기에 반응한다.
 * 원본 맵 v0.277: 기관총·역화·이블린·패닝·헨리 블록의 반격처럼 뱅! 효과로 명시된 것도 포함한다.
 * (샷건의 발동 범위는 결정 항목에 올라 있어 그대로 둔다)
 */
export const BANG_CAUSES: readonly DamageCause[] = [
  'bang', 'gatling', 'fanning', 'tomahawk', 'backfire', 'evelyn', 'henryBlock',
];

/**
 * '뱅! 카드에 맞았다'로 치는 피해 원인. 포상금이 여기에 반응한다.
 * 진짜 뱅!과 뱅!으로 치는 카드(르매트·칼라미티 자넷·블랙 플라워 ♣·조준을 얹은 뱅!)는 모두 'bang' 이다.
 *
 * VoS 룰 5쪽: "Whenever an effect requires a BANG! or Missed! card, (e.g., Colorado Bill, Mick Defender,
 * Bounty, etc.), you must use a real BANG! or Missed! card, or a card that counts as a BANG! or Missed!
 * card (e.g. LeMat, Calamity Janet, etc., but not Gatling, Fanning, etc.)."
 */
export const BANG_CARD_CAUSES: readonly DamageCause[] = ['bang'];
