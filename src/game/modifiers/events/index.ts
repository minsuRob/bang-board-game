import type { EventCardId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';
import { FISTFUL_EVENT_MODIFIERS } from './fistful';
import { HIGHNOON_EVENT_MODIFIERS } from './highnoon';

/** 모든 확장판의 이벤트 훅. 지금 공개된 이벤트 id 하나로 찾는다 */
export const EVENT_MODIFIERS: Record<EventCardId, Modifier> = {
  ...HIGHNOON_EVENT_MODIFIERS,
  ...FISTFUL_EVENT_MODIFIERS,
};
