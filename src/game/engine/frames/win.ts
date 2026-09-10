/**
 * 승리 판정.
 *
 * 탈락 훅에 매달지 않고 별도 프레임으로 둔다. 유령의 차례 종료·동시 탈락처럼
 * "탈락 이벤트가 없는데 승패가 갈리는" 순간이 있기 때문이다.
 * 여러 탈락이 한 번에 일어나면 전부 처리한 뒤 한 번만 판정한다.
 */

import type { Role } from '../../data/types';
import { alivePlayers, log, popFrame } from '../cards';
import type { GameResult, GameState } from '../types';

export function checkWin(state: GameState): GameResult | null {
  const alive = alivePlayers(state);
  const sheriff = state.players.find((p) => p.role === 'sheriff');
  if (!sheriff) return null;

  if (!sheriff.alive) {
    // 보안관이 제거되면 게임은 즉시 끝난다.
    const others = alive.filter((p) => p.id !== sheriff.id);
    if (others.length === 1 && others[0].role === 'renegade') {
      return {
        winners: ['renegade'],
        winnerIds: [others[0].id],
        reason: '보안관이 제거되고 배신자만 남았다.',
      };
    }
    return {
      winners: ['outlaw'],
      winnerIds: state.players.filter((p) => p.role === 'outlaw').map((p) => p.id),
      reason: '보안관이 제거되었다.',
    };
  }

  const enemiesLeft = alive.some((p) => p.role === 'outlaw' || p.role === 'renegade');
  if (!enemiesLeft) {
    const lawIds = state.players
      .filter((p) => p.role === 'sheriff' || p.role === 'deputy')
      .map((p) => p.id);
    return {
      winners: ['sheriff', 'deputy'],
      winnerIds: lawIds,
      reason: '모든 무법자와 배신자가 제거되었다.',
    };
  }
  return null;
}

export function resolveCheckWin(state: GameState): GameState {
  const cur = popFrame(state);
  if (cur.result) return cur;

  const result = checkWin(cur);
  if (!result) return cur;

  const label: Record<Role, string> = {
    sheriff: '보안관',
    deputy: '부관',
    outlaw: '무법자',
    renegade: '배신자',
  };
  return log({ ...cur, result, stack: [], awaiting: null }, {
    t: 'gameEnd',
    text: `${result.winners.map((r) => label[r]).join('·')} 승리. ${result.reason}`,
  });
}
