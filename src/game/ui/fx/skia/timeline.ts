/**
 * 고화질 총격(슬로모션 + 사실풍)의 시간표.
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

/** 테이블 캔버스 좌표계에서 카드와 총구 자리. 총이 터질 때 한 번 재서 넣는다 */
export type ShotGeom = {
  /** 카드 가운데 */
  cx: number;
  cy: number;
  /** 카드 크기 */
  cw: number;
  ch: number;
  /** 총구 */
  mx: number;
  my: number;
};

export const EMPTY_GEOM: ShotGeom = { cx: 0, cy: 0, cw: 1, ch: 1, mx: 0, my: 0 };

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
