/**
 * 지갑 산술. Cloud Functions 가 트랜잭션 안에서 이 함수 하나만 부른다.
 *
 * 하루 한도는 날짜 키(`YYYY-MM-DD`, 한국 시간) 로 센다. 날이 바뀌면 dayCash 가 0 으로 돌아간다.
 */

import { DAILY_CASH_CAP } from './constants';
import type { Wallet } from './model';
import type { Credit } from './settle';

export type Applied = {
  cash: number;
  xp: number;
  won: boolean;
  /** 하루 한도에 걸려 돈을 깎았는가 */
  capped: boolean;
};

export function emptyWallet(dayKey: string): Wallet {
  return { cash: 0, xp: 0, games: 0, wins: 0, day: dayKey, dayCash: 0, updatedAt: 0 };
}

/** 한국 시간 기준 날짜 키 */
export function dayKeyOf(nowMs: number): string {
  const kst = new Date(nowMs + 9 * 3600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
}

export function applyCredit(
  wallet: Wallet | null,
  credit: Credit,
  dayKey: string,
  nowMs: number,
): { wallet: Wallet; applied: Applied } {
  const base = wallet ?? emptyWallet(dayKey);
  const dayCash = base.day === dayKey ? base.dayCash : 0;
  const room = Math.max(0, DAILY_CASH_CAP - dayCash);
  const cash = Math.min(credit.cash, room);
  const capped = cash < credit.cash;
  return {
    wallet: {
      cash: base.cash + cash,
      xp: base.xp + credit.xp,
      games: base.games + 1,
      wins: base.wins + (credit.won ? 1 : 0),
      day: dayKey,
      dayCash: dayCash + cash,
      updatedAt: nowMs,
    },
    applied: { cash, xp: credit.xp, won: credit.won, capped },
  };
}
