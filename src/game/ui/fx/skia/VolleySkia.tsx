/**
 * 고화질 볼캐닉 — 연사 스트로브. 연출 캔버스(CardFxSkia) 안의 한 무리로 그린다.
 *
 * 그림 속 총구에서 일곱 번, 점점 빠르게 별 모양 섬광이 터지고 짧은 예광선이 나간다
 * (사정거리 1 이라 멀리 가지 않는다). 끝에 카드 아래로 가까운 고리 한 겹.
 * 카드가 들썩이는 반동은 cardMotion, 옆의 "뱅! ×7 → ∞" 카운터는 RN(VolleyCounter)이 맡는다.
 *
 * 크기는 시안(카드 폭 92)을 기준으로 카드 폭에 비례해 키운다.
 */

import { BlurMask, Circle, Group, Oval, Path, RadialGradient, Skia, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { FX_VOLLEY, volleyFrame, type ShotGeom } from './timeline';

export function VolleySkia({ progress, geom }: { progress: SharedValue<number>; geom: SharedValue<ShotGeom> }) {
  const v = useDerivedValue(() => volleyFrame(geom.value.kind === FX_VOLLEY ? progress.value : 1));
  const unit = useDerivedValue(() => geom.value.cw / 92);
  /** 섬광 크기 배율 */
  const size = useDerivedValue(() => (v.value.shot < 0 ? 0 : (1 - v.value.k * 0.6) * unit.value));
  const angle = useDerivedValue(() => geom.value.dir + ((v.value.shot % 3) - 1) * 0.08);

  const star = useDerivedValue(() => {
    const { mx, my } = geom.value;
    const p = Skia.Path.Make();
    const s = size.value;
    if (s <= 0) return p;
    const a0 = angle.value;
    for (let i = 0; i < 10; i++) {
      const k = (i * Math.PI) / 5;
      const r = (i % 2 ? 2.4 : i === 0 ? 13 : 6) * s;
      const x = mx + Math.cos(a0 + k) * r;
      const y = my + Math.sin(a0 + k) * r;
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
    p.close();
    return p;
  });
  const flashOpacity = useDerivedValue(() => (v.value.shot < 0 ? 0 : 1));
  const glowC = useDerivedValue(() => {
    const { mx, my } = geom.value;
    return vec(mx + Math.cos(angle.value) * 5 * size.value, my + Math.sin(angle.value) * 5 * size.value);
  });
  const glowX = useDerivedValue(() => glowC.value.x);
  const glowY = useDerivedValue(() => glowC.value.y);
  const glowR = useDerivedValue(() => 16 * size.value);

  // 짧은 예광선
  const tracer = useDerivedValue(() => {
    const { mx, my, dir } = geom.value;
    const p = Skia.Path.Make();
    if (v.value.shot < 0) return p;
    const u = unit.value;
    const L = (30 + v.value.k * 30) * u;
    const c = Math.cos(dir);
    const s = Math.sin(dir);
    p.moveTo(mx + c * (8 * u + L * 0.5), my + s * (8 * u + L * 0.5));
    p.lineTo(mx + c * (8 * u + L), my + s * (8 * u + L));
    return p;
  });
  const tracerOpacity = useDerivedValue(() => (v.value.shot < 0 ? 0 : 1 - v.value.k));
  const tracerWidth = useDerivedValue(() => 1.5 * unit.value);

  // 사정거리 1: 카드 아래 가까운 고리 한 겹
  const ring = useDerivedValue(() => {
    const { cx, cy, ch } = geom.value;
    const u = unit.value;
    const r = Math.max(0, v.value.ring);
    const rx = (50 + r * 18) * u;
    const ry = (12 + r * 4) * u;
    const y = cy + ch / 2 - (3 / 132) * ch;
    return { x: cx - rx, y: y - ry, width: rx * 2, height: ry * 2 };
  });
  const ringOpacity = useDerivedValue(() => (v.value.ring < 0 || v.value.ring >= 1 ? 0 : (1 - v.value.ring) * 0.8));
  const ringWidth = useDerivedValue(() => 1.5 * unit.value);

  return (
    <Group>
      <Oval rect={ring} style="stroke" strokeWidth={ringWidth} color="#F2C14E" opacity={ringOpacity} />
      <Path path={tracer} style="stroke" strokeWidth={tracerWidth} strokeCap="round" color="#FFECAA" opacity={tracerOpacity} />
      <Group opacity={flashOpacity}>
        <Circle cx={glowX} cy={glowY} r={glowR} blendMode="screen">
          <RadialGradient c={glowC} r={glowR} colors={['rgba(255,250,220,0.95)', 'rgba(255,190,80,0.6)', 'rgba(255,110,30,0)']} positions={[0, 0.4, 1]} />
        </Circle>
        <Path path={star} color="#FFF2B8">
          <BlurMask blur={0.8} style="solid" />
        </Path>
      </Group>
    </Group>
  );
}
