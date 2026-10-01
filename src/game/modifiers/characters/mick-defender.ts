/**
 * 믹 디펜더 — 뱅!이 아닌 갈색 카드의 대상이 되면 빗나감!을 내서 그 카드를 피할 수 있다.
 * 판정은 hooks.evadeOptions 가 탈출 카드와 같은 자리에서 한다.
 */
import type { Modifier } from '../../engine/modifier';

export const mickDefender: Modifier = {
  id: 'char:mickDefender',
  from: 'character',
  evadeBrownWith: 'missed',
};
