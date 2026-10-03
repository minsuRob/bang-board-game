/**
 * 고화질 야생마 — 3D 멀어졌다 돌아오기. 연출 캔버스(CardFxSkia) 안의 한 무리로 그린다.
 *
 * 카드가 들려 원근 길을 따라 지평선 쪽으로 작아지며 멀어지고(거리 +1), 길에 말발굽 자국이 찍힌다.
 * 제자리에는 점선 카드 자리가 남는다. 돌아와 쿵 착지하면 양옆으로 흙먼지와 금빛 고리.
 * 카드가 멀어지는 움직임은 cardMotion(RN 카드와 같은 값), "거리 +1" 글자는 RN(GunFxLabels).
 *
 * 캔버스는 카드 위에 있으므로 지금 카드 자리를 도려내 길이 카드를 가리지 않게 한다.
 * 자리는 시안(카드 92×132, 가운데 150,105)의 좌표를 카드 폭에 비례해 옮긴다.
 */

import { DashPathEffect, Group, Oval, Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { settlePath } from './paths';
import { cardRectNow, FX_MUSTANG, mustangFrame, type ShotGeom } from './timeline';

/** 길 아래 끝 (시안 x, 바닥 y=210) */
const ROAD = [60, 240, 10, 290] as const;
const HOOVES = 8;

export function MustangSkia({ progress, geom }: { progress: SharedValue<number>; geom: SharedValue<ShotGeom> }) {
  const live = useDerivedValue(() => (geom.value.kind === FX_MUSTANG ? progress.value : 1));
  const f = useDerivedValue(() => mustangFrame(live.value));
  const unit = useDerivedValue(() => geom.value.cw / 92);
  /** 시안 좌표 → 캔버스 */
  const P = (x: number, y: number) => {
    'worklet';
    const g = geom.value;
    return { x: g.cx + (x - 150) * unit.value, y: g.cy + (y - 105) * unit.value };
  };

  const cardHole = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const r = cardRectNow(geom.value, live.value);
    p.addRRect(Skia.RRectXY(Skia.XYWHRect(r.x - 1, r.y - 1, r.width + 2, r.height + 2), 8, 8));
    return p;
  });

  const road = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (f.value.road <= 0.01) return p;
    for (const x of ROAD) {
      const a = P(150 + (x - 150) * 0.05, 14);
      const b = P(x, 210);
      p.moveTo(a.x, a.y);
      p.lineTo(b.x, b.y);
    }
    return p;
  });

  // 말발굽 자국: 멀어진 만큼 지평선 쪽으로 찍힌다
  const hooves = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const d = f.value.away;
    if (f.value.road <= 0.01) return p;
    const u = unit.value;
    for (let i = 0; i < HOOVES; i++) {
      const z = i / HOOVES;
      if (z > d) continue;
      const s = 1 - 0.7 * z;
      const c = P(150 + (i % 2 ? 6 : -6) * s, 195 - 165 * Math.pow(z, 0.7));
      const r = 3 * s * u;
      p.addArc(Skia.XYWHRect(c.x - r, c.y - r, r * 2, r * 2), 27, 306);
    }
    return p;
  });

  const slot = useDerivedValue(() => {
    const g = geom.value;
    return Skia.RRectXY(Skia.XYWHRect(g.cx - g.cw / 2, g.cy - g.ch / 2, g.cw, g.ch), 8, 8);
  });
  const slotPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.addRRect(slot.value);
    return p;
  });

  // 들린 카드의 그림자
  const shadow = useDerivedValue(() => {
    const g = geom.value;
    const r = cardRectNow(g, live.value);
    const u = unit.value;
    const s = f.value.scale;
    const w = r.width * 0.55 + 6 * u * (1 - s);
    const y = r.y + r.height + (4 + 10 * f.value.away) * u;
    return { x: r.x + r.width / 2 - w, y: y - 5 * s * u, width: w * 2, height: 10 * s * u };
  });
  const shadowOpacity = useDerivedValue(() => (f.value.rise > 0.5 ? 0.3 * (1 - f.value.away * 0.5) : 0));

  // 착지 흙먼지
  const dust = useDerivedValue(() => {
    const g = geom.value;
    const k = f.value.land;
    const p = Skia.Path.Make();
    if (k <= 0 || k >= 1) return p;
    const u = unit.value;
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * 2 - (i / 5) * Math.PI;
      const r = (3 + k * 8) * u;
      p.addCircle(g.cx + Math.cos(a) * (g.cw / 2 + k * 14 * u), g.cy + g.ch / 2 - 2 * u + Math.sin(a) * 4 * u, r);
    }
    return p;
  });
  const dustOpacity = useDerivedValue(() => (f.value.land > 0 ? (1 - f.value.land) * 0.55 : 0));

  const settle = useDerivedValue(() => settlePath(geom.value, f.value.land));
  const settleOpacity = useDerivedValue(() => (f.value.land > 0 ? (1 - f.value.land) * 0.85 : 0));
  const settleWidth = useDerivedValue(() => (2 * (1 - Math.max(0, f.value.land)) + 0.5) * unit.value);

  const roadOpacity = useDerivedValue(() => f.value.road);
  const thin = useDerivedValue(() => unit.value);
  const hoofWidth = useDerivedValue(() => 1.5 * unit.value);

  return (
    <>
      <Group clip={cardHole} invertClip>
        <Group opacity={roadOpacity}>
          <Path path={road} style="stroke" strokeWidth={thin} color="rgba(200,160,100,0.4)" />
          <Path path={hooves} style="stroke" strokeWidth={hoofWidth} strokeCap="round" color="rgba(30,20,11,0.6)" />
          <Path path={slotPath} style="stroke" strokeWidth={thin} color="rgba(242,193,78,0.7)">
            <DashPathEffect intervals={[4, 4]} />
          </Path>
        </Group>
        <Oval rect={shadow} color="#000000" opacity={shadowOpacity} />
        <Path path={dust} color="#C8AA7D" opacity={dustOpacity} />
      </Group>
      <Path path={settle} style="stroke" strokeWidth={settleWidth} color="#F2C14E" opacity={settleOpacity} />
    </>
  );
}
