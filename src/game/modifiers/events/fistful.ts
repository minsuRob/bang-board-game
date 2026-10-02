/**
 * 한줌의 카드 확장 이벤트 15종의 능력 훅.
 *
 * 진행은 하이 눈과 같다. 보안관의 두 번째 차례부터 보안관의 차례 시작마다 새 카드가
 * 공개되어 이전 이벤트를 대체하고, 마지막 '한줌의 카드'는 끝까지 남는다.
 */

import { CARD_DEFS } from '../../data/cards.base';
import type { FistfulEventId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

const ev = (id: FistfulEventId): Modifier => ({ id: `event:${id}`, from: 'event' });

/** 차례 시작 이벤트는 장비(다이너마이트·감옥)보다 먼저 온다. 하이 눈과 같다 */
const EVENT_TURN_ORDER = 5;
/** 카드 가져오기 단계를 대신하는 이벤트는 캐릭터 능력보다 먼저 본다 */
const EVENT_DRAW_ORDER = 1;

// ---------------------------------------------------------------------------
// 차례 시작
// ---------------------------------------------------------------------------

/** 의형제 — 목숨 1을 넘겨줄 수 있다. 마지막 목숨은 안 되고, 받을 사람은 프레임이 고른다 */
const bloodBrothers: Modifier = {
  id: 'event:bloodBrothers',
  from: 'event',
  order: EVENT_TURN_ORDER,
  onTurnStart: ({ state, pid }) => {
    const p = state.players.find((x) => x.id === pid);
    return p && p.alive && p.hp > 1 ? [{ k: 'bloodBrothers', pid }] : [];
  },
};

/** 한줌의 카드 — 손패 장수만큼 쏜 사람 없는 뱅!을 맞는다. 장수는 차례 시작 순간에 정해진다 */
const fistfulOfCards: Modifier = {
  id: 'event:fistfulOfCards',
  from: 'event',
  order: EVENT_TURN_ORDER,
  onTurnStart: ({ state, pid }) => {
    const p = state.players.find((x) => x.id === pid);
    const n = p && p.alive ? p.hand.length : 0;
    return n > 0 ? [{ k: 'fistfulBangs', pid, remaining: n }] : [];
  },
};

// ---------------------------------------------------------------------------
// 카드 가져오기 단계
// ---------------------------------------------------------------------------

/** 독한 술 — 가져오기를 건너뛰고 목숨 1을 회복할 수 있다. 목숨이 가득이면 묻지 않는다 */
const hardLiquor: Modifier = {
  id: 'event:hardLiquor',
  from: 'event',
  order: EVENT_DRAW_ORDER,
  drawPhase: ({ state, pid }) => {
    const p = state.players.find((x) => x.id === pid);
    return p && p.alive && p.hp < p.maxHp ? [{ k: 'hardLiquor', pid }] : null;
  },
};

/** 피요테 — 가져오기 대신 덱 맨 위 카드의 색을 맞힌다 */
const peyote: Modifier = {
  id: 'event:peyote',
  from: 'event',
  order: EVENT_DRAW_ORDER,
  drawPhase: ({ pid }) => [{ k: 'peyote', pid }],
};

/** 목장 — 가져오기가 끝나면 한 번, 원하는 만큼 바꾼다 */
const ranch: Modifier = {
  id: 'event:ranch',
  from: 'event',
  onDrawPhaseEnd: ({ pid }) => [{ k: 'ranch', pid, picked: [] }],
};

/** 서부의 법 — 두 번째로 가져온 카드를 보여 주고 의무를 건다 */
const lawOfTheWest: Modifier = {
  id: 'event:lawOfTheWest',
  from: 'event',
  afterDraw: ({ pid }, drawn) => (drawn[1] ? [{ k: 'lawOfTheWest', pid, card: drawn[1] }] : []),
};

// ---------------------------------------------------------------------------
// 공개 · 카드 사용 · 차례 끝
// ---------------------------------------------------------------------------

/** 러시안 룰렛 — 공개되면 보안관부터 빗나감!을 버린다 */
const russianRoulette: Modifier = {
  id: 'event:russianRoulette',
  from: 'event',
  onEventEnter: (state) => {
    const alive = state.players.filter((p) => p.alive);
    const start = alive.findIndex((p) => p.role === 'sheriff');
    const ordered = start < 0 ? alive : [...alive.slice(start), ...alive.slice(0, start)];
    return ordered.length ? [{ k: 'russianRoulette', queue: ordered.map((p) => p.id), i: 0 }] : [];
  },
};

/** 판사 — 앞에 내려놓는 카드(파랑)를 낼 수 없다 */
const theJudge: Modifier = {
  id: 'event:theJudge',
  from: 'event',
  canPlay: (_ctx, kind) => CARD_DEFS[kind].category !== 'blue',
};

/** 복수 — 차례 끝에 펼쳐 ♥ 면 차례를 한 번 더. 추가 차례에는 다시 펼치지 않는다 */
const vendetta: Modifier = {
  id: 'event:vendetta',
  from: 'event',
  onTurnEnd: ({ state, pid }) =>
    state.turn.extra ? [] : [{ k: 'judgement', pid, purpose: 'vendetta', candidates: [] }],
};

export const FISTFUL_EVENT_MODIFIERS: Record<FistfulEventId, Modifier> = {
  abandonedMine: ev('abandonedMine'),
  ambush: ev('ambush'),
  bloodBrothers,
  deadMan: ev('deadMan'),
  hardLiquor,
  lasso: ev('lasso'),
  lawOfTheWest,
  peyote,
  ranch,
  ricochet: ev('ricochet'),
  russianRoulette,
  sniper: ev('sniper'),
  theJudge,
  vendetta,
  fistfulOfCards,
};
