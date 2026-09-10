import { describe, expect, it } from 'vitest';

import { createRng, nextFloat, nextInt, pick, shuffle } from './rng';

describe('시드 RNG', () => {
  it('같은 시드는 같은 수열을 만든다', () => {
    const roll = (seed: number) => {
      let rng = createRng(seed);
      const out: number[] = [];
      for (let i = 0; i < 20; i++) {
        const r = nextInt(rng, 100);
        out.push(r.value);
        rng = r.rng;
      }
      return out;
    };
    expect(roll(42)).toEqual(roll(42));
    expect(roll(42)).not.toEqual(roll(43));
  });

  it('상태는 정수 두 개뿐이고 JSON을 왕복해도 이어서 뽑힌다', () => {
    let rng = createRng(7);
    for (let i = 0; i < 5; i++) rng = nextInt(rng, 10).rng;

    const revived = JSON.parse(JSON.stringify(rng));
    expect(nextInt(revived, 10).value).toBe(nextInt(rng, 10).value);
  });

  it('nextFloat는 [0,1) 범위다', () => {
    let rng = createRng(1);
    for (let i = 0; i < 500; i++) {
      const r = nextFloat(rng);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(1);
      rng = r.rng;
    }
  });

  it('nextInt는 범위를 벗어나지 않고 모든 값이 나온다', () => {
    let rng = createRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const r = nextInt(rng, 6);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(6);
      seen.add(r.value);
      rng = r.rng;
    }
    expect(seen.size).toBe(6);
  });

  it('nextInt 분포가 심하게 치우치지 않는다', () => {
    let rng = createRng(2024);
    const counts = new Array(10).fill(0);
    const n = 60000;
    for (let i = 0; i < n; i++) {
      const r = nextInt(rng, 10);
      counts[r.value]++;
      rng = r.rng;
    }
    for (const c of counts) expect(Math.abs(c - n / 10) / (n / 10)).toBeLessThan(0.06);
  });

  it('셔플은 원본을 건드리지 않고 원소를 보존한다', () => {
    const src = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const { value } = shuffle(createRng(5), src);
    expect(value).not.toEqual([...src]);
    expect([...value].sort((a, b) => a - b)).toEqual([...src]);
  });

  it('셔플도 시드에 따라 재현된다', () => {
    const a = shuffle(createRng(5), [1, 2, 3, 4, 5, 6, 7, 8]);
    const b = shuffle(createRng(5), [1, 2, 3, 4, 5, 6, 7, 8]);
    expect(a.value).toEqual(b.value);
    expect(a.rng).toEqual(b.rng);
  });

  it('pick은 목록 안의 값을 돌려준다', () => {
    const items = ['a', 'b', 'c'];
    let rng = createRng(3);
    for (let i = 0; i < 50; i++) {
      const r = pick(rng, items);
      expect(items).toContain(r.value);
      rng = r.rng;
    }
  });
});
