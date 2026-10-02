/**
 * 한줌의 카드 확장 이벤트 15종의 능력 훅.
 *
 * 진행은 하이 눈과 같다. 보안관의 두 번째 차례부터 보안관의 차례 시작마다 새 카드가
 * 공개되어 이전 이벤트를 대체하고, 마지막 '한줌의 카드'는 끝까지 남는다.
 *
 * 아직 효과는 붙이지 않았다. feat/fistful-of-cards 브랜치의 훅을 현재 엔진에 맞춰 옮길 자리다.
 */

import type { FistfulEventId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

const ev = (id: FistfulEventId): Modifier => ({ id: `event:${id}`, from: 'event' });

export const FISTFUL_EVENT_MODIFIERS: Record<FistfulEventId, Modifier> = {
  abandonedMine: ev('abandonedMine'),
  ambush: ev('ambush'),
  bloodBrothers: ev('bloodBrothers'),
  deadMan: ev('deadMan'),
  hardLiquor: ev('hardLiquor'),
  lasso: ev('lasso'),
  lawOfTheWest: ev('lawOfTheWest'),
  peyote: ev('peyote'),
  ranch: ev('ranch'),
  ricochet: ev('ricochet'),
  russianRoulette: ev('russianRoulette'),
  sniper: ev('sniper'),
  theJudge: ev('theJudge'),
  vendetta: ev('vendetta'),
  fistfulOfCards: ev('fistfulOfCards'),
};
