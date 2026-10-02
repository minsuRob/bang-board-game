/**
 * 가운데 카드 연출(PlayedCardSpotlight)이 새 로그 중에서 무엇을 띄울지 고른다.
 *
 * 손에서 낸 카드와 새로 공개된 이벤트 카드를 띄운다. 한 번에 여러 개가 들어왔으면 가장 나중 것.
 * 남의 카드를 버리게·가져가게 한 결과(캣 발루·강탈·리코체)도 띄운다.
 * 공개된 카드(장비)면 그 카드, 손패에서 뽑았으면 로그에 카드가 없어 뒷면이다.
 * 판정·블랙 잭·피요테처럼 카드를 펼친 결과도 띄운다 (로그의 reveal).
 *
 * 낸 카드 뒤에 결과가 이어지면(뱅! → 술통 판정) 둘 다 순서대로 띄운다.
 */

import { EVENTS } from '../data/events';
import type { CardId, EventCardDef } from '../data/types';
import { isHidden, type GameEvent } from '../engine';

/** 손에서 카드를 내는 로그 */
const PLAY_EVENTS = new Set(['playCard', 'playMissed', 'indiansBang', 'duelBang']);

/** 남의 카드 한 장을 버리게 하거나 가져간 결과 로그 */
const TAKE_EVENTS = new Set(['catBalou', 'panic', 'ricochet']);

export function isTakeEvent(e: GameEvent): boolean {
  return TAKE_EVENTS.has(e.t) && Boolean(e.target);
}

/** 결과 로그에서 앞면으로 보여 줄 카드. 손패에서 뽑아 가려졌으면 null (뒷면) */
export function takenCardOf(e: GameEvent): CardId | null {
  return e.card && !isHidden(e.card) ? e.card : null;
}

/** 이벤트 공개 로그의 카드 정의. 이벤트 로그가 아니거나 모르는 이벤트면 null */
export function revealedEventOf(e: GameEvent): EventCardDef | null {
  if (e.t !== 'event' || !e.card) return null;
  return (EVENTS as Record<string, EventCardDef | undefined>)[e.card] ?? null;
}

/** 카드를 펼친 결과 (판정·블랙 잭·피요테) */
export function isRevealEvent(e: GameEvent): boolean {
  return Boolean(e.reveal && e.card && !isHidden(e.card));
}

/** 앞선 카드에 이어 붙는 결과. 낸 카드를 덮지 않고 뒤에 줄 선다 */
export function isFollowUp(e: GameEvent): boolean {
  return isTakeEvent(e) || isRevealEvent(e);
}

function isMain(e: GameEvent): boolean {
  if (e.t === 'event') return revealedEventOf(e) !== null;
  return PLAY_EVENTS.has(e.t) && Boolean(e.card) && !isHidden(e.card!);
}

/** 한 번에 띄울 수 있는 최대 개수. 빨리 둘 때 연출이 밀리지 않게 */
const MAX_QUEUE = 3;

/**
 * seq 가 since 보다 뒤인 로그 중 가운데에 띄울 것들을 순서대로.
 * 마지막 낸 카드(또는 이벤트)와 그 뒤의 결과들. 낸 카드가 없으면 결과들만.
 */
export function pickSpotlights(log: readonly GameEvent[], since: number): GameEvent[] {
  let start = log.length;
  while (start > 0 && log[start - 1].seq > since) start--;
  const fresh = log.slice(start).filter((e) => isMain(e) || isFollowUp(e));
  let lastMain = -1;
  fresh.forEach((e, i) => {
    if (isMain(e)) lastMain = i;
  });
  const picked = lastMain >= 0 ? fresh.slice(lastMain) : fresh;
  return picked.slice(-MAX_QUEUE);
}

/** seq 가 since 보다 뒤인 로그 중 가운데에 띄울 마지막 것 */
export function pickSpotlight(log: readonly GameEvent[], since: number): GameEvent | null {
  return pickSpotlights(log, since).at(-1) ?? null;
}
