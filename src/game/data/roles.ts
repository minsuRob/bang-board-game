/**
 * 역할과 인원수별 분배.
 *
 * 7인 구성(보안관1·부관2·무법자3·배신자1)은 도감 이미지
 * reference/sc2-arcade/images/howtoplay_671dc0586240.jpg 에서 확인했고,
 * 나머지 인원수는 원작 룰북 값이다.
 */

import type { Role } from './types';

export const ROLE_DISTRIBUTION: Record<number, readonly Role[]> = {
  4: ['sheriff', 'outlaw', 'outlaw', 'renegade'],
  5: ['sheriff', 'deputy', 'outlaw', 'outlaw', 'renegade'],
  6: ['sheriff', 'deputy', 'outlaw', 'outlaw', 'outlaw', 'renegade'],
  7: ['sheriff', 'deputy', 'deputy', 'outlaw', 'outlaw', 'outlaw', 'renegade'],
  // 8인은 닷지 시티 확장 구성. 엔진은 지원하되 기본 로비에서는 노출하지 않는다.
  8: ['sheriff', 'deputy', 'deputy', 'outlaw', 'outlaw', 'outlaw', 'renegade', 'renegade'],
};

/** 직업 id 전부. 화면에 보일 이름·목표는 i18n/content 의 `roles` 에 있다 */
export const ROLE_IDS: readonly Role[] = ['sheriff', 'deputy', 'outlaw', 'renegade'];

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 8;

/** 무법자를 처치하면 받는 현상금 (카드 장수) */
export const BOUNTY_CARDS = 3;
