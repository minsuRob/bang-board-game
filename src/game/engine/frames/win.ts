/**
 * 승리 판정.
 *
 * 탈락 훅에 매달지 않고 별도 프레임으로 둔다. 유령의 차례 종료·유령 카드 잃음·동시 탈락처럼
 * "탈락 이벤트가 없는데 승패가 갈리는" 순간이 있기 때문이다.
 * 여러 탈락이 한 번에 일어나면 전부 처리한 뒤 한 번만 판정한다.
 */

import { alivePlayers, inPlay, log, popFrame } from '../cards';
import { lastOneStanding } from '../hooks';
import { ga } from '../josa';
import { reasonKo, roleKo } from '../legacy-ko';
import type { GameResult, GameState } from '../types';

export function checkWin(state: GameState): GameResult | null {
  const alive = alivePlayers(state);

  // 와일드 웨스트 쇼: 역할과 상관없이 마지막까지 살아남은 한 사람이 이긴다.
  // 보안관이 쓰러져도 판은 이어진다.
  if (lastOneStanding(state)) {
    if (alive.length > 1) return null;
    const last = alive[0];
    if (!last) return { winners: [], winnerIds: [], reason: 'nobodyAlive' };
    return {
      winners: [last.role],
      winnerIds: [last.id],
      reason: 'lastStanding',
    };
  }

  const sheriff = state.players.find((p) => p.role === 'sheriff');
  if (!sheriff) return null;

  // 유령도 '남은 사람'으로 센다. 유령도시의 유령은 자기 차례 동안 (faq-highnoon-fistful.txt Q07
  // "he is considered to be in play for victory purposes"), 유령 카드의 유령은 그 카드가 앞에 있는
  // 동안이다 (valley.txt "A ghost is considered “in play” for all purposes").
  const standing = state.players.filter(inPlay);

  if (!sheriff.alive) {
    // 보안관이 제거되면 게임은 즉시 끝난다.
    // 유령 무법자·부관이 남아 있으면 배신자 혼자가 아니므로 무법자가 이긴다 (FAQ Q07).
    const others = standing.filter((p) => p.id !== sheriff.id);
    if (others.length === 1 && others[0].role === 'renegade') {
      return {
        winners: ['renegade'],
        winnerIds: [others[0].id],
        reason: 'sheriffDownRenegadeLeft',
      };
    }
    return {
      winners: ['outlaw'],
      winnerIds: state.players.filter((p) => p.role === 'outlaw').map((p) => p.id),
      reason: 'sheriffDown',
    };
  }

  const enemiesLeft = standing.some((p) => p.role === 'outlaw' || p.role === 'renegade');
  if (!enemiesLeft) {
    const lawIds = state.players
      .filter((p) => p.role === 'sheriff' || p.role === 'deputy')
      .map((p) => p.id);
    return {
      winners: ['sheriff', 'deputy'],
      winnerIds: lawIds,
      reason: 'lawWon',
    };
  }
  return null;
}

export function resolveCheckWin(state: GameState): GameState {
  const cur = popFrame(state);
  if (cur.result) return cur;

  const result = checkWin(cur);
  if (!result) return cur;

  // 와일드 웨스트 쇼에서는 역할이 아니라 사람이 이긴다
  const who = lastOneStanding(cur)
    ? result.winnerIds.map((id) => cur.players.find((p) => p.id === id)?.name ?? id).join('·')
    : result.winners.map((r) => roleKo(r)).join('·');
  // 로그 문장용 (번역 묶음 D 에서 LogMsg 로 바뀐다)
  const why =
    result.reason === 'lastStanding'
      ? `${ga(cur.players.find((p) => p.id === result.winnerIds[0])?.name ?? '')} ${reasonKo(result.reason)}`
      : reasonKo(result.reason);
  return log({ ...cur, result, stack: [], awaiting: null }, {
    t: 'gameEnd',
    text: who ? `${who} 승리. ${why}` : `승자 없음. ${why}`,
  });
}
