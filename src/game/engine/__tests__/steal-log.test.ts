/**
 * 강탈·캣 발루 로그가 무엇을 드러내는가.
 *
 * 가운데 연출(ui/spotlight-pick)은 로그의 card 로 앞면·뒷면을 고른다.
 * 강탈로 손패에서 뽑은 카드는 로그에 남기지 않고, 앞에 놓인 장비는 남긴다.
 * 캣 발루로 손패에서 버린 카드는 버린 더미에 앞면으로 놓이므로 모두에게 이름을 밝힌다.
 * 강탈은 가져간 사람과 빼앗긴 사람에게만 카드 이름을 보여 준다 (viewFor).
 */

import { describe, expect, it } from 'vitest';

import { reduce } from '../reducer';
import { viewFor } from '../view';
import { handCard, p, scenario } from './helpers';
import type { GameState } from '../types';

const lastOf = (s: GameState, t: string) => [...s.log].reverse().find((e) => e.t === t);

function steal(kind: 'panic' | 'catBalou', zone: 'hand' | 'equipment') {
  const s0 = scenario({
    players: [{ hand: ['bang'], equipment: ['barrel'] }, { hand: [kind] }, {}, {}],
    activeSeat: 1,
  });
  const s = reduce(s0, { type: 'playCard', pid: 'p1', card: handCard(s0, 'p1', kind), target: 'p0' });
  const pick =
    zone === 'hand' ? { zone: 'hand' as const, index: 0 } : { zone: 'equipment' as const, card: p(s0, 'p0').equipment[0] };
  return { s0, s: reduce(s, { type: 'respond', pid: 'p1', choice: { c: 'pick', pick } }) };
}

describe('강탈·캣 발루 로그', () => {
  it('강탈: 손패에서 뽑으면 카드를 남기지 않는다', () => {
    const { s } = steal('panic', 'hand');
    const e = lastOf(s, 'panic');
    expect(e?.target).toBe('p0');
    expect(e?.card).toBeUndefined();
  });

  it('캣 발루: 손패에서 버리게 하면 모두에게 카드 이름을 밝힌다', () => {
    const { s0, s } = steal('catBalou', 'hand');
    const e = lastOf(s, 'catBalou');
    expect(e?.card).toBe(p(s0, 'p0').hand[0]);
    expect(e?.fromHand).toBe(true);
    for (const pid of ['p0', 'p1', 'p2']) {
      expect(lastOf(viewFor(s, pid), 'catBalou')?.text).toContain('"뱅!"을 버리게 했다');
    }
  });

  it.each(['panic', 'catBalou'] as const)('%s: 장비를 뽑으면 그 카드를 남긴다', (kind) => {
    const { s0, s } = steal(kind, 'equipment');
    const e = lastOf(s, kind);
    expect(e?.target).toBe('p0');
    expect(e?.card).toBe(p(s0, 'p0').equipment[0]);
    expect(e?.text).toContain('술통을');
  });

  it('강탈: 손패에서 뽑으면 텍스트에도 이름을 적지 않는다', () => {
    const { s } = steal('panic', 'hand');
    const e = lastOf(s, 'panic');
    expect(e?.text).toContain('카드를');
    expect(e?.text).not.toContain('뱅!');
  });

  it('강탈: 가져간 사람과 빼앗긴 사람만 카드 이름을 본다', () => {
    const { s } = steal('panic', 'hand');
    for (const pid of ['p0', 'p1']) {
      const e = lastOf(viewFor(s, pid), 'panic');
      expect(e?.text).toContain('"뱅!"을 강탈했다');
      expect(e?.card).toBeUndefined();
    }
    const other = lastOf(viewFor(s, 'p2'), 'panic');
    expect(other?.text).toContain('카드를 강탈했다');
    expect(other?.secret).toBeUndefined();
    expect(JSON.stringify(viewFor(s, 'p2').log)).not.toContain('뱅!');
  });
});
