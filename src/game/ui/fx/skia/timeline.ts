/**
 * 고화질 카드 연출의 시간표. 총격(뱅!)과 빗나감(빗나감!) 두 가지.
 *
 * 진행도 하나(0→1)를 받아 그 순간의 모든 값을 돌려주는 워클릿이다. 카드 확대(RN)와
 * Skia 그림이 이 함수 하나를 같은 공유값으로 부르므로 서로 어긋날 수 없다.
 * Skia 를 import 하지 않으므로 Skia 를 불러오기 전에도 쓸 수 있다.
 *
 *   0–120ms     섬광이 터진다, 흔들림, 반동
 *   120–800ms   슬로모션: 카드가 총구 쪽으로 확대, 섬광이 멈춘 듯 식고, 총알이 천천히 빠져나온다
 *   800–1100ms  풀림: 확대가 풀리며 총알이 예광을 끌고 날아간다 (휘익)
 *   1100–2000ms 연기가 부풀어 흩어지고 잔불이 식는다
 */

/** 연출 종류. 공유값 안에서 쓰므로 숫자로 둔다 */
export const FX_GUNSHOT = 0;
export const FX_MISSED = 1;

/** 테이블 캔버스 좌표계에서 카드와 총구 자리. 연출이 시작될 때 한 번 재서 넣는다 */
export type ShotGeom = {
  kind: number;
  /** 카드 가운데 */
  cx: number;
  cy: number;
  /** 카드 크기 */
  cw: number;
  ch: number;
  /** 총구 */
  mx: number;
  my: number;
  /** 확대할 때 제자리에 두는 점 (카드 가운데 기준 오프셋). 빗나감은 얼굴 */
  fx: number;
  fy: number;
};

export const EMPTY_GEOM: ShotGeom = { kind: FX_GUNSHOT, cx: 0, cy: 0, cw: 1, ch: 1, mx: 0, my: 0, fx: 0, fy: 0 };

/** 1배속 전체 길이 */
export const GUNSHOT_HQ_MS = 2000;
/** 슬로모션이 풀리는 순간. 휘익 소리를 여기서 튼다 */
export const RELEASE_MS = 800;

const SLOW_FROM = 120;
const SLOW_TO = RELEASE_MS;
const RELEASE_TO = 1100;
/** 슬로모션 동안 입자 시간이 흐르는 빠르기 */
const SLOW_RATE = 0.25;

export type ShotFrame = {
  /** 입자용 시간(ms). 슬로모션 동안 느리게 흐른다 */
  warp: number;
  /** 카드·캔버스 확대 배율 */
  zoom: number;
  shakeX: number;
  shakeY: number;
  /** 반동 (왼쪽으로 px) */
  recoil: number;
  /** 섬광 세기 0~1 */
  flash: number;
  /** 섬광 크기 배율 */
  flashScale: number;
  /** 총알이 총구에서 나아간 거리 (카드 폭 비율). 음수면 아직 안 보인다 */
  bullet: number;
  /** 예광 줄기 세기 */
  tracer: number;
  /** 슬로모션 비네트 세기 */
  vignette: number;
  /** 화면 번쩍 세기 */
  screenFlash: number;
  /** 연기 짙기 */
  smoke: number;
  /** 풀림 충격파 진행 0~1 (범위 밖이면 안 보인다) */
  shock: number;
};

function clamp01(v: number) {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function seg(t: number, a: number, b: number) {
  'worklet';
  return clamp01((t - a) / (b - a));
}

function easeOut(t: number) {
  'worklet';
  return 1 - (1 - t) * (1 - t) * (1 - t);
}

function easeIn(t: number) {
  'worklet';
  return t * t * t;
}

function easeInOut(t: number) {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** 진행도(0~1) → 그 순간의 값들 */
export function shotFrame(progress: number): ShotFrame {
  'worklet';
  const T = progress * GUNSHOT_HQ_MS;

  const warp =
    T < SLOW_FROM
      ? T
      : T < SLOW_TO
        ? SLOW_FROM + (T - SLOW_FROM) * SLOW_RATE
        : SLOW_FROM + (SLOW_TO - SLOW_FROM) * SLOW_RATE + (T - SLOW_TO);

  const zoomIn = easeInOut(seg(T, SLOW_FROM, 300));
  const zoomOut = easeInOut(seg(T, SLOW_TO, 1000));
  const zoom = 1 + 0.45 * zoomIn * (1 - zoomOut);

  const shake = T < 160 ? (1 - T / 160) * 4 : 0;
  const shakeX = Math.sin(T * 0.9) * shake;
  const shakeY = Math.cos(T * 1.3) * shake;
  const recoil = T < 120 ? Math.sin((T / 120) * Math.PI) * 8 : 0;

  // 터지고 → 슬로모션 동안 멈춘 듯 천천히 식고 → 풀리며 꺼진다
  const flash =
    T < 40
      ? T / 40
      : T < SLOW_FROM
        ? 1
        : T < SLOW_TO
          ? 1 - 0.65 * seg(T, SLOW_FROM, SLOW_TO)
          : 0.35 * (1 - seg(T, SLOW_TO, 950));
  const flashScale = T < 60 ? 0.3 + 0.7 * easeOut(T / 60) : 1 + 0.12 * seg(T, 60, SLOW_TO);

  // 총알: 슬로모션 동안 0.35장 기어 나오고, 풀리면 가속해 캔버스 밖으로
  const bullet =
    T < 60
      ? -1
      : T < SLOW_TO
        ? 0.35 * seg(T, 60, SLOW_TO)
        : T < RELEASE_TO
          ? 0.35 + 3.4 * easeIn(seg(T, SLOW_TO, RELEASE_TO))
          : -1;
  const tracer = T >= SLOW_TO && T < RELEASE_TO + 80 ? 1 - seg(T, RELEASE_TO - 80, RELEASE_TO + 80) : 0;

  const vignette = seg(T, SLOW_FROM, 300) * (1 - seg(T, SLOW_TO, 1000));
  const screenFlash = T < 30 ? T / 30 : 1 - seg(T, 30, 140);
  const smoke = seg(T, 60, 500) * (1 - seg(T, 1400, GUNSHOT_HQ_MS));
  const shock = T >= SLOW_TO && T < SLOW_TO + 420 ? (T - SLOW_TO) / 420 : -1;

  return { warp, zoom, shakeX, shakeY, recoil, flash, flashScale, bullet, tracer, vignette, screenFlash, smoke, shock };
}

// ---------------------------------------------------------------------------
// 빗나감! — 슬로모션 스침
//
//   0–150ms     총알이 오른쪽에서 날아든다
//   150–1100ms  슬로모션: 얼굴 쪽으로 확대, 인물이 뒤로 젖히고, 총알이 모자를 스치며 천천히 지나간다
//   1100–1500ms 풀림: 총알이 왼쪽으로 빠져나가고(휘익), 모자가 한 바퀴 돌며 그림 속 자리로 날아간다
//   1500–2400ms 인물이 제자리로 돌아오고, 모자 구멍에서 연기가 오른다. 끝 장면은 원본 그림 그대로
// ---------------------------------------------------------------------------

export const MISSED_HQ_MS = 2400;
/** 총알이 빠져나가는 순간. 휘익 소리를 여기서 튼다 */
export const MISSED_RELEASE_MS = 1100;

export type MissFrame = {
  /** 그림 조각을 덮어 그리는 중인가 (0/1). 시작 전·끝난 뒤에는 RN 카드가 그대로 보인다 */
  active: number;
  zoom: number;
  shakeX: number;
  shakeY: number;
  /** 인물이 뒤로 젖힌 정도 0~1 */
  lean: number;
  /** 모자가 머리 위(0)에서 그림 속 자리(1)까지 간 정도 */
  hat: number;
  /** 총알 위치: 총알 길의 비율. 1.2 넘으면 안 보인다 */
  bullet: number;
  tracer: number;
  vignette: number;
  /** 모자 구멍 연기 0~1 (범위 밖이면 없다) */
  puff: number;
};

export function missFrame(progress: number): MissFrame {
  'worklet';
  const T = progress * MISSED_HQ_MS;
  const active = progress > 0 && progress < 1 ? 1 : 0;

  const bullet =
    T < 150
      ? (0.3 * T) / 150
      : T < MISSED_RELEASE_MS
        ? 0.3 + 0.22 * seg(T, 150, MISSED_RELEASE_MS)
        : T < 1350
          ? 0.52 + 0.7 * easeIn(seg(T, MISSED_RELEASE_MS, 1350))
          : 2;
  const tracer = T < 150 ? 1 : T < MISSED_RELEASE_MS ? 0.55 : 1 - seg(T, 1300, 1450);

  const zoom = 1 + 0.5 * easeInOut(seg(T, 150, 380)) * (1 - easeInOut(seg(T, MISSED_RELEASE_MS, 1320)));
  const lean = easeOut(seg(T, 250, 800)) * (1 - easeInOut(seg(T, 1400, 2100)));
  const hat =
    T < 600
      ? 0
      : T < MISSED_RELEASE_MS
        ? 0.18 * easeOut(seg(T, 600, MISSED_RELEASE_MS))
        : 0.18 + 0.82 * easeOut(seg(T, MISSED_RELEASE_MS, 1500));

  // 모자를 채 갈 때와 풀릴 때 한 번씩 움찔
  const jolt = (at: number, amp: number) => (T >= at && T < at + 200 ? (1 - (T - at) / 200) * amp : 0);
  const shake = jolt(600, 2) + jolt(MISSED_RELEASE_MS, 3);
  const shakeX = Math.sin(T * 0.9) * shake;
  const shakeY = Math.cos(T * 1.3) * shake;

  const vignette = seg(T, 150, 350) * (1 - seg(T, MISSED_RELEASE_MS, 1300));
  const puff = T >= 1450 && T < MISSED_HQ_MS ? (T - 1450) / (MISSED_HQ_MS - 1450) : -1;

  return { active, zoom, shakeX, shakeY, lean, hat, bullet, tracer, vignette, puff };
}

/** 카드(RN)와 캔버스가 함께 거는 움직임. 확대할 때 초점(fx, fy)은 제자리에 둔다 */
export function cardMotion(g: ShotGeom, progress: number): { zoom: number; tx: number; ty: number } {
  'worklet';
  if (g.kind === FX_MISSED) {
    const m = missFrame(progress);
    return { zoom: m.zoom, tx: m.shakeX - g.fx * (m.zoom - 1), ty: m.shakeY - g.fy * (m.zoom - 1) };
  }
  const f = shotFrame(progress);
  return { zoom: f.zoom, tx: f.shakeX - f.recoil - g.fx * (f.zoom - 1), ty: f.shakeY - g.fy * (f.zoom - 1) };
}
