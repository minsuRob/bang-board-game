/**
 * 가운데 "자동 플레이" 알림이 띄울 내용을 고른다.
 *
 * 사람 자리의 제한시간이 지나 엔진이 기본 행동을 대신 넣은 순간이다 (timeout 액션).
 * AI 자리의 timeout(드래프트 마감 때 함께 들어간다)은 알리지 않는다.
 */

import type { GameState, PlayerId } from '../engine';
import type { Transition } from '../store/transition-bus';

export type AutoPlayNotice = {
  /** 자동으로 넘어간 사람 자리. 드래프트 마감처럼 여럿이 한꺼번에 넘어갈 수 있다 */
  pids: PlayerId[];
};

/** 이 전이가 사람 자리의 자동 플레이면 그 자리를 돌려준다 */
export function autoPlayOf(
  t: Transition,
  seats: readonly { id: PlayerId; human: boolean }[],
): PlayerId | null {
  if (t.action.type !== 'timeout') return null;
  const pid = t.action.pid;
  if (seats.find((s) => s.id === pid)?.human !== true) return null;
  // 기본 행동이 없어 아무 일도 없었던 timeout 은 로그를 남기지 않는다
  const acted = t.next.log.some((e) => e.seq === t.next.seq && e.t === 'timeout');
  return acted ? pid : null;
}

export function autoPlayText(
  notice: AutoPlayNotice,
  state: Pick<GameState, 'players'>,
  viewer: PlayerId | null,
): string {
  if (viewer && notice.pids.includes(viewer)) return '내 제한시간이 지나 기본 행동을 대신했다';
  const names = notice.pids.map((pid) => state.players.find((p) => p.id === pid)?.name ?? pid);
  return `${names.join(' · ')}의 제한시간이 지나 기본 행동을 대신했다`;
}
