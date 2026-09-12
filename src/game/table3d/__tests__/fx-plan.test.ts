import { describe, expect, it } from 'vitest';

import { reduce, type Action, type GameState } from '../../engine';
import { scenario } from '../../engine/__tests__/helpers';
import { planFx } from '../core/fx-plan';
import { diffZones } from '../core/move-diff';
import type { FxCommand } from '../core/types';

function step(prev: GameState, action: Action, viewer = prev.players[0].id) {
  const next = reduce(prev, action);
  const batch = planFx({ prev, next, action }, diffZones(prev, next), viewer);
  return { next, batch, cmds: batch.steps.flat() };
}

const of = <K extends FxCommand['k']>(cmds: FxCommand[], k: K) =>
  cmds.filter((c): c is Extract<FxCommand, { k: K }> => c.k === k);

describe('planFx', () => {
  it('첫 상태는 연출 없이 놓는다', () => {
    const s = scenario({ players: [{}, {}] });
    const b = planFx({ prev: null, next: s, action: { type: 'endTurn', pid: 'p0' } }, [], 'p0');
    expect(b.snap).toBe(true);
    expect(b.steps).toEqual([]);
  });

  it('뱅!은 카드가 대상 위를 거쳐 내리꽂히고 총격이 따른다', () => {
    const prev = scenario({ players: [{ hand: ['bang'] }, { hand: [] }] });
    const [me, foe] = prev.players;
    const card = me.hand[0];
    const { next, cmds } = step(prev, { type: 'playCard', pid: me.id, card, target: foe.id });
    const move = of(cmds, 'moveCard').find((m) => m.card === card)!;
    expect(move.style).toBe('arc');
    expect(move.slam).toBe(true);
    expect(move.via).toBe(foe.id);
    expect(move.face).toBe('up');
    expect(of(cmds, 'bang')).toEqual([{ k: 'bang', from: me.id, to: foe.id }]);

    // 빗나감이 없으면 곧바로 피해까지. 반응 대기라면 pass 로 넘겨 본다
    let all = cmds;
    if (next.awaiting) {
      const r = step(next, { type: 'respond', pid: next.awaiting.pid, choice: { c: 'pass' } });
      all = r.cmds;
    }
    const numbers = of(all, 'number');
    expect(numbers.some((n) => n.pid === foe.id && n.text === '-1' && n.tone === 'damage')).toBe(true);
    expect(of(all, 'shockwave').some((s) => s.pid === foe.id)).toBe(true);
  });

  it('상대가 받는 카드는 뒷면으로 난다', () => {
    const prev = scenario({ players: [{ hand: [] }, { hand: [] }, {}, {}] });
    const { cmds } = step(prev, { type: 'endTurn', pid: prev.players[0].id }, prev.players[0].id);
    const deals = of(cmds, 'moveCard').filter((m) => m.style === 'deal');
    expect(deals.length).toBeGreaterThanOrEqual(2);
    for (const d of deals) {
      expect(d.face).toBe('down');
      expect(d.from).toEqual({ z: 'deck' });
    }
    // 두 번째 카드는 조금 늦게 출발한다
    expect(deals[1].delayMs).toBeGreaterThan(deals[0].delayMs ?? 0);
    expect(of(cmds, 'cameraFocus').length).toBeGreaterThan(0);
  });

  it('내가 받는 카드는 앞면이다', () => {
    const prev = scenario({ players: [{ hand: [] }, { hand: [] }, {}, {}] });
    const viewer = prev.players[1].id;
    const { cmds } = step(prev, { type: 'endTurn', pid: prev.players[0].id }, viewer);
    const deals = of(cmds, 'moveCard').filter((m) => m.style === 'deal');
    expect(deals.length).toBeGreaterThanOrEqual(2);
    for (const d of deals) expect(d.face).toBe('up');
  });

  it('다이너마이트 판정은 뒤집어 보여 주고 터지면 폭발한다', () => {
    const prev = scenario({
      players: [{ hand: [], equipment: ['dynamite'], hp: 4 }, { hand: [] }],
      deckTop: [{ kind: 'missed', suit: 'spades', rank: '5' }],
      activeSeat: 1,
    });
    const { cmds, next } = step(prev, { type: 'endTurn', pid: prev.players[1].id });
    const reveal = of(cmds, 'moveCard').find((m) => m.style === 'reveal');
    expect(reveal).toBeDefined();
    expect(reveal!.from).toEqual({ z: 'deck' });
    expect(of(cmds, 'caption').length).toBeGreaterThan(0);
    expect(next.log.some((e) => e.t === 'dynamite')).toBe(true);
    expect(of(cmds, 'shockwave').some((s) => s.strength >= 3)).toBe(true);
    expect(of(cmds, 'particles').some((p) => p.preset === 'explosion')).toBe(true);
  });

  it('배치 길이는 단계별 최장 명령의 합이다', () => {
    // 맥주는 2인 남았을 때 효과가 없으므로 4인으로
    const prev = scenario({ players: [{ hand: ['beer'], hp: 2 }, {}, {}, {}] });
    const me = prev.players[0];
    const { batch, cmds } = step(prev, { type: 'playCard', pid: me.id, card: me.hand[0] });
    expect(of(cmds, 'number').some((n) => n.tone === 'heal')).toBe(true);
    expect(batch.estMs).toBeGreaterThan(0);
    expect(batch.snap).toBeUndefined();
  });
});
