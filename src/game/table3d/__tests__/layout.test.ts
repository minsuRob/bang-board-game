import { describe, expect, it } from 'vitest';

import { equipmentOffset, fanOffset, layoutTable, storeSlot } from '../core/layout';

describe('layoutTable', () => {
  it('나는 언제나 화면 아래(+z 최대)에 앉는다', () => {
    for (const n of [4, 5, 6, 7, 8]) {
      for (let v = 0; v < n; v++) {
        for (const aspect of [0.46, 1, 1.78]) {
          const l = layoutTable(n, v, aspect);
          const me = l.seats[v];
          for (const s of l.seats) {
            if (s.index === v) continue;
            expect(s.pos[2]).toBeLessThan(me.pos[2] - 0.5);
          }
          expect(Math.abs(me.pos[0])).toBeLessThan(1e-9);
        }
      }
    }
  });

  it('좌석은 서로 겹치지 않는다', () => {
    for (const n of [4, 5, 6, 7]) {
      for (const aspect of [0.46, 1.78]) {
        const l = layoutTable(n, 0, aspect);
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const a = l.seats[i].pos;
            const b = l.seats[j].pos;
            expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeGreaterThan(1.3);
          }
        }
      }
    }
  });

  it('착석 순서가 시계 방향으로 유지된다 (내 왼쪽이 다음 사람)', () => {
    const l = layoutTable(5, 2, 1.78);
    // 내 다음 사람(offset 1)은 내 왼쪽(x<0), 마지막 사람(offset n-1)은 오른쪽
    expect(l.seats[3].pos[0]).toBeLessThan(0);
    expect(l.seats[1].pos[0]).toBeGreaterThan(0);
  });

  it('카드 윗변이 테이블 중심을 향한다', () => {
    const l = layoutTable(6, 0, 1.78);
    for (const s of l.seats) {
      // yaw=0 일 때 윗변 방향은 -z. 회전 후 방향이 inward 와 같아야 한다
      const dir = [-Math.sin(s.yaw), 0, -Math.cos(s.yaw)];
      expect(dir[0]).toBeCloseTo(s.inward[0], 6);
      expect(dir[2]).toBeCloseTo(s.inward[2], 6);
    }
  });

  it('세로 화면에서는 상대가 전부 위쪽 호에 모인다', () => {
    const l = layoutTable(7, 0, 0.5);
    expect(l.portrait).toBe(true);
    for (const s of l.seats) {
      if (s.index === 0) continue;
      expect(s.pos[2]).toBeLessThan(2.2);
    }
  });

  it('보조 배치 함수는 가운데 정렬이다', () => {
    expect(fanOffset(1, 3).dx).toBeCloseTo(0);
    expect(fanOffset(0, 3).dx).toBeLessThan(0);
    expect(equipmentOffset(1, 3)).toBeCloseTo(0);
    const l = layoutTable(4, 0, 1.78);
    expect(storeSlot(l, 1, 3)[0]).toBeCloseTo(l.store[0][0]);
    expect(storeSlot(l, 0, 3)[0]).toBeLessThan(storeSlot(l, 2, 3)[0]);
  });
});
