import { describe, expect, it } from 'vitest';

import { baseDistance, canReachAtRange, canReachWithBang, distance, weaponRangeOf } from '../distance';
import { scenario } from './helpers';

const plain = (n: number) => scenario({ players: Array.from({ length: n }, () => ({})) });

describe('기본 거리', () => {
  it('원형에서 짧은 쪽을 잰다', () => {
    const s = plain(7);
    expect(baseDistance(s, 'p0', 'p1')).toBe(1);
    expect(baseDistance(s, 'p0', 'p6')).toBe(1);
    expect(baseDistance(s, 'p0', 'p3')).toBe(3);
    expect(baseDistance(s, 'p0', 'p4')).toBe(3);
    expect(baseDistance(s, 'p0', 'p0')).toBe(0);
  });

  it('4인은 최대 거리가 2다', () => {
    const s = plain(4);
    expect(baseDistance(s, 'p0', 'p2')).toBe(2);
    expect(baseDistance(s, 'p0', 'p1')).toBe(1);
  });

  it('거리는 대칭이다', () => {
    const s = plain(6);
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        expect(baseDistance(s, `p${i}`, `p${j}`)).toBe(baseDistance(s, `p${j}`, `p${i}`));
      }
    }
  });
});

describe('탈락자는 원에서 빠진다', () => {
  it('사이에 있던 사람이 죽으면 거리가 줄어든다', () => {
    const s = scenario({
      players: [{}, { alive: false }, {}, {}, {}, {}, {}],
    });
    // p1 이 빠졌으므로 p0 → p2 는 이제 1
    expect(baseDistance(s, 'p0', 'p2')).toBe(1);
    // 남은 6명 원에서 p0 → p3 는 2
    expect(baseDistance(s, 'p0', 'p3')).toBe(2);
  });

  it('좌석 1,3,4,5,7 만 살아남은 경우에도 원이 다시 짜인다', () => {
    // 원본 맵 v0.8 패치노트가 지적한 상황
    const s = scenario({
      players: [
        { alive: false },
        {},
        { alive: false },
        {},
        {},
        {},
        { alive: false },
        {},
      ],
    });
    // 생존자는 좌석 1,3,4,5,7 → 5명 원
    expect(baseDistance(s, 'p1', 'p3')).toBe(1);
    expect(baseDistance(s, 'p1', 'p5')).toBe(2);
    expect(baseDistance(s, 'p1', 'p7')).toBe(1);
    expect(baseDistance(s, 'p3', 'p7')).toBe(2);
  });

  it('유령은 원에 남는다', () => {
    const s = scenario({
      players: [{}, { alive: false, ghost: true }, {}, {}],
    });
    expect(baseDistance(s, 'p0', 'p2')).toBe(2);
  });
});

describe('거리 수정치', () => {
  it('야생마는 상대가 나를 볼 때 거리를 늘린다', () => {
    const s = scenario({ players: [{}, { equipment: ['mustang'] }, {}, {}] });
    expect(distance(s, 'p0', 'p1')).toBe(2);
    expect(distance(s, 'p1', 'p0')).toBe(1);
  });

  it('조준경은 내가 남을 볼 때 거리를 줄인다', () => {
    const s = scenario({ players: [{ equipment: ['scope'] }, {}, {}, {}] });
    expect(distance(s, 'p0', 'p2')).toBe(1);
    expect(distance(s, 'p2', 'p0')).toBe(2);
  });

  it('폴 리그렛과 로즈 둘란은 장비와 같은 방향으로 작동한다', () => {
    const s = scenario({
      players: [{ character: 'roseDoolan' }, {}, { character: 'paulRegret' }, {}],
    });
    expect(distance(s, 'p0', 'p2')).toBe(2); // 2 - 1(로즈) + 1(폴)
    expect(distance(s, 'p1', 'p2')).toBe(2); // 1 + 1(폴)
  });

  it('수정치가 겹쳐도 거리는 1 아래로 내려가지 않는다', () => {
    const s = scenario({
      players: [{ character: 'roseDoolan', equipment: ['scope'] }, {}, {}, {}],
    });
    expect(distance(s, 'p0', 'p1')).toBe(1);
  });

  it('야생마와 폴 리그렛은 합산된다', () => {
    const s = scenario({
      players: [{}, {}, { character: 'paulRegret', equipment: ['mustang'] }, {}],
    });
    expect(distance(s, 'p0', 'p2')).toBe(4);
  });
});

describe('사정거리', () => {
  it('맨손은 1이고 무기는 카드에 적힌 값을 준다', () => {
    const s = scenario({
      players: [
        {},
        { equipment: ['schofield'] },
        { equipment: ['winchester'] },
        { equipment: ['volcanic'] },
      ],
    });
    expect(weaponRangeOf(s, 'p0')).toBe(1);
    expect(weaponRangeOf(s, 'p1')).toBe(2);
    expect(weaponRangeOf(s, 'p2')).toBe(5);
    expect(weaponRangeOf(s, 'p3')).toBe(1);
  });

  it('뱅!은 사정거리 안에서만 닿는다', () => {
    const s = scenario({
      players: [{ equipment: ['schofield'] }, {}, {}, {}, {}, {}, {}],
    });
    expect(canReachWithBang(s, 'p0', 'p1')).toBe(true);
    expect(canReachWithBang(s, 'p0', 'p2')).toBe(true);
    expect(canReachWithBang(s, 'p0', 'p3')).toBe(false);
    expect(canReachWithBang(s, 'p0', 'p0')).toBe(false);
  });

  it('강탈은 무기를 무시하고 거리 1만 본다', () => {
    const s = scenario({
      players: [{ equipment: ['winchester'] }, {}, {}, {}, {}],
    });
    expect(canReachWithBang(s, 'p0', 'p2')).toBe(true);
    expect(canReachAtRange(s, 'p0', 'p2', 1)).toBe(false);
    expect(canReachAtRange(s, 'p0', 'p1', 1)).toBe(true);
  });
});
