/**
 * 합법 액션 열거.
 *
 * UI 의 하이라이트, AI 의 후보 생성, 리듀서의 검증이 전부 이 함수 하나를 쓴다.
 * 세 곳이 각자 판단하면 반드시 어긋난다.
 */

import { CARD_DEFS } from '../data/cards.base';
import type { CardId, CardKind, Suit } from '../data/types';
import { SUITS } from '../data/types';
import { SID_KETCHUM_ABILITY } from '../modifiers';
import {
  alivePlayers,
  effectiveSuit,
  inPlay,
  kindOf,
  playerOf,
  seatedPlayers,
  topFrame,
} from './cards';
import { canReachAtRange, canReachWithBang, distance, rightNeighborOf } from './distance';
import {
  allowsDoubleBang,
  allowsRicochet,
  anytimeAbilitiesOf,
  bangLimitOf,
  canPlayCard,
  canUseCardAs,
  eventAbilityOf,
  isExplicitAbility,
  immuneToCard,
  isSwapAbility,
  playAnyAsAbilitiesOf,
  playableAs,
  repeatAbilitiesOf,
  swapAbilitiesOf,
  turnDirectionOf,
} from './hooks';
import { hasSameBlueCard } from './play';
import { goldDyingActions, goldPlayActions } from './gold-actions';
import type { Action, EventAbilityKind, GameState, PlayerId } from './types';

/** 액션을 문자열 하나로 정규화한다. 검증에서 동등성 비교에 쓴다. */
export function actionKey(action: Action): string {
  switch (action.type) {
    case 'playCard':
      return [
        'playCard',
        action.pid,
        action.card,
        action.as ?? '',
        action.target ?? '',
        action.pick ? (action.pick.zone === 'hand' ? `h${action.pick.index}` : `e${action.pick.card}`) : '',
        action.target2 ?? '',
        action.extra ?? '',
        action.also ?? '',
        action.ability ?? '',
      ].join('|');
    case 'respond': {
      const c = action.choice;
      const detail =
        c.c === 'card'
          ? c.card
          : c.c === 'suit'
            ? c.suit
            : c.c === 'player'
              ? c.pid
              : c.c === 'color'
                ? c.color
              : c.c === 'pick'
                ? c.pick.zone === 'hand'
                  ? `h${c.pick.index}`
                  : `e${c.pick.card}`
                : c.c === 'goldUse'
                  ? `${c.use.as ?? ''}>${c.use.target ?? ''}`
                  : '';
      return ['respond', action.pid, c.c, detail].join('|');
    }
    case 'useAbility':
      return ['useAbility', action.pid, action.ability, [...(action.cards ?? [])].sort().join(',')].join('|');
    case 'discardCard':
      return ['discardCard', action.pid, action.card].join('|');
    case 'endTurn':
      return ['endTurn', action.pid].join('|');
    case 'pickCharacter':
      return ['pickCharacter', action.pid, action.character].join('|');
    case 'timeout':
      return ['timeout', action.pid].join('|');
    case 'buyGold':
      return ['buyGold', action.pid, action.card, action.use?.as ?? '', action.use?.target ?? ''].join('|');
    case 'removeGold':
      return ['removeGold', action.pid, action.target, action.card].join('|');
    case 'beerForGold':
      return ['beerForGold', action.pid, action.card].join('|');
    case 'goldAbility':
      return ['goldAbility', action.pid, action.ability, action.target ?? ''].join('|');
    case 'eventAbility':
      return ['eventAbility', action.pid, action.ability, action.forced ?? '', action.kind ?? '', action.target ?? ''].join('|');
    case 'startGame':
      return 'startGame';
  }
}

/**
 * 지금 행동해야 하는 사람들.
 *
 * 평소에는 한 명(입력 대기 중인 사람, 아니면 차례인 사람)이다.
 * 캐릭터 드래프트 중에만 아직 안 고른 사람 전원이 동시에 행동한다.
 */
export function actorsOf(state: GameState): PlayerId[] {
  if (state.result) return [];
  if (state.draft) {
    const d = state.draft;
    return state.players.filter((p) => d.picked[p.id] === null).map((p) => p.id);
  }
  return [state.awaiting ? state.awaiting.pid : state.turn.active];
}

/** 이 플레이어가 지금 낼 수 있는 모든 액션 */
export function legalActions(state: GameState, pid: PlayerId): Action[] {
  if (state.result) return [];

  const out: Action[] = [];
  const me = state.players.find((p) => p.id === pid);
  if (!me || !inPlay(me)) return out;

  // 드래프트 중에는 캐릭터 고르기만 할 수 있다. 자리표시자 캐릭터의 능력은 열지 않는다.
  if (state.draft) {
    if (state.draft.picked[pid] !== null) return out;
    return (state.draft.offers[pid] ?? []).map((character) => ({
      type: 'pickCharacter' as const,
      pid,
      character,
    }));
  }

  out.push(...anytimeActions(state, pid));
  out.push(...goldDyingActions(state, pid));

  if (state.awaiting) {
    if (state.awaiting.pid === pid) out.push(...respondActions(state, pid));
    return out;
  }

  if (state.turn.active !== pid) return out;

  const top = topFrame(state);
  if (top?.k === 'playPhase' && state.turn.phase === 'play') {
    const plays = playPhaseActions(state, pid);
    out.push(...plays);
    out.push(...goldPlayActions(state, pid));
    out.push(...eventAbilityActions(state, pid));
    // 서부의 법: 보여 준 카드를 낼 수 있는 동안은 차례를 마칠 수 없다.
    const must = state.turn.mustPlay;
    const owed =
      must !== undefined &&
      plays.some(
        (x) => x.type === 'playCard' && x.card === must && !isSwapAbility(state, pid, x.ability),
      );
    if (!owed) out.push({ type: 'endTurn', pid });
  } else if (top?.k === 'discardPhase' && state.turn.phase === 'discard') {
    for (const card of unique(me.hand)) out.push({ type: 'discardCard', pid, card });
  }
  return out;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

// ---------------------------------------------------------------------------
// 언제든 쓸 수 있는 능력
// ---------------------------------------------------------------------------

function anytimeActions(state: GameState, pid: PlayerId): Action[] {
  const me = playerOf(state, pid);
  const out: Action[] = [];
  for (const ability of anytimeAbilitiesOf(state, pid)) {
    if (ability.key !== SID_KETCHUM_ABILITY) continue;
    if (me.hand.length < 2 || me.hp >= me.maxHp || me.ghost) continue;
    // 버릴 두 장의 조합을 전부 열거한다. 손패가 커도 조합 수는 감당할 만하다.
    const hand = unique(me.hand);
    for (let i = 0; i < hand.length; i++) {
      for (let j = i + 1; j < hand.length; j++) {
        out.push({ type: 'useAbility', pid, ability: ability.key, cards: [hand[i], hand[j]] });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 입력 대기에 대한 응답
// ---------------------------------------------------------------------------

function respondActions(state: GameState, pid: PlayerId): Action[] {
  const a = state.awaiting;
  if (!a) return [];
  const out: Action[] = [];
  const pass: Action = { type: 'respond', pid, choice: { c: 'pass' } };

  switch (a.k) {
    case 'missed':
    case 'indiansBang':
    case 'duelBang':
    case 'russianRoulette':
    case 'ricochet':
    case 'ranch':
      for (const card of unique(a.options)) {
        out.push({ type: 'respond', pid, choice: { c: 'card', card } });
      }
      out.push(pass);
      break;
    case 'beerToSurvive':
      for (const card of unique(a.options)) {
        out.push({ type: 'respond', pid, choice: { c: 'card', card } });
      }
      out.push(pass);
      break;
    case 'judgementChoice':
    case 'giveCard':
    case 'generalStore':
    case 'kitCarlson':
    case 'daltonsDiscard':
    case 'dutchWill':
      for (const card of unique(a.options)) {
        out.push({ type: 'respond', pid, choice: { c: 'card', card } });
      }
      break;
    case 'goldUse':
      for (const use of a.options) {
        out.push({ type: 'respond', pid, choice: { c: 'goldUse', use } });
      }
      break;
    case 'stealCard': {
      for (let i = 0; i < a.handCount; i++) {
        out.push({ type: 'respond', pid, choice: { c: 'pick', pick: { zone: 'hand', index: i } } });
      }
      for (const card of a.equipment) {
        out.push({ type: 'respond', pid, choice: { c: 'pick', pick: { zone: 'equipment', card } } });
      }
      break;
    }
    case 'jesseJones':
      for (const target of a.targets) {
        out.push({ type: 'respond', pid, choice: { c: 'player', pid: target } });
      }
      out.push(pass);
      break;
    case 'pedroRamirez':
    case 'hardLiquor':
    case 'newIdentity':
    case 'borrowCharacters':
      out.push({ type: 'respond', pid, choice: { c: 'yes' } });
      out.push(pass);
      break;
    case 'bloodBrothers':
      for (const target of a.targets) {
        out.push({ type: 'respond', pid, choice: { c: 'player', pid: target } });
      }
      out.push(pass);
      break;
    case 'peyote':
      out.push({ type: 'respond', pid, choice: { c: 'color', color: 'red' } });
      out.push({ type: 'respond', pid, choice: { c: 'color', color: 'black' } });
      break;
    case 'evelyn':
      for (const target of a.targets) {
        out.push({ type: 'respond', pid, choice: { c: 'player', pid: target } });
      }
      out.push(pass);
      break;
    case 'saved':
      for (const card of unique(a.options)) {
        out.push({ type: 'respond', pid, choice: { c: 'card', card } });
      }
      out.push(pass);
      break;
    case 'savedReward':
      out.push({ type: 'respond', pid, choice: { c: 'yes' } });
      out.push(pass);
      break;
    case 'evade':
      for (const card of unique(a.options)) {
        out.push({ type: 'respond', pid, choice: { c: 'card', card } });
      }
      out.push(pass);
      break;
    case 'discardChoice':
      for (const card of unique(a.options)) {
        out.push({ type: 'respond', pid, choice: { c: 'card', card } });
      }
      if (a.canPass) out.push(pass);
      break;
    case 'declareSuit':
      for (const suit of SUITS) {
        out.push({ type: 'respond', pid, choice: { c: 'suit', suit: suit as Suit } });
      }
      break;
    default: {
      // 응답을 하나도 내놓지 못하면 판이 멈춘다. 새 입력 대기를 넣으면 여기서 막힌다
      const never: never = a;
      throw new Error(`응답을 만들 수 없는 입력 대기: ${JSON.stringify(never)}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 카드 사용 단계
// ---------------------------------------------------------------------------

/**
 * 손에 든 카드를 어떤 종류로 쓸 수 있는지.
 * 칼라미티 자넷의 뱅!↔빗나감! 치환과, 엉클 윌의 '아무 카드나 잡화점'을 포함한다.
 */
function usableKinds(state: GameState, pid: PlayerId, card: CardId): CardKind[] {
  const own = kindOf(card);
  const kinds = new Set<CardKind>([own]);
  for (const as of ['bang', 'missed'] as CardKind[]) {
    if (canUseCardAs(state, pid, own, as)) kinds.add(as);
  }
  for (const ab of playAnyAsAbilitiesOf(state, pid)) {
    if (!isExplicitAbility(ab)) kinds.add(ab.as);
  }
  return [...kinds];
}

function playPhaseActions(state: GameState, pid: PlayerId): Action[] {
  const me = playerOf(state, pid);
  const out: Action[] = [];
  const bangsLeft = state.turn.bangsPlayed < bangLimitOf(state, pid);

  for (const card of unique(me.hand)) {
    for (const as of usableKinds(state, pid, card)) {
      if (!canPlayCard(state, pid, as, card, false)) continue;
      const explicit = as === kindOf(card) ? undefined : as;

      out.push(...kindActions(state, pid, card, as, explicit, bangsLeft));
    }
  }
  out.push(...explicitAbilityActions(state, pid, bangsLeft));
  out.push(...repeatBrownActions(state, pid));
  out.push(...swapActions(state, pid));
  return out;
}

// ---------------------------------------------------------------------------
// 이벤트가 주는 차례당 한 번 행동 (와일드 웨스트 쇼)
// ---------------------------------------------------------------------------

/** usedThisTurn 에 넣는 key */
export function eventAbilityKey(ability: EventAbilityKind): string {
  return `event:${ability}`;
}

/** 도로시 레이지가 남에게 내게 할 수 있는 갈색 카드. 대상이 둘이거나 다른 카드와 함께 내는 것은 뺀다 */
const DOROTHY_BASE: readonly CardKind[] = [
  'bang', 'beer', 'saloon', 'stagecoach', 'wellsFargo', 'generalStore',
  'gatling', 'indians', 'duel', 'panic', 'catBalou',
];
const DOROTHY_VALLEY: readonly CardKind[] = ['tomahawk', 'bandidos', 'poker', 'tornado', 'lastCall'];

export function dorothyKinds(state: GameState): CardKind[] {
  return state.config.expansions.includes('valley') ? [...DOROTHY_BASE, ...DOROTHY_VALLEY] : [...DOROTHY_BASE];
}

/**
 * forced 가 kind 를 낸다면 고를 수 있는 대상. 대상이 없는 카드면 [undefined].
 * forced 의 손패는 보지 않는다 (시키는 사람은 남의 손을 모른다). 실제로 낼 수 있는지는 낼 때 본다.
 */
function dorothyTargets(state: GameState, forced: PlayerId, kind: CardKind): (PlayerId | undefined)[] {
  const others = seatedPlayers(state).filter((t) => t.id !== forced && t.alive);
  const hasCards = (t: { hand: unknown[]; equipment: unknown[] }) => t.hand.length + t.equipment.length > 0;
  switch (kind) {
    case 'bang':
      return others.filter((t) => canReachWithBang(state, forced, t.id)).map((t) => t.id);
    case 'tomahawk':
      return others.filter((t) => canReachAtRange(state, forced, t.id, 2)).map((t) => t.id);
    case 'panic':
      return others.filter((t) => hasCards(t) && canReachAtRange(state, forced, t.id, 1)).map((t) => t.id);
    case 'catBalou':
      return others.filter(hasCards).map((t) => t.id);
    case 'duel':
      return others.map((t) => t.id);
    default:
      return [undefined];
  }
}

function eventAbilityActions(state: GameState, pid: PlayerId): Action[] {
  const ability = eventAbilityOf(state);
  const me = playerOf(state, pid);
  if (!ability || me.ghost || me.usedThisTurn.includes(eventAbilityKey(ability))) return [];

  if (ability === 'ladyRose') {
    return rightNeighborOf(state, pid, turnDirectionOf(state)) ? [{ type: 'eventAbility', pid, ability }] : [];
  }
  const out: Action[] = [];
  for (const x of alivePlayers(state)) {
    if (x.id === pid || x.ghost) continue;
    for (const kind of dorothyKinds(state)) {
      for (const target of dorothyTargets(state, x.id, kind)) {
        out.push({ type: 'eventAbility', pid, ability, forced: x.id, kind, ...(target ? { target } : {}) });
      }
    }
  }
  return out;
}

/**
 * 도로시 레이지로 시킨 수: forced 가 손의 kind 카드로 target 에게 낼 수 있는 수.
 * 그 카드가 없거나, 있어도 지금 그 대상에게 낼 수 없으면 null (그 사람이 손패를 보여 준다).
 */
export function forcedPlayOf(
  state: GameState,
  forced: PlayerId,
  kind: CardKind,
  target: PlayerId | undefined,
): Extract<Action, { type: 'playCard' }> | null {
  const x = playerOf(state, forced);
  for (const card of unique(x.hand)) {
    if (kindOf(card) !== kind || !canPlayCard(state, forced, kind, card, false)) continue;
    for (const a of kindActions(state, forced, card, kind, undefined, true)) {
      if (a.type !== 'playCard' || a.pick || a.extra || a.also || a.target2) continue;
      if (a.target === target) return a;
    }
  }
  return null;
}

/**
 * 갈색 카드 중 리 반 클리프가 다시 낼 수 없는 것. 차례에 혼자 낼 수 없는 카드뿐이다.
 * 뱅!은 다시 낼 수 있다 (공식 해설 "The brown-bordered card may be also another BANG!")
 */
const NOT_REPEATABLE: readonly CardKind[] = ['missed', 'aim'];

/** 리 반 클리프가 다시 낼 수 있는 갈색 카드 종류인가 */
export function isRepeatableBrown(kind: CardKind): boolean {
  return !NOT_REPEATABLE.includes(kind);
}

/**
 * 리 반 클리프: 방금 낸 갈색 카드를, 뱅! 카드를 버려 한 번 더 낸다.
 * 대상은 새로 고르므로 그 카드를 평소에 낼 때의 수를 그대로 쓰고 ability 만 붙인다.
 * 다시 낸 뱅!은 효과일 뿐이라 차례당 뱅! 횟수와 상관없이 낼 수 있다.
 * 버릴 카드는 뱅!으로 쓸 수 있는 카드면 된다 (결전 중에는 아무 카드나).
 */
function repeatBrownActions(state: GameState, pid: PlayerId): Action[] {
  const last = state.turn.lastBrown;
  if (!last || !isRepeatableBrown(last)) return [];
  const me = playerOf(state, pid);
  const out: Action[] = [];
  for (const ab of repeatAbilitiesOf(state, pid)) {
    for (const card of unique(me.hand)) {
      if (!canUseCardAs(state, pid, kindOf(card), ab.from)) continue;
      for (const a of kindActions(state, pid, card, last, last, true)) {
        if (a.type === 'playCard') out.push({ ...a, ability: ab.key });
      }
    }
  }
  return out;
}

/** 플린트 웨스트우드: 손의 카드 1장을, 손패가 있는 다른 사람과 맞바꾼다 */
function swapActions(state: GameState, pid: PlayerId): Action[] {
  const me = playerOf(state, pid);
  const out: Action[] = [];
  for (const ab of swapAbilitiesOf(state, pid)) {
    for (const t of alivePlayers(state)) {
      if (t.id === pid || t.hand.length === 0) continue;
      for (const card of unique(me.hand)) {
        out.push({ type: 'playCard', pid, card, target: t.id, ability: ab.key });
      }
    }
  }
  return out;
}

/** 손의 card 를 as 종류로 낼 때의 모든 수 (대상·조준·저격수까지) */
function kindActions(
  state: GameState,
  pid: PlayerId,
  card: CardId,
  as: CardKind,
  explicit: CardKind | undefined,
  bangsLeft: boolean,
): Action[] {
  const me = playerOf(state, pid);
  const out: Action[] = [];
  switch (as) {
    case 'bang': {
      // 리코체: 뱅!을 버려 앞에 놓인 카드를 노린다. 사용이 아니라 버림이라 횟수·거리를 보지 않는다.
      if (allowsRicochet(state)) {
        for (const t of seatedPlayers(state)) {
          if (t.id === pid) continue;
          for (const e of unique(t.equipment)) {
            out.push({
              type: 'playCard', pid, card, as: explicit, target: t.id,
              pick: { zone: 'equipment', card: e },
            });
          }
        }
      }
      if (!bangsLeft) break;
      // 조준: 뱅!과 함께 낼 수 있는 카드
      const aims = unique(me.hand).filter(
        (c) => c !== card && kindOf(c) === 'aim' && canPlayCard(state, pid, 'aim', c, false),
      );
      // 저격수: 뱅!으로 쓸 수 있는 두 번째 카드를 함께 버린다. 같은 쌍은 한 번만 연다.
      const partners = allowsDoubleBang(state)
        ? unique(me.hand).filter(
            (c) =>
              c > card &&
              canUseCardAs(state, pid, kindOf(c), 'bang') &&
              canPlayCard(state, pid, 'bang', c, false),
          )
        : [];
      for (const t of seatedPlayers(state)) {
        if (t.id === pid || !t.alive) continue;
        if (canReachWithBang(state, pid, t.id) && !immuneToCard(state, t.id, card, pid)) {
          out.push({ type: 'playCard', pid, card, as: explicit, target: t.id });
          for (const extra of aims) {
            out.push({ type: 'playCard', pid, card, as: explicit, target: t.id, extra });
          }
          for (const also of partners) {
            out.push({ type: 'playCard', pid, card, as: explicit, target: t.id, also });
          }
        }
      }
      break;
    }
    case 'fanning': {
      if (!bangsLeft) break;
      for (const t of seatedPlayers(state)) {
        if (t.id === pid || !t.alive) continue;
        if (!canReachWithBang(state, pid, t.id) || immuneToCard(state, t.id, card, pid)) continue;
        // 두 번째 표적: 첫 표적에서 거리 1, 나 제외 (원본 맵 v0.327)
        const seconds = alivePlayers(state).filter(
          (u) =>
            u.id !== pid &&
            u.id !== t.id &&
            distance(state, t.id, u.id) <= 1 &&
            !immuneToCard(state, u.id, card, pid),
        );
        if (seconds.length === 0) {
          out.push({ type: 'playCard', pid, card, as: explicit, target: t.id });
        }
        for (const u of seconds) {
          out.push({ type: 'playCard', pid, card, as: explicit, target: t.id, target2: u.id });
        }
      }
      break;
    }
    case 'aim':
      // 조준은 뱅!과 함께만 낸다.
      break;
    case 'missed':
      // 빗나감!은 반응으로만 낸다.
      break;
    case 'beer':
      // 낼 수는 있다. 생존자가 2명뿐이거나 목숨이 가득이면 효과가 없을 뿐이다.
      out.push({ type: 'playCard', pid, card, as: explicit });
      break;
    case 'lastCall':
      // 맥주가 아니므로 2인에도 쓸 수 있다.
      if (me.hp < me.maxHp && !me.ghost) {
        out.push({ type: 'playCard', pid, card, as: explicit });
      }
      break;
    case 'tomahawk':
      // 무기와 무관하게 거리 2 이내. 뱅! 카드가 아니라 횟수를 쓰지 않는다.
      for (const t of seatedPlayers(state)) {
        if (t.id === pid || !t.alive) continue;
        // 칼루멧: 남이 낸 ♦ 카드(토마호크 ♦A)는 효과가 없다
        if (canReachAtRange(state, pid, t.id, 2) && !immuneToCard(state, t.id, card, pid)) {
          out.push({ type: 'playCard', pid, card, as: explicit, target: t.id });
        }
      }
      break;
    case 'saloon':
    case 'stagecoach':
    case 'wellsFargo':
    case 'generalStore':
    case 'gatling':
    case 'indians':
    case 'bandidos':
    case 'poker':
    case 'tornado':
      out.push({ type: 'playCard', pid, card, as: explicit });
      break;
    case 'duel':
      for (const t of alivePlayers(state)) {
        if (t.id === pid) continue;
        out.push({ type: 'playCard', pid, card, as: explicit, target: t.id });
      }
      break;
    case 'panic':
      for (const t of seatedPlayers(state)) {
        if (t.hand.length === 0 && t.equipment.length === 0) continue;
        // 자기 앞의 카드(다이너마이트 등)는 스스로 치울 수 있다.
        if (t.id === pid) {
          if (t.equipment.length > 0) {
            out.push({ type: 'playCard', pid, card, as: explicit, target: pid });
          }
          continue;
        }
        if (canReachAtRange(state, pid, t.id, 1) && !immuneToCard(state, t.id, card, pid)) {
          out.push({ type: 'playCard', pid, card, as: explicit, target: t.id });
        }
      }
      break;
    case 'catBalou':
      for (const t of seatedPlayers(state)) {
        if (t.id === pid) {
          if (t.equipment.length > 0) {
            out.push({ type: 'playCard', pid, card, as: explicit, target: pid });
          }
          continue;
        }
        if (
          (t.hand.length > 0 || t.equipment.length > 0) &&
          !immuneToCard(state, t.id, card, pid)
        ) {
          out.push({ type: 'playCard', pid, card, as: explicit, target: t.id });
        }
      }
      break;
    case 'jail': {
      for (const t of alivePlayers(state)) {
        // 감옥은 보안관에게 쓸 수 없고, 자기 자신에게도 쓰지 않는다.
        if (t.id === pid || t.role === 'sheriff') continue;
        if (hasSameBlueCard(state, t.id, 'jail')) continue;
        if (immuneToCard(state, t.id, card, pid)) continue;
        out.push({ type: 'playCard', pid, card, as: explicit, target: t.id });
      }
      break;
    }
    default: {
      // 나머지 파랑 카드는 자기 앞에 장착한다.
      const def = CARD_DEFS[as];
      if (def.category !== 'blue') break;
      if (def.equip === 'other') {
        // 방울뱀·포상금: 다른 생존자 앞에 (같은 이름이 이미 있으면 안 된다)
        for (const t of alivePlayers(state)) {
          if (t.id === pid || hasSameBlueCard(state, t.id, as)) continue;
          out.push({ type: 'playCard', pid, card, as: explicit, target: t.id });
        }
      } else if (def.equip === 'eliminated') {
        // 유령: 제거되어 자리에 없는 사람 앞에
        for (const t of state.players) {
          if (t.alive || t.ghost || hasSameBlueCard(state, t.id, as)) continue;
          out.push({ type: 'playCard', pid, card, as: explicit, target: t.id });
        }
      } else if (def.equip === 'weapon') {
        out.push({ type: 'playCard', pid, card, as: explicit });
      } else if (!hasSameBlueCard(state, pid, as)) {
        out.push({ type: 'playCard', pid, card, as: explicit });
      }
      break;
    }
  }
  return out;
}

/**
 * 조건이 붙은 차례당 한 번 능력 (블랙 플라워 ♣ → 추가 뱅!, 더 스팟 뱅! → 기관총).
 * 액션에 ability 를 명시해서, 같은 카드를 일반으로 내는 것과 구별한다.
 */
function explicitAbilityActions(state: GameState, pid: PlayerId, bangsLeft: boolean): Action[] {
  const me = playerOf(state, pid);
  const out: Action[] = [];
  for (const ab of playAnyAsAbilitiesOf(state, pid)) {
    if (!isExplicitAbility(ab)) continue;
    for (const card of unique(me.hand)) {
      const own = kindOf(card);
      if (ab.from && !ab.from.includes(own)) continue;
      if (ab.suit && effectiveSuit(state, card) !== ab.suit) continue;
      if (!canPlayCard(state, pid, ab.as, card, false)) continue;
      const as = ab.as === own ? undefined : ab.as;
      if (ab.as === 'bang') {
        if (!ab.extra && !bangsLeft) continue;
        for (const t of seatedPlayers(state)) {
          if (t.id === pid || !t.alive || !canReachWithBang(state, pid, t.id)) continue;
          out.push({ type: 'playCard', pid, card, as, target: t.id, ability: ab.key });
        }
      } else if (CARD_DEFS[ab.as].category === 'brown') {
        out.push({ type: 'playCard', pid, card, as, ability: ab.key });
      }
    }
  }
  return out;
}

/** 지금 이 사람이 반응으로 낼 수 있는 카드가 있는가 (UI 힌트용) */
export function hasReaction(state: GameState, pid: PlayerId, as: CardKind): boolean {
  return playableAs(state, pid, as, true).length > 0;
}
