import { describe, expect, it } from 'vitest';

import { CHARACTERS } from '../../data/characters';
import { SID_KETCHUM_ABILITY } from '../../modifiers';
import { actorsOf, legalActions } from '../legal';
import { defaultAction, reduce } from '../reducer';
import type { Action, GameState } from '../types';
import { viewFor } from '../view';
import { autoDraft, totalCards } from './helpers';

function start(count: number, highnoon = false, seed = 17): GameState {
  const seats = Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  const action: Action = {
    type: 'startGame',
    seed,
    config: { playerCount: count, expansions: highnoon ? ['highnoon'] : [] },
    seats,
  };
  return reduce(null, action);
}

describe('캐릭터 드래프트', () => {
  it('4·5인은 후보 3장, 6·7인은 2장이고 서로 겹치지 않는다', () => {
    for (const [count, per] of [
      [4, 3],
      [5, 3],
      [6, 2],
      [7, 2],
    ]) {
      const s = start(count);
      const all = Object.values(s.draft!.offers);
      expect(all).toHaveLength(count);
      for (const o of all) expect(o).toHaveLength(per);
      expect(new Set(all.flat()).size).toBe(count * per);
    }
  });

  it('고르기 전에는 손패가 없고 모두가 동시에 행동한다', () => {
    const s = start(5);
    expect(s.players.every((p) => p.hand.length === 0)).toBe(true);
    expect(s.deck).toHaveLength(80);
    expect(s.stack).toHaveLength(0);
    expect(actorsOf(s)).toEqual(s.players.map((p) => p.id));
    for (const p of s.players) {
      expect(legalActions(s, p.id).every((a) => a.type === 'pickCharacter')).toBe(true);
    }
  });

  it('고른 사람은 더 고를 수 없고, 남의 후보도 고를 수 없다', () => {
    let s = start(5);
    const mine = s.draft!.offers.p0;
    const other = s.draft!.offers.p1[0];
    s = reduce(s, { type: 'pickCharacter', pid: 'p0', character: other });
    expect(s.draft!.picked.p0).toBeNull();
    expect(s.log.at(-1)!.t).toBe('rejected');

    s = reduce(s, { type: 'pickCharacter', pid: 'p0', character: mine[1] });
    expect(s.draft!.picked.p0).toBe(mine[1]);
    expect(legalActions(s, 'p0')).toHaveLength(0);
    expect(actorsOf(s)).not.toContain('p0');
  });

  it('마지막 사람이 고르면 목숨만큼 패를 받고 보안관 차례가 시작된다', () => {
    let s = start(5);
    const picks: Record<string, string> = {};
    for (const p of s.players) {
      const c = s.draft!.offers[p.id][1];
      picks[p.id] = c;
      s = reduce(s, { type: 'pickCharacter', pid: p.id, character: c as never });
    }
    expect(s.draft).toBeNull();
    for (const p of s.players) {
      expect(p.character).toBe(picks[p.id]);
      const base = CHARACTERS[p.character].maxHp;
      expect(p.maxHp).toBe(base + (p.role === 'sheriff' ? 1 : 0));
      expect(p.hp).toBe(p.maxHp);
    }
    const sheriff = s.players.find((p) => p.role === 'sheriff')!;
    expect(s.turn.active).toBe(sheriff.id);
    expect(s.turn.phase).toBe('play');
    expect(totalCards(s)).toBe(80);
  });

  it('시간이 지나면 첫 후보를 고른다', () => {
    const s = start(6);
    expect(defaultAction(s, 'p3')).toEqual({
      type: 'pickCharacter',
      pid: 'p3',
      character: s.draft!.offers.p3[0],
    });
    const after = reduce(s, { type: 'timeout', pid: 'p3' });
    expect(after.draft!.picked.p3).toBe(s.draft!.offers.p3[0]);
  });

  it('하이 눈의 예비 캐릭터는 자기가 안 고른 후보다', () => {
    let s = start(7, true);
    const offers = s.draft!.offers;
    s = autoDraft(s);
    for (const p of s.players) {
      expect(offers[p.id]).toContain(p.spareCharacter);
      expect(p.spareCharacter).not.toBe(p.character);
    }
  });

  it('남의 후보와 선택은 보이지 않는다', () => {
    let s = start(5);
    s = reduce(s, { type: 'pickCharacter', pid: 'p1', character: s.draft!.offers.p1[2] });
    const v = viewFor(s, 'p0');
    expect(v.draft!.offers.p0).toEqual(s.draft!.offers.p0);
    expect(v.draft!.offers.p1).toEqual([]);
    expect(v.draft!.picked.p1).not.toBeNull();
    expect(v.draft!.picked.p1).not.toBe(s.draft!.offers.p1[2]);
    expect(v.draft!.picked.p2).toBeNull();
    expect(s.draft!.offers.p1).not.toContain(v.players[1].character);
  });

  it('드래프트 중에는 자리표시자 캐릭터의 능력이 열리지 않는다', () => {
    for (let seed = 0; seed < 40; seed++) {
      const s = start(7, false, seed);
      for (const p of s.players) {
        expect(
          legalActions(s, p.id).some(
            (a) => a.type === 'useAbility' && a.ability === SID_KETCHUM_ABILITY,
          ),
        ).toBe(false);
      }
    }
  });
});
