/**
 * 고화질 기관총 — 쓸어 가는 연사. 연출 캔버스(CardFxSkia) 안의 두 무리로 그린다.
 *
 * - GatlingSeatsSkia (배경 무대): 판 둘레의 다른 사람 자리 여섯. 예광탄이 닿으면 붉게 부푼다
 * - GatlingSkia (카드와 함께 흔들림): 그림 속 총구(geom.mx, my)에서 총열이 돌며 섬광이 깜빡이고,
 *   예광탄 30발이 왼쪽 위 자리부터 오른쪽 아래 자리까지 부채꼴로 쓸어 간다.
 *   탄피는 총 몸통(geom.bx, by)에서 튀어 올라 카드 아래 바닥에 한 번 튄다
 *
 * 자리는 시안(카드 92×132, 가운데 150,105)의 좌표를 카드 폭에 비례해 옮긴다.
 */

import { BlurMask, Circle, Group, Path, RadialGradient, Skia, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { addRotRect, seeded } from './paths';
import {
  FX_GATLING,
  GATLING_FIRE,
  GATLING_HQ_MS,
  GATLING_SHOTS,
  gatlingFrame,
  gatlingSweep,
  SEAT_DEG,
  seatAt,
  type ShotGeom,
} from './timeline';

type Props = { progress: SharedValue<number>; geom: SharedValue<ShotGeom> };

/** 탄피: 나오는 때(진행도), 속도(시안 px/진행도), 회전 */
const CASES = (() => {
  const r = seeded(21);
  return Array.from({ length: 26 }, (_, i) => ({ t0: 0.1 + (i / 26) * 0.6, vx: -15 - r() * 35, vy: -55 - r() * 45, spin: (r() - 0.5) * 30 }));
})();

/** 한 프레임에 섬광이 켜져 있는가 (33ms 마다 깜빡) */
function blink(T: number) {
  'worklet';
  return Math.floor(T / 33) % 2 === 0;
}

export function GatlingSkia({ progress, geom }: Props) {
  const f = useDerivedValue(() => gatlingFrame(geom.value.kind === FX_GATLING ? progress.value : 1));
  const unit = useDerivedValue(() => geom.value.cw / 92);

  const tracers = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const { T } = f.value;
    if (f.value.seats <= 0) return p;
    const { mx, my } = geom.value;
    const span = GATLING_FIRE[1] - GATLING_FIRE[0];
    for (let i = 0; i < GATLING_SHOTS; i++) {
      const te = GATLING_FIRE[0] + (i / GATLING_SHOTS) * span;
      const k = (T - te) / (0.14 * GATLING_HQ_MS);
      if (k <= 0 || k >= 1) continue;
      const tg = seatAt(geom.value, gatlingSweep(i / GATLING_SHOTS));
      const k0 = Math.max(0, k - 0.18);
      p.moveTo(mx + (tg.x - mx) * k0, my + (tg.y - my) * k0);
      p.lineTo(mx + (tg.x - mx) * k, my + (tg.y - my) * k);
    }
    return p;
  });

  // 도는 총열
  const barrels = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (f.value.fire < 0) return p;
    const { mx, my } = geom.value;
    const u = unit.value;
    const rot = (f.value.T / GATLING_HQ_MS) * 90;
    for (let j = 0; j < 6; j++) {
      const a = rot + (j * Math.PI * 2) / 6;
      if (Math.cos(a) < 0) continue;
      const y = my + Math.sin(a) * 2.6 * u;
      p.moveTo(mx - 14 * u, y);
      p.lineTo(mx, y);
    }
    return p;
  });

  // 섬광: 지금 겨누는 자리 쪽으로 별
  const aim = useDerivedValue(() => {
    const tg = seatAt(geom.value, gatlingSweep(Math.max(0, f.value.fire)));
    return Math.atan2(tg.y - geom.value.my, tg.x - geom.value.mx);
  });
  const flash = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (f.value.fire < 0 || !blink(f.value.T)) return p;
    const { mx, my } = geom.value;
    const u = unit.value;
    const a = aim.value;
    const x = mx + Math.cos(a) * 4 * u;
    const y = my + Math.sin(a) * 4 * u;
    const r = 7 * u;
    for (let i = 0; i < 10; i++) {
      const t = (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.35 : r * (i % 4 ? 0.7 : 1);
      const lx = Math.cos(t) * rr * 1.4;
      const ly = Math.sin(t) * rr;
      const px = x + lx * Math.cos(a) - ly * Math.sin(a);
      const py = y + lx * Math.sin(a) + ly * Math.cos(a);
      if (i === 0) p.moveTo(px, py);
      else p.lineTo(px, py);
    }
    p.close();
    return p;
  });
  const hot = useDerivedValue(() => (Math.floor(f.value.T / 33) % 4 === 0 ? 1 : 0));
  const cool = useDerivedValue(() => 1 - hot.value);
  const glowOpacity = useDerivedValue(() => (f.value.fire >= 0 && blink(f.value.T) ? 1 : 0));
  const muzzle = useDerivedValue(() => vec(geom.value.mx, geom.value.my));
  const mx = useDerivedValue(() => geom.value.mx);
  const my = useDerivedValue(() => geom.value.my);
  const glowR = useDerivedValue(() => 22 * unit.value);

  // 탄피
  const cases = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const g = geom.value;
    const u = unit.value;
    const t = f.value.T / GATLING_HQ_MS;
    if (f.value.seats <= 0) return p;
    const floor = g.cy + g.ch / 2 + 18 * u;
    for (const c of CASES) {
      const k = (t - c.t0) / 0.3;
      if (k <= 0 || k >= 1) continue;
      const s = k * 0.9;
      const x = g.bx + c.vx * s * u;
      let y = g.by + (c.vy * s + 260 * s * s) * u;
      if (y > floor) y = floor - (y - floor) * 0.3;
      addRotRect(p, x, y, 4.8 * u, 2 * u, c.spin * s);
    }
    return p;
  });

  const tracerWidth = useDerivedValue(() => 1.6 * unit.value);
  const thin = useDerivedValue(() => unit.value);

  return (
    <>
      <Path path={tracers} style="stroke" strokeWidth={tracerWidth} strokeCap="round" color="rgba(255,214,120,0.85)">
        <BlurMask blur={0.8} style="solid" />
      </Path>
      <Path path={barrels} style="stroke" strokeWidth={thin} color="#9B9286" />
      <Circle cx={mx} cy={my} r={glowR} opacity={glowOpacity} blendMode="screen">
        <RadialGradient c={muzzle} r={glowR} colors={['rgba(255,220,140,0.8)', 'rgba(255,120,30,0)']} />
      </Circle>
      <Group opacity={hot}>
        <Path path={flash} color="#FFF3C0" />
      </Group>
      <Group opacity={cool}>
        <Path path={flash} color="#FFD166" />
      </Group>
      <Path path={cases} color="#D9A441" />
    </>
  );
}

export function GatlingSeatsSkia({ progress, geom }: Props) {
  const f = useDerivedValue(() => gatlingFrame(geom.value.kind === FX_GATLING ? progress.value : 1));
  const opacity = useDerivedValue(() => f.value.seats);
  return (
    <Group opacity={opacity}>
      {SEAT_DEG.map((_, i) => (
        <Seat key={i} i={i} f={f} geom={geom} />
      ))}
    </Group>
  );
}

function Seat({ i, f, geom }: { i: number; f: SharedValue<ReturnType<typeof gatlingFrame>>; geom: SharedValue<ShotGeom> }) {
  const u = useDerivedValue(() => geom.value.cw / 92);
  const at = useDerivedValue(() => seatAt(geom.value, SEAT_DEG[i]));
  const x = useDerivedValue(() => at.value.x);
  const y = useDerivedValue(() => at.value.y);
  const r = useDerivedValue(() => (7 + f.value.hit[i] * 3) * u.value);
  const idle = useDerivedValue(() => (f.value.hit[i] > 0 ? 0 : 0.55));
  const hit = useDerivedValue(() => (f.value.hit[i] > 0 ? 0.35 + f.value.hit[i] * 0.5 : 0));
  const ring = useDerivedValue(() => 1.5 * u.value);
  return (
    <>
      <Circle cx={x} cy={y} r={r} color="#1E140B" opacity={idle} />
      <Circle cx={x} cy={y} r={r} color="#C8321E" opacity={hit} />
      <Circle cx={x} cy={y} r={r} style="stroke" strokeWidth={ring} color="#C8902F" />
    </>
  );
}
