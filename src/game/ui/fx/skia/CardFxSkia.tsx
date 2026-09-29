/**
 * 고화질 카드 연출 캔버스. 총격(뱅!)은 여기서, 빗나감(빗나감!)은 MissedSkia 가 그린다.
 *
 * 총격 = 슬로모션 총알 + 사실풍 효과.
 *
 * 이 모듈은 Skia 를 곧바로 import 하므로, 웹에서는 CanvasKit 을 불러온 뒤에만 불러야 한다
 * (`load.ts` 가 맡는다).
 *
 * 캔버스는 게임 화면마다 **하나만** 띄워 두고 계속 쓴다. 총격마다 캔버스를 새로 만들면 웹에서
 * WebGL 컨텍스트가 쌓여 브라우저 한도를 넘고, 오래된 컨텍스트(3D 테이블 포함)가 끊긴다.
 * 쉬는 동안(진행도 0 또는 1)에는 아무것도 그리지 않는다.
 *
 * 모든 값은 진행도 공유값 하나와 `shotFrame`, 그리고 총이 터질 때 잰 자리(`geom`)에서 나온다.
 */

import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  Rect,
  RoundedRect,
  Shader,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { MissedSkia } from './MissedSkia';
import { smokeEffect } from './shaders';
import { cardMotion, FX_GUNSHOT, missFrame, shotFrame, type ShotGeom } from './timeline';

export type CardFxSkiaLayerProps = {
  progress: SharedValue<number>;
  geom: SharedValue<ShotGeom>;
};

/** 불티. 속도는 카드 폭/초, 각도는 오른쪽 기준 도. 고정 표라 PC·모바일이 같다 */
const SPARKS = [
  { a: -62, v: 1.2, hot: true },
  { a: -50, v: 1.9, hot: false },
  { a: -41, v: 1.5, hot: true },
  { a: -33, v: 2.3, hot: true },
  { a: -24, v: 1.7, hot: false },
  { a: -17, v: 2.6, hot: true },
  { a: -10, v: 2.0, hot: true },
  { a: -4, v: 2.9, hot: false },
  { a: 3, v: 2.2, hot: true },
  { a: 9, v: 2.7, hot: true },
  { a: 16, v: 1.8, hot: false },
  { a: 23, v: 2.4, hot: true },
  { a: 31, v: 1.6, hot: true },
  { a: 40, v: 2.1, hot: false },
  { a: 49, v: 1.4, hot: true },
  { a: 58, v: 1.1, hot: false },
  { a: -75, v: 0.9, hot: true },
  { a: 70, v: 0.9, hot: true },
] as const;

/** 불꽃 줄기: 각도, 길이(카드 폭 비율), 폭(각도) */
const RAYS = [
  { a: 0, len: 1.05, w: 7 },
  { a: -22, len: 0.62, w: 8 },
  { a: 22, len: 0.62, w: 8 },
  { a: -52, len: 0.36, w: 10 },
  { a: 52, len: 0.36, w: 10 },
  { a: 180, len: 0.22, w: 14 },
] as const;

// 웹의 Skia Canvas 는 스타일 배열을 펼치지 않고 DOM 에 넘긴다. 한 객체로 준다
const LAYER_STYLE = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' } as const;

export function CardFxSkiaLayer({ progress, geom }: CardFxSkiaLayerProps) {
  const size = useSharedValue({ width: 0, height: 0 });
  // 총격 그림은 총격일 때만. 다른 연출이면 끝난 상태(아무것도 안 그림)로 둔다
  const f = useDerivedValue(() => shotFrame(geom.value.kind === FX_GUNSHOT ? progress.value : 1));

  // ── 테이블 전체: 슬로모션 비네트와 번쩍임
  const w = useDerivedValue(() => size.value.width);
  const h = useDerivedValue(() => size.value.height);
  const center = useDerivedValue(() => vec(size.value.width / 2, size.value.height / 2));
  const radius = useDerivedValue(() => Math.max(1, Math.max(size.value.width, size.value.height) * 0.72));
  const vignette = useDerivedValue(() =>
    geom.value.kind === FX_GUNSHOT ? f.value.vignette : missFrame(progress.value).vignette,
  );
  const screenFlash = useDerivedValue(() => f.value.screenFlash * 0.35);

  // ── 카드 둘레: 카드 감싸개(RN)와 같은 흔들림·반동·확대를 건다
  const stage = useDerivedValue(() => {
    const c = cardMotion(geom.value, progress.value);
    return [{ translateX: c.tx }, { translateY: c.ty }, { scale: c.zoom }];
  });
  const stageOrigin = useDerivedValue(() => vec(geom.value.cx, geom.value.cy));

  const smokeUniforms = useDerivedValue(() => ({
    u_origin: [geom.value.mx, geom.value.my],
    u_scale: geom.value.cw,
    u_t: f.value.warp / 1000,
    u_amt: f.value.smoke * 0.95,
  }));
  const smokeOpacity = useDerivedValue(() => (f.value.smoke > 0.001 ? 1 : 0));

  // 섬광에 달아오른 카드
  const cardRect = useDerivedValue(() => {
    const g = geom.value;
    return Skia.RRectXY(Skia.XYWHRect(g.cx - g.cw / 2, g.cy - g.ch / 2, g.cw, g.ch), 8, 8);
  });
  const glow = useDerivedValue(() => f.value.flash * 0.5);

  // 연기 고리: 슬로모션 동안 느리게 밀려나며 커진다
  const ringK = useDerivedValue(() => Math.min(1, Math.max(0, (f.value.warp - 40) / 1300)));
  const ringRect = useDerivedValue(() => {
    const g = geom.value;
    const k = ringK.value;
    const e = 1 - (1 - k) * (1 - k) * (1 - k);
    const ry = g.cw * (0.06 + 0.3 * e);
    const rx = ry * 0.38;
    const x = g.mx + g.cw * (0.12 + 0.95 * e);
    return { x: x - rx, y: g.my - ry, width: rx * 2, height: ry * 2 };
  });
  const ringOpacity = useDerivedValue(() => (ringK.value > 0 && ringK.value < 1 ? (1 - ringK.value) * 0.9 : 0));
  const ringStroke = useDerivedValue(() => 1 + 4 * (1 - ringK.value));

  // 풀림 충격파
  const muzzleX = useDerivedValue(() => geom.value.mx);
  const muzzleY = useDerivedValue(() => geom.value.my);
  const shockR = useDerivedValue(() => (f.value.shock < 0 ? 0 : geom.value.cw * (0.1 + 1.3 * f.value.shock)));
  const shockOpacity = useDerivedValue(() => (f.value.shock < 0 ? 0 : 1 - f.value.shock));
  const shockStroke = useDerivedValue(() => (f.value.shock < 0 ? 0 : 3 * (1 - f.value.shock) + 0.5));

  // 총구 섬광
  const flashTransform = useDerivedValue(() => [{ scale: f.value.flashScale }]);
  const muzzle = useDerivedValue(() => vec(geom.value.mx, geom.value.my));
  const flashOpacity = useDerivedValue(() => f.value.flash);
  const fireballX = useDerivedValue(() => geom.value.mx + geom.value.cw * 0.2);
  const fireballR = useDerivedValue(() => geom.value.cw * 0.55);
  const fireballGradR = useDerivedValue(() => geom.value.cw * 0.62);
  const coreR = useDerivedValue(() => geom.value.cw * 0.09);
  const rays = useDerivedValue(() => {
    const { mx, my, cw } = geom.value;
    const p = Skia.Path.Make();
    for (const r of RAYS) {
      const a = (r.a * Math.PI) / 180;
      const half = (r.w * Math.PI) / 180;
      const len = r.len * cw;
      p.moveTo(mx + Math.cos(a - half) * cw * 0.06, my + Math.sin(a - half) * cw * 0.06);
      p.lineTo(mx + Math.cos(a) * len, my + Math.sin(a) * len);
      p.lineTo(mx + Math.cos(a + half) * cw * 0.06, my + Math.sin(a + half) * cw * 0.06);
      p.close();
    }
    return p;
  });

  // 불티: 입자 시간(슬로모션 동안 느림)으로 날아가며 꼬리를 남긴다
  const sparkPath = (hot: boolean) => {
    'worklet';
    const { mx, my, cw } = geom.value;
    const p = Skia.Path.Make();
    const t = f.value.warp / 1000;
    const gravity = 2.4 * cw;
    for (const s of SPARKS) {
      if (s.hot !== hot) continue;
      if (t <= 0.01 || t > 0.62) continue;
      const a = (s.a * Math.PI) / 180;
      const vx = Math.cos(a) * s.v * cw;
      const vy = Math.sin(a) * s.v * cw;
      const t0 = Math.max(0, t - 0.035);
      p.moveTo(mx + vx * t0, my + vy * t0 + 0.5 * gravity * t0 * t0);
      p.lineTo(mx + vx * t, my + vy * t + 0.5 * gravity * t * t);
    }
    return p;
  };
  const hotSparks = useDerivedValue(() => sparkPath(true));
  const coolSparks = useDerivedValue(() => sparkPath(false));
  const sparkOpacity = useDerivedValue(() => 1 - Math.min(1, Math.max(0, (f.value.warp / 1000 - 0.3) / 0.32)));

  // 총알과 원뿔 충격파, 예광
  const bx = useDerivedValue(() => geom.value.mx + f.value.bullet * geom.value.cw);
  const bulletOpacity = useDerivedValue(() => (f.value.bullet < 0 ? 0 : 1));
  const bulletBody = useDerivedValue(() => {
    const { my, cw } = geom.value;
    return Skia.RRectXY(Skia.XYWHRect(bx.value - cw * 0.1, my - cw * 0.032, cw * 0.12, cw * 0.064), cw * 0.012, cw * 0.012);
  });
  const bulletTip = useDerivedValue(() => {
    const { my, cw } = geom.value;
    return { x: bx.value - cw * 0.005, y: my - cw * 0.032, width: cw * 0.05, height: cw * 0.064 };
  });
  const cone = useDerivedValue(() => {
    const { my, cw } = geom.value;
    const p = Skia.Path.Make();
    if (f.value.bullet < 0 || f.value.bullet > 0.35) return p;
    const x = bx.value;
    const spread = cw * (0.08 + f.value.bullet * 0.5);
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      p.moveTo(x - cw * 0.08, my + i * cw * 0.012);
      p.lineTo(x - cw * 0.08 - spread, my + i * spread * 0.32);
    }
    return p;
  });
  const coneOpacity = useDerivedValue(() => (f.value.bullet >= 0 && f.value.bullet <= 0.35 ? 0.75 : 0));
  const tracerFromX = useDerivedValue(() => Math.max(geom.value.mx, bx.value - geom.value.cw * 1.6));
  const tracerFrom = useDerivedValue(() => vec(tracerFromX.value, geom.value.my));
  const tracerTo = useDerivedValue(() => vec(bx.value, geom.value.my));
  const tracerRect = useDerivedValue(() => ({
    x: tracerFromX.value,
    y: geom.value.my - 1.5,
    width: Math.max(0, bx.value - tracerFromX.value),
    height: 3,
  }));
  const tracerOpacity = useDerivedValue(() => f.value.tracer);

  return (
    <Canvas style={LAYER_STYLE} onSize={size}>
      <Rect x={0} y={0} width={w} height={h} opacity={vignette}>
        <RadialGradient c={center} r={radius} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']} positions={[0.45, 1]} />
      </Rect>

      <Group transform={stage} origin={stageOrigin}>
        <MissedSkia progress={progress} geom={geom} />

        {/* 화약 연기 */}
        {smokeEffect && (
          <Rect x={0} y={0} width={w} height={h} opacity={smokeOpacity}>
            <Shader source={smokeEffect} uniforms={smokeUniforms} />
          </Rect>
        )}

        <RoundedRect rect={cardRect} color="#FF8A2A" opacity={glow} blendMode="screen" />

        {/* 연기 고리 */}
        <Oval rect={ringRect} style="stroke" strokeWidth={ringStroke} color="#D8CFC0" opacity={ringOpacity}>
          <BlurMask blur={2.5} style="normal" />
        </Oval>

        {/* 풀림 충격파 */}
        <Circle
          cx={muzzleX}
          cy={muzzleY}
          r={shockR}
          style="stroke"
          strokeWidth={shockStroke}
          color="#FFF1CF"
          opacity={shockOpacity}>
          <BlurMask blur={1.5} style="solid" />
        </Circle>

        {/* 불티 */}
        <Group opacity={sparkOpacity}>
          <Path path={hotSparks} style="stroke" strokeWidth={2.2} strokeCap="round" color="#FFE7A0">
            <BlurMask blur={1.2} style="solid" />
          </Path>
          <Path path={coolSparks} style="stroke" strokeWidth={1.8} strokeCap="round" color="#FF8A2A">
            <BlurMask blur={1.2} style="solid" />
          </Path>
        </Group>

        {/* 예광 줄기와 총알 */}
        <Rect rect={tracerRect} opacity={tracerOpacity}>
          <LinearGradient start={tracerFrom} end={tracerTo} colors={['rgba(255,233,176,0)', 'rgba(255,240,200,0.95)']} />
          <BlurMask blur={1.5} style="solid" />
        </Rect>
        <Group opacity={bulletOpacity}>
          <Path path={cone} style="stroke" strokeWidth={1.4} color="#FFF1CF" opacity={coneOpacity} />
          <RoundedRect rect={bulletBody} color="#B8862F" />
          <Oval rect={bulletTip} color="#E2BE6A" />
        </Group>

        {/* 총구 섬광: 번진 불덩이 + 불꽃 줄기 + 흰 심 */}
        <Group transform={flashTransform} origin={muzzle} opacity={flashOpacity}>
          <Circle cx={fireballX} cy={muzzleY} r={fireballR}>
            <RadialGradient
              c={muzzle}
              r={fireballGradR}
              colors={['#FFFFFF', '#FFE27A', 'rgba(255,130,40,0.75)', 'rgba(255,90,20,0)']}
              positions={[0, 0.16, 0.48, 1]}
            />
            <BlurMask blur={6} style="normal" />
          </Circle>
          <Path path={rays} color="#FFD35A">
            <BlurMask blur={3} style="solid" />
          </Path>
          <Circle cx={muzzleX} cy={muzzleY} r={coreR} color="#FFFFFF">
            <BlurMask blur={4} style="solid" />
          </Circle>
        </Group>
      </Group>

      <Rect x={0} y={0} width={w} height={h} color="#FFF6DA" opacity={screenFlash} />
    </Canvas>
  );
}
