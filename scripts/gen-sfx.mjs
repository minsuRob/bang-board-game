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

const SOUNDS = { gunshot, bullet_whiz: bulletWhiz };

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, make] of Object.entries(SOUNDS)) {
  const path = join(OUT_DIR, `${name}.wav`);
  writeFileSync(path, wav(make()));
  console.log(`만들었다: ${path}`);
}
