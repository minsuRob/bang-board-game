/**
 * 스토어 전이 → 연출 배치. Table3D 가 마운트될 때만 산다.
 * 2D 모드에서는 시작하지 않으므로 AI 를 붙잡지 않는다.
 */

import type { PlayerId } from '../../engine';
import { extendFx, fxPacing, releaseFx } from '../../store/fx-pacing';
import { onTransition } from '../../store/transition-bus';
import { clearFx, enqueueFx } from './fx-store';
import { planFx } from './fx-plan';
import { diffZones } from './move-diff';

export function startFxBridge(getViewer: () => PlayerId | null): () => void {
  const stop = onTransition((t) => {
    const moves = t.prev ? diffZones(t.prev, t.next) : [];
    const batch = planFx(t, moves, getViewer());
    enqueueFx(batch);
    if (!batch.snap && batch.estMs > 0) extendFx(batch.estMs / fxPacing.getState().timeScale + 60);
  });
  return () => {
    stop();
    releaseFx();
    clearFx();
  };
}
