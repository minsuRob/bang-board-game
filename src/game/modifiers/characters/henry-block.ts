/**
 * 헨리 블록 — 내 카드(손패든 앞에 놓인 것이든)를 가져가거나 버리게 한 사람은 뱅!의 표적이 된다.
 * 강탈·캣 벌로우·제시 존스·플린트 웨스트우드·구조! 보상처럼 남이 골라서 내 카드를 떼어 가는 경로가 해당한다.
 *
 * VoS 룰 5쪽: "The card is drawn (or discarded) only after the automatic BANG! is resolved.
 * This ability works against Jesse Jones’ or Pat Brennan’s, but not against automatic abilities like El Gringo’s."
 * 그래서 카드 이동 프레임이 이 뱅!을 먼저 쌓고 카드는 그 뒤에 옮긴다 (frames/cards.ts reactFirst).
 * 엘 그링고처럼 자동 발동 능력은 drawFromPlayer.auto 로 이 훅을 건너뛴다.
 */
import type { Modifier } from '../../engine/modifier';

export const henryBlock: Modifier = {
  id: 'char:henryBlock',
  from: 'character',
  onCardTaken: ({ pid }, taker) => [
    { k: 'bang', source: pid, target: taker, missesRequired: 1, cause: 'henryBlock', dodgeChecked: false },
  ],
};
