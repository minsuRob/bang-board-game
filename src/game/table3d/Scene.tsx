/**
 * Canvas 안쪽. 월드 객체를 한 번 만들고, 상태·크기 변화는 effect 에서, 움직임은 useFrame 하나에서.
 * 프레임마다 React 가 렌더하지 않는다.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import type { GameState, PlayerId } from '../engine';
import { frameCamera } from './core/camera';
import { dragStore } from './core/drag-store';
import { fxStore, isReserved } from './core/fx-store';
import { layoutTable } from './core/layout';
import type { FxBudget } from './core/types';
import { setMaterialSwapListener } from './materials/card-materials';
import { AnchorProjector } from './scene/AnchorProjector';
import { CameraRig } from './scene/CameraRig';
import { CardWorld } from './scene/CardWorld';
import { DragTracker } from './scene/DragTracker';
import { FxLayer } from './scene/FxLayer';
import { Particles } from './scene/Particles';
import { Sequencer } from './scene/Sequencer';

export type SceneProps = {
  /** 가리지 않은 상태. 앞면을 보일지는 CardWorld 가 정한다 */
  state: GameState;
  viewerIndex: number;
  budget: FxBudget;
  targets: PlayerId[];
  /** 탭으로 골라 둔 카드 */
  selected: string | null;
};

export function Scene({ state, viewerIndex, budget, targets, selected }: SceneProps) {
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  const [world] = useState(() => {
    const w = new CardWorld(budget);
    w.isReservedNow = isReserved;
    return w;
  });
  const [rig] = useState(() => new CameraRig());
  const [projector] = useState(() => new AnchorProjector());
  const [fx] = useState(() => new FxLayer());
  const [particles] = useState(() => new Particles(budget.particles));
  const [seq] = useState(
    () => new Sequencer({ world, rig, fx, particles, onBatchDone: (snap) => world.resettle(snap, isReserved) }),
  );
  const [root] = useState(() => {
    const g = new THREE.Group();
    g.add(world.root, fx.root, particles.points);
    return g;
  });
  // 첫 배치는 즉시 스냅, 그 뒤로는 감쇠로 붙는다
  const booted = useRef(false);
  const [drag] = useState(() => new DragTracker(world));

  const n = state.players.length;

  // 배치와 카메라: 인원·내 자리·화면 크기가 바뀔 때만
  useEffect(() => {
    // 첫 측정 전에는 0×0 이 온다. 그걸로 카메라를 맞추면 NaN 이 되어 영영 안 돌아온다
    if (size.width < 2 || size.height < 2) return;
    const aspect = size.width / size.height;
    const layout = layoutTable(n, viewerIndex, aspect);
    world.setLayout(layout);
    rig.setBase(frameCamera(aspect, layout), !booted.current);
    rig.apply(camera);
    projector.project(camera, size.width, size.height, layout);
    booted.current = true;
    invalidate();
  }, [n, viewerIndex, size.width, size.height, world, rig, projector, camera, invalidate]);

  // 상태가 바뀌면 정답 자리로. 큐에 든 연출이 옮길 카드는 건너뛴다
  useEffect(() => {
    world.settle(state, viewerIndex, !booted.current, isReserved);
    world.highlightTargets(targets);
    // 판이 끝났으면 남은 연출을 정리한다
    if (state.result) seq.flush();
    invalidate();
  }, [state, viewerIndex, targets, world, seq, invalidate]);

  useEffect(() => {
    particles.setPixelRatio(gl.getPixelRatio());
  }, [particles, gl]);

  // 손가락이 움직이거나 고른 카드가 바뀌면 프레임을 하나 요청한다
  useEffect(() => dragStore.subscribe(() => invalidate()), [invalidate]);
  useEffect(() => invalidate(), [selected, invalidate]);

  // 큐에 배치가 들어오면 프레임을 하나 요청한다 (demand 모드라 누가 깨워야 돈다)
  useEffect(
    () =>
      fxStore.subscribe((s, prev) => {
        if (s.queue.length > prev.queue.length) invalidate();
      }),
    [invalidate],
  );

  // 그림이 늦게 오면 한 프레임 더
  useEffect(() => {
    setMaterialSwapListener(() => invalidate());
    return () => setMaterialSwapListener(null);
  }, [invalidate]);

  useEffect(() => {
    if (__DEV__) (globalThis as { __bang3d?: unknown }).__bang3d = { world, rig, camera, projector, seq, fx, particles, fxStore, dragStore };
  }, [world, rig, camera, projector, seq, fx, particles]);

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    const now = performance.now();
    let active = seq.tick(now);
    if (
      drag.tick(step, now, {
        camera,
        width: size.width,
        height: size.height,
        viewerIndex,
        playerIds: state.players.map((p) => p.id),
        selected,
      })
    )
      active = true;
    if (world.tick(step, now)) active = true;
    if (fx.tick(now)) active = true;
    if (particles.tick(now / 1000)) active = true;
    if (rig.tick(step, now)) active = true;
    rig.apply(camera);
    if (rig.moving && world.layout) projector.project(camera, size.width, size.height, world.layout);
    if (active) invalidate();
  });

  // eslint-disable-next-line react/no-unknown-property -- r3f 고유 prop
  return <primitive object={root} />;
}
