/**
 * 레벨 곡선.
 *
 * 레벨 L 에 닿는 데 필요한 누적 경험치는 100·L·(L−1)/2 다.
 * Lv2 100, Lv3 300, Lv4 600, Lv5 1000 … 레벨이 오를수록 다음 칸이 100 씩 길어진다.
 */

/** 레벨 L 에 닿는 누적 경험치 */
export function xpToReach(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return (100 * l * (l - 1)) / 2;
}

export type LevelInfo = {
  level: number;
  /** 이번 레벨 안에서 쌓은 경험치 */
  into: number;
  /** 이번 레벨 칸의 길이 */
  span: number;
};

export function levelFromXp(xp: number): LevelInfo {
  const x = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpToReach(level + 1) <= x) level++;
  const base = xpToReach(level);
  return { level, into: x - base, span: xpToReach(level + 1) - base };
}
