import { describe, expect, it } from 'vitest';

import { legalActions } from '../legal';
import { reduce } from '../reducer';
import { createRng, nextInt, type RngState } from '../rng';
import type { Action, GameState } from '../types';
import { totalCards } from './helpers';

type FuzzResult = {
  state: GameState;
  steps: number;
  history: Action[];
};

/**
 * 합법 액션 중 하나를 무작위로 골라 계속 두는 드라이버.
 * AI 가 아니라 순전히 엔진을 흔들기 위한 것이다.
 */
function fuzzGame(seed: number, playerCount: number, highnoon: boolean, maxSteps = 4000): FuzzResult {
  const seats = Array.from({ length: playerCount }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  const start: Action = {
    type: 'startGame',
    seed,
    config: { playerCount, expansions: highnoon ? ['highnoon'] : [] },
    seats,
  };
  let state = reduce(null, start);
  const history: Action[] = [start];
  let rng: RngState = createRng(seed ^ 0x5f3759df);
  let steps = 0;

  while (!state.result && steps < maxSteps) {
    const actor = state.awaiting ? state.awaiting.pid : state.turn.active;
    let legal = legalActions(state, actor);

    // 대기 중인 사람은 반드시 낼 수 있는 액션이 있어야 한다.
    if (state.awaiting) {
      expect(legal.length, `대기 중인데 낼 액션이 없다: ${JSON.stringify(state.awaiting)}`).toBeGreaterThan(0);
      legal = legal.filter((a) => a.type === 'respond');
    }
    if (legal.length === 0) {
      // 카드 사용 단계인데 아무것도 못 하는 경우는 없어야 한다 (최소한 endTurn)
      throw new Error(
        `막다른 상태: phase=${state.turn.phase} actor=${actor} stack=${state.stack.map((f) => f.k).join(',')}`,
      );
    }

    const rolled = nextInt(rng, legal.length);
    rng = rolled.rng;
    const action = legal[rolled.value];
    history.push(action);
    state = reduce(state, action);
    steps++;

    expectInvariants(state, seed, steps);
  }
  return { state, steps, history };
}

function expectInvariants(state: GameState, seed: number, step: number) {
  const where = `seed=${seed} step=${step}`;
  expect(totalCards(state), `카드 총량이 깨졌다 (${where})`).toBe(80);

  for (const p of state.players) {
    expect(p.hp, `목숨이 최대치를 넘었다: ${p.id} (${where})`).toBeLessThanOrEqual(p.maxHp);
    if (!p.alive && !p.ghost) {
      expect(p.hand.length + p.equipment.length, `탈락자가 카드를 들고 있다 (${where})`).toBe(0);
    }
    // 같은 이름의 파랑 카드를 두 장 장착할 수 없다
    const kinds = p.equipment.map((c) => c.split('-')[0]);
    expect(new Set(kinds).size, `파랑 카드가 중복 장착됐다: ${p.id} (${where})`).toBe(kinds.length);
  }

  // 기본판에는 다이너마이트가 한 장뿐이다 (edge-cases 쟁점 J)
  const dynamites = state.players.flatMap((p) => p.equipment).filter((c) => c.startsWith('dynamite'));
  expect(dynamites.length, `다이너마이트가 여러 장이다 (${where})`).toBeLessThanOrEqual(1);

  if (state.awaiting) {
    const p = state.players.find((x) => x.id === state.awaiting!.pid);
    expect(p, `없는 플레이어에게 입력을 요구한다 (${where})`).toBeDefined();
    expect(p!.alive || p!.ghost, `죽은 사람에게 입력을 요구한다 (${where})`).toBe(true);
  }
}

describe('무작위 대국 (엔진 흔들기)', () => {
  it('4~7인 기본판 60판이 예외 없이 끝난다', () => {
    let finished = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const players = 4 + (seed % 4);
      const { state, steps } = fuzzGame(seed, players, false);
      expect(steps, `seed=${seed} 이 끝나지 않았다`).toBeLessThan(4000);
      if (state.result) {
        finished++;
        expect(['sheriff', 'outlaw', 'renegade']).toContain(state.result.winners[0]);
        expect(state.result.winnerIds.length).toBeGreaterThan(0);
      }
    }
    // 무작위로 두어도 대부분은 결판이 난다
    expect(finished).toBeGreaterThan(50);
  });

  it('하이 눈 확장 40판도 예외 없이 끝난다', () => {
    let finished = 0;
    for (let seed = 101; seed <= 140; seed++) {
      const players = 4 + (seed % 4);
      const { state } = fuzzGame(seed, players, true);
      if (state.result) finished++;
    }
    expect(finished).toBeGreaterThan(30);
  });
});

describe('재현성', () => {
  it('같은 시드 + 같은 액션 열은 같은 상태를 만든다', () => {
    const { state, history } = fuzzGame(7, 5, true, 600);

    let replay: GameState | null = null;
    for (const action of history) replay = reduce(replay, action);

    expect(JSON.stringify(replay)).toBe(JSON.stringify(state));
  });

  it('상태는 JSON 을 왕복해도 똑같이 이어진다', () => {
    const { state, history } = fuzzGame(11, 6, false, 400);
    const revived: GameState = JSON.parse(JSON.stringify(state));

    if (!state.result) {
      const actor = state.awaiting ? state.awaiting.pid : state.turn.active;
      const legal = legalActions(revived, actor);
      if (legal.length > 0) {
        expect(JSON.stringify(reduce(revived, legal[0]))).toBe(
          JSON.stringify(reduce(state, legal[0])),
        );
      }
    }
    expect(history.length).toBeGreaterThan(0);
  });
});
