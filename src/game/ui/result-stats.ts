/**
 * 판이 끝났을 때 결과 표에 쓰는 사람별 기록. 로그만 읽는다.
 *
 * - 처치: 남을 제거한 횟수 (자기 자신은 세지 않는다)
 * - 준 피해 / 받은 피해: damage 로그의 amount 합. 자해는 준 피해에 넣지 않는다
 * - 탈락 순서: 제거된 차례 (1 이 가장 먼저). 살아남았으면 null
 */

import type { Role } from '../data/types';
import type { GameState, PlayerId } from '../engine/types';

export type ResultRow = {
  id: PlayerId;
  name: string;
  character: GameState['players'][number]['character'];
  role: Role;
  won: boolean;
  alive: boolean;
  hp: number;
  maxHp: number;
  kills: number;
  dealt: number;
  taken: number;
  outOrder: number | null;
};

export function resultRows(state: Pick<GameState, 'players' | 'log' | 'result'>): ResultRow[] {
  const winners = new Set(state.result?.winnerIds ?? []);
  const kills: Record<PlayerId, number> = {};
  const dealt: Record<PlayerId, number> = {};
  const taken: Record<PlayerId, number> = {};
  const outOrder: Record<PlayerId, number> = {};
  let outs = 0;

  for (const ev of state.log) {
    if (ev.t === 'damage' && ev.target) {
      const n = ev.amount ?? 0;
      taken[ev.target] = (taken[ev.target] ?? 0) + n;
      if (ev.pid && ev.pid !== ev.target) dealt[ev.pid] = (dealt[ev.pid] ?? 0) + n;
    } else if (ev.t === 'eliminate' && ev.target) {
      // 유령도시로 잠깐 돌아온 사람이 다시 제거돼도 처음 순서를 지킨다
      if (outOrder[ev.target] === undefined) outOrder[ev.target] = ++outs;
      if (ev.pid && ev.pid !== ev.target) kills[ev.pid] = (kills[ev.pid] ?? 0) + 1;
    }
  }

  const rows = state.players.map((p): ResultRow => ({
    id: p.id,
    name: p.name,
    character: p.character,
    role: p.role,
    won: winners.has(p.id),
    alive: p.alive,
    hp: Math.max(0, p.hp),
    maxHp: p.maxHp,
    kills: kills[p.id] ?? 0,
    dealt: dealt[p.id] ?? 0,
    taken: taken[p.id] ?? 0,
    outOrder: p.alive ? null : (outOrder[p.id] ?? null),
  }));

  // 이긴 사람 → 살아남은 사람 → 늦게 탈락한 사람 순. 같으면 자리 순서
  return rows
    .map((r, seat) => ({ r, seat }))
    .sort((a, b) => rank(b.r) - rank(a.r) || a.seat - b.seat)
    .map(({ r }) => r);
}

function rank(r: ResultRow): number {
  return (r.won ? 1000 : 0) + (r.alive ? 100 : (r.outOrder ?? 0));
}
