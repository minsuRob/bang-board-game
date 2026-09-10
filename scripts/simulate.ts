/**
 * AI 자가검증 시뮬레이터.
 *
 * 사람 없이 수천 판을 돌려 엔진의 불변식을 확인하고, 난이도별 실력 차이를 잰다.
 * 실패하면 시드를 찍어 주므로 그 판을 그대로 재현할 수 있다.
 *
 *   npm run simulate -- --games 200 --players 7 --highnoon
 */

import { decide, type AiTier } from '../src/game/ai';
import { legalActions, reduce, type Action, type GameState } from '../src/game/engine';
import { viewFor } from '../src/game/engine/view';

type Options = {
  games: number;
  players: number;
  seed: number;
  highnoon: boolean;
  tiers: AiTier[];
  maxSteps: number;
  verbose: boolean;
};

function parseArgs(argv: string[]): Options {
  const get = (name: string, fallback: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const has = (name: string) => argv.includes(`--${name}`);

  return {
    games: Number(get('games', '100')),
    players: Number(get('players', '7')),
    seed: Number(get('seed', '1')),
    highnoon: has('highnoon'),
    tiers: get('tiers', 'hard,medium,easy').split(',') as AiTier[],
    maxSteps: Number(get('maxSteps', '6000')),
    verbose: has('verbose'),
  };
}

type GameOutcome = {
  seed: number;
  winners: string[];
  winnerIds: string[];
  steps: number;
  turns: number;
  tierBySeat: AiTier[];
  roleBySeat: string[];
};

class SimulationError extends Error {
  constructor(
    message: string,
    readonly seed: number,
    readonly history: Action[],
  ) {
    super(message);
  }
}

function playOne(seed: number, opts: Options): GameOutcome {
  const seats = Array.from({ length: opts.players }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  const tierBySeat = seats.map((_, i) => opts.tiers[(i + seed) % opts.tiers.length]);

  const start: Action = {
    type: 'startGame',
    seed,
    config: { playerCount: opts.players, expansions: opts.highnoon ? ['highnoon'] : [] },
    seats,
  };
  const history: Action[] = [start];
  let state = reduce(null, start);
  let steps = 0;

  while (!state.result && steps < opts.maxSteps) {
    const actor = state.awaiting ? state.awaiting.pid : state.turn.active;
    const seat = state.players.findIndex((p) => p.id === actor);
    const tier = tierBySeat[seat] ?? 'medium';

    const action = decide(state, actor, tier, seed * 7919 + steps);
    if (!action) {
      const legal = legalActions(state, actor);
      if (legal.length === 0) {
        throw new SimulationError(
          `막다른 상태: actor=${actor} phase=${state.turn.phase} stack=${state.stack
            .map((f) => f.k)
            .join(',')}`,
          seed,
          history,
        );
      }
      throw new SimulationError(`AI 가 수를 못 골랐다: actor=${actor}`, seed, history);
    }

    history.push(action);
    const next = reduce(state, action);
    checkInvariants(next, seed, steps, history);
    if (next === state) {
      throw new SimulationError(`상태가 진행되지 않는다: ${JSON.stringify(action)}`, seed, history);
    }
    state = next;
    steps++;
  }

  if (!state.result) {
    throw new SimulationError(`${opts.maxSteps}수 안에 끝나지 않았다`, seed, history);
  }

  return {
    seed,
    winners: state.result.winners,
    winnerIds: state.result.winnerIds,
    steps,
    turns: state.turn.round,
    tierBySeat,
    roleBySeat: state.players.map((p) => p.role),
  };
}

function checkInvariants(state: GameState, seed: number, step: number, history: Action[]) {
  const total =
    state.deck.length +
    state.discard.length +
    state.players.reduce((n, p) => n + p.hand.length + p.equipment.length, 0) +
    state.stack.reduce((n, f) => {
      if (f.k === 'judgement') return n + f.candidates.length;
      if (f.k === 'generalStore') return n + f.revealed.length;
      if (f.k === 'kitCarlson') return n + f.candidates.length;
      return n;
    }, 0);
  if (total !== 80) {
    throw new SimulationError(`카드가 ${total}장이다 (step ${step})`, seed, history);
  }
  for (const p of state.players) {
    if (p.hp > p.maxHp) {
      throw new SimulationError(`${p.id} 목숨이 최대치를 넘었다 (step ${step})`, seed, history);
    }
    if (!p.alive && !p.ghost && p.hand.length + p.equipment.length > 0) {
      throw new SimulationError(`탈락자 ${p.id} 가 카드를 들고 있다 (step ${step})`, seed, history);
    }
  }
  if (state.awaiting) {
    const p = state.players.find((x) => x.id === state.awaiting!.pid);
    if (!p || (!p.alive && !p.ghost)) {
      throw new SimulationError(`죽은 사람에게 입력을 요구한다 (step ${step})`, seed, history);
    }
  }
}

export type SimulationReport = {
  games: number;
  failures: { seed: number; message: string }[];
  byRole: Record<string, { wins: number; games: number }>;
  byTier: Record<string, { wins: number; seats: number }>;
  avgTurns: number;
  avgSteps: number;
};

export function simulate(opts: Options): SimulationReport {
  const byRole: Record<string, { wins: number; games: number }> = {};
  const byTier: Record<string, { wins: number; seats: number }> = {};
  const failures: { seed: number; message: string }[] = [];
  let turns = 0;
  let steps = 0;
  let done = 0;

  for (let i = 0; i < opts.games; i++) {
    const seed = opts.seed + i;
    try {
      const out = playOne(seed, opts);
      done++;
      turns += out.turns;
      steps += out.steps;

      for (let seat = 0; seat < out.roleBySeat.length; seat++) {
        const role = out.roleBySeat[seat];
        const tier = out.tierBySeat[seat];
        const won = out.winnerIds.includes(`p${seat}`);
        byRole[role] ??= { wins: 0, games: 0 };
        byRole[role].games++;
        if (won) byRole[role].wins++;
        byTier[tier] ??= { wins: 0, seats: 0 };
        byTier[tier].seats++;
        if (won) byTier[tier].wins++;
      }
      if (opts.verbose) {
        console.log(`seed ${seed}: ${out.winners.join('·')} 승 (${out.turns}라운드, ${out.steps}수)`);
      }
    } catch (err) {
      const e = err as SimulationError;
      failures.push({ seed, message: e.message });
      console.error(`✗ seed ${seed}: ${e.message}`);
      if (e.history) {
        console.error(`  재현: seed=${seed} 액션 ${e.history.length}개`);
      }
    }
  }

  return {
    games: done,
    failures,
    byRole,
    byTier,
    avgTurns: done ? turns / done : 0,
    avgSteps: done ? steps / done : 0,
  };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const started = Date.now();
  console.log(
    `${opts.games}판 시뮬레이션 — ${opts.players}인, 난이도 ${opts.tiers.join('/')}` +
      (opts.highnoon ? ', 하이 눈' : ''),
  );

  const report = simulate(opts);
  const secs = ((Date.now() - started) / 1000).toFixed(1);

  console.log(`\n완료 ${report.games}/${opts.games}판 (${secs}초)`);
  console.log(`평균 ${report.avgTurns.toFixed(1)}라운드 / ${report.avgSteps.toFixed(0)}수\n`);

  console.log('역할별 승률');
  for (const [role, s] of Object.entries(report.byRole)) {
    console.log(`  ${role.padEnd(9)} ${((s.wins / s.games) * 100).toFixed(1)}%  (${s.wins}/${s.games})`);
  }
  console.log('\n난이도별 승률');
  for (const [tier, s] of Object.entries(report.byTier)) {
    console.log(`  ${tier.padEnd(9)} ${((s.wins / s.seats) * 100).toFixed(1)}%  (${s.wins}/${s.seats})`);
  }

  if (report.failures.length > 0) {
    console.error(`\n실패 ${report.failures.length}건`);
    process.exitCode = 1;
  } else {
    console.log('\n불변식 위반 없음');
  }
}

export { playOne, parseArgs, viewFor };
export type { Options };

if (process.argv[1]?.endsWith('simulate.ts')) main();
