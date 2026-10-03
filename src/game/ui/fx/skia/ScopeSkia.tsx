/**
 * 고화질 조준경 — 렌즈 속 당겨 보기. 연출 캔버스(CardFxSkia) 안의 한 무리로 그린다.
 *
 * 그림 속 대물렌즈(geom.mx, my)가 반짝인 뒤, 화면이 어두워지며 렌즈에서 둥근 시야가 커져
 * 카드 오른쪽 위로 나온다. 시야 안에서는 지평선의 먼 사람이 조준선 안으로 당겨져 커진다 (거리 -1).
 * 시야가 렌즈로 접혀 들어가면 카드 둘레에 금빛 고리가 한 번 퍼진다.
 * "거리 3 → 2" 글자는 RN(GunFxLabels)이 그린다.
 *
 * 크기는 시안(카드 폭 92)을 기준으로 카드 폭에 비례해 키운다.
 */

import {
  BlurMask,
  Circle,
  FillType,
  Group,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  Rect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { settlePath, type SkPath } from './paths';
import { FX_SCOPE, scopeFrame, scopeView, type ShotGeom } from './timeline';

/** 먼 사람 실루엣. 시안 단위 s 배 */
function cowboy(p: SkPath, x: number, y: number, s: number) {
  'worklet';
  const r = (rx: number, ry: number, w: number, h: number) => p.addRect(Skia.XYWHRect(x + rx * s, y + ry * s, w * s, h * s));
  r(-4, -10, 8, 14);
  p.addCircle(x, y - 13 * s, 3.2 * s);
  r(-7, -17, 14, 1.6);
  r(-3.5, -20, 7, 3.5);
  r(-4, 4, 3, 10);
  r(1, 4, 3, 10);
}

export function ScopeSkia({ progress, geom }: { progress: SharedValue<number>; geom: SharedValue<ShotGeom> }) {
  const f = useDerivedValue(() => scopeFrame(geom.value.kind === FX_SCOPE ? progress.value : 1));
  const unit = useDerivedValue(() => geom.value.cw / 92);
  const view = useDerivedValue(() => scopeView(geom.value, f.value.open));
  const shown = useDerivedValue(() => (f.value.open > 0.001 ? 1 : 0));

  // 화면을 덮는 어둠. 시야 자리만 뚫는다
  const dark = useDerivedValue(() => {
    const g = geom.value;
    const v = view.value;
    const p = Skia.Path.Make();
    const big = Math.max(g.cw, g.ch) * 20;
    p.addRect(Skia.XYWHRect(g.cx - big, g.cy - big, big * 2, big * 2));
    p.addCircle(v.x, v.y, Math.max(0.01, v.r));
    p.setFillType(FillType.EvenOdd);
    return p;
  });
  const darkOpacity = useDerivedValue(() => 0.72 * f.value.open);

  const lens = useDerivedValue(() => {
    const v = view.value;
    const p = Skia.Path.Make();
    p.addCircle(v.x, v.y, Math.max(0.01, v.r));
    return p;
  });
  const lensRect = useDerivedValue(() => {
    const v = view.value;
    return { x: v.x - v.r, y: v.y - v.r, width: v.r * 2, height: v.r * 2 };
  });
  const skyFrom = useDerivedValue(() => vec(view.value.x, view.value.y - view.value.r));
  const skyTo = useDerivedValue(() => vec(view.value.x, view.value.y + view.value.r));
  const center = useDerivedValue(() => vec(view.value.x, view.value.y));
  const rimR = useDerivedValue(() => Math.max(0.01, view.value.r));
  const outerR = useDerivedValue(() => view.value.r + 2.5 * unit.value);
  const vx = useDerivedValue(() => view.value.x);
  const vy = useDerivedValue(() => view.value.y);

  // 먼 사람: 작게(멀리) → 크게(가까이)
  const man = useDerivedValue(() => {
    const v = view.value;
    const u = unit.value;
    const zk = f.value.zoom;
    const s = (0.45 + 1.05 * zk) * u;
    const p = Skia.Path.Make();
    if (v.r <= 0.01) return p;
    cowboy(p, v.x + (8 - zk * 8) * u, v.y + v.r * 0.1 + 2 * s, s);
    return p;
  });

  // 조준선과 눈금
  const reticle = useDerivedValue(() => {
    const { x, y, r } = view.value;
    const u = unit.value;
    const p = Skia.Path.Make();
    if (r <= 0.01) return p;
    const gap = 5 * u;
    p.moveTo(x - r, y);
    p.lineTo(x - gap, y);
    p.moveTo(x + gap, y);
    p.lineTo(x + r, y);
    p.moveTo(x, y - r);
    p.lineTo(x, y - gap);
    p.moveTo(x, y + gap);
    p.lineTo(x, y + r);
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      p.moveTo(x + (i * r) / 4, y - 2 * u);
      p.lineTo(x + (i * r) / 4, y + 2 * u);
    }
    return p;
  });

  // 대물렌즈 반짝
  const glintRect = useDerivedValue(() => {
    const { mx, my } = geom.value;
    const u = unit.value;
    const k = f.value.glint;
    return { x: mx - (2 + 3 * k) * u, y: my - (3 + 3 * k) * u, width: (4 + 6 * k) * u, height: (6 + 6 * k) * u };
  });
  const glintOpacity = useDerivedValue(() => f.value.glint);

  // 끝 고리
  const settle = useDerivedValue(() => settlePath(geom.value, f.value.settle));
  const settleOpacity = useDerivedValue(() => (f.value.settle > 0 ? (1 - f.value.settle) * 0.85 : 0));
  const settleWidth = useDerivedValue(() => (2 * (1 - Math.max(0, f.value.settle)) + 0.5) * unit.value);

  const thin = useDerivedValue(() => unit.value);
  const rimWidth = useDerivedValue(() => 4 * unit.value);

  return (
    <>
      <Oval rect={glintRect} color="#FFF6D6" opacity={glintOpacity}>
        <BlurMask blur={3} style="solid" />
      </Oval>
      <Group opacity={shown}>
        <Path path={dark} color="#0A0704" opacity={darkOpacity} />
        <Group clip={lens}>
          <Rect rect={lensRect}>
            <LinearGradient start={skyFrom} end={skyTo} colors={['#F2C98A', '#E9A860', '#A8754A', '#7A5233']} positions={[0, 0.55, 0.56, 1]} />
          </Rect>
          <Path path={man} color="#2A1D12" />
          <Path path={reticle} style="stroke" strokeWidth={thin} color="rgba(20,14,8,0.9)" />
          <Rect rect={lensRect}>
            <RadialGradient c={center} r={rimR} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']} positions={[0.6, 1]} />
          </Rect>
        </Group>
        <Circle cx={vx} cy={vy} r={rimR} style="stroke" strokeWidth={rimWidth} color="#1E140B" />
        <Circle cx={vx} cy={vy} r={outerR} style="stroke" strokeWidth={thin} color="rgba(200,180,140,0.6)" />
      </Group>
      <Path path={settle} style="stroke" strokeWidth={settleWidth} color="#F2C14E" opacity={settleOpacity} />
    </>
  );
}
