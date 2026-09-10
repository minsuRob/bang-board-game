/**
 * 카드·플레이어 조작 헬퍼.
 *
 * 모든 함수는 순수하다. 상태를 받아 새 상태를 돌려주며 원본을 건드리지 않는다.
 */

import { BASE_CARDS_BY_ID, CARD_DEFS } from '../data/cards.base';
import type { CardDef, CardId, CardInstance, CardKind, Suit } from '../data/types';
import { shuffle } from './rng';
import type { Frame, GameEvent, GameState, Player, PlayerId } from './types';

// ---------------------------------------------------------------------------
// 카드 조회
// ---------------------------------------------------------------------------

export function cardOf(id: CardId): CardInstance {
  const card = BASE_CARDS_BY_ID.get(id);
  if (!card) throw new Error(`알 수 없는 카드 id: ${id}`);
  return card;
}

export function kindOf(id: CardId): CardKind {
  return cardOf(id).kind;
}

export function defOf(id: CardId): CardDef {
  return CARD_DEFS[kindOf(id)];
}

/**
 * 실제로 적용되는 무늬.
 * 하이 눈 '축복'은 모든 카드를 ♥ 로, '저주'는 ♠ 로 바꾼다.
 */
export function effectiveSuit(state: GameState, id: CardId): Suit {
  const event = state.event?.current;
  if (event === 'blessing') return 'hearts';
  if (event === 'curse') return 'spades';
  return cardOf(id).suit;
}

// ---------------------------------------------------------------------------
// 플레이어 조회·갱신
// ---------------------------------------------------------------------------

export function playerOf(state: GameState, pid: PlayerId): Player {
  const p = state.players.find((x) => x.id === pid);
  if (!p) throw new Error(`알 수 없는 플레이어 id: ${pid}`);
  return p;
}

export function updatePlayer(
  state: GameState,
  pid: PlayerId,
  patch: (p: Player) => Player,
): GameState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === pid ? patch(p) : p)),
  };
}

/** 살아 있거나 유령으로 되살아나 자리에 앉아 있는가 (거리 계산 대상) */
export function inPlay(p: Player): boolean {
  return p.alive || p.ghost;
}

/** 진짜로 생존해 있는 플레이어 (승리 판정·맥주 2인 규칙의 기준) */
export function alivePlayers(state: GameState): Player[] {
  return state.players.filter((p) => p.alive);
}

/** 자리에 앉아 있는 플레이어 (착석 순서 유지) */
export function seatedPlayers(state: GameState): Player[] {
  return state.players.filter(inPlay);
}

// ---------------------------------------------------------------------------
// 로그
// ---------------------------------------------------------------------------

export function log(state: GameState, ev: Omit<GameEvent, 'seq'>): GameState {
  return { ...state, log: [...state.log, { ...ev, seq: state.seq }] };
}

/** 로그에 이름을 쓰기 위한 표시용 이름 */
export function nameOf(state: GameState, pid: PlayerId): string {
  return playerOf(state, pid).name;
}

// ---------------------------------------------------------------------------
// 스택
// ---------------------------------------------------------------------------

/** 배열의 마지막이 top 이다. */
export function push(state: GameState, frame: Frame): GameState {
  return { ...state, stack: [...state.stack, frame] };
}

/** frames[0] 이 가장 먼저 해결되도록 쌓는다. */
export function pushSeq(state: GameState, frames: Frame[]): GameState {
  return { ...state, stack: [...state.stack, ...[...frames].reverse()] };
}

export function topFrame(state: GameState): Frame | null {
  return state.stack.length ? state.stack[state.stack.length - 1] : null;
}

export function popFrame(state: GameState): GameState {
  return { ...state, stack: state.stack.slice(0, -1) };
}

/** top 프레임을 새 값으로 교체한다 (진행 상태 갱신용) */
export function replaceTop(state: GameState, frame: Frame): GameState {
  return { ...state, stack: [...state.stack.slice(0, -1), frame] };
}

// ---------------------------------------------------------------------------
// 덱
// ---------------------------------------------------------------------------

/**
 * 덱이 비었으면 버린 더미를 섞어 되살린다.
 * 원본 맵 v0.422 "플레잉 카드 더미를 다시 섞을 때 포함되는 카드를 보이지 않게" —
 * 섞인 결과는 로그에 남기지 않는다.
 */
export function refillDeck(state: GameState): GameState {
  if (state.deck.length > 0 || state.discard.length === 0) return state;

  const { value, rng } = shuffle(state.rng, state.discard);
  return log({ ...state, deck: value, discard: [], rng }, {
    t: 'reshuffle',
    amount: value.length,
    text: `버린 더미 ${value.length}장을 섞어 새 덱을 만들었다.`,
  });
}

/** 덱 맨 위에서 n장을 뽑는다. 모자라면 리셔플하고, 그래도 없으면 있는 만큼만 준다. */
export function drawFromDeck(state: GameState, n: number): { state: GameState; cards: CardId[] } {
  let cur = state;
  const cards: CardId[] = [];
  for (let i = 0; i < n; i++) {
    cur = refillDeck(cur);
    if (cur.deck.length === 0) break;
    cards.push(cur.deck[cur.deck.length - 1]);
    cur = { ...cur, deck: cur.deck.slice(0, -1) };
  }
  return { state: cur, cards };
}

/** 덱 맨 위를 들여다본다 (뽑지는 않는다) */
export function peekDeck(state: GameState, n: number): { state: GameState; cards: CardId[] } {
  let cur = state;
  const cards: CardId[] = [];
  for (let i = 0; i < n; i++) {
    if (cur.deck.length <= i) {
      cur = refillDeck(cur);
      if (cur.deck.length <= i) break;
    }
    cards.push(cur.deck[cur.deck.length - 1 - i]);
  }
  return { state: cur, cards };
}

/** 카드를 덱 맨 위에 되돌린다 (킷 칼슨) */
export function putOnDeck(state: GameState, ids: CardId[]): GameState {
  return { ...state, deck: [...state.deck, ...ids] };
}

export function toDiscard(state: GameState, ids: CardId[]): GameState {
  return { ...state, discard: [...state.discard, ...ids] };
}

// ---------------------------------------------------------------------------
// 손패·장비 이동
// ---------------------------------------------------------------------------

export function giveCards(state: GameState, pid: PlayerId, ids: CardId[]): GameState {
  if (ids.length === 0) return state;
  return updatePlayer(state, pid, (p) => ({ ...p, hand: [...p.hand, ...ids] }));
}

export function removeFromHand(state: GameState, pid: PlayerId, id: CardId): GameState {
  return updatePlayer(state, pid, (p) => {
    const i = p.hand.indexOf(id);
    if (i < 0) throw new Error(`${p.name} 손패에 ${id} 가 없다`);
    return { ...p, hand: [...p.hand.slice(0, i), ...p.hand.slice(i + 1)] };
  });
}

export function removeFromEquipment(state: GameState, pid: PlayerId, id: CardId): GameState {
  return updatePlayer(state, pid, (p) => {
    const i = p.equipment.indexOf(id);
    if (i < 0) throw new Error(`${p.name} 장비에 ${id} 가 없다`);
    return { ...p, equipment: [...p.equipment.slice(0, i), ...p.equipment.slice(i + 1)] };
  });
}

/** 어느 영역에 있든 그 카드를 소유자에게서 떼어낸다. */
export function removeCardAnywhere(state: GameState, id: CardId): GameState {
  for (const p of state.players) {
    if (p.hand.includes(id)) return removeFromHand(state, p.id, id);
    if (p.equipment.includes(id)) return removeFromEquipment(state, p.id, id);
  }
  return state;
}

export function equipCard(state: GameState, pid: PlayerId, id: CardId): GameState {
  return updatePlayer(state, pid, (p) => ({ ...p, equipment: [...p.equipment, id] }));
}

/** 장착 중인 무기 카드 id (없으면 null) */
export function weaponOf(state: GameState, pid: PlayerId): CardId | null {
  const p = playerOf(state, pid);
  return p.equipment.find((id) => defOf(id).equip === 'weapon') ?? null;
}

/** 같은 종류의 파랑 카드를 이미 장착 중인가 (감옥·다이너마이트 중복 방지) */
export function hasEquipmentKind(state: GameState, pid: PlayerId, kind: CardKind): boolean {
  return playerOf(state, pid).equipment.some((id) => kindOf(id) === kind);
}

export function equipmentOfKind(
  state: GameState,
  pid: PlayerId,
  kind: CardKind,
): CardId | null {
  return playerOf(state, pid).equipment.find((id) => kindOf(id) === kind) ?? null;
}
