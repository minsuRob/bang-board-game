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
/** 볼캐닉: 그림 속 총이 제자리에서 연사 */
export const FX_VOLLEY = 2;
/** 스코필드: 큰 실린더가 돌며 장전 */
export const FX_CYLINDER = 3;
/** 레밍턴: 사격장 과녁 3개 */
export const FX_RANGE = 4;
/** 카빈: 원근 사격 레인 4칸 */
export const FX_LANE = 5;
/** 조준경: 렌즈 속에서 먼 사람이 당겨진다 */
export const FX_SCOPE = 6;
/** 야생마: 카드가 원근 길을 따라 멀어졌다 돌아온다 */
export const FX_MUSTANG = 7;
/** 술통: 만화 잉크로 쏙 숨고 핑 튕긴다 */
export const FX_BARREL = 8;
/** 기관총: 총구 연사가 모든 자리를 쓸어 간다 */
export const FX_GATLING = 9;
/** 인디언!: 외치는 입에서 함성 물결이 판 전체로 */
export const FX_INDIANS = 10;

/**
 * 카드 그림이 카드 가장자리에서 들어간 거리. CardView 의 테두리 2 + 여백 4
 * (artCard 의 padding: 0 은 card 의 paddingHorizontal·Vertical 을 덮지 못한다)
 */
export const ART_INSET = 6;
/** 원본 그림(250×389) 1px 이 카드 위에서 몇 px 인지 (테두리 안쪽에 cover 로 깔린다) */
export function artScale(cw: number, ch: number) {
  'worklet';
  return Math.max((cw - ART_INSET * 2) / 250, (ch - ART_INSET * 2) / 389);
}
/** 원본 그림 좌표 → 카드 가운데 기준 오프셋 */
export function artOffset(cw: number, ch: number, x: number, y: number) {
  'worklet';
  const k = artScale(cw, ch);
  return { x: (x - 125) * k, y: (y - 194.5) * k };
}
/** 윈체스터: 야간 녹색 망원 조준경. 다른 연출 번호와 겹치지 않게 뒤쪽 번호를 쓴다 */
export const FX_WINCHESTER = 20;

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
  /** 총구가 겨누는 방향(라디안, 오른쪽 0). 볼캐닉·레밍턴 */
  dir: number;
  /** 그림 속 실린더 반지름. 스코필드 */
  r: number;
  /** 그림 속 두 번째 자리. 기관총 탄피가 튀는 곳, 인디언 깃털 */
  bx: number;
  by: number;
};

export const EMPTY_GEOM: ShotGeom = { kind: FX_GUNSHOT, cx: 0, cy: 0, cw: 1, ch: 1, mx: 0, my: 0, fx: 0, fy: 0, dir: 0, r: 0, bx: 0, by: 0 };

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

function easeBack(t: number) {
  'worklet';
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

/** 그 시각에 막 시작한 일이면 1 에서 0 으로 줄어드는 값 (반동·딸깍용) */
function kick(T: number, at: number, ms: number) {
  'worklet';
  return T >= at && T < at + ms ? 1 - (T - at) / ms : 0;
}

// ---------------------------------------------------------------------------
// 볼캐닉 — 연사 스트로브 (docs/card-fx-prototypes/volcanic.html A)
//
//   120–750ms   그림 속 총구에서 7번, 점점 빠르게 불을 뿜는다. 쏠 때마다 카드가 뒤로 들썩
//               옆 카운터가 "뱅! ×1 … ×7" 로 올라간다
//   900–1050ms  ×7 이 ∞ 로 바뀐다 (뱅! 무제한)
//   930–1500ms  카드 아래 가까운 고리 한 겹 (사정거리 1)
// ---------------------------------------------------------------------------

export const VOLLEY_HQ_MS = 1500;
/** 발사 시각. 소리도 이 표로 튼다 */
export const VOLLEY_SHOTS_MS = [120, 255, 375, 480, 570, 660, 750] as const;
const VOLLEY_FLASH_MS = 90;
const VOLLEY_KICK_MS = 105;

export type VolleyFrame = {
  /** 지금 터지는 섬광 번호 (-1 이면 없음)와 그 섬광의 진행 0~1 */
  shot: number;
  k: number;
  /** 반동 0~1 */
  rec: number;
  /** 지금까지 쏜 수 */
  count: number;
  /** ×7 → ∞ 로 바뀐 정도 */
  inf: number;
  /** 카운터 투명도 */
  counter: number;
  /** 사정거리 고리 진행 0~1 (범위 밖이면 안 보인다) */
  ring: number;
};

export function volleyFrame(progress: number): VolleyFrame {
  'worklet';
  const T = progress * VOLLEY_HQ_MS;
  let shot = -1;
  let k = 0;
  let rec = 0;
  let count = 0;
  for (let i = 0; i < VOLLEY_SHOTS_MS.length; i++) {
    const s = VOLLEY_SHOTS_MS[i];
    if (T >= s) count++;
    if (T >= s && T < s + VOLLEY_FLASH_MS) {
      shot = i;
      k = (T - s) / VOLLEY_FLASH_MS;
    }
    rec = Math.max(rec, kick(T, s, VOLLEY_KICK_MS));
  }
  const live = progress > 0 && progress < 1;
  const inf = seg(T, 900, 1050);
  const counter = live && count > 0 ? 1 - seg(T, 1290, VOLLEY_HQ_MS) : 0;
  const ring = live && T > 930 ? seg(T, 930, VOLLEY_HQ_MS) : -1;
  return { shot, k, rec, count, inf, counter, ring };
}

// ---------------------------------------------------------------------------
// 스코필드 — 3D 실린더 회전 (docs/card-fx-prototypes/schofield.html B)
//
//   0–270ms     카드 오른쪽에 큰 실린더가 옆면부터 돌아 정면을 보인다
//   340–1020ms  딸깍딸깍 여섯 칸 돌며 약실마다 탄이 찬다
//   1020–1190ms 금속 반사가 한 번 쓸고 간다
//   1160–1560ms 작아지며 그림 속 실린더 자리로 빨려 들고, 철컥 닫히며 카드가 움찔
// ---------------------------------------------------------------------------

export const CYLINDER_HQ_MS = 1700;
/** 딸깍 시각 (여섯 칸) */
export const CYLINDER_CLICKS_MS = [340, 459, 578, 697, 816, 935] as const;
/** 그림 속 자리로 들어가 닫히는 시각 */
export const CYLINDER_LATCH_MS = 1564;

export type CylinderFrame = {
  /** 그리는 중인가 */
  active: number;
  /** 정면을 향한 정도 (가로 축척) */
  turn: number;
  /** 그림 속 자리로 돌아간 정도 0~1 */
  back: number;
  /** 돈 칸 수 (소수 = 도는 중) */
  steps: number;
  /** 정지판 딸깍 불꽃 0~1 */
  click: number;
  /** 금속 반사 진행 (범위 밖이면 안 보인다) */
  shine: number;
  /** 닫히며 움찔 */
  latch: number;
};

export function cylinderFrame(progress: number): CylinderFrame {
  'worklet';
  const T = progress * CYLINDER_HQ_MS;
  const app = easeOut(seg(T, 0, 272));
  const back = easeInOut(seg(T, 1156, CYLINDER_LATCH_MS));
  let steps = 0;
  let click = 0;
  for (let i = 0; i < CYLINDER_CLICKS_MS.length; i++) {
    const a = CYLINDER_CLICKS_MS[i];
    const k = seg(T, a, a + 85);
    steps += easeBack(k);
    if (k > 0 && k < 1) click = 1 - k;
  }
  const turn = (0.12 + 0.88 * app) * (1 - 0.7 * back);
  const active = progress > 0 && T < CYLINDER_LATCH_MS ? 1 : 0;
  const shine = T > 1020 && T < 1190 ? seg(T, 1020, 1190) : -1;
  const latch = kick(T, CYLINDER_LATCH_MS, 130);
  return { active, turn, back, steps, click, shine, latch };
}

// ---------------------------------------------------------------------------
// 레밍턴 — 사격장 과녁 3개 (docs/card-fx-prototypes/remington.html C)
//
//   80–680ms    카드 오른쪽 원근 사격장에 과녁 5개가 차례로 일어선다
//   580–1340ms  총구에서 예광선이 1·2·3번을 차례로 맞혀 넘어뜨린다. 4·5번은 흐린 점선
//   1680–2000ms 사격장이 사라진다
// ---------------------------------------------------------------------------

export const RANGE_HQ_MS = 2000;
/** 맞는 시각. 예광선은 100ms 앞서 출발한다 */
export const RANGE_HITS_MS = [680, 960, 1240] as const;
/** 과녁 자리: 카드 오른쪽 모서리에서 (카드 폭 비율), 카드 위에서 (카드 높이 비율), 크기 */
export const RANGE_TARGETS = [
  { x: 30 / 92, y: 133 / 132, s: 1 },
  { x: 56 / 92, y: 101 / 132, s: 0.78 },
  { x: 75 / 92, y: 77 / 132, s: 0.6 },
  { x: 89 / 92, y: 59 / 132, s: 0.46 },
  { x: 99 / 92, y: 46 / 132, s: 0.36 },
] as const;

export type RangeFrame = {
  /** 사격장 전체 투명도 */
  fade: number;
  /** 과녁마다 일어선 정도 (넘어지면 줄어든다) */
  up: number[];
  /** 과녁마다 맞은 정도 0~1 */
  hit: number[];
  /** 예광선마다 진행 0~1 (범위 밖이면 안 보인다) */
  tracer: number[];
  /** 반동 */
  rec: number;
};

export function rangeFrame(progress: number): RangeFrame {
  'worklet';
  const T = progress * RANGE_HQ_MS;
  const live = progress > 0 && progress < 1;
  const fade = live ? 1 - seg(T, 1680, RANGE_HQ_MS) : 0;
  const up: number[] = [];
  const hit: number[] = [];
  const tracer: number[] = [];
  let rec = 0;
  for (let i = 0; i < RANGE_TARGETS.length; i++) {
    const h = i < RANGE_HITS_MS.length ? seg(T, RANGE_HITS_MS[i], RANGE_HITS_MS[i] + 160) : 0;
    up.push(easeBack(seg(T, 80 + i * 80, 360 + i * 80)) * (1 - 0.75 * easeOut(h)));
    hit.push(h);
  }
  for (let i = 0; i < RANGE_HITS_MS.length; i++) {
    const a = RANGE_HITS_MS[i] - 100;
    tracer.push(T > a && T < a + 200 ? (T - a) / 200 : -1);
    rec = Math.max(rec, kick(T, a, 120));
  }
  return { fade, up, hit, tracer, rec };
}

// ---------------------------------------------------------------------------
// 카빈 — 원근 사격 레인 (docs/card-fx-prototypes/carabine.html B)
//
//   0–220ms     카드 아래로 소실점까지 이어지는 바닥이 깔리고, 카드가 뒤로 기대 선다
//   360–1080ms  가까운 칸부터 1·2·3·4 띠에 차례로 불이 들어온다. 5칸째부터는 어둡다
//   1400–1800ms 바닥이 사라지고 카드가 다시 선다
// ---------------------------------------------------------------------------

export const LANE_HQ_MS = 1800;
/** 띠에 불이 들어오는 시각 */
export const LANE_STEPS_MS = [360, 540, 720, 900] as const;
/** 바닥 띠 수 (불이 드는 것은 앞의 4칸) */
export const LANE_BANDS = 6;
/** 카드가 뒤로 기대는 최대 각도(라디안) */
export const LANE_LEAN = 0.28;

/**
 * 레인 바닥 모양. 카드 가운데 기준 좌표.
 * z 는 깊이(1 = 가장 앞), s 는 왼쪽(-1)·오른쪽(1)
 */
export function laneY(z: number, ch: number) {
  'worklet';
  const vy = -0.75 * ch;
  const by = 0.795 * ch;
  return vy + (by - vy) / z;
}
export function laneX(z: number, s: number, cw: number) {
  'worklet';
  return (s * 1.05 * cw) / z;
}
/** i 번째 띠의 앞뒤 깊이 */
export function laneZ(i: number) {
  'worklet';
  return [1 + i * 0.75, 1 + (i + 1) * 0.75] as const;
}

export type LaneFrame = {
  /** 바닥 투명도 */
  floor: number;
  /** 카드가 기댄 각도 */
  lean: number;
  /** 띠마다 불 들어온 정도 */
  band: number[];
};

export function laneFrame(progress: number): LaneFrame {
  'worklet';
  const T = progress * LANE_HQ_MS;
  const live = progress > 0 && progress < 1;
  const floor = live ? seg(T, 0, 216) * (1 - seg(T, 1476, LANE_HQ_MS)) : 0;
  const lean = live ? LANE_LEAN * easeOut(seg(T, 0, 360)) * (1 - easeInOut(seg(T, 1404, 1710))) : 0;
  const band: number[] = [];
  for (let i = 0; i < LANE_STEPS_MS.length; i++) band.push(seg(T, LANE_STEPS_MS[i], LANE_STEPS_MS[i] + 180));
  return { floor, lean, band };
}

// ---------------------------------------------------------------------------
// 윈체스터 — 야간 녹색 망원 조준경 (docs/card-fx-prototypes/winchester.html B3)
//
//   0–440ms     그림 속 총구에서 동그란 조준경이 커지며 카드 위로 온다. 바깥은 어두워지고
//               렌즈 안은 짙은 녹색, 카드가 1.4배로 비친다
//   480–1100ms  흔들리던 렌즈 안에 눈금 1~5 가 아래로 차례로 켜진다 (연두 발광)
//   1160–1320ms 눈금 5 에 붉은 점이 "틱" 고정되고 "사정거리 5"
//   1440–1920ms 렌즈가 활짝 열리며 사라진다
// ---------------------------------------------------------------------------

export const WINCHESTER_HQ_MS = 2000;
/** 붉은 점이 고정되는 시각 (틱) */
export const WINCHESTER_LOCK_MS = 1160;
export const WINCHESTER_TICKS = 5;

export type WinchesterFrame = {
  active: number;
  /** 커진 정도, 열린 정도 */
  grow: number;
  open: number;
  /** 눈금마다 켜진 정도 */
  tick: number[];
  /** 붉은 점 고정 진행 0~1 */
  lock: number;
  /** 렌즈 안 카드 확대 배율 */
  zoom: number;
};

export function winchesterFrame(progress: number): WinchesterFrame {
  'worklet';
  const T = progress * WINCHESTER_HQ_MS;
  const grow = easeOut(seg(T, 0, 440));
  const open = easeIn(seg(T, 1440, 1920));
  const tick: number[] = [];
  for (let i = 1; i <= WINCHESTER_TICKS; i++) tick.push(seg(T, 480 + i * 100, 600 + i * 100));
  const active = progress > 0 && T < 1920 ? 1 : 0;
  return { active, grow, open, tick, lock: seg(T, WINCHESTER_LOCK_MS, 1320), zoom: 1 + 0.4 * grow * (1 - open) };
}

/** 렌즈 가운데와 반지름 (캔버스 좌표). 캔버스 그림과 RN 숫자가 같이 쓴다 */
export function winchesterLens(g: ShotGeom, progress: number) {
  'worklet';
  const f = winchesterFrame(progress);
  const u = g.cw / 92;
  const T = progress * WINCHESTER_HQ_MS;
  const sway = (1 - seg(T, 1100, 1240)) * f.grow;
  const tx = g.cx;
  const ty = g.cy - (5 / 132) * g.ch;
  const x = g.mx + (tx - g.mx) * f.grow + Math.sin(progress * 17) * 3 * u * sway;
  const y = g.my + (ty - g.my) * f.grow + Math.cos(progress * 13) * 2 * u * sway;
  const R = (4 + 58 * f.grow + f.open * 220) * u;
  return { x, y, R, u };
}

// ---------------------------------------------------------------------------
// 조준경 — 렌즈 속 당겨 보기 (docs/card-fx-prototypes/scope.html A)
//
//   160–400ms   그림 속 대물렌즈가 반짝
//   240–680ms   화면이 어두워지며 렌즈에서 둥근 시야가 커져 카드 오른쪽 위로 나온다
//   720–1360ms  지평선의 먼 사람이 조준선 안으로 당겨져 커진다. "거리 3" → "거리 2"
//   1480–1840ms 시야가 렌즈로 접혀 들어가고, 카드 둘레에 금빛 고리가 한 번 퍼진다
// ---------------------------------------------------------------------------

export const SCOPE_HQ_MS = 2000;
/** 시야가 다 열렸을 때 가운데 (카드 가운데 기준, 시안 카드 폭 92 단위)와 반지름 */
export const SCOPE_VIEW = { x: 18, y: -5, r: 70 } as const;

export type ScopeFrame = {
  /** 시야가 열린 정도 0~1 */
  open: number;
  /** 먼 사람이 당겨진 정도 0~1 */
  zoom: number;
  /** 렌즈 반짝 0~1 */
  glint: number;
  /** 끝 고리 진행 (범위 밖이면 안 보인다) */
  settle: number;
};

export function scopeFrame(progress: number): ScopeFrame {
  'worklet';
  const T = progress * SCOPE_HQ_MS;
  const live = progress > 0 && progress < 1;
  const open = live ? easeOut(seg(T, 240, 680)) * (1 - easeIn(seg(T, 1480, 1840))) : 0;
  const zoom = easeInOut(seg(T, 720, 1360));
  const glint = live && T > 160 && T < 400 ? Math.sin(seg(T, 160, 400) * Math.PI) : 0;
  const settle = live && T > 1720 ? seg(T, 1720, SCOPE_HQ_MS) : -1;
  return { open, zoom, glint, settle };
}

/** 시야 가운데와 반지름 (캔버스 좌표). 렌즈(mx, my)에서 SCOPE_VIEW 로 나온다 */
export function scopeView(g: ShotGeom, open: number) {
  'worklet';
  const u = g.cw / 92;
  return {
    x: g.mx + (g.cx + SCOPE_VIEW.x * u - g.mx) * open,
    y: g.my + (g.cy + SCOPE_VIEW.y * u - g.my) * open,
    r: SCOPE_VIEW.r * u * open,
  };
}

// ---------------------------------------------------------------------------
// 야생마 — 3D 멀어졌다 돌아오기 (docs/card-fx-prototypes/mustang.html B)
//
//   100–840ms   카드가 들려 원근 길을 따라 지평선 쪽으로 작아지며 멀어진다. 길에 말발굽 자국
//               제자리에는 점선 카드 자리, 아래에 "거리 +1"
//   1160–1720ms 돌아온다
//   1720–2000ms 쿵 착지: 양옆 흙먼지와 금빛 고리
// ---------------------------------------------------------------------------

export const MUSTANG_HQ_MS = 2000;

export type MustangFrame = {
  /** 멀어진 정도 0~1 */
  away: number;
  /** 길·발굽 자국 짙기 */
  road: number;
  /** 착지 진행 (범위 밖이면 안 보인다) */
  land: number;
  /** 카드 배율·들림 (시안 단위) */
  scale: number;
  rise: number;
};

export function mustangFrame(progress: number): MustangFrame {
  'worklet';
  const T = progress * MUSTANG_HQ_MS;
  const live = progress > 0 && progress < 1;
  const away = live ? easeInOut(seg(T, 100, 840)) * (1 - easeIn(seg(T, 1160, 1720))) : 0;
  const road = Math.min(1, away * 3);
  const land = live && T > 1720 ? seg(T, 1720, MUSTANG_HQ_MS) : -1;
  const lift = live ? 12 * Math.sin(Math.PI * seg(T, 0, 1800)) : 0;
  const bob = live ? Math.abs(Math.sin(T * 0.015)) * 3 * Math.sin(Math.PI * seg(T, 100, 1720)) : 0;
  const scale = 1 - 0.5 * away;
  const rise = 44 * away + lift * scale + bob;
  return { away, road, land, scale, rise };
}

// ---------------------------------------------------------------------------
// 술통 — 만화 잉크 쏙·핑! (docs/card-fx-prototypes/barrel.html C)
//
//   90–450ms    카드가 찌부러졌다 늘어나며 그림 속 사내가 통 뒤로 쏙 숨는다 ("쏙!")
//   420–750ms   잉크 지그재그 총알이 오른쪽에서 날아와 통 옆구리에 맞는다
//   750–1050ms  "핑!" 별 모양으로 튕겨 나간다
//   930–1380ms  카드 왼쪽에 잉크 하트가 톡 터진다
//   1050–1275ms 사내가 다시 고개를 내민다
// ---------------------------------------------------------------------------

export const BARREL_HQ_MS = 1500;
/** 총알이 통에 맞는 때 */
export const BARREL_HIT_MS = 750;

export type BarrelFrame = {
  active: number;
  /** 카드 찌부러짐 (+ 면 넓고 낮다) */
  squash: number;
  /** 사내가 내려간 거리 (원본 그림 px) */
  duck: number;
  /** "쏙!" 진행 (범위 밖이면 안 보인다) */
  sok: number;
  /** 날아오는 총알 진행 */
  bullet: number;
  /** 튕겨 나가는 진행 */
  ping: number;
  /** 하트 진행 */
  heart: number;
};

export function barrelFrame(progress: number): BarrelFrame {
  'worklet';
  const T = progress * BARREL_HQ_MS;
  const live = progress > 0 && progress < 1;
  const sq = seg(T, 90, 450);
  const squash = live ? Math.sin(sq * Math.PI * 2) * (1 - sq) * 0.12 : 0;
  const duck = live ? 46 * easeOut(seg(T, 90, 240)) * (1 - easeOut(seg(T, 1050, 1275))) : 0;
  const open = (a: number, b: number) => (live && T > a && T < b ? seg(T, a, b) : -1);
  return {
    active: live ? 1 : 0,
    squash,
    duck,
    sok: open(150, 480),
    bullet: open(420, BARREL_HIT_MS),
    ping: open(BARREL_HIT_MS, 1050),
    heart: open(930, 1380),
  };
}

// ---------------------------------------------------------------------------
// 기관총 — 쓸어 가는 연사 (docs/card-fx-prototypes/gatling.html A)
//
//   0–180ms     판 둘레에 다른 사람 자리 여섯 개가 뜬다
//   144–1296ms  총열이 돌며 섬광이 깜빡이고, 예광탄 30발이 왼쪽 위 자리부터 오른쪽 아래 자리까지
//               부채꼴로 쓸어 간다. 맞은 자리는 붉게. 탄피가 튀어 카드 아래 바닥에 튄다
//   1530–1800ms 자리가 사라진다
// ---------------------------------------------------------------------------

export const GATLING_HQ_MS = 1800;
export const GATLING_FIRE = [144, 1296] as const;
export const GATLING_SHOTS = 30;
/** 다른 사람 자리 (판 가운데를 둘러싼 타원 위 각도, 도). 아래(90°)는 나라서 비운다 */
export const SEAT_DEG = [130, 186, 242, 298, 354, 410] as const;
/** 자리 타원 반지름 (시안 카드 폭 92 단위) */
export const SEAT_RX = 132;
export const SEAT_RY = 88;

export function seatAt(g: ShotGeom, deg: number) {
  'worklet';
  const u = g.cw / 92;
  const a = (deg * Math.PI) / 180;
  return { x: g.cx + Math.cos(a) * SEAT_RX * u, y: g.cy + Math.sin(a) * SEAT_RY * u };
}

/** 쏘는 방향: 0~1 → 자리 각도 */
export function gatlingSweep(k: number) {
  'worklet';
  return SEAT_DEG[0] - 12 + (SEAT_DEG[5] + 12 - SEAT_DEG[0] + 12) * k;
}

export type GatlingFrame = {
  T: number;
  /** 연사 진행 (범위 밖이면 안 쏜다) */
  fire: number;
  /** 자리 투명도 */
  seats: number;
  /** 자리마다 맞은 세기 */
  hit: number[];
};

export function gatlingFrame(progress: number): GatlingFrame {
  'worklet';
  const T = progress * GATLING_HQ_MS;
  const live = progress > 0 && progress < 1;
  const k = seg(T, GATLING_FIRE[0], GATLING_FIRE[1]);
  const fire = live && k > 0 && k < 1 ? k : -1;
  const seats = live ? Math.min(seg(T, 0, 180), 1 - seg(T, 1530, GATLING_HQ_MS)) : 0;
  const hit: number[] = [];
  for (let i = 0; i < SEAT_DEG.length; i++) {
    const a = (0.08 + ((SEAT_DEG[i] - SEAT_DEG[0] + 12) / 304) * 0.64 + 0.04) * GATLING_HQ_MS;
    const h = seg(T, a, 0.95 * GATLING_HQ_MS);
    hit.push(live && h > 0 && h < 1 ? 1 - h : 0);
  }
  return { T, fire, seats, hit };
}

// ---------------------------------------------------------------------------
// 인디언! — 함성 물결 (docs/card-fx-prototypes/indians.html A)
//
//   108·504·900ms  외치는 입이 크게 벌어지고(둥), 붉은 소리 고리 세 겹이 판 전체로 번진다
//                  고리가 닿는 자리마다 들썩인다. 깃털이 흩날린다
//   1530–1800ms    자리가 사라진다
// ---------------------------------------------------------------------------

export const INDIANS_HQ_MS = 1800;
export const INDIANS_BEATS_MS = [108, 504, 900] as const;
/** 고리 한 겹이 퍼지는 시간과 겹 사이 */
export const INDIANS_RING_MS = 684;
export const INDIANS_RING_GAP_MS = 63;
/** 고리가 퍼지는 최대 반지름 (시안 단위) */
export const INDIANS_RING_R = 175;

export type IndiansFrame = {
  T: number;
  /** 입 벌린 정도 0~1 */
  mouth: number;
  /** 화면 흔들림 세기 */
  shake: number;
  seats: number;
};

export function indiansFrame(progress: number): IndiansFrame {
  'worklet';
  const T = progress * INDIANS_HQ_MS;
  const live = progress > 0 && progress < 1;
  let mouth = 0;
  let shake = 0;
  for (let i = 0; i < INDIANS_BEATS_MS.length; i++) {
    const b = INDIANS_BEATS_MS[i];
    mouth = Math.max(mouth, Math.sin(seg(T, b - 72, b + 252) * Math.PI));
    shake = Math.max(shake, kick(T, b, 108) * 2);
  }
  const seats = live ? Math.min(seg(T, 0, 144), 1 - seg(T, 1530, INDIANS_HQ_MS)) : 0;
  return { T, mouth: live ? mouth : 0, shake: live ? shake : 0, seats };
}

/** 함성 고리 (박자 b, 겹 j) 진행 0~1. 범위 밖이면 -1 */
export function indiansRing(T: number, b: number, j: number) {
  'worklet';
  const a = INDIANS_BEATS_MS[b] + j * INDIANS_RING_GAP_MS;
  return T > a && T < a + INDIANS_RING_MS ? (T - a) / INDIANS_RING_MS : -1;
}

/** 카드(RN)와 캔버스가 함께 거는 움직임. 확대할 때 초점(fx, fy)은 제자리에 둔다. tilt 는 카드만 (뒤로 기대기) */
export type CardMotion = { zoom: number; sx: number; sy: number; tx: number; ty: number; tilt: number };

export function cardMotion(g: ShotGeom, progress: number): CardMotion {
  'worklet';
  if (g.kind === FX_MISSED) {
    const m = missFrame(progress);
    return { zoom: m.zoom, sx: 1, sy: 1, tx: m.shakeX - g.fx * (m.zoom - 1), ty: m.shakeY - g.fy * (m.zoom - 1), tilt: 0 };
  }
  if (g.kind === FX_VOLLEY || g.kind === FX_RANGE) {
    const rec = g.kind === FX_VOLLEY ? volleyFrame(progress).rec : rangeFrame(progress).rec * 0.8;
    const amp = (g.cw / 140) * 4 * rec;
    const T = progress * 1000;
    return {
      zoom: 1 + 0.02 * rec,
      sx: 1,
      sy: 1,
      tx: -Math.cos(g.dir) * amp + Math.sin(T * 0.9) * rec * 0.8,
      ty: -Math.sin(g.dir) * amp + Math.cos(T * 1.3) * rec * 0.8,
      tilt: 0,
    };
  }
  if (g.kind === FX_CYLINDER) {
    const l = cylinderFrame(progress).latch;
    return { zoom: 1 + 0.03 * l, sx: 1, sy: 1, tx: 0, ty: 2 * l, tilt: 0 };
  }
  if (g.kind === FX_LANE) {
    return { zoom: 1, sx: 1, sy: 1, tx: 0, ty: 0, tilt: laneFrame(progress).lean };
  }
  if (g.kind === FX_SCOPE) {
    return { zoom: 1, sx: 1, sy: 1, tx: 0, ty: 0, tilt: 0 };
  }
  if (g.kind === FX_MUSTANG) {
    const m = mustangFrame(progress);
    return { zoom: m.scale, sx: 1, sy: 1 - 0.15 * m.away, tx: 0, ty: -m.rise * (g.cw / 92), tilt: 0 };
  }
  if (g.kind === FX_BARREL) {
    // 아래 모서리를 붙인 채 찌부러진다
    const q = barrelFrame(progress).squash;
    return { zoom: 1, sx: 1 + q, sy: 1 - q, tx: 0, ty: (g.ch / 2) * q, tilt: 0 };
  }
  if (g.kind === FX_GATLING || g.kind === FX_INDIANS) {
    const T = progress * 1800;
    const amp =
      (g.cw / 92) *
      (g.kind === FX_GATLING ? (gatlingFrame(progress).fire >= 0 ? 1.4 : 0) : indiansFrame(progress).shake);
    return { zoom: 1, sx: 1, sy: 1, tx: Math.sin(T * 0.167) * amp, ty: Math.cos(T * 0.144) * amp, tilt: 0 };
  }
  const f = shotFrame(progress);
  return {
    zoom: f.zoom,
    sx: 1,
    sy: 1,
    tx: f.shakeX - f.recoil - g.fx * (f.zoom - 1),
    ty: f.shakeY - g.fy * (f.zoom - 1),
    tilt: 0,
  };
}

/** 지금 카드가 놓인 사각형 (캔버스 좌표). 카드를 가리지 않게 도려낼 때 쓴다 */
export function cardRectNow(g: ShotGeom, progress: number) {
  'worklet';
  const c = cardMotion(g, progress);
  const w = g.cw * c.zoom * c.sx;
  const h = g.ch * c.zoom * c.sy;
  return { x: g.cx + c.tx - w / 2, y: g.cy + c.ty - h / 2, width: w, height: h };
}

/** 원근 거리 (RN transform perspective 와 캔버스 레인 가림 모양이 같은 값을 쓴다) */
export const TILT_PERSPECTIVE = 600;
