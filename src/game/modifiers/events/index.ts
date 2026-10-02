/**
 * 이벤트 능력 훅 등록소. 확장판마다 파일 하나씩 두고 여기서 합친다.
 */
import type { EventCardId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

import { HIGHNOON_EVENT_MODIFIERS } from './highnoon';
import { WILDWESTSHOW_EVENT_MODIFIERS } from './wildwestshow';
import { FISTFUL_EVENT_MODIFIERS } from './fistful';

export const EVENT_MODIFIERS: Record<EventCardId, Modifier> = {
  ...HIGHNOON_EVENT_MODIFIERS,
  ...WILDWESTSHOW_EVENT_MODIFIERS,
  ...FISTFUL_EVENT_MODIFIERS,
};
