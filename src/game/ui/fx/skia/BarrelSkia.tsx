/**
 * 고화질 술통 — 만화 잉크 쏙·핑!. 연출 캔버스(CardFxSkia) 안의 한 무리로 그린다.
 *
 * 카드가 찌부러졌다 늘어나며(cardMotion) 그림 속 사내가 통 뒤로 쏙 숨는다. 원본 그림의 머리·모자
 * 조각을 잘라 아래로 내리고, 통 테두리보다 아래로 내려간 부분은 잘라 낸다 (통 뒤로 숨은 것처럼).
 * 조각이 떠난 자리는 아주 흐린 그림으로 메우고, 가장자리를 흐린 마스크로 풀어 사각형 티가 나지 않게 한다. 잉크 지그재그 총알이 통 옆구리(geom.mx, my)에 맞고
 * 별 모양으로 튕겨 나간 뒤, 카드 왼쪽에 잉크 하트가 톡 터진다.
 * "쏙!"·"핑!" 글자는 RN(GunFxLabels)이 그린다.
 *
 * 그림이 없는 기기에서는 조각 없이 잉크 효과만 그린다. 그림 속 자리는 원본(250×389) 픽셀이다.
 */

import { Blur, BlurMask, Group, Image, Mask, Path, Skia, useImage, type DataSourceParam } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { playingCardArt } from '../../card-art';
import { addHeart, addStar } from './paths';
import { artScale, barrelFrame, FX_BARREL, type ShotGeom } from './timeline';

/** 통 위로 보이는 머리·모자 조각 (원본 픽셀). 모자 챙 오른쪽 끝·통에 얹은 손까지 덮는다 */
const HEAD = [
  [100, 118],
  [176, 118],
  [178, 172],
  [100, 172],
] as const;
/** 통 테두리. 이보다 아래로 내려간 조각은 통 뒤에 숨는다 */
const RIM_Y = 172;
const INK = '#1E140B';

export function BarrelSkia({ progress, geom }: { progress: SharedValue<number>; geom: SharedValue<ShotGeom> }) {
  const src = playingCardArt('barrel');
  const image = useImage((src ?? null) as DataSourceParam);
  const hasArt = image !== null;

  const f = useDerivedValue(() => barrelFrame(geom.value.kind === FX_BARREL ? progress.value : 1));
  const unit = useDerivedValue(() => geom.value.cw / 92);
  /**
   * 원본 그림 픽셀 → 캔버스. geom 은 인자로 받는다: 콜백 본문에서 geom.value 를 읽어야
   * 웹 Reanimated 가 구독한다 (도우미 안에서만 읽으면 처음 값에 멈춘다)
   */
  const art = (g: ShotGeom, x: number, y: number) => {
    'worklet';
    const k = artScale(g.cw, g.ch);
    return { x: g.cx + (x - 125) * k, y: g.cy + (y - 194.5) * k };
  };
  /** 시안 좌표(카드 가운데 150,105) → 캔버스 */
  const P = (x: number, y: number) => {
    'worklet';
    const g = geom.value;
    return { x: g.cx + (x - 150) * unit.value, y: g.cy + (y - 105) * unit.value };
  };

  // ── 그림 조각
  const imgRect = useDerivedValue(() => {
    const g = geom.value;
    const a = art(g, 0, 0);
    const k = artScale(g.cw, g.ch);
    return { x: a.x, y: a.y, width: 250 * k, height: 389 * k };
  });
  const imgX = useDerivedValue(() => imgRect.value.x);
  const imgY = useDerivedValue(() => imgRect.value.y);
  const imgW = useDerivedValue(() => imgRect.value.width);
  const imgH = useDerivedValue(() => imgRect.value.height);
  const head = useDerivedValue(() => {
    const g = geom.value;
    const p = Skia.Path.Make();
    HEAD.forEach(([x, y], i) => {
      const q = art(g, x, y);
      if (i === 0) p.moveTo(q.x, q.y);
      else p.lineTo(q.x, q.y);
    });
    p.close();
    return p;
  });
  const aboveRim = useDerivedValue(() => {
    const g = geom.value;
    const a = art(g, 80, 60);
    const b = art(g, 180, RIM_Y);
    return Skia.XYWHRect(a.x, a.y, b.x - a.x, b.y - a.y);
  });
  const duck = useDerivedValue(() => [{ translateY: f.value.duck * artScale(geom.value.cw, geom.value.ch) }]);
  // 그림을 늦게 받으므로 hasArt 를 의존성으로 준다
  const artOpacity = useDerivedValue(() => (hasArt && f.value.duck > 0.01 ? 1 : 0), [hasArt]);

  // ── 날아오는 잉크 지그재그 총알
  const bullet = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const k = f.value.bullet;
    if (k < 0) return p;
    const u = unit.value;
    const from = P(300, 110);
    const x = from.x + (geom.value.mx - from.x) * k;
    const y = from.y + (geom.value.my - from.y) * k;
    p.moveTo(x, y);
    for (let i = 1; i <= 4; i++) p.lineTo(x + i * 10 * u, y + (-i * 3 + (i % 2 ? 4 : -4)) * u);
    return p;
  });
  const bulletDot = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const u = unit.value;
    const g = geom.value;
    if (f.value.bullet >= 0) {
      const from = P(300, 110);
      const k = f.value.bullet;
      p.addCircle(from.x + (g.mx - from.x) * k, from.y + (g.my - from.y) * k, 2.5 * u);
    } else if (f.value.ping >= 0) {
      const k = f.value.ping;
      p.addCircle(g.mx + 70 * u * k, g.my - 90 * u * k, 2.5 * u);
    }
    return p;
  });

  // ── 튕김: 줄과 별
  const ricochet = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const k = f.value.ping;
    if (k < 0) return p;
    const { mx, my } = geom.value;
    const u = unit.value;
    p.moveTo(mx, my);
    p.lineTo(mx + 70 * u * k, my - 90 * u * k);
    return p;
  });
  const star = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const k = f.value.ping;
    if (k < 0) return p;
    const u = unit.value;
    const s = (k < 0.2 ? 0.5 + k * 4 : 1.3) * u;
    addStar(p, geom.value.mx + 6 * u, geom.value.my, 4 * s, 10 * s, 6, 0);
    return p;
  });
  const pingOpacity = useDerivedValue(() => (f.value.ping >= 0 ? 1 - f.value.ping : 0));

  // ── 잉크 하트와 터지는 선
  const heart = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const k = f.value.heart;
    if (k < 0) return p;
    const t = Math.min(1, k * 2.5);
    const c = 1.70158;
    const back = 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
    const at = P(60, 130);
    addHeart(p, at.x, at.y, back * 3.2 * unit.value);
    return p;
  });
  const burst = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const k = f.value.heart;
    if (k < 0) return p;
    const u = unit.value;
    const at = P(60, 128);
    const r0 = (22 + k * 8) * u;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      p.moveTo(at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0);
      p.lineTo(at.x + Math.cos(a) * (r0 + 6 * u), at.y + Math.sin(a) * (r0 + 6 * u));
    }
    return p;
  });
  const heartOpacity = useDerivedValue(() => {
    const k = f.value.heart;
    return k < 0 ? 0 : k > 0.7 ? (1 - k) / 0.3 : 1;
  });

  const ink2 = useDerivedValue(() => 2 * unit.value);
  const ink1 = useDerivedValue(() => 1.2 * unit.value);

  return (
    <>
      {image && (
        <Group opacity={artOpacity}>
          {/* 조각이 떠난 자리: 둘레 벽색으로 번진 그림, 가장자리는 흐린 마스크로 풀어 준다 */}
          <Mask
            mask={
              <Path path={head} color="black">
                <BlurMask blur={8} style="normal" />
              </Path>
            }>
            <Image image={image} x={imgX} y={imgY} width={imgW} height={imgH} fit="fill">
              <Blur blur={24} />
            </Image>
          </Mask>
          {/* 머리·모자 조각: 통 테두리 아래로 내려가면 숨는다 */}
          <Group clip={aboveRim}>
            <Group transform={duck}>
              <Group clip={head}>
                <Image image={image} x={imgX} y={imgY} width={imgW} height={imgH} fit="fill" />
              </Group>
            </Group>
          </Group>
        </Group>
      )}

      <Path path={bullet} style="stroke" strokeWidth={ink2} strokeJoin="round" color={INK} />
      <Group opacity={pingOpacity}>
        <Path path={ricochet} style="stroke" strokeWidth={ink2} color={INK} />
        <Path path={star} color="#F2C14E" />
        <Path path={star} style="stroke" strokeWidth={ink2} strokeJoin="round" color={INK} />
      </Group>
      <Path path={bulletDot} color={INK} />

      <Group opacity={heartOpacity}>
        <Path path={heart} color="#D0342A" />
        <Path path={heart} style="stroke" strokeWidth={ink1} color={INK} />
        <Path path={burst} style="stroke" strokeWidth={ink2} strokeCap="round" color={INK} />
      </Group>
    </>
  );
}
