/**
 * 시뮬레이터 작업자 (worker_threads).
 *
 * simulate.ts 의 simulateParallel 이 띄운다. 시드를 하나씩 받아 한 판을 돌리고 결과를 돌려준다.
 * 엔진·AI 는 순수 함수라 작업자마다 따로 돌려도 같은 시드면 같은 판이 나온다.
 */

import { parentPort, workerData } from 'node:worker_threads';

import { playOne, type Options, type WorkerJob, type WorkerResult } from './simulate';

const opts = workerData as Options;

parentPort?.on('message', (job: WorkerJob) => {
  if ('stop' in job) {
    parentPort?.close();
    process.exit(0);
  }
  let result: WorkerResult;
  try {
    result = { seed: job.seed, ok: true, out: playOne(job.seed, opts) };
  } catch (err) {
    const e = err as Error & { history?: unknown[] };
    result = { seed: job.seed, ok: false, message: e.message, historyLength: e.history?.length };
  }
  parentPort?.postMessage(result);
});
