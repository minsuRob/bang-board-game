/**
 * 고화질 카빈 — 원근 사격 레인. 연출 캔버스(CardFxSkia) 안의 한 무리로 그린다.
 *
 * 카드 아래로 소실점까지 이어지는 바닥이 깔리고, 가까운 칸부터 1·2·3·4 띠에 차례로 불이 든다.
 * 5칸째부터는 어둡다 (사정거리 4). 카드가 뒤로 기대는 것은 RN(ShotCardWrap 의 rotateX)이 맡고,
 * 띠 번호는 RN(GunFxLabels)이 그린다.
 *
 * 캔버스는 카드 위에 있으므로, 기댄 카드 모양(사다리꼴)만큼 바닥을 도려내 카드를 가리지 않는다.
 */

import { Group, Oval, Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { FX_LANE, LANE_BANDS, laneFrame, laneX, laneY, laneZ, TILT_PERSPECTIVE, type ShotGeom } from './timeline';

const LIT = 4;

export function LaneSkia({ progress, geom }: { progress: SharedValue<number>; geom: SharedValue<ShotGeom> }) {
  const f = useDerivedValue(() => laneFrame(geom.value.kind === FX_LANE ? progress.value : 1));

  // 도우미는 값을 인자로 받는다. 도우미 안에서만 공유값을 읽으면 웹에서 구독이 안 잡혀 갱신되지 않는다
  const quad = (p: ReturnType<typeof Skia.Path.Make>, g: ShotGeom, i: number) => {
    'worklet';
    const { cx, cy, cw, ch } = g;
    const [z0, z1] = laneZ(i);
    p.moveTo(cx + laneX(z0, -1, cw), cy + laneY(z0, ch));
    p.lineTo(cx + laneX(z0, 1, cw), cy + laneY(z0, ch));
    p.lineTo(cx + laneX(z1, 1, cw), cy + laneY(z1, ch));
    p.lineTo(cx + laneX(z1, -1, cw), cy + laneY(z1, ch));
    p.close();
  };
  const band = (g: ShotGeom, i: number) => {
    'worklet';
    const p = Skia.Path.Make();
    quad(p, g, i);
    return p;
  };
  const b0 = useDerivedValue(() => band(geom.value, 0));
  const b1 = useDerivedValue(() => band(geom.value, 1));
  const b2 = useDerivedValue(() => band(geom.value, 2));
  const b3 = useDerivedValue(() => band(geom.value, 3));
  // 앞 칸일수록 진하게
  const o0 = useDerivedValue(() => 0.36 * f.value.band[0]);
  const o1 = useDerivedValue(() => 0.3 * f.value.band[1]);
  const o2 = useDerivedValue(() => 0.25 * f.value.band[2]);
  const o3 = useDerivedValue(() => 0.2 * f.value.band[3]);

  const litEdges = useDerivedValue(() => {
    const p = Skia.Path.Make();
    for (let i = 0; i < LIT; i++) quad(p, geom.value, i);
    return p;
  });
  const darkEdges = useDerivedValue(() => {
    const p = Skia.Path.Make();
    for (let i = LIT; i < LANE_BANDS; i++) quad(p, geom.value, i);
    // 바닥 테두리: 맨 앞에서 소실점까지
    const { cx, cy, cw, ch } = geom.value;
    const vy = cy - 0.75 * ch;
    p.moveTo(cx + laneX(1, -1, cw), cy + laneY(1, ch));
    p.lineTo(cx, vy);
    p.lineTo(cx + laneX(1, 1, cw), cy + laneY(1, ch));
    return p;
  });

  /** 기댄 카드 모양. ShotCardWrap 의 perspective + rotateX(아래 모서리 축)와 같은 계산 */
  const cardShape = useDerivedValue(() => {
    const { cx, cy, cw, ch } = geom.value;
    const th = f.value.lean;
    const s = TILT_PERSPECTIVE / (TILT_PERSPECTIVE + ch * Math.sin(th));
    const bottom = cy + ch / 2;
    const top = bottom - ch * Math.cos(th) * s;
    const p = Skia.Path.Make();
    p.moveTo(cx - cw / 2 - 2, bottom + 2);
    p.lineTo(cx + cw / 2 + 2, bottom + 2);
    p.lineTo(cx + (cw / 2) * s + 2, top - 2);
    p.lineTo(cx - (cw / 2) * s - 2, top - 2);
    p.close();
    return p;
  });

  // 기댄 카드의 그림자
  const shadow = useDerivedValue(() => {
    const { cx, cy, cw, ch } = geom.value;
    const u = cw / 92;
    const h = (5 + f.value.lean * 10) * u;
    return { x: cx - 50 * u, y: cy + ch / 2 + 2 * u - h, width: 100 * u, height: h * 2 };
  });

  const floor = useDerivedValue(() => f.value.floor);
  const shadowOpacity = useDerivedValue(() => (f.value.lean > 0.001 ? 0.35 : 0));

  return (
    <Group clip={cardShape} invertClip>
      <Oval rect={shadow} color="#000000" opacity={shadowOpacity} />
      <Group opacity={floor}>
        <Path path={b0} color="#F2C14E" opacity={o0} />
        <Path path={b1} color="#F2C14E" opacity={o1} />
        <Path path={b2} color="#F2C14E" opacity={o2} />
        <Path path={b3} color="#F2C14E" opacity={o3} />
        <Path path={darkEdges} style="stroke" strokeWidth={1} color="rgba(179,155,116,0.4)" />
        <Path path={litEdges} style="stroke" strokeWidth={1} color="rgba(242,193,78,0.65)" />
      </Group>
    </Group>
  );
}
