/**
 * 와일드 웨스트 쇼 확장 이벤트 10종의 능력 훅.
 *
 * 진행은 하이 눈과 같다. 보안관의 두 번째 차례부터 보안관의 차례 시작마다 새 카드가
 * 공개되어 이전 이벤트를 대체하고, 마지막 '와일드 웨스트 쇼'는 끝까지 남는다.
 */

import type { WildWestShowEventId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

const ev = (id: WildWestShowEventId): Modifier => ({ id: `event:${id}`, from: 'event' });

export const WILDWESTSHOW_EVENT_MODIFIERS: Record<WildWestShowEventId, Modifier> = {
  gag: ev('gag'),
  boneOrchard: ev('boneOrchard'),
  darlingValentine: ev('darlingValentine'),
  dorothyRage: ev('dorothyRage'),
  helenaZontero: ev('helenaZontero'),
  ladyRoseOfTexas: ev('ladyRoseOfTexas'),
  missSusanna: ev('missSusanna'),
  showdown: ev('showdown'),
  sacagaway: ev('sacagaway'),
  wildWestShow: ev('wildWestShow'),
};
