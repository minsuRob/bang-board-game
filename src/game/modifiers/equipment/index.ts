/**
 * 장비 카드 훅 등록소.
 *
 * 무기(스코필드·레밍턴·카빈·윈체스터)는 사정거리만 바꾸므로 훅이 없다.
 * 사정거리는 카드 정의(CARD_DEFS[kind].weaponRange)에서 읽는다.
 */
import type { CardId, CardKind } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

import { barrel } from './barrel';
import { dynamite } from './dynamite';
import { jail } from './jail';
import { mustang } from './mustang';
import { scope } from './scope';
import { volcanic } from './volcanic';
import { bounty } from './bounty';
import { lemat } from './lemat';
import { rattlesnake } from './rattlesnake';
import { shotgun } from './shotgun';

type Factory = (card: CardId) => Modifier;

const FACTORIES: Partial<Record<CardKind, Factory>> = {
  barrel,
  mustang,
  scope,
  volcanic,
  dynamite,
  jail,
  bounty,
  lemat,
  rattlesnake,
  shotgun,
};

export function equipmentModifier(kind: CardKind, card: CardId): Modifier | null {
  const make = FACTORIES[kind];
  return make ? make(card) : null;
}
