import { describe, expect, it } from 'vitest';

import { frameCamera, framingSamples, projectPoint } from '../core/camera';
import { layoutTable } from '../core/layout';

describe('frameCamera', () => {
  it('모든 화면 비율·인원에서 좌석과 더미가 화면 안에 들어온다', () => {
    for (const aspect of [0.46, 0.75, 1, 1.33, 1.78, 2.2]) {
      for (const n of [4, 5, 6, 7]) {
        const layout = layoutTable(n, 0, aspect);
        const frame = frameCamera(aspect, layout);
        for (const p of framingSamples(layout)) {
          const q = projectPoint(frame, aspect, p);
          expect(Math.abs(q.x), `aspect ${aspect} n ${n}`).toBeLessThanOrEqual(0.95);
          expect(Math.abs(q.y), `aspect ${aspect} n ${n}`).toBeLessThanOrEqual(0.92);
          expect(q.depth).toBeGreaterThan(0);
        }
      }
    }
  });

  it('카메라는 테이블 위, 내 쪽에서 내려다본다', () => {
    const layout = layoutTable(5, 0, 1.78);
    const frame = frameCamera(1.78, layout);
    expect(frame.position[1]).toBeGreaterThan(3);
    expect(frame.position[2]).toBeGreaterThan(frame.lookAt[2]);
  });

  it('투영은 가운데를 가운데로 보낸다', () => {
    const frame = { position: [0, 5, 5] as const, lookAt: [0, 0, 0] as const, fov: 45 };
    const q = projectPoint(frame, 1, [0, 0, 0]);
    expect(q.x).toBeCloseTo(0);
    expect(q.y).toBeCloseTo(0);
    // 오른쪽 점은 x>0, 카메라에서 먼 점(-z)은 위쪽
    expect(projectPoint(frame, 1, [1, 0, 0]).x).toBeGreaterThan(0);
    expect(projectPoint(frame, 1, [0, 0, -1]).y).toBeGreaterThan(0);
  });
});
