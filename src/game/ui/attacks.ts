/**
 * 누가 나를 몇 번 겨눴는가. 좌석 이름 옆 배지가 쓴다.
 *
 * 로그의 `playCard` 만 센다. 강탈·캣 벌로우·결투의 후속 로그(`panic`, `duelBang` …)는
 * 같은 카드 한 장을 두 번 세게 되므로 빼고, 개틀링·인디언처럼 대상이 없는 카드는 자연히 빠진다.
 */

import type { CardKind } from '../data/types';
import { isHidden, kindOf, type GameEvent, type PlayerId } from '../engine';

/** 한 사람을 겨누는 해로운 카드. 배지는 이 순서로 늘어선다 */
export const ATTACK_KINDS = ['bang', 'duel', 'catBalou', 'panic', 'jail'] as const satisfies readonly CardKind[];

export type AttackKind = (typeof ATTACK_KINDS)[number];
export type AttackCounts = Partial<Record<AttackKind, number>>;

function asAttack(kind: CardKind): AttackKind | null {
  // 대상과 함께 나온 빗나감!은 칼라미티 자넷의 뱅!이다
  if (kind === 'missed') return 'bang';
  return (ATTACK_KINDS as readonly CardKind[]).includes(kind) ? (kind as AttackKind) : null;
}

/** `from` 이 `to` 를 겨눠 낸 카드를 종류별로 센다 */
export function attacksBy(log: readonly GameEvent[], from: PlayerId, to: PlayerId): AttackCounts {
  const out: AttackCounts = {};
  if (from === to) return out;
  for (const ev of log) {
    if (ev.t !== 'playCard' || ev.pid !== from || ev.target !== to || !ev.card || isHidden(ev.card)) continue;
    const kind = asAttack(ev.as ?? kindOf(ev.card));
    if (kind) out[kind] = (out[kind] ?? 0) + 1;
  }
  return out;
}
