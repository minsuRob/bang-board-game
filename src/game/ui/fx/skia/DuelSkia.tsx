/**
 * 고화질 결투 — 사선 만화 컷. 연출 캔버스(CardFxSkia) 맨 위에 그린다.
 * (docs/card-fx-prototypes/duel.html B6, 얼굴·모자는 시안의 cowboy())
 *
 * 화면이 어두워지고 비스듬히 잘린 컷 셋이 번갈아 옆에서 밀려든다:
 * 모자 챙에 반쯤 가린 나 / 모래바람 속 회전초 / 반쯤 가린 상대. 두 눈이 가늘어지며 눈빛이 번갈아
 * 번뜩이다가, 총성과 함께 하얗게 번쩍하고 컷이 유리처럼 아홉 조각으로 깨져 흩어진다.
 * 가운데에는 노란 별 말풍선이 튀어나온다. 말풍선 속 "BANG!" 글자는 캔버스 위 RN(DuelLabels)이 쓴다.
 *
 * 그릴 것이 많고, 깨질 때는 같은 컷 그림을 조각마다 다시 그려야 하므로 선언형 노드 대신
 * 워클릿에서 SkPicture 를 직접 기록한다 (시안의 2D 캔버스 코드를 거의 그대로 옮길 수 있다).
 * 좌표는 시안 그대로(300×210, 카드 가운데 150,105, 카드 폭 92)이고, 카드 폭/92 배로 키워 카드 가운데에 맞춘다.
 *
 * 카드 그림은 쓰지 않는다. 끝(진행도 0·1)에는 아무것도 그리지 않는다.
 */

import {
  BlendMode,
  ClipOp,
  PaintStyle,
  Picture,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkCanvas,
  type SkPaint,
  type SkPath,
  type SkPicture,
} from '@shopify/react-native-skia';
import { Platform } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { DUEL_BALLOON_TILT, duelBalloon, duelFrame, duelLayout, FX_DUEL, type DuelFrame, type ShotGeom } from './timeline';

/** 어두운 바탕·번쩍을 깔 넓이 (시안 단위). 화면보다 넉넉히 */
const FAR = 3000;
const W = 300;
const BOUNDS = { x: -FAR * 4, y: -FAR * 4, width: FAR * 8, height: FAR * 8 };

/**
 * 웹 CanvasKit 객체는 GC 로 풀리지 않는다. 한 장면에서 만든 붓·모양은 기록이 끝나면 풀고,
 * 지난 장면 그림은 몇 장 뒤에 푼다. 네이티브는 JSI 가 알아서 푼다.
 */
const IS_WEB = Platform.OS === 'web';
const OLD_PICTURES: SkPicture[] = [];

type Bin = { dispose(): void }[];

// ── 시안과 같은 시드 난수표 (모듈에서 한 번 만든다) ──────────────────────
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 모래바람 줄 18개 */
const WIND = Array.from({ length: 18 }, (_, j) => {
  const r = rng(j * 31 + 7);
  const x0 = r() * 360;
  const sp = 260 + r() * 200;
  const y = 108 + r() * 36;
  const len = 18 + r() * 20;
  return { x0, sp, y, len };
});

/** 유리 조각 아홉 */
const SHARDS = (() => {
  const r = rng(55);
  const a = Array.from({ length: 9 }, (_, i) => ((i + 0.2 + r() * 0.6) / 9) * Math.PI * 2);
  return a.map((a0, i) => ({ a0, a1: a[(i + 1) % 9] + (i === 8 ? Math.PI * 2 : 0), d: 70 + r() * 90, rot: (r() - 0.5) * 0.7 }));
})();

/** 상대 턱의 수염 자국 (u 단위 오프셋) */
const STUBBLE = (() => {
  const r = rng(17);
  return Array.from({ length: 160 }, () => ({ x: (r() * 2 - 1) * 72, y: 62 + r() * 44 }));
})();

// ── 붓·모양 도우미 ─────────────────────────────────────────────────────
function keep(bin: Bin, o: { dispose(): void }) {
  'worklet';
  if (IS_WEB) bin.push(o);
}

function fillP(bin: Bin, color: string, alpha = 1): SkPaint {
  'worklet';
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(color));
  if (alpha !== 1) p.setAlphaf(p.getAlphaf() * alpha);
  keep(bin, p);
  return p;
}

function strokeP(bin: Bin, color: string, width: number, alpha = 1): SkPaint {
  'worklet';
  const p = fillP(bin, color, alpha);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(width);
  p.setStrokeCap(StrokeCap.Round);
  p.setStrokeJoin(StrokeJoin.Round);
  return p;
}

function path(bin: Bin): SkPath {
  'worklet';
  const q = Skia.Path.Make();
  keep(bin, q);
  return q;
}

function linear(bin: Bin, x0: number, y0: number, x1: number, y1: number, colors: string[], pos: number[] | null) {
  'worklet';
  const p = fillP(bin, '#000');
  const s = Skia.Shader.MakeLinearGradient(
    { x: x0, y: y0 },
    { x: x1, y: y1 },
    colors.map((c) => Skia.Color(c)),
    pos,
    TileMode.Clamp,
  );
  keep(bin, s);
  p.setShader(s);
  return p;
}

/** 2D 캔버스의 createRadialGradient 와 같은 두 원 그라데이션 */
function radial(bin: Bin, x0: number, y0: number, r0: number, x1: number, y1: number, r1: number, colors: string[], pos: number[] | null) {
  'worklet';
  const p = fillP(bin, '#000');
  const s = Skia.Shader.MakeTwoPointConicalGradient(
    { x: x0, y: y0 },
    r0,
    { x: x1, y: y1 },
    r1,
    colors.map((c) => Skia.Color(c)),
    pos,
    TileMode.Clamp,
  );
  keep(bin, s);
  p.setShader(s);
  return p;
}

function oval(c: SkCanvas, x: number, y: number, rx: number, ry: number, rot: number, paint: SkPaint) {
  'worklet';
  c.save();
  c.translate(x, y);
  if (rot !== 0) c.rotate((rot * 180) / Math.PI, 0, 0);
  c.drawOval(Skia.XYWHRect(-rx, -ry, rx * 2, ry * 2), paint);
  c.restore();
}

function rect(c: SkCanvas, x: number, y: number, w: number, h: number, paint: SkPaint) {
  'worklet';
  c.drawRect(Skia.XYWHRect(x, y, w, h), paint);
}

function seg(t: number, a: number, b: number) {
  'worklet';
  const v = (t - a) / (b - a);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function easeOut(t: number) {
  'worklet';
  return 1 - (1 - t) * (1 - t) * (1 - t);
}

/** 사선: 시안 컷의 위·아래 변은 오른쪽으로 갈수록 40 올라간다 */
function sl(x: number, y0: number) {
  'worklet';
  return y0 - (40 * (x - 6)) / 288;
}

// ── 눈 ───────────────────────────────────────────────────────────────
type EyeOpt = { side: number; look: number; iris: [string, string]; frown: number; wrinkle: number; white: string; browC: string };

/** 아몬드형 눈 하나 (눈썹·쌍꺼풀·눈가 주름). o 는 뜬 정도. 돌려주는 값은 홍채 중심 */
function eye(c: SkCanvas, bin: Bin, x: number, cy: number, w: number, o: number, s: EyeOpt) {
  'worklet';
  const hw = w / 2;
  const hu = Math.max(0.6, w * 0.21 * o);
  const hd = Math.max(0.4, w * 0.11 * o);
  const dk = '40,20,10';
  c.save();
  c.translate(x, cy);
  c.scale(s.side, 1);
  const ix0 = -hw;
  const iy0 = w * 0.04;
  const ox = hw;
  const oy = -w * 0.035;

  // 눈두덩 그늘
  rect(c, -w, -w * 0.8, w * 2, w * 1.5, radial(bin, 0, -hu * 0.4, w * 0.08, 0, -hu * 0.4, w * 0.75, ['rgba(20,10,5,0.55)', 'rgba(20,10,5,0)'], null));

  // 눈썹: 안쪽이 내려앉은 찡그림
  const by = -w * 0.36 + (1 - o) * w * 0.1;
  const fr = s.frown;
  const th = w * 0.085;
  const yi = by + w * 0.09 * fr;
  const yo = by + w * 0.05;
  const ym = by - w * 0.04 * (1 - fr * 0.5);
  const brow = path(bin);
  brow.moveTo(-hw * 1.02, yi - th * 0.9);
  brow.quadTo(0, ym - th * 1.1, hw * 1.2, yo);
  brow.quadTo(0, ym + th * 0.4, -hw * 0.98, yi + th * 0.5);
  brow.close();
  c.drawPath(brow, fillP(bin, s.browC));
  const hairs = path(bin);
  for (let i = 0; i < 11; i++) {
    const k = i / 10;
    const bx = -hw + (hw * 1.1 + hw) * k;
    const byy = (1 - k) * (1 - k) * yi + 2 * k * (1 - k) * (ym - th * 0.3) + k * k * yo;
    hairs.moveTo(bx, byy + th * 0.4);
    hairs.lineTo(bx + Math.min(w * 0.06, 3.5), byy - th * 0.45);
  }
  c.drawPath(hairs, strokeP(bin, 'rgba(0,0,0,0.35)', 0.6));

  // 쌍꺼풀 주름
  const crease = path(bin);
  crease.moveTo(-hw * 0.8, -hu * 1.0 - w * 0.07);
  crease.quadTo(-hw * 0.1, -hu * 1.5 - w * 0.1, hw * 0.95, oy - hu * 0.5 - w * 0.07);
  c.drawPath(crease, strokeP(bin, `rgba(${dk},0.5)`, Math.max(0.7, w * 0.018)));

  // 흰자 · 홍채 · 동공
  const almond = path(bin);
  almond.moveTo(ix0, iy0);
  almond.cubicTo(-hw * 0.45, -hu * 1.35, hw * 0.4, -hu * 1.25, ox, oy);
  almond.cubicTo(hw * 0.45, hd * 1.3, -hw * 0.35, hd * 1.35, ix0, iy0);
  almond.close();
  c.drawPath(almond, fillP(bin, s.white));
  c.save();
  c.clipPath(almond, ClipOp.Intersect, true);
  const ir = w * 0.2;
  const ix = s.look * w * 0.13 * s.side;
  const iy = -hu * 0.12;
  c.drawCircle(ix, iy, ir, radial(bin, ix, iy, ir * 0.15, ix, iy, ir, [s.iris[1], s.iris[0], '#0c0705'], [0, 0.72, 1]));
  const streaks = path(bin);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    streaks.moveTo(ix + Math.cos(a) * ir * 0.48, iy + Math.sin(a) * ir * 0.48);
    streaks.lineTo(ix + Math.cos(a) * ir * 0.88, iy + Math.sin(a) * ir * 0.88);
  }
  c.drawPath(streaks, strokeP(bin, 'rgba(255,232,190,0.2)', 0.5));
  c.drawCircle(ix, iy, ir * 0.42, fillP(bin, '#050302'));
  // 윗눈꺼풀이 드리운 그늘
  rect(c, -hw, -hu * 1.5, w, hu * 1.9, linear(bin, 0, -hu * 1.4, 0, hu * 0.4, ['rgba(0,0,0,0.72)', 'rgba(0,0,0,0)'], null));
  c.restore();

  // 속눈썹 선(굵게) · 아랫눈꺼풀 · 눈밑 주름
  const lash = path(bin);
  lash.moveTo(ix0, iy0);
  lash.cubicTo(-hw * 0.45, -hu * 1.35, hw * 0.4, -hu * 1.25, ox, oy);
  lash.lineTo(ox + w * 0.06, oy - w * 0.05);
  c.drawPath(lash, strokeP(bin, '#1a0f08', Math.max(1.2, Math.min(3.6, w * 0.05))));
  const lower = path(bin);
  lower.moveTo(ox, oy);
  lower.cubicTo(hw * 0.45, hd * 1.3, -hw * 0.35, hd * 1.35, ix0, iy0);
  c.drawPath(lower, strokeP(bin, `rgba(${dk},0.6)`, Math.max(0.6, w * 0.016)));
  const under = path(bin);
  under.moveTo(-hw * 0.55, hd * 1.2 + w * 0.08);
  under.quadTo(0, hd * 1.5 + w * 0.13, hw * 0.75, hd * 0.8 + w * 0.06);
  c.drawPath(under, strokeP(bin, `rgba(${dk},0.28)`, Math.max(0.6, w * 0.016)));

  // 눈가 잔주름 (찡그릴수록 짙다)
  if (s.wrinkle > 0) {
    const wr = path(bin);
    for (let i = 0; i < 4; i++) {
      const a = (i - 1.5) * 0.34;
      wr.moveTo(ox + w * 0.05, oy + a * w * 0.12);
      wr.quadTo(ox + w * 0.15, oy + a * w * 0.2 - w * 0.012, ox + w * (0.24 + (i % 2) * 0.04), oy + a * w * 0.4);
    }
    c.drawPath(wr, strokeP(bin, `rgba(${dk},${Math.min(1, s.wrinkle * 0.6)})`, Math.max(0.6, w * 0.014)));
  }
  c.restore();
  return { x: x + s.look * w * 0.13, y: cy - hu * 0.12, r: w * 0.2 };
}

/** 눈빛에 걸리는 십자 반짝 */
function glint(c: SkCanvas, bin: Bin, x: number, y: number, k: number, size: number, col: string) {
  'worklet';
  if (k <= 0.01) return;
  const L = size * (0.6 + k);
  const st = strokeP(bin, `rgba(${col},${k})`, 1);
  st.setBlendMode(BlendMode.Plus);
  const q = path(bin);
  q.moveTo(x - L, y);
  q.lineTo(x + L, y);
  q.moveTo(x, y - L * 0.55);
  q.lineTo(x, y + L * 0.55);
  c.drawPath(q, st);
  const dot = fillP(bin, `rgba(255,255,255,${k})`);
  dot.setBlendMode(BlendMode.Plus);
  c.drawCircle(x, y, 1.1 + k * 1.3, dot);
}

// ── 모자를 쓴 얼굴 ────────────────────────────────────────────────────
type Cowboy = {
  cx: number;
  ey: number;
  sc: number;
  skin: string;
  o: number;
  look: number;
  iris: [string, string];
  glowC: string;
  glint: number;
  brim: number;
  tilt: number;
  hatC: string;
  mouth: boolean;
};

/** 앞챙 아래 선 (모자 좌표, 챙 가운데 0,0) */
function brimFront(q: SkPath, dy: number) {
  'worklet';
  q.moveTo(-150, -34 + dy);
  q.cubicTo(-125, -6 + dy, -70, 4 + dy, 0, 4 + dy);
  q.cubicTo(70, 4 + dy, 125, -6 + dy, 150, -34 + dy);
}

/** 카우보이 모자를 쓴 얼굴 (눈 위쪽 클로즈업). 챙이 눈 위를 반쯤 덮고 그늘 속 눈빛만 빛난다 */
function cowboy(c: SkCanvas, bin: Bin, P: Cowboy) {
  'worklet';
  const { cx, ey } = P;
  const u = P.sc;
  const ex = 47 * u;
  const ew = 50 * u;
  const fy = ey + 40 * u;
  const rx = 100 * u;
  const ry = 132 * u;
  const browC = '#24160c';
  const rimC = '255,214,150';

  // 귀 · 얼굴
  const skin = fillP(bin, P.skin);
  const earShade = fillP(bin, 'rgba(0,0,0,0.3)');
  for (const d of [-1, 1]) {
    oval(c, cx + d * 100 * u, ey + 30 * u, 11 * u, 22 * u, d * 0.15, skin);
    oval(c, cx + d * 102 * u, ey + 30 * u, 5 * u, 13 * u, d * 0.15, earShade);
  }
  oval(c, cx, fy, rx, ry, 0, skin);
  oval(
    c,
    cx,
    fy,
    rx,
    ry,
    0,
    radial(bin, cx, ey + 24 * u, 16 * u, cx, fy, 132 * u, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.14)', 'rgba(0,0,0,0.62)'], [0, 0.55, 1]),
  );

  // 콧등 그늘 · 콧방울
  const nose = path(bin);
  nose.moveTo(cx + 5 * u, ey + 8 * u);
  nose.quadTo(cx + 12 * u, ey + 30 * u, cx + 16 * u, ey + 56 * u);
  nose.lineTo(cx + 6 * u, ey + 60 * u);
  nose.quadTo(cx + 6 * u, ey + 30 * u, cx + u, ey + 8 * u);
  nose.close();
  c.drawPath(nose, fillP(bin, 'rgba(30,14,6,0.13)'));
  const nostril = fillP(bin, 'rgba(30,14,6,0.45)');
  for (const d of [-1, 1]) oval(c, cx + d * 9 * u, ey + 62 * u, 4.5 * u, 2.4 * u, d * 0.3, nostril);

  // 수염 자국 · 입 · 콧수염
  if (P.mouth) {
    const stub = path(bin);
    for (const s of STUBBLE) stub.addRect(Skia.XYWHRect(cx + s.x * u, ey + s.y * u, 0.8, 0.8));
    c.drawPath(stub, fillP(bin, 'rgba(30,16,8,0.35)'));
    const lip = path(bin);
    lip.moveTo(cx - 22 * u, ey + 84 * u);
    lip.quadTo(cx, ey + 81 * u, cx + 24 * u, ey + 85 * u);
    c.drawPath(lip, strokeP(bin, 'rgba(50,24,12,0.8)', 1.6 * u));
    const mus = path(bin);
    mus.moveTo(cx - 32 * u, ey + 86 * u);
    mus.quadTo(cx - 12 * u, ey + 66 * u, cx, ey + 72 * u);
    mus.quadTo(cx + 12 * u, ey + 66 * u, cx + 32 * u, ey + 86 * u);
    mus.quadTo(cx + 12 * u, ey + 76 * u, cx, ey + 78 * u);
    mus.quadTo(cx - 12 * u, ey + 76 * u, cx - 32 * u, ey + 86 * u);
    mus.close();
    c.drawPath(mus, fillP(bin, browC));
  }

  const hatOn = () => {
    'worklet';
    c.translate(cx, ey + P.brim * u);
    c.rotate((P.tilt * 180) / Math.PI, 0, 0);
    c.scale(u, u);
  };

  // 챙 그늘이 얼굴에 드리운다
  const sd = 26;
  c.save();
  hatOn();
  const shade = path(bin);
  brimFront(shade, 0);
  shade.lineTo(150, -34 + sd);
  shade.cubicTo(125, -6 + sd, 70, 4 + sd, 0, 4 + sd);
  shade.cubicTo(-70, 4 + sd, -125, -6 + sd, -150, -34 + sd);
  shade.close();
  c.drawPath(shade, linear(bin, 0, 0, 0, 4 + sd, ['rgba(8,4,2,0.9)', 'rgba(8,4,2,0.54)', 'rgba(8,4,2,0)'], [0, 0.55, 1]));
  c.restore();

  // 눈
  const eyes = [-1, 1].map((d) =>
    eye(c, bin, cx + d * ex, ey, ew, P.o, {
      side: d,
      look: P.look,
      iris: P.iris,
      frown: 0.95,
      wrinkle: 0.3 + 0.7 * (1 - P.o),
      white: '#a89880',
      browC,
    }),
  );

  // 그늘 속 눈빛 (반사는 홍채 아래쪽에 맺힌다 = 햇빛 받은 땅)
  const gl = P.glint;
  const base = 0.4;
  const k = base + (1 - base) * gl;
  for (const p of eyes) {
    const glow = radial(bin, p.x, p.y, 0, p.x, p.y, p.r * 2.6, [`rgba(${P.glowC},${0.45 * k})`, `rgba(${P.glowC},0)`], null);
    glow.setBlendMode(BlendMode.Plus);
    c.drawCircle(p.x, p.y, p.r * 2.6, glow);
    const sx = p.x - p.r * 0.3;
    const sy = p.y + p.r * 0.22;
    c.drawCircle(sx, sy, (0.9 + gl) * Math.min(1.4, u), fillP(bin, `rgba(255,250,235,${Math.min(1, 0.35 + 0.65 * k)})`));
    glint(c, bin, sx, sy, gl, 9 * u, P.glowC);
  }

  // 모자: 챙 → 크라운 → 띠
  c.save();
  hatOn();
  const brim = path(bin);
  brim.moveTo(-150, -34);
  brim.cubicTo(-120, -30, -60, -27, 0, -27);
  brim.cubicTo(60, -27, 120, -30, 150, -34);
  brim.cubicTo(125, -6, 70, 4, 0, 4);
  brim.cubicTo(-70, 4, -125, -6, -150, -34);
  brim.close();
  c.drawPath(brim, linear(bin, 0, -30, 0, 4, [P.hatC, '#0e0905'], null));
  const crown = path(bin);
  crown.moveTo(-58, -25);
  crown.cubicTo(-63, -60, -57, -92, -42, -104);
  crown.quadTo(-20, -112, 0, -97);
  crown.quadTo(20, -112, 42, -104);
  crown.cubicTo(57, -92, 63, -60, 58, -25);
  crown.quadTo(0, -21, -58, -25);
  crown.close();
  c.drawPath(crown, linear(bin, -60, 0, 60, 0, ['#0e0905', P.hatC, '#120b06'], [0, 0.45, 1]));
  const dents = path(bin);
  dents.moveTo(0, -96);
  dents.quadTo(-4, -72, 0, -48);
  dents.moveTo(-38, -98);
  dents.quadTo(-46, -80, -44, -60);
  dents.moveTo(38, -98);
  dents.quadTo(46, -80, 44, -60);
  c.drawPath(dents, strokeP(bin, 'rgba(0,0,0,0.4)', 2));
  const band = path(bin);
  band.moveTo(-59, -26);
  band.quadTo(0, -22, 59, -26);
  band.lineTo(60, -40);
  band.quadTo(0, -36, -60, -40);
  band.close();
  c.drawPath(band, fillP(bin, '#17100a'));
  c.drawCircle(36, -33, 4, fillP(bin, '#b8b0a0'));
  c.drawCircle(36, -33, 1.4, fillP(bin, '#4a443c'));
  // 챙 앞끝에 걸린 빛
  const edge = path(bin);
  brimFront(edge, 0);
  c.drawPath(edge, strokeP(bin, `rgba(${rimC},0.5)`, 1.4 / u));
  c.restore();
}

function sky(c: SkCanvas, bin: Bin, top: string, bot: string, y0: number, h: number) {
  'worklet';
  rect(c, 0, y0, W, h, linear(bin, 0, y0, 0, y0 + h, [top, bot], null));
}

function tumbleweed(c: SkCanvas, bin: Bin, x: number, y: number, r: number, rot: number) {
  'worklet';
  c.save();
  c.translate(x, y);
  c.rotate((rot * 180) / Math.PI, 0, 0);
  const st = strokeP(bin, '#7a5a32', 1.1);
  for (let i = 0; i < 7; i++) oval(c, 0, 0, r, r * 0.55, i * 0.45, st);
  c.restore();
}

/** 컷 하나의 속 그림 (컷 모양으로 자르기 전) */
function panelContent(c: SkCanvas, bin: Bin, i: number, t: number, f: DuelFrame) {
  'worklet';
  if (i === 0) {
    sky(c, bin, '#e2bb80', '#a87444', 0, 100);
    cowboy(c, bin, {
      cx: 150,
      ey: 52,
      sc: 0.92,
      skin: '#a8724a',
      o: f.squint,
      look: 0.6,
      iris: ['#7a4e1e', '#e0a548'],
      glowC: '255,184,80',
      glint: f.me,
      brim: -10,
      tilt: -0.06,
      hatC: '#4a301c',
      mouth: false,
    });
  } else if (i === 1) {
    rect(c, 0, 50, W, 110, fillP(bin, '#f2d7a0'));
    const ground = path(bin);
    ground.moveTo(0, sl(0, 128));
    ground.lineTo(W, sl(W, 128));
    ground.lineTo(W, 160);
    ground.lineTo(0, 160);
    ground.close();
    c.drawPath(ground, fillP(bin, '#b07a48'));
    const rock = path(bin);
    rock.moveTo(30, sl(30, 128));
    rock.lineTo(44, sl(44, 116));
    rock.lineTo(70, sl(70, 116));
    rock.lineTo(80, sl(80, 128));
    rock.close();
    c.drawPath(rock, fillP(bin, '#9a6a40'));
    const wind = path(bin);
    for (const w of WIND) {
      const x = ((((w.x0 - t * w.sp) % 360) + 360) % 360) - 30;
      const y = sl(x, w.y);
      wind.moveTo(x, y);
      wind.lineTo(x + w.len, sl(x + 30, 108) - sl(x, 108) + y);
    }
    c.drawPath(wind, strokeP(bin, 'rgba(255,240,210,0.7)', 1));
    const tx = 320 - 350 * seg(t, 0.06, 0.82);
    tumbleweed(c, bin, tx, sl(tx, 134) - Math.abs(Math.sin(t * 22)) * 5, 10, -t * 18);
  } else {
    sky(c, bin, '#c49464', '#5a3c22', 110, 100);
    cowboy(c, bin, {
      cx: 150,
      ey: 164,
      sc: 0.92,
      skin: '#8e5f3c',
      o: f.squint,
      look: -0.6,
      iris: ['#3a5a63', '#a6d4dc'],
      glowC: '150,222,238',
      glint: f.foe,
      brim: -9,
      tilt: 0.06,
      hatC: '#2a2420',
      mouth: true,
    });
  }
}

/** 비스듬히 잘린 컷 셋의 꼭짓점 */
const POLY: [number, number][][] = [
  [
    [6, 6],
    [294, 6],
    [294, sl(294, 94)],
    [6, 94],
  ],
  [
    [6, 102],
    [294, sl(294, 102)],
    [294, sl(294, 148)],
    [6, 148],
  ],
  [
    [6, 156],
    [294, sl(294, 156)],
    [294, 204],
    [6, 204],
  ],
];

/** 어두운 바탕 + 컷 셋 (테두리 포함) */
function panels(c: SkCanvas, bin: Bin, t: number, f: DuelFrame) {
  'worklet';
  if (f.dark <= 0) return;
  rect(c, -FAR, -FAR, FAR * 2, FAR * 2, fillP(bin, '#0d0906', f.dark));
  for (let i = 0; i < 3; i++) {
    const k = f.slide[i];
    if (k <= 0.005) continue;
    const dx = (i === 1 ? 1 : -1) * (1 - k) * 320;
    const pop = i === 0 ? f.me : i === 2 ? f.foe : 0;
    const shape = path(bin);
    POLY[i].forEach(([x, y], j) => (j ? shape.lineTo(x + dx, y) : shape.moveTo(x + dx, y)));
    shape.close();
    c.save();
    c.clipPath(shape, ClipOp.Intersect, true);
    c.translate(dx, 0);
    if (pop > 0) {
      const z = 1 + 0.05 * pop;
      const py = i ? 160 : 50;
      c.translate(150, py);
      c.scale(z, z);
      c.translate(-150, -py);
    }
    panelContent(c, bin, i, t, f);
    if (pop > 0) rect(c, -FAR, -FAR, FAR * 2, FAR * 2, fillP(bin, `rgba(255,248,230,${0.25 * pop})`));
    c.restore();
    c.drawPath(shape, strokeP(bin, '#f3e7ce', 3));
    c.drawPath(shape, strokeP(bin, '#0d0906', 1.2));
  }
}

function record(draw: (c: SkCanvas) => void) {
  'worklet';
  const rec = Skia.PictureRecorder();
  const c = rec.beginRecording(BOUNDS);
  draw(c);
  const pic = rec.finishRecordingAsPicture();
  if (IS_WEB) rec.dispose();
  return pic;
}

/** 한 장면 전체 (시안 좌표). 쉬는 동안은 빈 그림 */
function drawDuel(c: SkCanvas, bin: Bin, g: ShotGeom, p: number, w: number, h: number) {
  'worklet';
  const f = duelFrame(p);
  if (!f.active) return;
  const t = p;
  const L = duelLayout(g, w, h);
  c.save();
  c.translate(L.x - 150 * L.u, L.y - 105 * L.u);
  c.scale(L.u, L.u);

  const sk = f.shatter;
  if (sk <= 0) panels(c, bin, t, f);
  else if (sk < 1) {
    // 컷이 유리처럼 깨진다: 같은 그림을 조각(가운데에서 뻗은 쐐기)마다 잘라 흩는다
    const whole = record((pc) => {
      'worklet';
      panels(pc, bin, t, f);
    });
    keep(bin, whole);
    const fade = 1 - seg(sk, 0.35, 1);
    const e = easeOut(sk);
    const layer = fillP(bin, '#000', fade);
    for (const S of SHARDS) {
      const am = (S.a0 + S.a1) / 2;
      c.save();
      c.translate(Math.cos(am) * S.d * e, Math.sin(am) * S.d * e + 40 * sk * sk);
      c.rotate((S.rot * e * 180) / Math.PI, 150, 105);
      const wedge = path(bin);
      wedge.moveTo(150, 105);
      wedge.lineTo(150 + Math.cos(S.a0) * FAR, 105 + Math.sin(S.a0) * FAR);
      wedge.lineTo(150 + Math.cos(am) * FAR, 105 + Math.sin(am) * FAR);
      wedge.lineTo(150 + Math.cos(S.a1) * FAR, 105 + Math.sin(S.a1) * FAR);
      wedge.close();
      c.clipPath(wedge, ClipOp.Intersect, true);
      if (fade < 1) c.saveLayer(layer);
      c.drawPicture(whole);
      if (fade < 1) c.restore();
      // 깨진 금: 조각 가장자리에 밝은 선
      c.drawPath(wedge, strokeP(bin, 'rgba(255,248,230,0.55)', 1.2, fade));
      c.restore();
    }
  }

  // 금 가는 순간의 하얀 번쩍 + 노란 별 말풍선 (글자는 DuelLabels)
  const cut = f.cut;
  if (cut > 0 && cut < 0.12) rect(c, -FAR, -FAR, FAR * 2, FAR * 2, fillP(bin, '#fffaec', (1 - cut / 0.12) * 0.9));
  const b = duelBalloon(cut);
  if (b.alpha > 0) {
    c.save();
    c.translate(150, 105);
    c.scale(b.scale, b.scale);
    c.rotate((DUEL_BALLOON_TILT * 180) / Math.PI, 0, 0);
    const star = path(bin);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const rr = i % 2 ? 34 : 54 + (i % 4 === 0 ? 8 : 0);
      const x = Math.cos(a) * rr * 1.3;
      const y = Math.sin(a) * rr * 0.85;
      if (i === 0) star.moveTo(x, y);
      else star.lineTo(x, y);
    }
    star.close();
    c.drawPath(star, fillP(bin, '#ffd23a', b.alpha));
    c.drawPath(star, strokeP(bin, '#0d0906', 2.5, b.alpha));
    c.restore();
  }
  c.restore();
}

type Props = {
  progress: SharedValue<number>;
  geom: SharedValue<ShotGeom>;
  /** 캔버스 크기. 컷 묶음이 화면 밖으로 나가지 않게 줄이고 민다 */
  size: SharedValue<{ width: number; height: number }>;
};

export function DuelSkia({ progress, geom, size }: Props) {
  // 공유값은 이 콜백 본문에서 직접 읽는다 (웹 Reanimated 구독)
  const picture = useDerivedValue(() => {
    const g = geom.value;
    const p = g.kind === FX_DUEL ? progress.value : 1;
    const { width, height } = size.value;
    const bin: Bin = [];
    const pic = record((c) => {
      'worklet';
      drawDuel(c, bin, g, p, width, height);
    });
    if (IS_WEB) {
      for (const o of bin) o.dispose();
      // 화면에 걸린 그림은 바로 풀지 않는다
      OLD_PICTURES.push(pic);
      while (OLD_PICTURES.length > 4) OLD_PICTURES.shift()?.dispose();
    }
    return pic;
  });
  return <Picture picture={picture} />;
}
