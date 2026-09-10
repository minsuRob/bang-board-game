/**
 * 시야 투영.
 *
 * 락스텝이라 모든 클라이언트가 전체 상태를 들고 있다. 그래서 UI 와 AI 에게는
 * 반드시 가려진 사본만 넘긴다. 가린 카드는 물음표 하나로 바뀌므로,
 * 실수로 남의 손패를 들여다보는 코드가 있으면 조용히 유리해지는 게 아니라
 * 카드 조회에서 곧바로 터진다.
 */

import type { CardId, Role } from '../data/types';
import { playerOf } from './cards';
import type { GameState, PlayerId } from './types';

/** 가려진 카드 자리표시자 */
export const HIDDEN_CARD: CardId = '?';

export function isHidden(card: CardId): boolean {
  return card === HIDDEN_CARD;
}

function hiddenList(n: number): CardId[] {
  return new Array(n).fill(HIDDEN_CARD);
}

/** 이 사람에게 역할이 보이는가 (자신 · 보안관 · 탈락자) */
export function roleVisibleTo(
  viewer: PlayerId,
  target: { id: PlayerId; role: Role; roleRevealed: boolean },
): boolean {
  return target.id === viewer || target.roleRevealed;
}

/**
 * pid 의 눈으로 본 상태.
 *
 * 형태는 GameState 그대로라서 거리 계산·합법 액션 열거가 그대로 돌아간다.
 * 가려지는 것: 남의 손패, 덱, 남은 이벤트 덱, 감춰진 역할.
 */
export function viewFor(state: GameState, pid: PlayerId): GameState {
  return {
    ...state,
    players: state.players.map((p) => {
      if (p.id === pid) return p;
      return {
        ...p,
        hand: hiddenList(p.hand.length),
        role: roleVisibleTo(pid, p) ? p.role : ('outlaw' as Role),
        // 역할이 안 보이면 UI 와 AI 는 roleRevealed 로 판단해야 한다.
      };
    }),
    deck: hiddenList(state.deck.length),
    event: state.event ? { ...state.event, deck: [] } : null,
  };
}

/** 아직 아무도 못 본 카드들 (하드 AI 의 결정화에 쓰인다) */
export function unseenCards(view: GameState, pid: PlayerId, allCards: CardId[]): CardId[] {
  const seen = new Set<CardId>();
  for (const c of playerOf(view, pid).hand) seen.add(c);
  for (const p of view.players) for (const c of p.equipment) seen.add(c);
  for (const c of view.discard) seen.add(c);
  return allCards.filter((c) => !seen.has(c));
}
