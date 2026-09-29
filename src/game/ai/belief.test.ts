import { describe, expect, it } from 'vitest';

import { BASE_DECK } from '../data/cards.base';
import type { CardKind, Role } from '../data/types';
import { actorsOf, kindOf, reduce, type Action, type GameEvent, type GameState } from '../engine';
import { viewFor } from '../engine/view';
import { analyze, hostility, type InferDepth } from './belief';
import { decide } from './index';
import { isBetrayal, scoreAction } from './policy';

const ROLES_7: Role[] = ['sheriff', 'deputy', 'outlaw', 'outlaw', 'deputy', 'outlaw', 'renegade'];

function cardOfKind(kind: CardKind, nth = 0): string {
  return BASE_DECK.filter((c) => c.kind === kind)[nth].id;
}

/** 드래프트를 마친 7인 판에 역할을 원하는 대로 앉힌다. p0 이 보안관이다 */
function table(roles: Role[] = ROLES_7): GameState {
  const seats = roles.map((_, i) => ({ id: `p${i}`, name: `P${i}` }));
  let state = reduce(null, {
    type: 'startGame',
    seed: 7,
    config: { playerCount: roles.length, expansions: [] },
    seats,
  });
  let guard = 0;
  while (state.draft && guard++ < 50) {
    const actor = actorsOf(state)[0];
    state = reduce(state, decide(state, actor, 'medium', 1) as Action);
  }
  return {
    ...state,
    log: [],
    players: state.players.map((p, i) => ({
      ...p,
      role: roles[i],
      roleRevealed: roles[i] === 'sheriff',
      alive: true,
      ghost: false,
      hp: p.maxHp,
    })),
  };
}

function ev(t: string, pid: string, target?: string, card?: string): GameEvent {
  return { t, pid, target, card, text: '', seq: 0 };
}

function shoot(pid: string, target: string): GameEvent {
  return ev('playCard', pid, target, cardOfKind('bang'));
}

function withLog(state: GameState, log: GameEvent[]): GameState {
  return { ...state, log };
}

/** 탈락시켜 역할을 공개한다 */
function eliminate(state: GameState, pid: string): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === pid ? { ...p, alive: false, hp: 0, roleRevealed: true, hand: [], equipment: [] } : p,
    ),
  };
}

function read(state: GameState, me: string, depth: InferDepth = 'full') {
  return analyze(viewFor(state, me), me, depth);
}

describe('역할 추정 — 증거 읽기', () => {
  it('보안관을 겨눈 사람은 무법자로 본다 (빗나갔어도, 하 난이도도)', () => {
    const state = withLog(table(), [shoot('p2', 'p0'), shoot('p2', 'p0')]);
    for (const depth of ['direct', 'full'] as InferDepth[]) {
      const b = read(state, 'p1', depth);
      expect(b.p2.probs.outlaw).toBeGreaterThan(0.85);
      expect(b.p2.threatToSheriff).toBe(2);
      // 아무것도 안 한 사람보다 확실히 의심스럽다
      expect(b.p2.probs.outlaw).toBeGreaterThan(b.p5.probs.outlaw);
    }
  });

  it('보안관을 쏜 사람을 친 사람은 보안관 편으로 본다 (돕는 행동)', () => {
    const state = withLog(table(), [shoot('p2', 'p0'), shoot('p2', 'p0'), shoot('p4', 'p2')]);
    for (const depth of ['direct', 'full'] as InferDepth[]) {
      const b = read(state, 'p0', depth);
      expect(b.p4.probs.deputy).toBeGreaterThan(b.p5.probs.deputy);
      expect(b.p4.probs.outlaw).toBeLessThan(b.p5.probs.outlaw);
    }
  });

  it('나중에 무법자로 드러난 사람을 쳤던 것도 소급해 읽는다', () => {
    const state = eliminate(withLog(table(), [shoot('p4', 'p3')]), 'p3');
    const b = read(state, 'p0');
    expect(b.p4.probs.deputy).toBeGreaterThan(b.p5.probs.deputy);
  });

  it('보안관 편과 무법자를 모두 친 사람은 배신자 가능성이 오른다', () => {
    const base = eliminate(table(), 'p3');
    const both = read(withLog(base, [shoot('p6', 'p0'), shoot('p6', 'p3'), shoot('p6', 'p3')]), 'p0');
    const lawOnly = read(withLog(base, [shoot('p6', 'p3'), shoot('p6', 'p3')]), 'p0');
    const neutral = read(withLog(base, []), 'p0');
    expect(both.p6.probs.renegade).toBeGreaterThan(lawOnly.p6.probs.renegade);
    expect(both.p6.probs.renegade).toBeGreaterThan(neutral.p6.probs.renegade);
  });

  it('기관총·인디언만 쓴 사람을 무법자로 몰지 않는다', () => {
    const area = [
      ev('playCard', 'p4', undefined, cardOfKind('gatling')),
      ev('playCard', 'p4', undefined, cardOfKind('indians')),
      ev('playCard', 'p4', undefined, cardOfKind('indians', 1)),
    ];
    const b = read(withLog(table(), area), 'p0');
    const shooter = read(withLog(table(), [shoot('p4', 'p0')]), 'p0');
    expect(b.p4.probs.outlaw).toBeLessThan(shooter.p4.probs.outlaw - 0.2);
    expect(b.p4.threatToSheriff).toBe(0);
  });

  it('보안관의 감옥을 떼어 준 사람은 보안관 편으로 본다', () => {
    const rescue = [
      ev('playCard', 'p4', 'p0', cardOfKind('catBalou')),
      ev('catBalou', 'p4', 'p0', cardOfKind('jail')),
    ];
    const harm = [
      ev('playCard', 'p4', 'p0', cardOfKind('catBalou')),
      ev('catBalou', 'p4', 'p0', cardOfKind('barrel')),
    ];
    const helped = read(withLog(table(), rescue), 'p0');
    const hurt = read(withLog(table(), harm), 'p0');
    expect(helped.p4.probs.deputy).toBeGreaterThan(hurt.p4.probs.deputy);
    expect(helped.p4.threatToSheriff).toBe(0);
  });

  it('무법자가 모두 드러나면 남은 사람은 무법자일 수 없다. 확률 합은 늘 1', () => {
    let state = withLog(table(), [shoot('p4', 'p0')]);
    for (const id of ['p2', 'p3', 'p5']) state = eliminate(state, id);
    for (const depth of ['direct', 'full'] as InferDepth[]) {
      const b = read(state, 'p0', depth);
      for (const id of ['p1', 'p4', 'p6']) {
        const pr = b[id].probs;
        expect(pr.outlaw).toBe(0);
        expect(pr.sheriff + pr.deputy + pr.outlaw + pr.renegade).toBeCloseTo(1, 6);
      }
      // 보안관을 쏜 p4 는 이제 배신자로 좁혀진다
      expect(b.p4.probs.renegade).toBeGreaterThan(b.p1.probs.renegade);
    }
  });

  it('감춰진 역할을 들여다보지 않는다 (숨은 역할을 바꿔도 결과가 같다)', () => {
    const log = [shoot('p2', 'p0'), shoot('p4', 'p2'), shoot('p6', 'p3')];
    const a = withLog(table(ROLES_7), log);
    const swapped: Role[] = ['sheriff', 'deputy', 'renegade', 'deputy', 'outlaw', 'outlaw', 'outlaw'];
    const b = withLog(table(swapped), log);
    // p1 은 두 배치에서 같은 역할(부관)이다
    expect(read(a, 'p1')).toEqual(read(b, 'p1'));
    expect(read(a, 'p1', 'direct')).toEqual(read(b, 'p1', 'direct'));
  });
});

describe('역할별 판단', () => {
  it('부관은 보안관을 쏜 사람을 먼저 노린다', () => {
    const state = withLog(table(), [shoot('p2', 'p0')]);
    const view = viewFor(state, 'p1');
    const b = analyze(view, 'p1', 'direct');
    expect(hostility(view, 'p1', 'p2', b)).toBeGreaterThan(hostility(view, 'p1', 'p5', b) + 0.2);
    expect(hostility(view, 'p1', 'p0', b)).toBe(0);
  });

  it('무법자는 보안관을 쏜 사람을 동료로 보고 치지 않는다', () => {
    const state = withLog(table(), [shoot('p3', 'p0'), shoot('p3', 'p0')]);
    const view = viewFor(state, 'p2');
    const b = analyze(view, 'p2', 'direct');
    expect(hostility(view, 'p2', 'p3', b)).toBeLessThan(0.15);
    expect(hostility(view, 'p2', 'p0', b)).toBe(1);
  });

  it('보안관은 부관일 것 같은 사람을 쏘지 않는다', () => {
    const state = eliminate(withLog(table(), [shoot('p4', 'p3'), shoot('p4', 'p3')]), 'p3');
    const view = viewFor(state, 'p0');
    const b = analyze(view, 'p0');
    const bang = { type: 'playCard' as const, pid: 'p0', card: cardOfKind('bang'), target: 'p4' };
    expect(isBetrayal(view, 'p0', bang, b)).toBe(true);
  });

  it('무법자가 남아 있으면 배신자는 목숨 1 인 보안관 앞에서 기관총을 쓰지 않는다', () => {
    const base = table();
    const state: GameState = {
      ...base,
      players: base.players.map((p) => (p.id === 'p0' ? { ...p, hp: 1 } : p)),
    };
    const gatling = { type: 'playCard' as const, pid: 'p6', card: cardOfKind('gatling') };
    const view = viewFor(state, 'p6');
    const b = analyze(view, 'p6');
    expect(isBetrayal(view, 'p6', gatling, b)).toBe(true);
    expect(scoreAction(view, 'p6', gatling, b)).toBeLessThan(-50);

    // 무법자에게는 결정타다
    const outlawView = viewFor(state, 'p2');
    const ob = analyze(outlawView, 'p2');
    const og = { ...gatling, pid: 'p2' };
    expect(scoreAction(outlawView, 'p2', og, ob)).toBeGreaterThan(20);
  });

  it('배신자는 무법자가 우세하면 보안관을 도와 무법자를 친다', () => {
    const base = withLog(table(), [shoot('p2', 'p0'), shoot('p3', 'p0'), shoot('p4', 'p2')]);
    // 보안관이 목숨 2 로 몰렸다
    const state: GameState = {
      ...base,
      players: base.players.map((p) => (p.id === 'p0' ? { ...p, hp: 2 } : p)),
    };
    const view = viewFor(state, 'p6');
    const b = analyze(view, 'p6');
    expect(hostility(view, 'p6', 'p2', b)).toBeGreaterThan(hostility(view, 'p6', 'p4', b));
    expect(hostility(view, 'p6', 'p0', b)).toBeLessThan(0.05);
  });

  it('같은 편의 감옥은 떼어 주고, 적의 감옥은 그대로 둔다', () => {
    const base = table();
    const jail = cardOfKind('jail');
    const state: GameState = {
      ...base,
      awaiting: {
        k: 'stealCard',
        pid: 'p1',
        target: 'p0',
        mode: 'catBalou',
        handCount: 2,
        equipment: [jail],
      },
      players: base.players.map((p) => (p.id === 'p0' ? { ...p, equipment: [jail] } : p)),
    };
    const view = viewFor(state, 'p1');
    const b = analyze(view, 'p1');
    const pickJail = {
      type: 'respond' as const,
      pid: 'p1',
      choice: { c: 'pick' as const, pick: { zone: 'equipment' as const, card: jail } },
    };
    const pickHand = {
      type: 'respond' as const,
      pid: 'p1',
      choice: { c: 'pick' as const, pick: { zone: 'hand' as const, index: 0 } },
    };
    expect(scoreAction(view, 'p1', pickJail, b)).toBeGreaterThan(scoreAction(view, 'p1', pickHand, b));
    expect(kindOf(jail)).toBe('jail');
  });
});

describe('하 난이도의 최소한의 분별', () => {
  it('부관은 하 난이도라도 보안관을 겨누지 않는다', () => {
    let attacks = 0;
    let deputyAttacks = 0;
    let finished = 0;
    for (let seed = 1; seed <= 25; seed++) {
      const seats = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
      let state = reduce(null, {
        type: 'startGame',
        seed,
        config: { playerCount: 6, expansions: [] },
        seats,
      });
      for (let step = 0; step < 3000 && !state.result; step++) {
        const actor = actorsOf(state)[0];
        state = reduce(state, decide(state, actor, 'easy', seed * 31 + step) as Action);
      }
      if (state.result) finished++;
      const sheriff = state.players.find((p) => p.role === 'sheriff')!;
      const deputies = new Set(state.players.filter((p) => p.role === 'deputy').map((p) => p.id));
      for (const e of state.log) {
        if (e.t !== 'playCard' || !e.pid || !deputies.has(e.pid) || !e.target) continue;
        const kind = kindOf(e.card!);
        if (kind !== 'bang' && kind !== 'duel' && kind !== 'missed') continue;
        deputyAttacks++;
        if (e.target === sheriff.id) attacks++;
      }
    }
    // 판이 실제로 돌았고 부관들이 총을 쏘긴 했다
    expect(finished).toBeGreaterThanOrEqual(20);
    expect(deputyAttacks).toBeGreaterThan(20);
    expect(attacks).toBe(0);
  });
});
