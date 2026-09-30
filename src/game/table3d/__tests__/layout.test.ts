import { describe, expect, it } from 'vitest';

import { equipmentOffset, fanOffset, layoutTable, SELF_BOARD_SCALE, seatFootprint, storeSlot } from '../core/layout';
import { BOARD_SIZE, type SeatAnchor, type Vec3 } from '../core/types';

/** 보드 로컬 좌표 (u: 오른쪽, w: 중심 쪽) */
function local(seat: SeatAnchor, p: Vec3) {
  const dx = p[0] - seat.pos[0];
  const dz = p[2] - seat.pos[2];
  return { u: dx * seat.right[0] + dz * seat.right[2], w: dx * seat.inward[0] + dz * seat.inward[2] };
}

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

  it('슬롯과 총알 칸은 보드 안에 있고, 총알 줄이 슬롯보다 중심 쪽이다', () => {
    for (const aspect of [0.5, 1.78]) {
      const l = layoutTable(6, 2, aspect);
      for (const s of l.seats) {
        const hw = (BOARD_SIZE.w * s.scale) / 2;
        const hh = (BOARD_SIZE.h * s.scale) / 2;
        const slots = [s.slots.role, s.slots.character, s.slots.weapon].map((p) => local(s, p));
        const bullets = s.bullets.map((p) => local(s, p));
        for (const q of [...slots, ...bullets]) {
          expect(Math.abs(q.u)).toBeLessThan(hw);
          expect(Math.abs(q.w)).toBeLessThan(hh);
        }
        expect(bullets).toHaveLength(5);
        for (const b of bullets) for (const q of slots) expect(b.w).toBeGreaterThan(q.w);
        // 왼쪽부터 직업·캐릭터·무기
        expect(slots[0].u).toBeLessThan(slots[1].u);
        expect(slots[1].u).toBeLessThan(slots[2].u);
      }
    }
  });

  it('내 보드만 크게 그린다', () => {
    const l = layoutTable(5, 3, 1.78);
    for (const s of l.seats) expect(s.scale).toBe(s.index === 3 ? SELF_BOARD_SCALE : 1);
  });

  it('세로 화면은 내 정보창이 캔버스에 뜰 때만 보드 아래 자리를 비워 둔다', () => {
    const withLabel = layoutTable(5, 0, 0.5);
    const inBar = layoutTable(5, 0, 0.5, { selfLabel: false });
    const hh = (BOARD_SIZE.h * SELF_BOARD_SCALE) / 2;
    // 기본(드래프트)은 보드 아랫변 밖으로 한참 더 비운다
    expect(local(withLabel.seats[0], withLabel.seats[0].label).w).toBeLessThan(-hh - 1);
    // 하단 바로 가면 비워 둔 자리가 보드 아랫변을 크게 넘지 않는다
    expect(local(inBar.seats[0], inBar.seats[0].label).w).toBeGreaterThan(-hh - 0.5);
    // 좌석 자리 자체는 그대로다
    expect(inBar.seats.map((s) => s.pos)).toEqual(withLabel.seats.map((s) => s.pos));
    // 가로 화면은 원래 비워 두지 않는다
    expect(layoutTable(5, 0, 1.78, { selfLabel: false }).seats[0].label).toEqual(layoutTable(5, 0, 1.78).seats[0].label);
  });

  it('장비 줄은 보드 중심 쪽 바깥, 상대 손패는 보드 반대쪽 바깥에 놓인다', () => {
    const l = layoutTable(6, 0, 1.78);
    for (const s of l.seats) {
      const hh = (BOARD_SIZE.h * s.scale) / 2;
      expect(local(s, s.equipment).w).toBeGreaterThan(hh);
      expect(local(s, s.hand).w).toBeLessThan(-hh);
    }
  });

  it('보드끼리 겹치지 않는다', () => {
    for (const n of [4, 5, 6, 7, 8]) {
      for (const aspect of [0.46, 1.78]) {
        const l = layoutTable(n, 0, aspect);
        for (const a of l.seats) {
          for (const b of l.seats) {
            if (a === b) continue;
            // b 보드의 네 모서리가 a 보드 안에 들어오지 않는다
            for (const c of seatFootprint(b, 0).slice(0, 4)) {
              const q = local(a, c);
              const inside =
                Math.abs(q.u) < (BOARD_SIZE.w * a.scale) / 2 && Math.abs(q.w) < (BOARD_SIZE.h * a.scale) / 2;
              expect(inside, `n ${n} aspect ${aspect} seats ${a.index}/${b.index}`).toBe(false);
            }
          }
        }
      }
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
