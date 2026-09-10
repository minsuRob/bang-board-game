/**
 * 테스트용 상태 조립기.
 *
 * 액션을 길게 늘어놓는 대신 원하는 국면을 직접 만든다.
 * 엣지 케이스는 "이 상황에서 이 카드를 내면" 형태라서 그게 훨씬 읽기 좋다.
 */

import { BASE_DECK } from '../../data/cards.base';
import type {
  CardId,
  CardKind,
  CharacterId,
  EventCardId,
  Rank,
  Role,
  Suit,
} from '../../data/types';
import { CHARACTERS } from '../../data/characters';
import { createRng } from '../rng';
import type { Action, GameState, Player, PlayerId } from '../types';
import { reduce } from '../reducer';
import { resolveStack } from '../stack';

/** 종류만 적거나, 무늬·숫자까지 못박거나 */
export type CardSpec = CardKind | { kind: CardKind; suit?: Suit; rank?: Rank };

export type PlayerSpec = {
  id?: PlayerId;
  name?: string;
  role?: Role;
  character?: CharacterId;
  hp?: number;
  maxHp?: number;
  hand?: CardSpec[];
  equipment?: CardSpec[];
  alive?: boolean;
  ghost?: boolean;
};

export type ScenarioSpec = {
  players: PlayerSpec[];
  /** 덱 맨 위부터 차례로 놓일 카드 (판정 결과를 못박을 때 쓴다) */
  deckTop?: CardSpec[];
  discard?: CardSpec[];
  event?: EventCardId;
  activeSeat?: number;
  phase?: 'draw' | 'play' | 'discard';
  seed?: number;
};

/** 아직 쓰지 않은 카드 중 조건에 맞는 것을 하나 꺼낸다. */
function takeCard(used: Set<CardId>, spec: CardSpec): CardId {
  const want = typeof spec === 'string' ? { kind: spec } : spec;
  const found = BASE_DECK.find(
    (c) =>
      !used.has(c.id) &&
      c.kind === want.kind &&
      (!want.suit || c.suit === want.suit) &&
      (!want.rank || c.rank === want.rank),
  );
  if (!found) {
    throw new Error(`조건에 맞는 카드가 덱에 없다: ${JSON.stringify(want)}`);
  }
  used.add(found.id);
  return found.id;
}

/**
 * 원하는 국면을 그대로 만든 상태.
 * 스택은 카드 사용 단계에서 멈춰 있고, 액티브 플레이어는 activeSeat(기본 0)이다.
 */
export function scenario(spec: ScenarioSpec): GameState {
  const used = new Set<CardId>();

  const players: Player[] = spec.players.map((p, i) => {
    const character = p.character ?? 'willyTheKid';
    const role: Role = p.role ?? (i === 0 ? 'sheriff' : 'outlaw');
    const maxHp = p.maxHp ?? CHARACTERS[character].maxHp + (role === 'sheriff' ? 1 : 0);
    return {
      id: p.id ?? `p${i}`,
      seat: i,
      name: p.name ?? `P${i}`,
      role,
      character,
      spareCharacter: null,
      hp: p.hp ?? maxHp,
      maxHp,
      hand: (p.hand ?? []).map((c) => takeCard(used, c)),
      equipment: (p.equipment ?? []).map((c) => takeCard(used, c)),
      alive: p.alive ?? true,
      ghost: p.ghost ?? false,
      roleRevealed: role === 'sheriff',
      usedThisTurn: [],
    };
  });

  const discard = (spec.discard ?? []).map((c) => takeCard(used, c));
  const forcedTop = (spec.deckTop ?? []).map((c) => takeCard(used, c));
  // 덱은 맨 뒤가 맨 위이므로, 지정한 순서를 뒤집어 붙인다.
  const rest = BASE_DECK.filter((c) => !used.has(c.id)).map((c) => c.id);
  const deck = [...rest, ...[...forcedTop].reverse()];

  const activeSeat = spec.activeSeat ?? 0;
  const active = players[activeSeat];
  const phase = spec.phase ?? 'play';

  return {
    config: { playerCount: players.length, expansions: spec.event ? ['highnoon'] : [] },
    rng: createRng(spec.seed ?? 1),
    players,
    turn: {
      active: active.id,
      phase,
      bangsPlayed: 0,
      round: 1,
      handcuffsSuit: null,
      drawn: true,
    },
    deck,
    discard,
    stack: [
      { k: 'turnEnd', pid: active.id },
      { k: 'discardPhase', pid: active.id },
      { k: 'playPhase', pid: active.id },
    ],
    awaiting: null,
    event: spec.event
      ? { deck: [], current: spec.event, past: [] }
      : null,
    log: [],
    result: null,
    seq: 0,
  };
}

/** 액션 여러 개를 차례로 적용한다. */
export function run(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce((s, a) => reduce(s, a), state);
}

export function p(state: GameState, pid: PlayerId): Player {
  const found = state.players.find((x) => x.id === pid);
  if (!found) throw new Error(`플레이어가 없다: ${pid}`);
  return found;
}

/** 손패에서 특정 종류의 카드 id 하나 */
export function handCard(state: GameState, pid: PlayerId, kind: CardKind): CardId {
  const card = p(state, pid).hand.find((c) => BASE_DECK.find((b) => b.id === c)?.kind === kind);
  if (!card) throw new Error(`${pid} 손에 ${kind} 가 없다`);
  return card;
}

/** 로그에 특정 종류의 항목이 있는가 */
export function logged(state: GameState, t: string): boolean {
  return state.log.some((e) => e.t === t);
}

export function loggedCount(state: GameState, t: string): number {
  return state.log.filter((e) => e.t === t).length;
}

/** 카드 총량이 보존되는가 (80장) */
export function totalCards(state: GameState): number {
  return (
    state.deck.length +
    state.discard.length +
    state.players.reduce((n, x) => n + x.hand.length + x.equipment.length, 0) +
    state.stack.reduce((n, f) => {
      if (f.k === 'judgement') return n + f.candidates.length;
      if (f.k === 'generalStore') return n + f.revealed.length;
      if (f.k === 'kitCarlson') return n + f.candidates.length;
      return n;
    }, 0)
  );
}

export { resolveStack };
