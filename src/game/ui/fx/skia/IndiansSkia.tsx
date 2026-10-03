/**
 * 고화질 인디언! — 함성 물결. 연출 캔버스(CardFxSkia) 안의 두 무리로 그린다.
 *
 * - IndiansSeatsSkia (배경 무대): 판 둘레의 다른 사람 자리 여섯. 고리가 닿으면 붉게 들썩인다
 * - IndiansSkia (카드와 함께 흔들림): 그림 속 외치는 입(geom.mx, my)이 박자마다 크게 벌어지고,
 *   붉은 소리 고리 세 겹이 판 전체로 번진다. 깃털(geom.bx, by)이 흩날린다
 *
 * 크기·자리는 시안(카드 폭 92)을 기준으로 카드 폭에 비례해 옮긴다.
 */

import { DashPathEffect, Group, Oval, Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { addRotOval, addRotRect, seeded } from './paths';
import {
  artScale,
  FX_INDIANS,
  INDIANS_BEATS_MS,
  INDIANS_HQ_MS,
  INDIANS_RING_R,
  indiansFrame,
  indiansRing,
  SEAT_DEG,
  seatAt,
  type ShotGeom,
} from './timeline';

type Props = { progress: SharedValue<number>; geom: SharedValue<ShotGeom> };
type Frame = SharedValue<ReturnType<typeof indiansFrame>>;

/** 깃털: 방향, 속도(시안 px), 늦게 나는 정도(진행도), 회전 */
const FEATHERS = (() => {
  const r = seeded(31);
  return Array.from({ length: 18 }, () => ({ a: r() * Math.PI * 2, sp: 60 + r() * 90, d: r() * 0.25, spin: (r() - 0.5) * 8 }));
})();

export function IndiansSkia({ progress, geom }: Props) {
  const f = useDerivedValue(() => indiansFrame(geom.value.kind === FX_INDIANS ? progress.value : 1));
  const unit = useDerivedValue(() => geom.value.cw / 92);

  // 크게 벌린 입 (원본 그림 px 크기)
  const mouth = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const m = f.value.mouth;
    if (m <= 0.01) return p;
    const g = geom.value;
    const k = artScale(g.cw, g.ch);
    addRotOval(p, g.mx, g.my, (5 + m * 3) * 1.4 * k, (4 + m * 9) * 1.4 * k, -0.3);
    return p;
  });
  const mouthOpacity = useDerivedValue(() => Math.min(1, f.value.mouth * 1.5));

  const feathers = useDerivedValue(() => featherPath(geom.value, f.value.T, unit.value, false));
  const quills = useDerivedValue(() => featherPath(geom.value, f.value.T, unit.value, true));
  const featherOpacity = useDerivedValue(() => {
    const t = f.value.T / INDIANS_HQ_MS;
    return f.value.seats > 0 ? 1 - Math.min(1, Math.max(0, (t - 0.6) / 0.35)) : 0;
  });

  const rings = [];
  for (let b = 0; b < INDIANS_BEATS_MS.length; b++) for (let j = 0; j < 3; j++) rings.push(<Ring key={`${b}-${j}`} b={b} j={j} f={f} geom={geom} />);

  return (
    <>
      <Path path={mouth} color="#3A1A14" opacity={mouthOpacity} />
      {rings}
      <Group opacity={featherOpacity}>
        <Path path={feathers} color="#F3EAD6" />
        <Path path={quills} color="#1E140B" />
      </Group>
    </>
  );
}

function featherPath(g: ShotGeom, T: number, u: number, tip: boolean) {
  'worklet';
  const p = Skia.Path.Make();
  const t = T / INDIANS_HQ_MS;
  for (const fe of FEATHERS) {
    const k = (t - 0.08 - fe.d) / 0.62;
    if (k <= 0 || k >= 1) continue;
    const e = 1 - (1 - k) * (1 - k) * (1 - k);
    const x = g.bx + Math.cos(fe.a) * fe.sp * e * u;
    const y = g.by + (Math.sin(fe.a) * fe.sp * e * 0.7 + k * 20) * u;
    const a = fe.spin * k + Math.sin(k * 12) * 0.5;
    if (tip) addRotRect(p, x - Math.sin(a) * -5 * u, y + Math.cos(a) * -5 * u, 3.6 * u, 2 * u, a);
    else addRotOval(p, x, y, 1.8 * u, 6 * u, a);
  }
  return p;
}

function Ring({ b, j, f, geom }: { b: number; j: number; f: Frame; geom: SharedValue<ShotGeom> }) {
  const k = useDerivedValue(() => indiansRing(f.value.T, b, j));
  const rect = useDerivedValue(() => {
    const g = geom.value;
    const kk = Math.max(0, k.value);
    const R = (10 + (1 - (1 - kk) * (1 - kk) * (1 - kk)) * INDIANS_RING_R) * (g.cw / 92);
    return { x: g.mx - R, y: g.my - R * 0.7, width: R * 2, height: R * 1.4 };
  });
  const opacity = useDerivedValue(() => (k.value < 0 || f.value.seats <= 0 ? 0 : (1 - k.value) * (b === 2 ? 1 : 0.8)));
  const width = useDerivedValue(() => (3.5 - j) * (1 - Math.max(0, k.value) * 0.6) * (geom.value.cw / 92));
  const dash = [10 - j * 2, 4 + j * 2];
  return (
    <Oval rect={rect} style="stroke" strokeWidth={width} color="#D8452B" opacity={opacity}>
      <DashPathEffect intervals={dash} />
    </Oval>
  );
}

export function IndiansSeatsSkia({ progress, geom }: Props) {
  const f = useDerivedValue(() => indiansFrame(geom.value.kind === FX_INDIANS ? progress.value : 1));
  const opacity = useDerivedValue(() => f.value.seats);
  return (
    <Group opacity={opacity}>
      {SEAT_DEG.map((_, i) => (
        <Seat key={i} i={i} f={f} geom={geom} />
      ))}
    </Group>
  );
}

function Seat({ i, f, geom }: { i: number; f: Frame; geom: SharedValue<ShotGeom> }) {
  // 고리가 이 자리에 닿는 때마다 들썩인다
  const jolt = useDerivedValue(() => {
    const g = geom.value;
    const u = g.cw / 92;
    const s = seatAt(g, SEAT_DEG[i]);
    const d = Math.hypot((s.x - g.mx) / u, (s.y - g.my) / u / 0.7);
    let v = 0;
    for (let b = 0; b < INDIANS_BEATS_MS.length; b++) {
      const hit = INDIANS_BEATS_MS[b] + Math.max(0, (d - 10) / INDIANS_RING_R) * 0.2 * INDIANS_HQ_MS;
      const k = (f.value.T - hit) / 144;
      if (k > 0 && k < 1) v = Math.max(v, Math.sin(k * Math.PI));
    }
    return v;
  });
  const rect = useDerivedValue(() => {
    const g = geom.value;
    const u = g.cw / 92;
    const s = seatAt(g, SEAT_DEG[i]);
    const r = (7 + jolt.value * 2) * u;
    return { x: s.x + jolt.value * 2 * u - r, y: s.y - jolt.value * 3 * u - r, width: r * 2, height: r * 2 };
  });
  const idle = useDerivedValue(() => (jolt.value > 0.1 ? 0 : 0.55));
  const lit = useDerivedValue(() => (jolt.value > 0.1 ? 1 : 0));
  const ring = useDerivedValue(() => 1.5 * (geom.value.cw / 92));
  return (
    <>
      <Oval rect={rect} color="#1E140B" opacity={idle} />
      <Oval rect={rect} color="#D8452B" opacity={lit} />
      <Oval rect={rect} style="stroke" strokeWidth={ring} color="#C8902F" />
    </>
  );
}
