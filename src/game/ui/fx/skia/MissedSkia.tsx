/**
 * 고화질 빗나감! — 슬로모션 스침. 연출 캔버스(CardFxSkia) 안의 한 무리로 그린다.
 *
 * 원본 그림을 조각내 움직인다. 그림에는 총알이 스쳐 구멍 난 모자가 이미 날아가 있으므로,
 * 처음엔 그 모자 조각을 머리 위에 얹어 두고 인물을 뒤로 젖혔다가, 총알이 스치면 모자가 한 바퀴
 * 돌며 그림 속 자리로 날아가게 한다. 그래서 끝 장면이 원본 그림과 똑같고, RN 카드로 이어진다.
 * 조각이 떠난 자리는 흐린 그림으로 메운다.
 *
 * 카드 그림은 저장소에 없다. 그림이 없는 기기에서는 조각 없이 총알·공기 고리만 그린다.
 * 좌표는 원본 그림(250×389) 비율이다.
 */

import {
  Blur,
  BlurMask,
  Circle,
  Group,
  Image,
  LinearGradient,
  Oval,
  RadialGradient,
  Rect,
  RoundedRect,
  Skia,
  useImage,
  vec,
  type DataSourceParam,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { playingCardArt } from '../../card-art';
import { FX_MISSED, missFrame, type ShotGeom } from './timeline';

const IMG_W = 250;
const IMG_H = 389;
const n = (x: number, y: number) => [x / IMG_W, y / IMG_H] as const;

/** 삽화 틀 */
const ILLUS = [n(38, 92), n(212, 268)] as const;
/** 그림 속 날아간 모자 (중심, 반지름) */
const HAT_ART = n(75, 124);
const HAT_R = n(33, 32);
/** 모자를 처음 얹어 둘 머리 위 자리와 기울기 */
const HAT_HEAD = n(118, 128);
const HAT_HEAD_ROT = 0.5;
/** 인물 조각 (시계 방향 다각형) */
const PERSON = [n(92, 138), n(150, 132), n(165, 160), n(212, 192), n(212, 270), n(38, 270), n(38, 222), n(80, 200), n(86, 160)];
/** 젖힐 때 도는 축 (허리 아래) */
const PIVOT = n(125, 270);
/** 모자 구멍 (연기가 오르는 자리) */
const HOLE = n(80, 118);
/** 총알이 지나가는 높이 */
const PATH_Y = 122 / IMG_H;
/** 인물이 뒤로 젖히는 각도 */
const LEAN = -0.14;

/** 공기 고리가 생기는 총알 위치 */
const RINGS = [0.33, 0.39, 0.46] as const;

export function MissedSkia({ progress, geom }: { progress: SharedValue<number>; geom: SharedValue<ShotGeom> }) {
  const src = playingCardArt('missed');
  const image = useImage((src ?? null) as DataSourceParam);
  const iw = image?.width() ?? IMG_W;
  const ih = image?.height() ?? IMG_H;
  const hasArt = image !== null;

  const m = useDerivedValue(() => (geom.value.kind === FX_MISSED ? missFrame(progress.value) : missFrame(1)));

  // 그림이 카드에 깔리는 자리 (CardView 의 resizeMode="cover" 와 같다)
  const box = useDerivedValue(() => {
    const g = geom.value;
    const s = Math.max(g.cw / iw, g.ch / ih);
    return { s, x0: g.cx - (iw * s) / 2, y0: g.cy - (ih * s) / 2, w: iw * s, h: ih * s };
  }, [iw, ih]);
  const px = (p: readonly [number, number]) => {
    'worklet';
    const b = box.value;
    return { x: b.x0 + p[0] * b.w, y: b.y0 + p[1] * b.h };
  };

  const imgX = useDerivedValue(() => box.value.x0);
  const imgY = useDerivedValue(() => box.value.y0);
  const imgW = useDerivedValue(() => box.value.w);
  const imgH = useDerivedValue(() => box.value.h);
  // 그림을 늦게 받으므로 hasArt 를 의존성으로 준다. 없으면 처음 값(false)에 붙잡힌다
  const artOpacity = useDerivedValue(() => (hasArt ? m.value.active : 0), [hasArt]);

  const illus = useDerivedValue(() => {
    const a = px(ILLUS[0]);
    const b = px(ILLUS[1]);
    return Skia.XYWHRect(a.x, a.y, b.x - a.x, b.y - a.y);
  });

  const hatPath = useDerivedValue(() => {
    const c = px(HAT_ART);
    const b = box.value;
    const p = Skia.Path.Make();
    p.addOval(Skia.XYWHRect(c.x - HAT_R[0] * b.w, c.y - HAT_R[1] * b.h, HAT_R[0] * b.w * 2, HAT_R[1] * b.h * 2));
    return p;
  });
  const personPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    PERSON.forEach((pt, i) => {
      const q = px(pt);
      if (i === 0) p.moveTo(q.x, q.y);
      else p.lineTo(q.x, q.y);
    });
    p.close();
    return p;
  });
  const erasePath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.addPath(hatPath.value);
    p.addPath(personPath.value);
    return p;
  });

  // 인물: 허리 아래를 축으로 뒤로 젖힌다
  const pivot = useDerivedValue(() => {
    const q = px(PIVOT);
    return vec(q.x, q.y);
  });
  const leanT = useDerivedValue(() => [{ rotate: LEAN * m.value.lean }]);

  // 모자: 머리 위 → 한 바퀴 돌며 위로 솟았다가 그림 속 자리로
  const hatOrigin = useDerivedValue(() => {
    const q = px(HAT_ART);
    return vec(q.x, q.y);
  });
  const hatT = useDerivedValue(() => {
    const a = px(HAT_ART);
    const h = px(HAT_HEAD);
    const k = m.value.hat;
    const lift = Math.sin(Math.PI * k) * box.value.w * 0.18;
    // 머리 위에서는 인물과 함께 젖혀진다
    const ride = (1 - k) * LEAN * m.value.lean;
    return [
      { translateX: (h.x - a.x) * (1 - k) },
      { translateY: (h.y - a.y) * (1 - k) - lift },
      { rotate: HAT_HEAD_ROT * (1 - k) - Math.PI * 2 * k + ride },
    ];
  });

  // 총알 길: 카드 오른쪽 밖에서 왼쪽 밖으로
  const pathY = useDerivedValue(() => box.value.y0 + PATH_Y * box.value.h);
  const bx = useDerivedValue(() => {
    const g = geom.value;
    const x0 = g.cx + g.cw * 1.1;
    const x1 = g.cx - g.cw * 1.6;
    return x0 + (x1 - x0) * m.value.bullet;
  });
  const bulletOpacity = useDerivedValue(() => (m.value.active && m.value.bullet < 1.2 ? 1 : 0));
  const bulletBody = useDerivedValue(() => {
    const cw = geom.value.cw;
    return Skia.RRectXY(Skia.XYWHRect(bx.value - cw * 0.02, pathY.value - cw * 0.032, cw * 0.12, cw * 0.064), cw * 0.012, cw * 0.012);
  });
  const bulletTip = useDerivedValue(() => {
    const cw = geom.value.cw;
    return { x: bx.value - cw * 0.045, y: pathY.value - cw * 0.032, width: cw * 0.05, height: cw * 0.064 };
  });
  // 예광은 총알 뒤(오른쪽)로 끌린다
  const tracerRect = useDerivedValue(() => ({
    x: bx.value,
    y: pathY.value - 1.5,
    width: geom.value.cw * 0.9,
    height: 3,
  }));
  const tracerFrom = useDerivedValue(() => vec(bx.value + geom.value.cw * 0.9, pathY.value));
  const tracerTo = useDerivedValue(() => vec(bx.value, pathY.value));
  const tracerOpacity = useDerivedValue(() => (m.value.active && m.value.bullet < 1.2 ? m.value.tracer : 0));

  // 총알이 지나간 자리에 남는 공기 고리
  const ring = (at: number) => {
    'worklet';
    const k = Math.min(1, Math.max(0, (m.value.bullet - at) / 0.12));
    const g = geom.value;
    const x = g.cx + g.cw * 1.1 + (g.cx - g.cw * 1.6 - (g.cx + g.cw * 1.1)) * at;
    const ry = g.cw * (0.04 + 0.16 * k);
    return { k, rect: { x: x - ry * 0.35, y: pathY.value - ry, width: ry * 0.7, height: ry * 2 } };
  };
  const ring0 = useDerivedValue(() => ring(RINGS[0]));
  const ring1 = useDerivedValue(() => ring(RINGS[1]));
  const ring2 = useDerivedValue(() => ring(RINGS[2]));
  const ringRect0 = useDerivedValue(() => ring0.value.rect);
  const ringRect1 = useDerivedValue(() => ring1.value.rect);
  const ringRect2 = useDerivedValue(() => ring2.value.rect);
  const ringOp = (k: number) => {
    'worklet';
    return m.value.active && k > 0 && k < 1 ? (1 - k) * 0.8 : 0;
  };
  const ringOp0 = useDerivedValue(() => ringOp(ring0.value.k));
  const ringOp1 = useDerivedValue(() => ringOp(ring1.value.k));
  const ringOp2 = useDerivedValue(() => ringOp(ring2.value.k));

  // 모자 구멍에서 오르는 연기
  const puffC = useDerivedValue(() => {
    const q = px(HOLE);
    const k = Math.max(0, m.value.puff);
    return vec(q.x - k * geom.value.cw * 0.05, q.y - k * geom.value.cw * 0.35);
  });
  const puffR = useDerivedValue(() => geom.value.cw * (0.05 + 0.12 * Math.max(0, m.value.puff)));
  const puffOpacity = useDerivedValue(() => (m.value.puff < 0 || !hasArt ? 0 : (1 - m.value.puff) * 0.55), [hasArt]);

  return (
    <Group>
      {/* 그림 조각 */}
      {image && (
        <Group clip={illus} opacity={artOpacity}>
          <Image image={image} x={imgX} y={imgY} width={imgW} height={imgH} fit="fill" />
          {/* 조각이 떠난 자리는 흐린 그림과 벽 빛으로 메운다 */}
          <Group clip={erasePath}>
            <Image image={image} x={imgX} y={imgY} width={imgW} height={imgH} fit="fill">
              <Blur blur={14} />
            </Image>
            <Rect rect={illus} color="rgba(242, 214, 200, 0.55)" />
          </Group>
          <Group transform={leanT} origin={pivot} clip={personPath}>
            <Image image={image} x={imgX} y={imgY} width={imgW} height={imgH} fit="fill" />
          </Group>
          <Group transform={hatT} origin={hatOrigin} clip={hatPath}>
            <Image image={image} x={imgX} y={imgY} width={imgW} height={imgH} fit="fill" />
          </Group>
        </Group>
      )}

      {/* 공기 고리 */}
      <Oval rect={ringRect0} style="stroke" strokeWidth={2} color="#EDE6D8" opacity={ringOp0}>
        <BlurMask blur={1.5} style="normal" />
      </Oval>
      <Oval rect={ringRect1} style="stroke" strokeWidth={2} color="#EDE6D8" opacity={ringOp1}>
        <BlurMask blur={1.5} style="normal" />
      </Oval>
      <Oval rect={ringRect2} style="stroke" strokeWidth={2} color="#EDE6D8" opacity={ringOp2}>
        <BlurMask blur={1.5} style="normal" />
      </Oval>

      {/* 예광과 총알 (왼쪽을 향한다) */}
      <Rect rect={tracerRect} opacity={tracerOpacity}>
        <LinearGradient start={tracerFrom} end={tracerTo} colors={['rgba(255,233,176,0)', 'rgba(255,240,200,0.95)']} />
        <BlurMask blur={1.5} style="solid" />
      </Rect>
      <Group opacity={bulletOpacity}>
        <RoundedRect rect={bulletBody} color="#B8862F" />
        <Oval rect={bulletTip} color="#E2BE6A" />
      </Group>

      {/* 모자 구멍 연기 */}
      <Circle c={puffC} r={puffR} opacity={puffOpacity}>
        <RadialGradient c={puffC} r={puffR} colors={['rgba(190,180,165,0.9)', 'rgba(190,180,165,0)']} />
      </Circle>
    </Group>
  );
}
