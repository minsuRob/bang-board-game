/**
 * 시드 기반 난수.
 *
 * 전역 Math.random()은 쓰지 않는다. 상태가 정수 두 개(seed, n)뿐인 카운터 기반
 * 생성기라서 JSON으로 그대로 직렬화되고, 같은 시드 + 같은 액션 열은 언제나
 * 같은 게임을 만든다. (락스텝 멀티플레이·리플레이·테스트 재현성의 근거)
 */

export type RngState = {
  seed: number;
  /** 지금까지 뽑은 횟수 */
  n: number;
};

export function createRng(seed: number): RngState {
  return { seed: seed | 0, n: 0 };
}

/** splitmix32 — 카운터 하나를 잘 섞인 32비트 정수로 바꾼다. */
function splitmix32(input: number): number {
  let a = (input + 0x9e3779b9) | 0;
  a ^= a >>> 16;
  a = Math.imul(a, 0x21f0aaad);
  a ^= a >>> 15;
  a = Math.imul(a, 0x735a2d97);
  a ^= a >>> 15;
  return a >>> 0;
}

function rawAt(rng: RngState): number {
  return splitmix32((rng.seed + Math.imul(rng.n, 0x9e3779b1)) | 0);
}

export type Rolled<T> = { value: T; rng: RngState };

/** [0, 1) 실수 */
export function nextFloat(rng: RngState): Rolled<number> {
  return { value: rawAt(rng) / 0x1_0000_0000, rng: { ...rng, n: rng.n + 1 } };
}

/**
 * [0, maxExclusive) 정수.
 * 나머지 연산 편향을 없애기 위해 거절 표집을 쓴다. 거절해도 카운터만 늘어나므로
 * 결정성은 그대로다.
 */
export function nextInt(rng: RngState, maxExclusive: number): Rolled<number> {
  if (maxExclusive <= 0) throw new Error(`nextInt: 범위가 잘못됨 (${maxExclusive})`);
  if (maxExclusive === 1) return { value: 0, rng: { ...rng, n: rng.n + 1 } };

  const limit = Math.floor(0x1_0000_0000 / maxExclusive) * maxExclusive;
  let cur = rng;
  for (let guard = 0; guard < 64; guard++) {
    const raw = rawAt(cur);
    cur = { ...cur, n: cur.n + 1 };
    if (raw < limit) return { value: raw % maxExclusive, rng: cur };
  }
  // 통계적으로 도달 불가. 혹시 모를 무한 루프만 막는다.
  return { value: rawAt(cur) % maxExclusive, rng: { ...cur, n: cur.n + 1 } };
}

/** 원본을 건드리지 않는 피셔-예이츠 셔플 */
export function shuffle<T>(rng: RngState, items: readonly T[]): Rolled<T[]> {
  const out = [...items];
  let cur = rng;
  for (let i = out.length - 1; i > 0; i--) {
    const rolled = nextInt(cur, i + 1);
    cur = rolled.rng;
    const j = rolled.value;
    [out[i], out[j]] = [out[j], out[i]];
  }
  return { value: out, rng: cur };
}

/** 목록에서 하나 고르기 */
export function pick<T>(rng: RngState, items: readonly T[]): Rolled<T> {
  const rolled = nextInt(rng, items.length);
  return { value: items[rolled.value], rng: rolled.rng };
}
