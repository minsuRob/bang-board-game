import { describe, expect, it } from 'vitest';

import { Timeline } from '../core/timeline';

describe('Timeline', () => {
  it('시작 전엔 기다리고, 끝나면 done 을 부르고 빠진다', () => {
    const tl = new Timeline();
    const seen: number[] = [];
    let done = 0;
    tl.add({ start: 100, dur: 100, update: (p) => seen.push(p), done: () => done++ });
    expect(tl.tick(50)).toBe(true);
    expect(seen).toEqual([]);
    expect(tl.tick(150)).toBe(true);
    expect(seen).toEqual([0.5]);
    expect(tl.tick(250)).toBe(false);
    expect(seen).toEqual([0.5, 1]);
    expect(done).toBe(1);
    expect(tl.size).toBe(0);
  });

  it('update 안에서 추가한 트랙도 산다', () => {
    const tl = new Timeline();
    let inner = 0;
    tl.add({
      start: 0,
      dur: 10,
      update: () => {},
      done: () => tl.add({ start: 20, dur: 10, update: () => inner++ }),
    });
    tl.tick(10);
    expect(tl.size).toBe(1);
    tl.tick(30);
    expect(inner).toBe(1);
    expect(tl.size).toBe(0);
  });

  it('flush 는 전부 끝 상태로 보낸다', () => {
    const tl = new Timeline();
    const ps: number[] = [];
    tl.add({ start: 1000, dur: 500, update: (p) => ps.push(p) });
    tl.add({ start: 0, dur: 500, update: (p) => ps.push(p) });
    tl.flush();
    expect(ps).toEqual([1, 1]);
    expect(tl.tick(0)).toBe(false);
  });
});
