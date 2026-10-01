/**
 * 한줌의 카드 (A Fistful of Cards) 이벤트 15종의 능력 훅.
 *
 * 진행 방식은 하이 눈과 같다. 한 번에 하나만 활성이고, 보안관 차례 시작마다 대체된다.
 * 판정 근거는 docs/edge-cases.md 13절 (EC-121~).
 */

import { CARD_DEFS } from '../../data/cards.base';
import type { FistfulEventId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

/** 차례 시작 이벤트는 장비(다이너마이트·감옥)보다 먼저 온다. 하이 눈과 같다 */
const EVENT_TURN_ORDER = 5;
/** 카드 가져오기 단계를 대신하는 이벤트는 캐릭터 능력보다 먼저 본다 */
const EVENT_DRAW_ORDER = 1;

const abandonedMine: Modifier = {
  id: 'event:abandonedMine',
  from: 'event',
  drawsFromDiscard: true,
  discardsToDeck: true,
};

const ambush: Modifier = { id: 'event:ambush', from: 'event', fixedDistance: 1 };

const bloodBrothers: Modifier = {
  id: 'event:bloodBrothers',
  from: 'event',
  order: EVENT_TURN_ORDER,
  // 마지막 목숨은 넘길 수 없다. 받을 사람이 있는지는 프레임이 본다.
  onTurnStart: ({ state, pid }) => {
    const p = state.players.find((x) => x.id === pid);
    return p && p.alive && p.hp > 1 ? [{ k: 'bloodBrothers', pid }] : [];
  },
};

const deadMan: Modifier = {
  id: 'event:deadMan',
  from: 'event',
  revivesFirstOut: { hp: 2, cards: 2 },
};

const hardLiquor: Modifier = {
  id: 'event:hardLiquor',
  from: 'event',
  order: EVENT_DRAW_ORDER,
  // 목숨이 가득이면 물을 것이 없다. 목숨 1 이어도 고를 수 있다 (원본 맵 v0.504).
  drawPhase: ({ state, pid }) => {
    const p = state.players.find((x) => x.id === pid);
    return p && p.alive && p.hp < p.maxHp ? [{ k: 'hardLiquor', pid }] : null;
  },
};

const lasso: Modifier = { id: 'event:lasso', from: 'event', disablesEquipment: true };

const lawOfTheWest: Modifier = {
  id: 'event:lawOfTheWest',
  from: 'event',
  afterDraw: ({ pid }, drawn) => (drawn[1] ? [{ k: 'lawOfTheWest', pid, card: drawn[1] }] : []),
};

const peyote: Modifier = {
  id: 'event:peyote',
  from: 'event',
  order: EVENT_DRAW_ORDER,
  drawPhase: ({ pid }) => [{ k: 'peyote', pid }],
};

const ranch: Modifier = {
  id: 'event:ranch',
  from: 'event',
  onDrawPhaseEnd: ({ pid }) => [{ k: 'ranch', pid, picked: [] }],
};

const ricochet: Modifier = { id: 'event:ricochet', from: 'event', allowsRicochet: true };

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

const sniper: Modifier = { id: 'event:sniper', from: 'event', allowsDoubleBang: true };

const theJudge: Modifier = {
  id: 'event:theJudge',
  from: 'event',
  // 앞에 내려놓는 카드(파랑)만 막는다. 엉클 윌이 파랑 카드를 잡화점으로 내는 것은 된다.
  canPlay: (_ctx, kind) => CARD_DEFS[kind].category !== 'blue',
};

const vendetta: Modifier = {
  id: 'event:vendetta',
  from: 'event',
  // 추가 차례에는 다시 펼치지 않는다.
  onTurnEnd: ({ state, pid }) =>
    state.turn.extra ? [] : [{ k: 'judgement', pid, purpose: 'vendetta', candidates: [] }],
};

const fistfulOfCards: Modifier = {
  id: 'event:fistfulOfCards',
  from: 'event',
  order: EVENT_TURN_ORDER,
  // 장수는 차례 시작 순간에 정해진다.
  onTurnStart: ({ state, pid }) => {
    const p = state.players.find((x) => x.id === pid);
    const n = p && p.alive ? p.hand.length : 0;
    return n > 0 ? [{ k: 'fistfulBangs', pid, remaining: n }] : [];
  },
};

export const FISTFUL_EVENT_MODIFIERS: Record<FistfulEventId, Modifier> = {
  abandonedMine,
  ambush,
  bloodBrothers,
  deadMan,
  hardLiquor,
  lasso,
  lawOfTheWest,
  peyote,
  ranch,
  ricochet,
  russianRoulette,
  sniper,
  theJudge,
  vendetta,
  fistfulOfCards,
};
