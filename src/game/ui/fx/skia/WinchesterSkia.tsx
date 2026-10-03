/**
 * 고화질 윈체스터 — 야간 녹색 망원 조준경. 연출 캔버스(CardFxSkia) 안의 한 무리로 그린다.
 * (docs/card-fx-prototypes/winchester.html B3)
 *
 * 그림 속 총구에서 동그란 조준경이 커지며 카드 위로 온다. 렌즈 밖은 어두워지고, 렌즈 안에는
 * 카드 그림이 1.4배로 비친 위에 짙은 녹색을 덮는다. 십자선·눈금은 연두로 빛나고, 눈금 5 에
 * 붉은 점이 고정된 뒤 렌즈가 활짝 열리며 사라진다.
 * 눈금 숫자와 "사정거리 5" 는 어두운 덮개 위에 떠야 하므로 캔버스 위 RN(WinchesterLabels)이 그린다.
 *
 * 카드 그림이 없는 기기에서는 렌즈 안 확대 그림 없이 녹색 렌즈만 그린다.
 */

import {
  BlurMask,
  Circle,
  FillType,
  Group,
  Image,
  Path,
  RadialGradient,
  Skia,
  useImage,
  vec,
  type DataSourceParam,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { playingCardArt } from '../../card-art';
import { ART_INSET, FX_WINCHESTER, WINCHESTER_TICKS, winchesterFrame, winchesterLens, type ShotGeom } from './timeline';

/** 어두운 덮개를 깔 넓이. 캔버스보다 넉넉히 */
const FAR = 10000;

export function WinchesterSkia({ progress, geom }: { progress: SharedValue<number>; geom: SharedValue<ShotGeom> }) {
  const src = playingCardArt('winchester');
  const image = useImage((src ?? null) as DataSourceParam);

  const p = useDerivedValue(() => (geom.value.kind === FX_WINCHESTER ? progress.value : 1));
  const f = useDerivedValue(() => winchesterFrame(p.value));
  const lens = useDerivedValue(() => winchesterLens(geom.value, p.value));
  const al = useDerivedValue(() => (f.value.active ? 1 - f.value.open : 0));

  const lensPath = useDerivedValue(() => {
    const q = Skia.Path.Make();
    q.addCircle(lens.value.x, lens.value.y, Math.max(0.1, lens.value.R));
    return q;
  });
  // 렌즈 밖 어둠: 넓은 사각형에서 렌즈를 뚫는다
  const outside = useDerivedValue(() => {
    const q = Skia.Path.Make();
    q.addRect({ x: -FAR, y: -FAR, width: FAR * 2, height: FAR * 2 });
    q.addCircle(lens.value.x, lens.value.y, Math.max(0.1, lens.value.R));
    q.setFillType(FillType.EvenOdd);
    return q;
  });
  const darkOpacity = useDerivedValue(() => 0.82 * al.value);

  // 렌즈 안: 카드 그림을 렌즈 가운데 기준으로 확대
  const zoom = useDerivedValue(() => {
    const { x, y } = lens.value;
    const z = f.value.zoom;
    return [{ translateX: x }, { translateY: y }, { scale: z }, { translateX: -x }, { translateY: -y }];
  });
  const artRect = useDerivedValue(() => {
    const g = geom.value;
    return { x: g.cx - g.cw / 2 + ART_INSET, y: g.cy - g.ch / 2 + ART_INSET, width: g.cw - ART_INSET * 2, height: g.ch - ART_INSET * 2 };
  });
  const artX = useDerivedValue(() => artRect.value.x);
  const artY = useDerivedValue(() => artRect.value.y);
  const artW = useDerivedValue(() => artRect.value.width);
  const artH = useDerivedValue(() => artRect.value.height);
  const artClip = useDerivedValue(() => {
    const q = Skia.Path.Make();
    q.addRect(artRect.value);
    return q;
  });

  const cx = useDerivedValue(() => lens.value.x);
  const cy = useDerivedValue(() => lens.value.y);
  const R = useDerivedValue(() => Math.max(0.1, lens.value.R));
  const center = useDerivedValue(() => vec(lens.value.x, lens.value.y));
  const u = useDerivedValue(() => lens.value.u);
  const rimWidth = useDerivedValue(() => 2.5 * u.value);
  const ringR = useDerivedValue(() => Math.max(0.1, lens.value.R - 2 * u.value));
  const hair = useDerivedValue(() => Math.max(1, u.value));

  const cross = useDerivedValue(() => {
    const { x, y, R: r } = lens.value;
    const q = Skia.Path.Make();
    q.moveTo(x - r, y);
    q.lineTo(x + r, y);
    q.moveTo(x, y - r);
    q.lineTo(x, y + r);
    return q;
  });
  const ticks = useDerivedValue(() => {
    const { x, y, R: r, u: k } = lens.value;
    const q = Skia.Path.Make();
    for (let i = 1; i <= WINCHESTER_TICKS; i++) {
      const t = f.value.tick[i - 1];
      if (t <= 0) continue;
      const c = 1.70158;
      const b = 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
      const w = (6 - i * 0.6) * b * k;
      const ty = y + (i * r) / 6.2;
      q.moveTo(x - w, ty);
      q.lineTo(x + w, ty);
    }
    return q;
  });
  const tickWidth = useDerivedValue(() => 1.5 * u.value);

  // 붉은 점과 고정 고리
  const dotY = useDerivedValue(() => lens.value.y + (5 * lens.value.R) / 6.2);
  const dotR = useDerivedValue(() => (f.value.lock > 0 ? (1.8 + (1 - f.value.lock) * 3) * u.value : 0));
  const lockR = useDerivedValue(() => (3 + f.value.lock * 10) * u.value);
  const lockOpacity = useDerivedValue(() => (f.value.lock > 0 && f.value.lock < 1 ? 1 - f.value.lock : 0));

  return (
    <Group opacity={al}>
      <Path path={outside} color="#080503" opacity={darkOpacity} />
      <Group clip={lensPath}>
        {image && (
          <Group transform={zoom}>
            <Group clip={artClip}>
              <Image image={image} x={artX} y={artY} width={artW} height={artH} fit="cover" />
            </Group>
          </Group>
        )}
        {/* 야간 녹색 덮개와 가장자리 어둠 */}
        <Circle cx={cx} cy={cy} r={R} color="rgba(8,36,18,0.78)" />
        <Circle cx={cx} cy={cy} r={R}>
          <RadialGradient c={center} r={R} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']} positions={[0.7, 1]} />
        </Circle>
        <Path path={cross} style="stroke" strokeWidth={hair} color="rgba(120,255,150,0.6)">
          <BlurMask blur={2} style="solid" />
        </Path>
        <Path path={ticks} style="stroke" strokeWidth={tickWidth} color="#9DFFB0">
          <BlurMask blur={2} style="solid" />
        </Path>
        <Circle cx={cx} cy={dotY} r={lockR} style="stroke" strokeWidth={hair} color="#D9412B" opacity={lockOpacity} />
        <Circle cx={cx} cy={dotY} r={dotR} color="#D9412B" />
      </Group>
      <Circle cx={cx} cy={cy} r={R} style="stroke" strokeWidth={rimWidth} color="#1E140B" />
      <Circle cx={cx} cy={cy} r={ringR} style="stroke" strokeWidth={hair} color="rgba(120,255,150,0.75)" />
    </Group>
  );
}
