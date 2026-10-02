/**
 * AI 자가검증 시뮬레이터.
 *
 * 사람 없이 수천 판을 돌려 엔진의 불변식을 확인하고, 난이도별 실력 차이를 잰다.
 * 실패하면 시드를 찍어 주므로 그 판을 그대로 재현할 수 있다.
 *
 *   npm run simulate -- --games 200 --players 7 --highnoon
 *   npm run simulate -- --games 200 --players 7 --valley
 *   npm run simulate -- --games 200 --players 7 --goldrush
 *   npm run simulate -- --games 200 --players 7 --fistful
 *
 * 상황 카드 확장판(--highnoon · --wildwestshow · --fistful)은 한 판에 하나만 쓴다.
 * 여럿 주면 엔진이 하이 눈 → 와일드 웨스트 쇼 → 한줌의 카드 순으로 앞의 것을 쓴다.
 *
 * 빠르게 돌리기 (규칙·불변식 확인용):
 *
 *   npm run simulate -- --games 2000 --players 7 --wildwestshow --fast --events
 *
 * --jobs N    판을 N 개 작업자(worker_threads)에 나눠 돌린다. 기본은 CPU 수 - 1
 * --no-reads  역할 추정 측정(매 차례 모든 사람의 추론)을 끈다. 가장 비싼 부분 중 하나다
 * --fast      --no-reads 에, 난이도를 안 줬으면 중·하만 (상 난이도의 시뮬레이션 수읽기를 뺀다)
 * --events    이벤트별로 공개 횟수와 그 이벤트가 걸렸을 때만 나온 로그를 센다.
 *             공개는 되는데 고유 로그가 없는 이벤트는 효과가 없는 것일 수 있다
 * 불변식 검사는 어느 옵션에서든 매 수 한다.
 */

import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';

import { analyze, decide, inferDepthOf, type AiTier } from '../src/game/ai';
import {
  actorsOf,
  kindOf,
  legalActions,
  reduce,
  type Action,
  type GameState,
} from '../src/game/engine';
import { viewFor } from '../src/game/engine/view';

type Options = {
  games: number;
  players: number;
  seed: number;
  highnoon: boolean;
  wildwestshow: boolean;
  fistful: boolean;
  valley: boolean;
  goldrush: boolean;
  tiers: AiTier[];
  maxSteps: number;
  verbose: boolean;
  /** 동시에 돌릴 작업자 수. 1 이면 지금 프로세스에서 차례로 */
  jobs: number;
  /** 역할 추정 측정 */
  reads: boolean;
  /** 이벤트별 로그 집계 */
  events: boolean;
};

function parseArgs(argv: string[]): Options {
  const get = (name: string, fallback: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const has = (name: string) => argv.includes(`--${name}`);
  const fast = has('fast');
  const tiersGiven = argv.includes('--tiers');

  return {
    games: Number(get('games', '100')),
    players: Number(get('players', '7')),
    seed: Number(get('seed', '1')),
    highnoon: has('highnoon'),
    wildwestshow: has('wildwestshow'),
    fistful: has('fistful'),
    valley: has('valley'),
    goldrush: has('goldrush'),
    tiers: get('tiers', fast && !tiersGiven ? 'medium,easy' : 'hard,medium,easy').split(',') as AiTier[],
    maxSteps: Number(get('maxSteps', '6000')),
    verbose: has('verbose'),
    jobs: Math.max(1, Number(get('jobs', String(Math.max(1, availableParallelism() - 1))))),
    reads: !(fast || has('no-reads')),
    events: has('events'),
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
  /** 좌석별 (개인 공격 수, 같은 편을 겨냥한 수) */
  attacks: { total: number; friendly: number }[];
  /** 난이도별 역할 추정 성적 */
  reads: Record<string, ReadStat>;
  /** --events: 이벤트별 공개 횟수와, 그 이벤트가 걸려 있는 동안 나온 로그 종류별 횟수. '-' 는 이벤트 없음 */
  events?: { revealed: Record<string, number>; logs: Record<string, Record<string, number>> };
};

/** 판 기록을 이벤트 단위로 나눠 센다 */
function countEventLogs(state: GameState): NonNullable<GameOutcome['events']> {
  const revealed: Record<string, number> = {};
  const logs: Record<string, Record<string, number>> = {};
  let current = '-';
  for (const e of state.log) {
    if (e.t === 'event' && e.card) {
      current = e.card;
      revealed[current] = (revealed[current] ?? 0) + 1;
      continue;
    }
    const bucket = (logs[current] ??= {});
    bucket[e.t] = (bucket[e.t] ?? 0) + 1;
  }
  return { revealed, logs };
}

type ReadStat = { guesses: number; hits: number; trueProb: number };

/**
 * 차례가 바뀔 때마다 모든 생존자가 감춰진 역할을 얼마나 맞히는지 잰다.
 * hits: 가장 그럴듯한 역할이 실제와 같은 비율, trueProb: 실제 역할에 준 평균 확률.
 */
function measureReads(state: GameState, tierById: Record<string, AiTier>, into: Record<string, ReadStat>) {
  state.players.forEach((me) => {
    if (!me.alive) return;
    const tier = tierById[me.id] ?? 'medium';
    const beliefs = analyze(viewFor(state, me.id), me.id, inferDepthOf(tier));
    for (const p of state.players) {
      if (p.id === me.id || p.roleRevealed) continue;
      const pr = beliefs[p.id].probs;
      const guess = (Object.keys(pr) as (keyof typeof pr)[]).reduce((a, b) => (pr[b] > pr[a] ? b : a));
      into[tier] ??= { guesses: 0, hits: 0, trueProb: 0 };
      into[tier].guesses++;
      if (guess === p.role) into[tier].hits++;
      into[tier].trueProb += pr[p.role];
    }
  });
}

/** 한 사람을 겨냥하는 공격 카드. 빗나감이 대상과 함께 나오면 칼라미티 자넷의 뱅!이다 */
const ATTACK_KINDS = new Set(['bang', 'missed', 'duel', 'jail']);

function sideOf(role: string): string {
  return role === 'sheriff' || role === 'deputy' ? 'law' : role;
}

/** 판이 끝난 뒤 로그를 훑어 같은 편을 겨냥한 공격을 센다 */
/** 처음 앉은 자리 순서(ids)로 센다. 레이디 로즈로 자리가 바뀌어도 사람이 같으면 같은 칸이다 */
function countAttacks(state: GameState, ids: string[]): { total: number; friendly: number }[] {
  const out = ids.map(() => ({ total: 0, friendly: 0 }));
  for (const ev of state.log) {
    if (ev.t !== 'playCard' || !ev.pid || !ev.target || !ev.card || ev.pid === ev.target) continue;
    if (!ATTACK_KINDS.has(kindOf(ev.card))) continue;
    const seat = ids.indexOf(ev.pid);
    const actor = state.players.find((p) => p.id === ev.pid);
    const target = state.players.find((p) => p.id === ev.target);
    if (!actor || !target || seat < 0) continue;
    out[seat].total++;
    const a = sideOf(actor.role);
    if (a !== 'renegade' && a === sideOf(target.role)) out[seat].friendly++;
  }
  return out;
}

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
  const tierById: Record<string, AiTier> = Object.fromEntries(seats.map((s, i) => [s.id, tierBySeat[i]]));

  const start: Action = {
    type: 'startGame',
    seed,
    config: {
      playerCount: opts.players,
      expansions: [
        ...(opts.highnoon ? (['highnoon'] as const) : []),
        ...(opts.wildwestshow ? (['wildwestshow'] as const) : []),
        ...(opts.fistful ? (['fistful'] as const) : []),
        ...(opts.valley ? (['valley'] as const) : []),
        ...(opts.goldrush ? (['goldrush'] as const) : []),
      ],
    },
    seats,
  };
  const history: Action[] = [start];
  let state = reduce(null, start);
  let steps = 0;
  const reads: Record<string, ReadStat> = {};
  let lastTurnKey = '';

  while (!state.result && steps < opts.maxSteps) {
    const actor = actorsOf(state)[0];
    // 레이디 로즈 오브 텍사스로 자리가 바뀔 수 있다. 난이도는 처음 앉은 자리(id)로 찾는다
    const seat = seats.findIndex((s) => s.id === actor);
    const tier = tierBySeat[seat] ?? 'medium';

    const turnKey = `${state.turn.round}:${state.turn.active}`;
    if (opts.reads && !state.draft && turnKey !== lastTurnKey) {
      lastTurnKey = turnKey;
      measureReads(state, tierById, reads);
    }

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
    roleBySeat: seats.map((s) => state.players.find((p) => p.id === s.id)?.role ?? 'outlaw'),
    attacks: countAttacks(state, seats.map((s) => s.id)),
    reads,
    ...(opts.events ? { events: countEventLogs(state) } : {}),
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
      if (f.k === 'poker') return n + f.pot.length;
      return n;
    }, 0);
  const expected = state.config.expansions.includes('valley') ? 96 : 80;
  if (total !== expected) {
    throw new SimulationError(`카드가 ${total}장이다 (step ${step})`, seed, history);
  }
  // 골드 러시: 장비 24장 보존, 금덩이는 음수가 되지 않는다
  if (state.gold) {
    const g = state.gold;
    const gold =
      g.deck.length +
      g.shop.length +
      g.discard.length +
      state.players.reduce((n, p) => n + (p.goldEquipment?.length ?? 0), 0) +
      state.stack.filter((f) => f.k === 'goldUse').length;
    if (gold !== 24) {
      throw new SimulationError(`골드 러시 카드가 ${gold}장이다 (step ${step})`, seed, history);
    }
    if (g.shop.length > 3) {
      throw new SimulationError(`상점에 ${g.shop.length}장이 있다 (step ${step})`, seed, history);
    }
    for (const p of state.players) {
      if ((p.nuggets ?? 0) < 0) {
        throw new SimulationError(`${p.id} 금덩이가 음수다 (step ${step})`, seed, history);
      }
    }
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
  /** --events 집계. 이벤트 id → 로그 종류 → 횟수 ('-' 는 이벤트가 없을 때) */
  events?: NonNullable<GameOutcome['events']>;
  byRole: Record<string, { wins: number; games: number }>;
  byTier: Record<string, { wins: number; seats: number }>;
  /** 난이도 × 역할. 어느 역할에서 실력 차이가 나는지 보려면 이쪽을 본다 */
  byTierRole: Record<string, { wins: number; seats: number }>;
  /** 난이도 × 역할별 같은 편 오사 */
  friendlyFire: Record<string, { total: number; friendly: number }>;
  reads: Record<string, ReadStat>;
  avgTurns: number;
  avgSteps: number;
};

/** 판 결과를 모아 보고서로 만든다. 순차·병렬이 같이 쓴다 */
function makeTally(opts: Options) {
  const report: SimulationReport = {
    games: 0,
    failures: [],
    byRole: {},
    byTier: {},
    byTierRole: {},
    friendlyFire: {},
    reads: {},
    avgTurns: 0,
    avgSteps: 0,
    events: { revealed: {}, logs: {} },
  };
  let turns = 0;
  let steps = 0;

  const add = (out: GameOutcome) => {
    report.games++;
    for (const [tier, r] of Object.entries(out.reads)) {
      report.reads[tier] ??= { guesses: 0, hits: 0, trueProb: 0 };
      report.reads[tier].guesses += r.guesses;
      report.reads[tier].hits += r.hits;
      report.reads[tier].trueProb += r.trueProb;
    }
    turns += out.turns;
    steps += out.steps;

    for (let seat = 0; seat < out.roleBySeat.length; seat++) {
      const role = out.roleBySeat[seat];
      const tier = out.tierBySeat[seat];
      const won = out.winnerIds.includes(`p${seat}`);
      report.byRole[role] ??= { wins: 0, games: 0 };
      report.byRole[role].games++;
      if (won) report.byRole[role].wins++;
      report.byTier[tier] ??= { wins: 0, seats: 0 };
      report.byTier[tier].seats++;
      if (won) report.byTier[tier].wins++;

      const key = `${tier}/${role}`;
      report.byTierRole[key] ??= { wins: 0, seats: 0 };
      report.byTierRole[key].seats++;
      if (won) report.byTierRole[key].wins++;

      report.friendlyFire[key] ??= { total: 0, friendly: 0 };
      report.friendlyFire[key].total += out.attacks[seat].total;
      report.friendlyFire[key].friendly += out.attacks[seat].friendly;
    }
    if (out.events && report.events) {
      for (const [id, n] of Object.entries(out.events.revealed)) {
        report.events.revealed[id] = (report.events.revealed[id] ?? 0) + n;
      }
      for (const [id, logs] of Object.entries(out.events.logs)) {
        const into = (report.events.logs[id] ??= {});
        for (const [t, n] of Object.entries(logs)) into[t] = (into[t] ?? 0) + n;
      }
    }
    if (opts.verbose) {
      console.log(`seed ${out.seed}: ${out.winners.join('·')} 승 (${out.turns}라운드, ${out.steps}수)`);
    }
  };

  const fail = (seed: number, message: string, historyLength?: number) => {
    report.failures.push({ seed, message });
    console.error(`✗ seed ${seed}: ${message}`);
    if (historyLength) console.error(`  재현: seed=${seed} 액션 ${historyLength}개`);
  };

  const finish = (): SimulationReport => ({
    ...report,
    avgTurns: report.games ? turns / report.games : 0,
    avgSteps: report.games ? steps / report.games : 0,
    events: opts.events ? report.events : undefined,
  });

  return { add, fail, finish };
}

/** 지금 프로세스에서 한 판씩 */
export function simulate(opts: Options): SimulationReport {
  const tally = makeTally(opts);
  for (let i = 0; i < opts.games; i++) {
    const seed = opts.seed + i;
    try {
      tally.add(playOne(seed, opts));
    } catch (err) {
      const e = err as SimulationError;
      tally.fail(seed, e.message, e.history?.length);
    }
  }
  return tally.finish();
}

/** 작업자로 보내는 메시지와 받는 메시지 */
export type WorkerJob = { seed: number } | { stop: true };
export type WorkerResult =
  | { seed: number; ok: true; out: GameOutcome }
  | { seed: number; ok: false; message: string; historyLength?: number };

/**
 * worker_threads 로 나눠 돌린다. 한 판이 끝난 작업자에게 다음 시드를 주는 방식이라
 * 판마다 길이가 달라도 고르게 나뉜다. 결과는 시드 순서와 상관없이 같은 집계가 나온다.
 */
export function simulateParallel(opts: Options): Promise<SimulationReport> {
  const tally = makeTally(opts);
  const jobs = Math.min(opts.jobs, opts.games);
  let next = 0;
  let running = jobs;

  return new Promise((resolve, reject) => {
    for (let w = 0; w < jobs; w++) {
      const worker = new Worker(join(__dirname, 'simulate-worker.ts'), {
        workerData: opts,
        execArgv: ['--import', 'tsx'],
      });
      const feed = () => {
        if (next < opts.games) {
          worker.postMessage({ seed: opts.seed + next++ } satisfies WorkerJob);
        } else {
          worker.postMessage({ stop: true } satisfies WorkerJob);
        }
      };
      worker.on('message', (r: WorkerResult) => {
        if (r.ok) tally.add(r.out);
        else tally.fail(r.seed, r.message, r.historyLength);
        feed();
      });
      worker.on('error', reject);
      worker.on('exit', () => {
        running--;
        if (running === 0) resolve(tally.finish());
      });
      feed();
    }
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const started = Date.now();
  console.log(
    `${opts.games}판 시뮬레이션 — ${opts.players}인, 난이도 ${opts.tiers.join('/')}` +
      `, 작업자 ${Math.min(opts.jobs, opts.games)}` +
      (opts.reads ? '' : ', 역할 추정 측정 끔') +
      (opts.highnoon ? ', 하이 눈' : '') +
      (opts.wildwestshow ? ', 와일드 웨스트 쇼' : '') +
      (opts.fistful ? ', 한줌의 카드' : '') +
      (opts.valley ? ', 그림자의 계곡' : '') +
      (opts.goldrush ? ', 골드 러시' : ''),
  );

  const report = opts.jobs > 1 && opts.games > 1 ? await simulateParallel(opts) : simulate(opts);
  const elapsed = (Date.now() - started) / 1000;

  console.log(
    `\n완료 ${report.games}/${opts.games}판 (${elapsed.toFixed(1)}초, 초당 ${(report.games / Math.max(0.001, elapsed)).toFixed(2)}판)`,
  );
  console.log(`평균 ${report.avgTurns.toFixed(1)}라운드 / ${report.avgSteps.toFixed(0)}수\n`);

  console.log('역할별 승률');
  for (const [role, s] of Object.entries(report.byRole)) {
    console.log(`  ${role.padEnd(9)} ${((s.wins / s.games) * 100).toFixed(1)}%  (${s.wins}/${s.games})`);
  }
  console.log('\n난이도별 승률');
  for (const [tier, s] of Object.entries(report.byTier)) {
    console.log(`  ${tier.padEnd(9)} ${((s.wins / s.seats) * 100).toFixed(1)}%  (${s.wins}/${s.seats})`);
  }

  console.log('\n난이도 × 역할');
  const roles = ['sheriff', 'deputy', 'outlaw', 'renegade'];
  const tiers = Object.keys(report.byTier).sort();
  console.log(`  ${''.padEnd(9)}${roles.map((r) => r.padStart(11)).join('')}`);
  for (const tier of tiers) {
    const cells = roles.map((role) => {
      const s = report.byTierRole[`${tier}/${role}`];
      return (s ? `${((s.wins / s.seats) * 100).toFixed(0)}% (${s.seats})` : '-').padStart(11);
    });
    console.log(`  ${tier.padEnd(9)}${cells.join('')}`);
  }

  console.log('\n같은 편 오사율 (같은 편을 겨냥한 공격 / 개인 공격)');
  console.log(`  ${''.padEnd(9)}${roles.map((r) => r.padStart(14)).join('')}`);
  for (const tier of tiers) {
    const cells = roles.map((role) => {
      const s = report.friendlyFire[`${tier}/${role}`];
      if (!s || s.total === 0) return '-'.padStart(14);
      return `${((s.friendly / s.total) * 100).toFixed(1)}% (${s.total})`.padStart(14);
    });
    console.log(`  ${tier.padEnd(9)}${cells.join('')}`);
  }

  console.log('\n역할 추정 (적중률 / 실제 역할에 준 평균 확률)');
  for (const tier of tiers) {
    const r = report.reads[tier];
    if (!r || r.guesses === 0) continue;
    console.log(
      `  ${tier.padEnd(9)} ${((r.hits / r.guesses) * 100).toFixed(1)}%  /  ${(r.trueProb / r.guesses).toFixed(3)}  (${r.guesses}회)`,
    );
  }

  if (report.events) printEvents(report.events, report.games);

  if (report.failures.length > 0) {
    console.error(`\n실패 ${report.failures.length}건`);
    process.exitCode = 1;
  } else {
    console.log('\n불변식 위반 없음');
  }
}

/** 이 이벤트에서 공개 한 번당 나온 횟수가 다른 어느 때보다 이만큼 많으면 그 이벤트의 로그로 본다 */
const SIGNATURE_RATIO = 3;

/**
 * 이벤트마다 공개 횟수와, 그 이벤트가 걸려 있을 때 유난히 많이 나온 로그 종류.
 * 공개 한 번당 횟수를 다른 이벤트·이벤트 없는 구간(한 판당)과 견준다.
 * 그런 로그가 없으면 '확인 필요' 로 적는다. 손패 공개·채팅처럼 로그 없이 작동하는 이벤트도 여기 걸린다.
 */
function printEvents(events: NonNullable<SimulationReport['events']>, games: number) {
  const rate = (id: string, t: string) => {
    const n = events.logs[id]?.[t] ?? 0;
    const per = id === '-' ? games : (events.revealed[id] ?? 0);
    return per > 0 ? n / per : 0;
  };
  const buckets = Object.keys(events.logs);
  console.log('\n이벤트별 공개 횟수 · 그 이벤트에서 유난히 많이 나온 로그 (공개 한 번당 횟수)');
  for (const id of Object.keys(events.revealed).sort()) {
    const signature = Object.keys(events.logs[id] ?? {})
      .map((t) => ({ t, mine: rate(id, t), other: Math.max(0, ...buckets.filter((b) => b !== id).map((b) => rate(b, t))) }))
      .filter((x) => x.mine >= 0.05 && x.mine >= x.other * SIGNATURE_RATIO)
      .sort((a, b) => b.mine - a.mine)
      .slice(0, 4)
      .map((x) => `${x.t} ${x.mine.toFixed(2)}`);
    console.log(
      `  ${id.padEnd(18)} ${String(events.revealed[id]).padStart(5)}회  ${signature.length ? signature.join(', ') : '(눈에 띄는 로그 없음 — 확인 필요)'}`,
    );
  }
}

export { playOne, parseArgs, viewFor };
export type { Options, GameOutcome };

if (process.argv[1]?.endsWith('simulate.ts')) void main();
