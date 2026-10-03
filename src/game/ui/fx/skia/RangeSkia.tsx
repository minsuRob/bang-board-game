/**
 * 고화질 레밍턴 — 사격장 과녁 3개. 연출 캔버스(CardFxSkia) 안의 한 무리로 그린다.
 *
 * 카드 오른쪽 원근 사격장에 과녁 다섯 개가 차례로 일어서고, 그림 속 총구에서 예광선이
 * 1·2·3번을 맞혀 넘어뜨린다. 4·5번은 닿지 않는 흐린 점선으로 남는다 (사정거리 3).
 * 과녁 번호는 RN(GunFxLabels)이 그린다.
 *
 * 자리는 시안(카드 92×132, 가운데 150,105)의 좌표를 카드 크기에 비례해 옮긴다.
 */

import { BlurMask, DashPathEffect, Group, Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { FX_RANGE, RANGE_TARGETS, rangeFrame, type RangeFrame, type ShotGeom } from './timeline';

const HIT_COUNT = 3;

export function RangeSkia({ progress, geom }: { progress: SharedValue<number>; geom: SharedValue<ShotGeom> }) {
  const f = useDerivedValue(() => rangeFrame(geom.value.kind === FX_RANGE ? progress.value : 1));
  const unit = useDerivedValue(() => geom.value.cw / 92);

  // 도우미는 값을 인자로 받는다. 도우미 안에서만 공유값을 읽으면 웹에서 구독이 안 잡혀 갱신되지 않는다
  /** 과녁 i 의 받침 자리와 반지름 */
  const target = (g: ShotGeom, i: number) => {
    'worklet';
    const t = RANGE_TARGETS[i];
    return { x: g.cx + g.cw / 2 + t.x * g.cw, y: g.cy - g.ch / 2 + t.y * g.ch, r: 11 * t.s * (g.cw / 92) };
  };
  /** 과녁 머리(원) 타원. 일어선 정도만큼 세로로 눌린다 */
  const head = (p: ReturnType<typeof Skia.Path.Make>, g: ShotGeom, fr: RangeFrame, i: number, k: number) => {
    'worklet';
    const t = target(g, i);
    const sy = fr.up[i];
    const cy = t.y - 2 * t.r * sy;
    p.addOval({ x: t.x - t.r * k, y: cy - t.r * k * sy, width: 2 * t.r * k, height: 2 * t.r * k * sy });
  };
  const standing = (fr: RangeFrame, i: number) => {
    'worklet';
    return fr.up[i] > 0.01;
  };

  const posts = useDerivedValue(() => {
    const p = Skia.Path.Make();
    for (let i = 0; i < RANGE_TARGETS.length; i++) {
      if (!standing(f.value, i)) continue;
      const t = target(geom.value, i);
      p.moveTo(t.x, t.y);
      p.lineTo(t.x, t.y - t.r * f.value.up[i]);
    }
    return p;
  });
  const ring = (g: ShotGeom, fr: RangeFrame, k: number) => {
    'worklet';
    const p = Skia.Path.Make();
    for (let i = 0; i < HIT_COUNT; i++) if (standing(fr, i)) head(p, g, fr, i, k);
    return p;
  };
  const outer = useDerivedValue(() => ring(geom.value, f.value, 1));
  const red = useDerivedValue(() => ring(geom.value, f.value, 0.66));
  const inner = useDerivedValue(() => ring(geom.value, f.value, 0.33));
  const holes = useDerivedValue(() => {
    const p = Skia.Path.Make();
    for (let i = 0; i < HIT_COUNT; i++) {
      if (!standing(f.value, i) || f.value.hit[i] <= 0) continue;
      const t = target(geom.value, i);
      const sy = f.value.up[i];
      const s = RANGE_TARGETS[i].s;
      p.addCircle(t.x + unit.value, t.y - 2 * t.r * sy + unit.value * sy, (1.6 * s + 0.4) * unit.value);
    }
    return p;
  });
  const ghosts = useDerivedValue(() => {
    const p = Skia.Path.Make();
    for (let i = HIT_COUNT; i < RANGE_TARGETS.length; i++) if (standing(f.value, i)) head(p, geom.value, f.value, i, 1);
    return p;
  });

  // 사격장 바닥선 두 줄
  const lanes = useDerivedValue(() => {
    const g = geom.value;
    const u = unit.value;
    const v = g.ch / 132;
    const P = (x: number, y: number) => [g.cx + (x - 150) * u, g.cy + (y - 105) * v] as const;
    const p = Skia.Path.Make();
    const a = P(206, 190);
    const b = P(300, 70);
    const c = P(246, 196);
    const d = P(300, 120);
    p.moveTo(a[0], a[1]);
    p.lineTo(b[0], b[1]);
    p.moveTo(c[0], c[1]);
    p.lineTo(d[0], d[1]);
    return p;
  });

  // 예광선과 맞은 자리 불티
  const tracers = useDerivedValue(() => {
    const { mx, my } = geom.value;
    const p = Skia.Path.Make();
    for (let i = 0; i < HIT_COUNT; i++) {
      const k = f.value.tracer[i];
      if (k < 0) continue;
      const t = target(geom.value, i);
      const tx = t.x;
      const ty = t.y - 2 * t.r;
      const m = Math.min(1, k * 2);
      // 앞쪽 절반만 남겨 꼬리가 총구에서 떨어져 나가게 한다
      const from = Math.max(0, m - 0.55);
      p.moveTo(mx + (tx - mx) * from, my + (ty - my) * from);
      p.lineTo(mx + (tx - mx) * m, my + (ty - my) * m);
    }
    return p;
  });
  const tracerOpacity = useDerivedValue(() => {
    let o = 0;
    for (let i = 0; i < HIT_COUNT; i++) if (f.value.tracer[i] >= 0) o = Math.max(o, 1 - f.value.tracer[i]);
    return o;
  });
  const impacts = useDerivedValue(() => {
    const p = Skia.Path.Make();
    for (let i = 0; i < HIT_COUNT; i++) {
      const k = f.value.tracer[i];
      if (k < 0.5) continue;
      const q = (k - 0.5) * 2;
      const t = target(geom.value, i);
      const s = RANGE_TARGETS[i].s;
      const u = unit.value;
      const tx = t.x;
      const ty = t.y - 2 * t.r;
      for (let j = 0; j < 6; j++) {
        const a = j * 1.05;
        p.moveTo(tx + Math.cos(a) * 3 * u, ty + Math.sin(a) * 3 * u);
        p.lineTo(tx + Math.cos(a) * (4 + q * 8 * s) * u, ty + Math.sin(a) * (4 + q * 8 * s) * u);
      }
    }
    return p;
  });
  const impactOpacity = useDerivedValue(() => {
    let o = 0;
    for (let i = 0; i < HIT_COUNT; i++) if (f.value.tracer[i] >= 0.5) o = Math.max(o, 1 - (f.value.tracer[i] - 0.5) * 2);
    return o;
  });

  const fade = useDerivedValue(() => f.value.fade);
  const thin = useDerivedValue(() => Math.max(1, unit.value));
  const postWidth = useDerivedValue(() => 1.5 * unit.value);
  const tracerWidth = useDerivedValue(() => 2.5 * unit.value);

  return (
    <Group opacity={fade}>
      <Path path={lanes} style="stroke" strokeWidth={thin} color="rgba(179,155,116,0.3)" />
      <Path path={posts} style="stroke" strokeWidth={postWidth} color="#6B4A2F" />
      <Path path={outer} color="#EFE2C6" />
      <Path path={red} color="#B3261E" />
      <Path path={inner} color="#EFE2C6" />
      <Path path={holes} color="#1E140B" />
      <Path path={ghosts} style="stroke" strokeWidth={thin} color="rgba(179,155,116,0.7)">
        <DashPathEffect intervals={[3, 3]} />
      </Path>
      <Path path={tracers} style="stroke" strokeWidth={tracerWidth} strokeCap="round" color="#FFF4D2" opacity={tracerOpacity}>
        <BlurMask blur={1.2} style="solid" />
      </Path>
      <Path path={impacts} style="stroke" strokeWidth={thin} strokeCap="round" color="#FFDC8C" opacity={impactOpacity} />
    </Group>
  );
}
