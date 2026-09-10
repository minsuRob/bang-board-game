/**
 * 하이 눈 확장 이벤트 15종의 능력 훅.
 *
 * 이벤트는 언제나 한 번에 하나만 활성이다. 보안관의 두 번째 차례부터
 * 차례 시작마다 새 카드가 공개되어 이전 이벤트를 대체한다.
 */

import type { EventCardId } from '../../data/types';
import { effectiveSuit } from '../../engine/cards';
import type { Modifier } from '../../engine/modifier';
import type { Frame } from '../../engine/types';

/** 이벤트 훅은 차례 시작에서 장비(다이너마이트·감옥)보다 먼저 온다. */
const EVENT_TURN_ORDER = 5;

// ---------------------------------------------------------------------------
// 무늬를 바꾸는 이벤트
//
// 실제 적용은 engine/cards.ts 의 effectiveSuit() 이 담당한다. 판정·수갑·
// 블랙 잭까지 모든 무늬 질의가 그 함수 하나를 지나가기 때문이다.
// ---------------------------------------------------------------------------

const blessing: Modifier = { id: 'event:blessing', from: 'event' };
const curse: Modifier = { id: 'event:curse', from: 'event' };

// ---------------------------------------------------------------------------
// 유령도시 — 제거된 플레이어가 자기 차례에만 되살아난다
// ---------------------------------------------------------------------------

const ghostTown: Modifier = {
  id: 'event:ghostTown',
  from: 'event',
  resurrectsEliminated: true,
  drawCount: (base, { state, pid }) => {
    const p = state.players.find((x) => x.id === pid);
    return p?.ghost ? 3 : base;
  },
};

// ---------------------------------------------------------------------------
// 골드러시 — 차례가 반시계 방향으로 진행된다
// ---------------------------------------------------------------------------

const goldRush: Modifier = { id: 'event:goldRush', from: 'event', turnDirection: -1 };

// ---------------------------------------------------------------------------
// 숙취 — 모든 캐릭터 능력이 사라진다
// ---------------------------------------------------------------------------

const hangover: Modifier = {
  id: 'event:hangover',
  from: 'event',
  disablesCharacterAbilities: true,
};

// ---------------------------------------------------------------------------
// 총격전 — 뱅!을 두 번까지
// ---------------------------------------------------------------------------

const shootout: Modifier = {
  id: 'event:shootout',
  from: 'event',
  bangLimit: (base) => Math.max(base, 2),
};

// ---------------------------------------------------------------------------
// 달톤 형제 — 공개되는 순간, 파랑 카드를 가진 모두가 1장씩 버린다
// ---------------------------------------------------------------------------

const theDaltons: Modifier = {
  id: 'event:theDaltons',
  from: 'event',
  onEventEnter: (state) => {
    const queue = state.players
      .filter((p) => p.alive && p.equipment.length > 0)
      .map((p) => p.id);
    return queue.length ? [{ k: 'daltonsDiscard', queue }] : [];
  },
};

// ---------------------------------------------------------------------------
// 의사 — 공개되는 순간, 목숨이 가장 적은 플레이어가 1 회복
// ---------------------------------------------------------------------------

const theDoctor: Modifier = {
  id: 'event:theDoctor',
  from: 'event',
  onEventEnter: (state) => {
    const alive = state.players.filter((p) => p.alive);
    if (alive.length === 0) return [];
    const lowest = Math.min(...alive.map((p) => p.hp));
    return alive
      .filter((p) => p.hp === lowest)
      .map((p): Frame => ({ k: 'heal', pid: p.id, amount: 1 }));
  },
};

// ---------------------------------------------------------------------------
// 목사 — 아무도 맥주를 쓸 수 없다
//
// 죽음 직전의 생존맥주도 막힌다. (원본 맵 v0.43 패치노트)
// ---------------------------------------------------------------------------

const theReverend: Modifier = {
  id: 'event:theReverend',
  from: 'event',
  canPlay: (_ctx, kind) => kind !== 'beer',
};

// ---------------------------------------------------------------------------
// 설교 — 자기 차례에는 뱅! 카드를 '사용'할 수 없다
//
// 결투 응수와 인디언 대응은 사용이 아니라 버림이므로 막지 않는다.
// 원본 맵 v0.429 는 반대로 갔지만, 그대로 두면 설교 중에 결투를 건 사람이
// 무조건 지는 규칙이 된다. (docs/edge-cases.md 쟁점 B)
// ---------------------------------------------------------------------------

const theSermon: Modifier = {
  id: 'event:theSermon',
  from: 'event',
  canPlay: ({ state, pid }, kind, _card, reactive) =>
    reactive || !(kind === 'bang' && state.turn.active === pid),
};

// ---------------------------------------------------------------------------
// 기차도착 / 갈증 — 가져오는 장수
// ---------------------------------------------------------------------------

const trainArrival: Modifier = {
  id: 'event:trainArrival',
  from: 'event',
  drawCount: (base) => base + 1,
};

const thirst: Modifier = {
  id: 'event:thirst',
  from: 'event',
  drawCount: () => 1,
};

// ---------------------------------------------------------------------------
// 새로운 신분 — 차례 시작에 예비 캐릭터로 교체할 수 있다 (목숨 2로 시작)
// ---------------------------------------------------------------------------

const newIdentity: Modifier = {
  id: 'event:newIdentity',
  from: 'event',
  order: 1,
  onTurnStart: ({ state, pid }) => {
    const p = state.players.find((x) => x.id === pid);
    return p?.spareCharacter ? [{ k: 'newIdentity', pid }] : [];
  },
};

// ---------------------------------------------------------------------------
// 수갑 — 카드를 가져온 뒤 무늬를 선언하고, 그 차례에는 그 무늬만 쓴다
// ---------------------------------------------------------------------------

const handcuffs: Modifier = {
  id: 'event:handcuffs',
  from: 'event',
  onDrawPhaseEnd: ({ pid }) => [{ k: 'declareSuit', pid }],
  canPlay: ({ state, pid }, _kind, card, reactive) => {
    if (reactive || state.turn.active !== pid) return true;
    const declared = state.turn.handcuffsSuit;
    if (!declared) return true;
    return effectiveSuit(state, card) === declared;
  },
};

// ---------------------------------------------------------------------------
// 하이 눈 — 차례 시작에 목숨 1을 잃는다
// ---------------------------------------------------------------------------

const highNoon: Modifier = {
  id: 'event:highNoon',
  from: 'event',
  order: EVENT_TURN_ORDER,
  onTurnStart: ({ pid }) => [
    { k: 'damage', target: pid, amount: 1, source: null, cause: 'highNoon' },
  ],
};

export const EVENT_MODIFIERS: Record<EventCardId, Modifier> = {
  blessing,
  curse,
  ghostTown,
  goldRush,
  hangover,
  shootout,
  theDaltons,
  theDoctor,
  theReverend,
  theSermon,
  trainArrival,
  thirst,
  newIdentity,
  handcuffs,
  highNoon,
};
