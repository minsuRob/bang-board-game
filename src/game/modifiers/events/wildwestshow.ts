/**
 * 와일드 웨스트 쇼 확장 이벤트 10종의 능력 훅.
 *
 * 누군가 역마차·웰스 파고를 낼 때마다 그 사람이 새 카드를 공개해 이전 이벤트를 대체하고,
 * 마지막 '와일드 웨스트 쇼'는 끝까지 남는다. 첫 역마차·웰스 파고 전에는 이벤트가 없다.
 * 공개 시점은 `data/events.ts` 의 `revealOn`, 공개는 `engine/hooks.ts` 의 `revealEventOnPlayFrames`.
 *
 * 카드 원문은 dV Giochi 카드 목록(cardslist.php?id=6)에서 읽었다.
 */

import type { WildWestShowEventId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

/** 차례 시작 이벤트는 장비(다이너마이트·감옥)보다 먼저 온다. 하이 눈과 같은 순서다 */
const EVENT_TURN_ORDER = 5;

/** 재갈 — 아무도 말할 수 없다. 판 안 채팅을 막는다 */
const gag: Modifier = { id: 'event:gag', from: 'event', silencesChat: true };

/** 묘지 — 제거된 사람은 자기 차례에 목숨 1로 돌아온다. 역할은 제거된 사람들의 것을 섞어 받는다 */
const boneOrchard: Modifier = { id: 'event:boneOrchard', from: 'event', revivesWithShuffledRoles: true };

/** 달링 발렌타인 — 차례 시작에 손패를 모두 버리고 같은 장수를 새로 가져온다 */
const darlingValentine: Modifier = {
  id: 'event:darlingValentine',
  from: 'event',
  order: EVENT_TURN_ORDER,
  onTurnStart: ({ state, pid }) => {
    const p = state.players.find((x) => x.id === pid);
    return p && p.alive && p.hand.length > 0 ? [{ k: 'handRedraw', pid }] : [];
  },
};

/** 도로시 레이지 — 차례에 한 번, 다른 사람에게 카드를 내게 한다 */
const dorothyRage: Modifier = { id: 'event:dorothyRage', from: 'event', eventAbility: 'dorothyRage' };

/** 헬레나 존테로 — 공개될 때 판정해서 ♥·♦ 면 보안관을 뺀 살아 있는 사람의 역할을 다시 나눈다 */
const helenaZontero: Modifier = {
  id: 'event:helenaZontero',
  from: 'event',
  // 판정은 더미를 가져가 공개한 사람(역마차·웰스 파고를 낸 사람)이 한다
  onEventEnter: (_state, revealer) => [{ k: 'judgement', pid: revealer, purpose: 'helenaZontero', candidates: [] }],
};

/** 레이디 로즈 오브 텍사스 — 차례에 한 번, 오른쪽 사람과 자리를 바꾼다. 그 사람은 다음 차례를 건너뛴다 */
const ladyRoseOfTexas: Modifier = { id: 'event:ladyRoseOfTexas', from: 'event', eventAbility: 'ladyRose' };

/** 미스 수잔나 — 차례에 카드를 3장 이상 내야 한다. 못 내면 목숨 1을 잃는다 */
const missSusanna: Modifier = { id: 'event:missSusanna', from: 'event', minCardsPerTurn: 3 };

/** 결전 — 모든 카드를 뱅!으로, 뱅!을 빗나감!으로 낼 수 있다 */
const showdown: Modifier = {
  id: 'event:showdown',
  from: 'event',
  canUseAs: (from, as) => as === 'bang' || (from === 'bang' && as === 'missed'),
};

/** 사카가웨이 — 모두 손패를 펼쳐 놓고 한다 (역할은 가린다) */
const sacagaway: Modifier = { id: 'event:sacagaway', from: 'event', revealsHands: true };

/** 와일드 웨스트 쇼 — 모두의 목표가 '마지막까지 살아남기'가 된다 */
const wildWestShow: Modifier = { id: 'event:wildWestShow', from: 'event', lastOneStanding: true };

export const WILDWESTSHOW_EVENT_MODIFIERS: Record<WildWestShowEventId, Modifier> = {
  gag,
  boneOrchard,
  darlingValentine,
  dorothyRage,
  helenaZontero,
  ladyRoseOfTexas,
  missSusanna,
  showdown,
  sacagaway,
  wildWestShow,
};
