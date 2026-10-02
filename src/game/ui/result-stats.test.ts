import { describe, expect, it } from 'vitest';

import type { GameState } from '../engine/types';
import { resultRows } from './result-stats';

function player(id: string, role: GameState['players'][number]['role'], alive: boolean, hp: number) {
  return {
    id,
    name: id,
    role,
    character: 'bartCassidy',
    alive,
    hp,
    maxHp: 4,
  } as GameState['players'][number];
}

describe('resultRows', () => {
  const state = {
    players: [
      player('a', 'sheriff', false, 0),
      player('b', 'outlaw', true, 2),
      player('c', 'deputy', false, -1),
      player('d', 'outlaw', true, 3),
    ],
    log: [
      { t: 'damage', pid: 'b', target: 'c', amount: 2, text: '', seq: 1 },
      { t: 'damage', pid: 'c', target: 'c', amount: 1, text: '', seq: 2 },
      { t: 'eliminate', pid: 'b', target: 'c', text: '', seq: 3 },
      { t: 'damage', pid: 'b', target: 'a', amount: 1, text: '', seq: 4 },
      { t: 'damage', target: 'a', amount: 3, text: '', seq: 5 },
      { t: 'eliminate', target: 'a', text: '', seq: 6 },
    ],
    result: { winners: ['outlaw'], winnerIds: ['b', 'd'], reason: '' },
  } as unknown as GameState;

  it('처치·준 피해·받은 피해를 센다 (자해는 준 피해가 아니다)', () => {
    const rows = Object.fromEntries(resultRows(state).map((r) => [r.id, r]));
    expect(rows.b).toMatchObject({ kills: 1, dealt: 3, taken: 0, won: true });
    expect(rows.c).toMatchObject({
      kills: 0,
      dealt: 0,
      taken: 3,
      outOrder: 1,
      hp: 0,
    });
    expect(rows.a).toMatchObject({ taken: 4, outOrder: 2 });
  });

  it('이긴 사람, 늦게 탈락한 사람 순으로 줄 세운다', () => {
    expect(resultRows(state).map((r) => r.id)).toEqual(['b', 'd', 'a', 'c']);
  });
});
