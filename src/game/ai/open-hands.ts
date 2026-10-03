/**
 * 펼쳐진 손패 읽기 (사카가웨이).
 *
 * viewFor 는 사카가웨이가 걸려 있으면 남의 손패를 그대로 넘긴다. 여기서는 그 손패로
 * "이 사람이 지금 무엇을 낼 수 있나"를 센다. 한 장이라도 가려져 있으면 모른다(null).
 */

import type { CardId, CardKind } from '../data/types';
import { playerOf, type GameState, type PlayerId } from '../engine';
import { handsRevealed, playableAs } from '../engine/hooks';
import { isHidden } from '../engine/view';

/**
 * 남의 손패가 펼쳐져 있으면 그 카드들, 아니면 null.
 *
 * 상 난이도는 숨은 손패를 지어낸 '전체 상태'로도 이 정책을 굴린다. 거기서는 손패가
 * 다 보이지만 실제로는 모르는 것이므로, 사카가웨이가 걸렸을 때만 안다고 친다.
 */
export function knownHand(view: GameState, pid: PlayerId): readonly CardId[] | null {
  if (!handsRevealed(view)) return null;
  const hand = playerOf(view, pid).hand;
  return hand.some(isHidden) ? null : hand;
}

/**
 * pid 가 남의 차례에 as 로 낼 수 있는 카드 장수. 손패를 모르면 null.
 * 캘러미티 자넷·결투장 같은 '다른 카드로 친다'는 엔진 훅을 그대로 따른다.
 */
export function knownReactive(view: GameState, pid: PlayerId, as: CardKind): number | null {
  if (!knownHand(view, pid)) return null;
  return playableAs(view, pid, as, true).length;
}

/**
 * 결투 승패를 셈으로 안다.
 *
 * 지금 낼 차례인 사람이 카드 first 장, 상대가 second 장을 낼 수 있으면 서로 한 장씩
 * 버리다가 먼저 떨어지는 쪽이 진다. 먼저 내는 쪽은 더 많이 쥐었을 때만 이긴다.
 */
export function firstWinsDuel(first: number, second: number): boolean {
  return first > second;
}
