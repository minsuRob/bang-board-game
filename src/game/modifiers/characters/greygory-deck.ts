/**
 * 그레고리 덱 — 차례 시작에 기본판 캐릭터 2장을 무작위로 뽑아 그 능력을 모두 가질 수 있다.
 *
 * 처음 차례에는 물어보지 않고 뽑는다. 그다음부터는 새로 뽑을지 묻는다.
 * 빌린 능력은 hooks.ts 의 getModifiers 가 붙인다.
 */
import type { Modifier } from '../../engine/modifier';

export const greygoryDeck: Modifier = {
  id: 'char:greygoryDeck',
  from: 'character',
  borrowsCharacters: 2,
  onTurnStart: ({ pid }) => [{ k: 'borrowCharacters', pid, count: 2 }],
};
