import type { DamageCause } from '../../engine/types';

/**
 * '뱅!에 맞았다'로 치는 피해 원인. 포상금·샷건이 여기에 반응한다.
 * 원본 맵 v0.277: 기관총·역화·이블린·패닝·헨리 블록의 반격처럼 뱅! 효과로 명시된 것도 포함한다.
 */
export const BANG_CAUSES: readonly DamageCause[] = [
  'bang', 'gatling', 'fanning', 'tomahawk', 'backfire', 'evelyn', 'henryBlock',
];
