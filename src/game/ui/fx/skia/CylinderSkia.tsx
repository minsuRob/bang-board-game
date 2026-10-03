/**
 * 고화질 스코필드 — 3D 실린더 회전. 연출 캔버스(CardFxSkia) 안의 한 무리로 그린다.
 *
 * 카드 오른쪽에 큰 실린더가 옆면(두께)부터 돌아 정면을 보이고, 딸깍딸깍 여섯 칸 돌며
 * 약실마다 탄이 찬다. 금속 반사가 한 번 쓸고 간 뒤 작아지며 그림 속 실린더 자리로 빨려 든다.
 * 정면을 향하는 정도는 가로 축척(turn)으로, 옆면 두께는 그 뒤에 비친 타원으로 흉내 낸다.
 *
 * 모든 모양은 실린더 가운데를 원점으로 그린다 (Group 의 translate 하나로 옮긴다).
 */

import { Circle, Group, Oval, Path, RadialGradient, Rect, Skia, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { cylinderFrame, FX_CYLINDER, type CylinderFrame, type ShotGeom } from './timeline';

const CHAMBERS = 6;

export function CylinderSkia({ progress, geom }: { progress: SharedValue<number>; geom: SharedValue<ShotGeom> }) {
  const c = useDerivedValue(() => cylinderFrame(geom.value.kind === FX_CYLINDER ? progress.value : 1));

  /** 반지름: 처음엔 카드 폭의 절반쯤, 끝엔 그림 속 실린더 크기 */
  const R = useDerivedValue(() => {
    const g = geom.value;
    return Math.max(1, g.cw * 0.46 + (g.r - g.cw * 0.46) * c.value.back);
  });
  const place = useDerivedValue(() => {
    const g = geom.value;
    const b = c.value.back;
    const sx = g.cx + g.cw * 0.96;
    const sy = g.cy - g.cw * 0.08;
    return [{ translateX: sx + (g.mx - sx) * b }, { translateY: sy + (g.my - sy) * b }];
  });
  const front = useDerivedValue(() => [{ scaleX: Math.max(0.02, c.value.turn) }]);
  /** 옆면 두께: 옆으로 돌아 있을수록 두껍게 */
  const depth = useDerivedValue(() => ((1 - c.value.turn) * 12 + 5 * (1 - c.value.back)) * (R.value / 42));

  const shadow = useDerivedValue(() => {
    const r = R.value;
    const w = r * c.value.turn + depth.value;
    return { x: 4 - w, y: r * 1.24 - r * 0.18, width: w * 2, height: r * 0.36 };
  });
  const side = useDerivedValue(() => {
    const r = R.value;
    const w = r * c.value.turn;
    return { x: depth.value - w, y: -r, width: w * 2, height: r * 2 };
  });
  const sideBand = useDerivedValue(() => ({ x: 0, y: -R.value, width: depth.value, height: R.value * 2 }));

  const rot = useDerivedValue(() => (c.value.steps * Math.PI) / 3);
  // 도우미는 값을 인자로 받는다. 도우미 안에서만 공유값을 읽으면 웹에서 구독이 안 잡혀 갱신되지 않는다
  const chamberAt = (i: number, r: number, turned: number) => {
    'worklet';
    const a = (i * Math.PI) / 3 - Math.PI / 2 + turned;
    return { x: Math.cos(a) * r * 0.56, y: Math.sin(a) * r * 0.56 };
  };
  const holes = useDerivedValue(() => {
    const p = Skia.Path.Make();
    for (let i = 0; i < CHAMBERS; i++) {
      const q = chamberAt(i, R.value, rot.value);
      p.addCircle(q.x, q.y, R.value * 0.2);
    }
    return p;
  });
  // 칸이 돌아 지나간 약실부터 탄이 찬다
  const loaded = (inner: boolean, fr: CylinderFrame, r: number, turned: number) => {
    'worklet';
    const p = Skia.Path.Make();
    for (let i = 0; i < CHAMBERS; i++) {
      if (!(fr.steps > i + 0.5 || fr.shine >= 0 || fr.back > 0)) continue;
      const q = chamberAt(i, r, turned);
      p.addCircle(q.x, q.y, r * (inner ? 0.06 : 0.16));
    }
    return p;
  };
  const brass = useDerivedValue(() => loaded(false, c.value, R.value, rot.value));
  const primer = useDerivedValue(() => loaded(true, c.value, R.value, rot.value));
  const flutes = useDerivedValue(() => {
    const p = Skia.Path.Make();
    for (let i = 0; i < CHAMBERS; i++) {
      const b = (i * Math.PI) / 3 - Math.PI / 2 + rot.value + Math.PI / 6;
      p.addCircle(Math.cos(b) * R.value * 0.9, Math.sin(b) * R.value * 0.9, R.value * 0.08);
    }
    return p;
  });
  const bodyR = useDerivedValue(() => R.value);
  const hubR = useDerivedValue(() => R.value * 0.12);
  const lightC = useDerivedValue(() => vec(-R.value * 0.3, -R.value * 0.4));
  const rimWidth = useDerivedValue(() => Math.max(1, R.value / 28));

  // 정지판 딸깍 불꽃: 위쪽에 짧은 선 넷
  const sparks = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const k = c.value.click;
    if (k <= 0) return p;
    const r = R.value;
    const t = Math.max(0.02, c.value.turn);
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i - 1.5) * 0.35;
      p.moveTo(Math.cos(a) * (r + 2) * t, Math.sin(a) * (r + 2));
      p.lineTo(Math.cos(a) * (r + 2 + 7 * k * (r / 42)) * t, Math.sin(a) * (r + 2 + 7 * k * (r / 42)));
    }
    return p;
  });
  const sparkOpacity = useDerivedValue(() => c.value.click);

  // 금속 반사 띠: 앞면 원 안에서 비스듬히 지나간다
  const faceClip = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.addCircle(0, 0, R.value);
    return p;
  });
  const shine = useDerivedValue(() => {
    const s = c.value.shine;
    const r = R.value;
    const x = -r + 2 * r * Math.max(0, s);
    return [{ translateX: x }, { rotate: 0.5 }];
  });
  const shineRect = useDerivedValue(() => ({ x: -4 * (R.value / 42), y: -R.value * 1.5, width: 8 * (R.value / 42), height: R.value * 3 }));
  const shineOpacity = useDerivedValue(() => (c.value.shine < 0 ? 0 : Math.sin(c.value.shine * Math.PI) * 0.5));

  const active = useDerivedValue(() => c.value.active);

  return (
    <Group opacity={active} transform={place}>
      <Oval rect={shadow} color="rgba(0,0,0,0.3)" />
      <Oval rect={side} color="#2A2420" />
      <Rect rect={sideBand} color="#2A2420" />
      <Group transform={front}>
        <Circle cx={0} cy={0} r={bodyR}>
          <RadialGradient c={lightC} r={bodyR} colors={['#B9B4AC', '#6D665E', '#3A342E']} positions={[0, 0.6, 1]} />
        </Circle>
        <Circle cx={0} cy={0} r={bodyR} style="stroke" strokeWidth={rimWidth} color="#1E140B" />
        <Path path={flutes} color="rgba(20,14,8,0.6)" />
        <Path path={holes} color="#120C08" />
        <Path path={brass} color="#C99A3C" />
        <Path path={primer} color="#8E6A2A" />
        <Circle cx={0} cy={0} r={hubR} color="#2A2420" />
        <Group clip={faceClip}>
          <Group transform={shine}>
            <Rect rect={shineRect} color="#FFFFFF" opacity={shineOpacity} />
          </Group>
        </Group>
      </Group>
      <Path path={sparks} style="stroke" strokeWidth={1.2} strokeCap="round" color="#FFDC8C" opacity={sparkOpacity} />
    </Group>
  );
}
