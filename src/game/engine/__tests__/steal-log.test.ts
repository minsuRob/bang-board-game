/**
 * 강탈·캣 벌로우 로그가 무엇을 드러내는가.
 *
 * 가운데 연출(ui/spotlight-pick)은 로그의 card 로 앞면·뒷면을 고른다.
 * 강탈로 손패에서 뽑은 카드는 로그에 남기지 않고, 앞에 놓인 장비는 남긴다.
 * 캣 벌로우로 손패에서 버린 카드는 버린 더미에 앞면으로 놓이므로 모두에게 이름을 밝힌다.
 * 강탈은 가져간 사람과 빼앗긴 사람에게만 카드 이름을 보여 준다 (viewFor).
 */

import { describe, expect, it } from 'vitest';

import { reduce } from '../reducer';
import { viewFor } from '../view';
import { handCard, p, scenario } from './helpers';
import type { GameState } from '../types';

const lastOf = (s: GameState, t: string) => [...s.log].reverse().find((e) => e.t === t);
const msgOf = (s: GameState, t: string) => lastOf(s, t)?.msg;

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

describe('강탈·캣 벌로우 로그', () => {
  it('강탈: 손패에서 뽑으면 카드를 남기지 않는다', () => {
    const { s } = steal('panic', 'hand');
    const e = lastOf(s, 'panic');
    expect(e?.target).toBe('p0');
    expect(e?.card).toBeUndefined();
  });

  it('캣 벌로우: 손패에서 버리게 하면 모두에게 카드 이름을 밝힌다', () => {
    const { s0, s } = steal('catBalou', 'hand');
    const e = lastOf(s, 'catBalou');
    expect(e?.card).toBe(p(s0, 'p0').hand[0]);
    expect(e?.fromHand).toBe(true);
    for (const pid of ['p0', 'p1', 'p2']) {
      expect(msgOf(viewFor(s, pid), 'catBalou')).toMatchObject({ k: 'catBalou', fromHand: true, card: 'bang' });
    }
  });

  it.each(['panic', 'catBalou'] as const)('%s: 장비를 뽑으면 그 카드를 남긴다', (kind) => {
    const { s0, s } = steal(kind, 'equipment');
    const e = lastOf(s, kind);
    expect(e?.target).toBe('p0');
    expect(e?.card).toBe(p(s0, 'p0').equipment[0]);
    expect(msgOf(s, kind)).toMatchObject({ k: kind, fromHand: false, card: 'barrel' });
  });

  it('강탈: 손패에서 뽑으면 텍스트에도 이름을 적지 않는다', () => {
    const { s } = steal('panic', 'hand');
    const e = lastOf(s, 'panic');
    expect(msgOf(s, 'panic')).toEqual({ k: 'panic', who: 'p1', target: 'p0', fromHand: true });
  });

  it('강탈: 가져간 사람과 빼앗긴 사람만 카드 이름을 본다', () => {
    const { s } = steal('panic', 'hand');
    for (const pid of ['p0', 'p1']) {
      const e = lastOf(viewFor(s, pid), 'panic');
      expect(msgOf(viewFor(s, pid), 'panic')).toMatchObject({ k: 'panic', fromHand: true, card: 'bang' });
      expect(e?.card).toBeUndefined();
    }
    const other = lastOf(viewFor(s, 'p2'), 'panic');
    expect(msgOf(viewFor(s, 'p2'), 'panic')).toEqual({ k: 'panic', who: 'p1', target: 'p0', fromHand: true });
    expect(other?.secret).toBeUndefined();
    // 가려진 쪽의 msg 에는 카드 종류가 없다
    expect(other?.msg).toEqual({ k: 'panic', who: 'p1', target: 'p0', fromHand: true });
  });
});
