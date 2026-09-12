import { describe, expect, it } from 'vitest';

import { arcControl, damp, easeOutBack, hashNoise, quadBezier, quadBezierTangent, wrapAngle } from '../core/math';

describe('math', () => {
  it('베지어는 양 끝점을 지난다', () => {
    const c = arcControl([0, 0, 0], [2, 0, 2], 1);
    expect(quadBezier([0, 0, 0], c, [2, 0, 2], 0)).toEqual([0, 0, 0]);
    expect(quadBezier([0, 0, 0], c, [2, 0, 2], 1)).toEqual([2, 0, 2]);
    // 중간은 떠 있다
    expect(quadBezier([0, 0, 0], c, [2, 0, 2], 0.5)[1]).toBeGreaterThan(0.4);
    // 접선은 처음엔 위로, 끝엔 아래로
    expect(quadBezierTangent([0, 0, 0], c, [2, 0, 2], 0)[1]).toBeGreaterThan(0);
    expect(quadBezierTangent([0, 0, 0], c, [2, 0, 2], 1)[1]).toBeLessThan(0);
  });

  it('damp 는 dt 에 무관하게 수렴한다', () => {
    let a = 0;
    for (let i = 0; i < 60; i++) a = damp(a, 1, 8, 1 / 60);
    let b = 0;
    for (let i = 0; i < 30; i++) b = damp(b, 1, 8, 1 / 30);
    expect(a).toBeCloseTo(b, 3);
    expect(a).toBeGreaterThan(0.99);
  });

  it('easeOutBack 은 1 을 살짝 넘겼다가 돌아온다', () => {
    expect(easeOutBack(0)).toBeCloseTo(0);
    expect(easeOutBack(1)).toBeCloseTo(1);
    expect(Math.max(...[0.6, 0.7, 0.8].map((t) => easeOutBack(t)))).toBeGreaterThan(1);
  });

  it('hashNoise 는 결정적이고 [0,1) 안이다', () => {
    for (let i = 0; i < 200; i++) {
      const v = hashNoise(i, 3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(hashNoise(i, 3)).toBe(v);
    }
  });

  it('wrapAngle', () => {
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2);
  });
});
