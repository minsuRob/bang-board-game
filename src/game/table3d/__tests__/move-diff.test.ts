import { describe, expect, it } from 'vitest';

import { reduce } from '../../engine';
import { scenario } from '../../engine/__tests__/helpers';
import { diffZones, positionIn, zoneKey } from '../core/move-diff';

describe('diffZones', () => {
  it('갈색 카드를 내면 손 → 버린 더미 한 건이다', () => {
    const prev = scenario({ players: [{ hand: ['stagecoach'] }, {}] });
    const me = prev.players[0];
    const card = me.hand[0];
    const next = reduce(prev, { type: 'playCard', pid: me.id, card });
    const moves = diffZones(prev, next).filter((m) => m.card === card);
    expect(moves).toEqual([{ card, from: { z: 'hand', pid: me.id }, to: { z: 'discard' } }]);
    expect(positionIn(next, { z: 'discard' }, card)).toEqual({ index: next.discard.length - 1, count: next.discard.length });
  });

  it('파랑 카드를 내면 손 → 장착이다', () => {
    const prev = scenario({ players: [{ hand: ['mustang'] }, {}] });
    const me = prev.players[0];
    const card = me.hand[0];
    const next = reduce(prev, { type: 'playCard', pid: me.id, card });
    expect(diffZones(prev, next)).toEqual([{ card, from: { z: 'hand', pid: me.id }, to: { z: 'equipment', pid: me.id } }]);
  });

  it('차례가 넘어가면 다음 사람이 덱에서 두 장 받는다', () => {
    const prev = scenario({ players: [{ hand: [] }, { hand: [] }, {}, {}] });
    const next = reduce(prev, { type: 'endTurn', pid: prev.players[0].id });
    const moves = diffZones(prev, next);
    const dealt = moves.filter((m) => m.from?.z === 'deck' && m.to?.z === 'hand');
    expect(dealt.length).toBeGreaterThanOrEqual(2);
    expect(new Set(dealt.map((m) => zoneKey(m.to))).size).toBe(1);
  });

  it('같은 상태면 이동이 없다', () => {
    const s = scenario({ players: [{ hand: ['bang'] }, {}] });
    expect(diffZones(s, s)).toEqual([]);
  });
});
