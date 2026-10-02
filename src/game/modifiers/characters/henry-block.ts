/**
 * 헨리 블록 — 내 카드(손패든 앞에 놓인 것이든)를 가져가거나 버리게 한 사람은 뱅!의 표적이 된다.
 * 강탈·캣 벌로우·제시 존스·엘 그링고·구조! 보상처럼 남이 내 카드를 떼어 가는 경로가 전부 해당한다.
 */
import type { Modifier } from '../../engine/modifier';

export const henryBlock: Modifier = {
  id: 'char:henryBlock',
  from: 'character',
  onCardTaken: ({ pid }, taker) => [
    { k: 'bang', source: pid, target: taker, missesRequired: 1, cause: 'henryBlock', dodgeChecked: false },
  ],
};
