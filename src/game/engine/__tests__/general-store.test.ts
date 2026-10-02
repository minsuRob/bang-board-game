import { describe, expect, it } from 'vitest';

import { reduce } from '../reducer';
import type { GameState } from '../types';
import { handCard, p, scenario, totalCards } from './helpers';

describe('잡화점', () => {
  it('마지막 사람은 남은 한 장을 묻지 않고 받는다', () => {
    const s0 = scenario({ players: [{ hand: ['generalStore'] }, {}, {}] });
    const before = totalCards(s0);
    let s: GameState = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'generalStore') });

    const asked: string[] = [];
    while (s.awaiting?.k === 'generalStore') {
      const a = s.awaiting;
      asked.push(a.pid);
      expect(a.options.length).toBeGreaterThan(1);
      s = reduce(s, { type: 'respond', pid: a.pid, choice: { c: 'card', card: a.options[0] } });
    }

    expect(asked).toEqual(['p0', 'p1']);
    expect(p(s, 'p2').hand).toHaveLength(p(s0, 'p2').hand.length + 1);
    expect(s.log.filter((e) => e.t === 'generalStorePick')).toHaveLength(3);
    expect(totalCards(s)).toBe(before);
  });
});
