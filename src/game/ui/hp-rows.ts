/** 목숨 점 한 줄에 놓는 개수 */
export const HP_PIPS_PER_ROW = 5;

/** 줄마다 놓을 점 개수. 5 이하는 한 줄, 10 은 5·5 */
export function hpRows(maxHp: number): number[] {
  const rows: number[] = [];
  for (let left = Math.max(0, maxHp); left > 0; left -= HP_PIPS_PER_ROW) rows.push(Math.min(HP_PIPS_PER_ROW, left));
  return rows;
}
