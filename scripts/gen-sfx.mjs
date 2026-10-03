/**
 * 효과음 합성기. 녹음 파일 없이 코드로 소리를 만든다.
 *
 * 우리가 만든 소리라 저작권 걱정 없이 저장소에 넣을 수 있다.
 * 시드를 고정했으므로 다시 돌려도 같은 파일이 나온다.
 *
 *   npm run gen:sfx
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sfx');

/** mulberry32. 결과를 늘 같게 */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 한 극 저역 통과. cutoff Hz */
function lowpass(input, cutoff) {
  const out = new Float32Array(input.length);
  const k = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE);
  let y = 0;
  for (let i = 0; i < input.length; i++) {
    y += k * (input[i] - y);
    out[i] = y;
  }
  return out;
}

function highpass(input, cutoff) {
  const low = lowpass(input, cutoff);
  return input.map((v, i) => v - low[i]);
}

/**
 * 총성 한 발.
 * ① 날카로운 딱(고역 노이즈) ② 몸통(저역 노이즈) ③ 낮은 쿵(떨어지는 사인) ④ 짧은 잔향 꼬리
 */
function gunshot() {
  const seconds = 0.9;
  const n = Math.floor(RATE * seconds);
  const rand = rng(0xba46);
  const noise = Float32Array.from({ length: n }, () => rand() * 2 - 1);

  const crack = highpass(noise, 2500);
  const body = lowpass(noise, 900);
  const tail = lowpass(noise, 1600);
  const out = new Float32Array(n);

  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    // 첫 1ms 는 아주 짧게 올려 딸깍거리는 잡음을 막는다
    const attack = Math.min(1, t / 0.001);
    const crackEnv = Math.exp(-t / 0.008);
    const bodyEnv = Math.exp(-t / 0.07);
    const thumpEnv = Math.exp(-t / 0.14);
    // 잔향은 조금 늦게 부풀었다가 길게 사라진다
    const tailEnv = (1 - Math.exp(-t / 0.02)) * Math.exp(-t / 0.28);

    const freq = 40 + 30 * Math.exp(-t / 0.05);
    phase += (2 * Math.PI * freq) / RATE;

    out[i] =
      attack *
      (1.1 * crack[i] * crackEnv + 2.2 * body[i] * bodyEnv + 0.9 * Math.sin(phase) * thumpEnv + 0.9 * tail[i] * tailEnv);
  }

  // 부드럽게 눌러 찢어지지 않게 하고, 최대치를 맞춘다
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * 1.6);
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const gain = 0.92 / peak;
  // 끝 30ms 를 서서히 줄여 잘리는 소리를 막는다
  const fade = Math.floor(RATE * 0.03);
  for (let i = 0; i < n; i++) {
    const f = i > n - fade ? (n - i) / fade : 1;
    out[i] *= gain * f;
  }
  return out;
}

/**
 * 총알이 스쳐 가는 휘익.
 * 좁은 대역 노이즈의 중심 음이 높은 데서 낮은 데로 미끄러지고(도플러), 커졌다가 멀어진다.
 */
function bulletWhiz() {
  const seconds = 0.4;
  const n = Math.floor(RATE * seconds);
  const rand = rng(0x5ee7);
  const out = new Float32Array(n);
  // 상태 변수 필터 (대역 통과)
  let low = 0;
  let band = 0;
  const q = 0.12;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const k = t / seconds;
    const center = 3400 * Math.pow(900 / 3400, k);
    const f = 2 * Math.sin((Math.PI * center) / RATE);
    const x = rand() * 2 - 1;
    const high = x - low - q * band;
    band += f * high;
    low += f * band;
    // 스쳐 가는 순간(35%)에 가장 크다
    const env = Math.pow(Math.sin(Math.PI * Math.min(1, k / 0.7)), 2) * (k < 0.35 ? 0.6 + k : 1 - (k - 0.35) * 1.1);
    out[i] = band * Math.max(0, env);
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const gain = 0.7 / peak;
  const fade = Math.floor(RATE * 0.02);
  for (let i = 0; i < n; i++) out[i] *= gain * (i > n - fade ? (n - i) / fade : 1);
  return out;
}

/**
 * 카드가 손에 들어오는 '사락'.
 * 종이가 스치는 고역 잡음이 빠르게 커졌다 사라지고, 끝에 카드가 손에 닿는 작은 '탁'이 붙는다.
 */
function cardDraw() {
  const seconds = 0.12;
  const n = Math.floor(RATE * seconds);
  const rand = rng(0xca7d);
  const noise = new Float32Array(n);
  for (let i = 0; i < n; i++) noise[i] = rand() * 2 - 1;
  const swish = highpass(lowpass(noise, 7000), 1800);
  const thump = lowpass(noise, 900);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    // 4ms 만에 올라 70ms 동안 잦아든다
    const env = Math.min(1, t / 0.004) * Math.exp(-t / 0.028);
    // 닿는 소리는 80ms 쯤
    const tap = t > 0.075 ? Math.exp(-(t - 0.075) / 0.008) * 2.2 : 0;
    out[i] = swish[i] * env + thump[i] * tap;
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const gain = 0.55 / peak;
  const fade = Math.floor(RATE * 0.01);
  for (let i = 0; i < n; i++) out[i] *= gain * (i > n - fade ? (n - i) / fade : 1);
  return out;
}

/** 최대치를 맞추고 끝을 서서히 줄인다 */
function finish(out, peakTo, fadeSec) {
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const gain = peakTo / peak;
  const n = out.length;
  const fade = Math.floor(RATE * fadeSec);
  for (let i = 0; i < n; i++) out[i] *= gain * (i > n - fade ? (n - i) / fade : 1);
  return out;
}

/**
 * 연사용 마른 총성 (볼캐닉·레밍턴). gunshot 보다 짧고 꼬리가 없어 70~130ms 간격으로 겹쳐도 뭉개지지 않는다.
 */
function rapidShot() {
  const n = Math.floor(RATE * 0.26);
  const rand = rng(0x5a0d);
  const noise = Float32Array.from({ length: n }, () => rand() * 2 - 1);
  const crack = highpass(noise, 3000);
  const body = lowpass(noise, 1300);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.0008);
    const freq = 55 + 40 * Math.exp(-t / 0.03);
    phase += (2 * Math.PI * freq) / RATE;
    out[i] =
      attack *
      (1.3 * crack[i] * Math.exp(-t / 0.006) + 2.0 * body[i] * Math.exp(-t / 0.03) + 0.7 * Math.sin(phase) * Math.exp(-t / 0.05));
  }
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * 1.8);
  return finish(out, 0.8, 0.03);
}

/** 실린더가 한 칸 도는 작은 딸깍 (스코필드·카빈) */
function cylinderClick() {
  const n = Math.floor(RATE * 0.06);
  const rand = rng(0xc1c4);
  const noise = Float32Array.from({ length: n }, () => rand() * 2 - 1);
  const tick = highpass(noise, 3200);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    out[i] = tick[i] * Math.exp(-t / 0.003) + 0.5 * Math.sin(2 * Math.PI * 2300 * t) * Math.exp(-t / 0.008);
  }
  return finish(out, 0.5, 0.01);
}

/** 총을 닫는 철컥. 가벼운 딸깍 뒤에 묵직한 쇳소리 */
function gunLatch() {
  const n = Math.floor(RATE * 0.22);
  const rand = rng(0x1a7c);
  const noise = Float32Array.from({ length: n }, () => rand() * 2 - 1);
  const hi = highpass(noise, 2500);
  const lo = lowpass(noise, 1400);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const t2 = t - 0.045;
    const second = t2 > 0 ? hi[i] * 1.2 * Math.exp(-t2 / 0.006) + lo[i] * 2.4 * Math.exp(-t2 / 0.025) + 0.4 * Math.sin(2 * Math.PI * 1150 * t2) * Math.exp(-t2 / 0.04) : 0;
    out[i] = 0.6 * hi[i] * Math.exp(-t / 0.004) + second;
  }
  return finish(out, 0.7, 0.02);
}

/** 쇠 과녁에 맞는 땡. 배음이 어긋난 사인 몇 개가 서로 다르게 잦아든다 */
function targetDing() {
  const n = Math.floor(RATE * 0.6);
  const rand = rng(0xd149);
  const out = new Float32Array(n);
  const partials = [
    [1180, 0.16, 1],
    [1790, 0.1, 0.55],
    [2610, 0.06, 0.4],
    [3420, 0.035, 0.25],
  ];
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let v = (rand() * 2 - 1) * 0.5 * Math.exp(-t / 0.002);
    for (const [f, d, a] of partials) v += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / d);
    out[i] = v * Math.min(1, t / 0.0005);
  }
  return finish(out, 0.45, 0.05);
}

/** 말발굽 다그닥 세 박 (야생마). 낮은 나무 두드림 셋을 짧게 붙인다 */
function hoofGallop() {
  const n = Math.floor(RATE * 0.36);
  const rand = rng(0x400f);
  const noise = Float32Array.from({ length: n }, () => rand() * 2 - 1);
  const body = lowpass(noise, 700);
  const click = highpass(noise, 1800);
  const out = new Float32Array(n);
  const hits = [
    [0, 1],
    [0.075, 0.75],
    [0.15, 0.9],
  ];
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let v = 0;
    for (const [at, amp] of hits) {
      const d = t - at;
      if (d < 0) continue;
      v += amp * (2.2 * body[i] * Math.exp(-d / 0.018) + 0.5 * click[i] * Math.exp(-d / 0.004) + 0.8 * Math.sin(2 * Math.PI * 180 * d) * Math.exp(-d / 0.025));
    }
    out[i] = Math.tanh(v * 1.4);
  }
  return finish(out, 0.75, 0.03);
}

/** 나무통에 맞는 둔탁한 퉁 (술통 피격·야생마 착지) */
function woodThud() {
  const n = Math.floor(RATE * 0.4);
  const rand = rng(0x7b0d);
  const noise = Float32Array.from({ length: n }, () => rand() * 2 - 1);
  const body = lowpass(noise, 500);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const freq = 95 + 60 * Math.exp(-t / 0.02);
    phase += (2 * Math.PI * freq) / RATE;
    out[i] = Math.min(1, t / 0.001) * (2.4 * body[i] * Math.exp(-t / 0.03) + 1.1 * Math.sin(phase) * Math.exp(-t / 0.12) + 0.35 * Math.sin(phase * 2.7) * Math.exp(-t / 0.05));
  }
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * 1.3);
  return finish(out, 0.8, 0.04);
}

/** 총알이 튕겨 나가는 피융. 높은 음이 미끄러져 내려간다 */
function ricochet() {
  const n = Math.floor(RATE * 0.45);
  const rand = rng(0x41c0);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const freq = 900 + 2100 * Math.exp(-t / 0.12);
    phase += (2 * Math.PI * freq) / RATE;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / 0.16);
    out[i] = env * (Math.sin(phase) + 0.25 * Math.sin(phase * 2.01)) + (rand() * 2 - 1) * 0.6 * Math.exp(-t / 0.004);
  }
  return finish(out, 0.4, 0.05);
}

/** 낮은 북 둥 (인디언!) */
function warDrum() {
  const n = Math.floor(RATE * 0.6);
  const rand = rng(0xd2a3);
  const noise = Float32Array.from({ length: n }, () => rand() * 2 - 1);
  const skin = lowpass(noise, 300);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const freq = 62 + 40 * Math.exp(-t / 0.03);
    phase += (2 * Math.PI * freq) / RATE;
    out[i] = Math.min(1, t / 0.002) * (1.4 * Math.sin(phase) * Math.exp(-t / 0.22) + 1.6 * skin[i] * Math.exp(-t / 0.04));
  }
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * 1.5);
  return finish(out, 0.85, 0.05);
}

/** 16-bit PCM 모노 WAV */
function wav(samples) {
  const data = samples.length * 2;
  const buf = Buffer.alloc(44 + data);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + data, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // 모노
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(data, 40);
  samples.forEach((v, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  return buf;
}

const SOUNDS = {
  gunshot,
  bullet_whiz: bulletWhiz,
  card_draw: cardDraw,
  rapid_shot: rapidShot,
  cylinder_click: cylinderClick,
  gun_latch: gunLatch,
  target_ding: targetDing,
  hoof_gallop: hoofGallop,
  wood_thud: woodThud,
  ricochet,
  war_drum: warDrum,
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, make] of Object.entries(SOUNDS)) {
  const path = join(OUT_DIR, `${name}.wav`);
  writeFileSync(path, wav(make()));
  console.log(`만들었다: ${path}`);
}
