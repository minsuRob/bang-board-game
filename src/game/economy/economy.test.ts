import { describe, expect, it } from 'vitest';

import type { GameResult } from '../engine/types';
import { CASH_PLAY, CASH_WIN, DAILY_CASH_CAP, XP_PLAY, XP_WIN } from './constants';
import { levelFromXp, xpToReach } from './level';
import {
  clean,
  cleanNick,
  isMatchDoc,
  isWallet,
  makeMatchUpload,
  matchId,
  parseMatchLog,
} from './model';
import { settleResult } from './settle';
import { applyCredit, dayKeyOf } from './wallet';

describe('레벨 곡선', () => {
  it('Lv2 100 · Lv3 300 · Lv4 600', () => {
    expect(xpToReach(1)).toBe(0);
    expect(xpToReach(2)).toBe(100);
    expect(xpToReach(3)).toBe(300);
    expect(xpToReach(4)).toBe(600);
  });

  it('경험치에서 레벨과 진행도를 읽는다', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, into: 0, span: 100 });
    expect(levelFromXp(99)).toEqual({ level: 1, into: 99, span: 100 });
    expect(levelFromXp(100)).toEqual({ level: 2, into: 0, span: 200 });
    expect(levelFromXp(350)).toEqual({ level: 3, into: 50, span: 300 });
    expect(levelFromXp(-5).level).toBe(1);
  });
});

describe('정산', () => {
  const result: GameResult = { winners: ['sheriff', 'deputy'], winnerIds: ['p0', 'p2'], reason: '' };

  it('사람 자리만, 이긴 사람은 더 받는다', () => {
    const credits = settleResult(result, [
      { pid: 'p0', uid: 'a' },
      { pid: 'p1', uid: 'b' },
      { pid: 'p2', uid: null },
      { pid: 'p3', uid: 'd' },
    ]);
    expect(credits.map((c) => c.uid)).toEqual(['a', 'b', 'd']);
    expect(credits[0]).toMatchObject({ won: true, cash: CASH_PLAY + CASH_WIN, xp: XP_PLAY + XP_WIN });
    expect(credits[1]).toMatchObject({ won: false, cash: CASH_PLAY, xp: XP_PLAY });
  });
});

describe('지갑', () => {
  const credit = { uid: 'a', pid: 'p0' as const, won: true, cash: 20, xp: 50 };

  it('빈 지갑에 첫 보상을 넣는다', () => {
    const { wallet, applied } = applyCredit(null, credit, '2026-10-04', 1);
    expect(wallet).toMatchObject({ cash: 20, xp: 50, games: 1, wins: 1, day: '2026-10-04', dayCash: 20 });
    expect(applied).toEqual({ cash: 20, xp: 50, won: true, capped: false });
  });

  it('하루 한도에 닿으면 돈은 깎고 경험치는 그대로 준다', () => {
    let w = applyCredit(null, credit, 'd', 1).wallet;
    w = { ...w, dayCash: DAILY_CASH_CAP - 5 };
    const { wallet, applied } = applyCredit(w, credit, 'd', 2);
    expect(applied).toEqual({ cash: 5, xp: 50, won: true, capped: true });
    expect(wallet.dayCash).toBe(DAILY_CASH_CAP);
    const next = applyCredit(wallet, credit, 'd', 3);
    expect(next.applied.cash).toBe(0);
    expect(next.applied.capped).toBe(true);
    expect(next.wallet.xp).toBe(150);
  });

  it('날이 바뀌면 하루 한도가 돌아온다', () => {
    const w = { ...applyCredit(null, credit, 'd1', 1).wallet, dayCash: DAILY_CASH_CAP };
    const { applied, wallet } = applyCredit(w, credit, 'd2', 2);
    expect(applied.capped).toBe(false);
    expect(wallet.day).toBe('d2');
    expect(wallet.dayCash).toBe(20);
  });

  it('날짜 키는 한국 시간이다', () => {
    // 2026-10-03 16:00 UTC = 10-04 01:00 KST
    expect(dayKeyOf(Date.UTC(2026, 9, 3, 16))).toBe('2026-10-04');
    expect(dayKeyOf(Date.UTC(2026, 9, 3, 14))).toBe('2026-10-03');
  });
});

describe('문서 모양', () => {
  const seats = [
    { id: 'p0' as const, name: '나', human: true, tier: 'medium' as const },
    { id: 'p1' as const, name: 'AI', human: false, tier: 'hard' as const },
  ];

  it('올릴 문서를 만들고 다시 푼다', () => {
    const actions = [{ type: 'startGame' as const, seed: 7, config: { playerCount: 4, expansions: [] }, seats: [] }];
    const { id, doc } = makeMatchUpload({ uid: 'u', seed: 7, seats, controlled: ['p0'], actions });
    expect(id).toBe(matchId('u', 7));
    expect(doc.actions).toBe(1);
    expect(isMatchDoc(doc)).toBe(true);
    expect(parseMatchLog(doc)).toEqual(actions);
    expect(parseMatchLog({ log: '{' })).toBeNull();
    expect(parseMatchLog({ log: '[1]' })).toBeNull();
  });

  it('너무 긴 로그는 거절한다', () => {
    const big = Array.from({ length: 40000 }, () => ({ type: 'endTurn' as const, pid: 'p0' as const }));
    expect(() => makeMatchUpload({ uid: 'u', seed: 1, seats, controlled: ['p0'], actions: big })).toThrow(
      /너무 길어/,
    );
  });

  it('가드가 어긋난 모양을 거른다', () => {
    expect(isWallet({ cash: 1, xp: 1, games: 1, wins: 0, day: 'd', dayCash: 0 })).toBe(true);
    expect(isWallet({ cash: '1' })).toBe(false);
    expect(isMatchDoc({ uid: 'u', seed: 1, seats: [{ id: 'p0' }], controlled: [], log: '', actions: 0, status: 'pending' })).toBe(false);
  });

  it('undefined 필드를 걷어 낸다', () => {
    expect(clean({ a: 1, b: undefined, c: [{ d: undefined, e: 2 }] })).toEqual({ a: 1, c: [{ e: 2 }] });
  });

  it('닉네임을 다듬는다', () => {
    expect(cleanNick('  총잡이\n 철수  ')).toBe('총잡이 철수');
    expect(cleanNick('   ')).toBeNull();
    expect(cleanNick('가나다라마바사아자차카타파하')).toBe('가나다라마바사아자차카타');
  });
});
