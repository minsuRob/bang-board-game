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
  inPlay,
  kindOf,
  playerOf,
  seatedPlayers,
  topFrame,
} from './cards';
import { canReachAtRange, canReachWithBang } from './distance';
import {
  anytimeAbilitiesOf,
  bangLimitOf,
  canPlayCard,
  canUseCardAs,
  playableAs,
} from './hooks';
import { hasSameBlueCard } from './play';
import type { Action, GameState, PlayerId } from './types';

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
              : c.c === 'pick'
                ? c.pick.zone === 'hand'
                  ? `h${c.pick.index}`
                  : `e${c.pick.card}`
                : '';
      return ['respond', action.pid, c.c, detail].join('|');
    }
    case 'useAbility':
      return ['useAbility', action.pid, action.ability, [...(action.cards ?? [])].sort().join(',')].join('|');
    case 'discardCard':
      return ['discardCard', action.pid, action.card].join('|');
    case 'endTurn':
      return ['endTurn', action.pid].join('|');
    case 'timeout':
      return ['timeout', action.pid].join('|');
    case 'startGame':
      return 'startGame';
  }
}

/** 이 플레이어가 지금 낼 수 있는 모든 액션 */
export function legalActions(state: GameState, pid: PlayerId): Action[] {
  if (state.result) return [];

  const out: Action[] = [];
  const me = state.players.find((p) => p.id === pid);
  if (!me || !inPlay(me)) return out;

  out.push(...anytimeActions(state, pid));

  if (state.awaiting) {
    if (state.awaiting.pid === pid) out.push(...respondActions(state, pid));
    return out;
  }

  if (state.turn.active !== pid) return out;

  const top = topFrame(state);
  if (top?.k === 'playPhase' && state.turn.phase === 'play') {
    out.push(...playPhaseActions(state, pid));
    out.push({ type: 'endTurn', pid });
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
    case 'luckyDuke':
    case 'generalStore':
    case 'kitCarlson':
    case 'daltonsDiscard':
      for (const card of unique(a.options)) {
        out.push({ type: 'respond', pid, choice: { c: 'card', card } });
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
    case 'newIdentity':
      out.push({ type: 'respond', pid, choice: { c: 'yes' } });
      out.push(pass);
      break;
    case 'declareSuit':
      for (const suit of SUITS) {
        out.push({ type: 'respond', pid, choice: { c: 'suit', suit: suit as Suit } });
      }
      break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 카드 사용 단계
// ---------------------------------------------------------------------------

/** 손에 든 카드를 어떤 종류로 쓸 수 있는지 (칼라미티 자넷 치환 포함) */
function usableKinds(state: GameState, pid: PlayerId, card: CardId): CardKind[] {
  const own = kindOf(card);
  const kinds = new Set<CardKind>([own]);
  // 지금은 뱅!↔빗나감! 치환만 존재한다.
  for (const as of ['bang', 'missed'] as CardKind[]) {
    if (canUseCardAs(state, pid, own, as)) kinds.add(as);
  }
  return [...kinds];
}

function playPhaseActions(state: GameState, pid: PlayerId): Action[] {
  const me = playerOf(state, pid);
  const out: Action[] = [];
  const survivors = alivePlayers(state).length;
  const bangsLeft = state.turn.bangsPlayed < bangLimitOf(state, pid);

  for (const card of unique(me.hand)) {
    for (const as of usableKinds(state, pid, card)) {
      if (!canPlayCard(state, pid, as, card, false)) continue;
      const explicit = as === kindOf(card) ? undefined : as;

      switch (as) {
        case 'bang': {
          if (!bangsLeft) break;
          for (const t of seatedPlayers(state)) {
            if (t.id === pid || !t.alive) continue;
            if (canReachWithBang(state, pid, t.id)) {
              out.push({ type: 'playCard', pid, card, as: explicit, target: t.id });
            }
          }
          break;
        }
        case 'missed':
          // 빗나감!은 반응으로만 낸다.
          break;
        case 'beer':
          // 생존자가 2명뿐이면 맥주는 아무 효과가 없다.
          if (survivors > 2 && me.hp < me.maxHp) {
            out.push({ type: 'playCard', pid, card, as: explicit });
          }
          break;
        case 'saloon':
        case 'stagecoach':
        case 'wellsFargo':
        case 'generalStore':
        case 'gatling':
        case 'indians':
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
            if (canReachAtRange(state, pid, t.id, 1)) {
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
            if (t.hand.length > 0 || t.equipment.length > 0) {
              out.push({ type: 'playCard', pid, card, as: explicit, target: t.id });
            }
          }
          break;
        case 'jail': {
          for (const t of alivePlayers(state)) {
            // 감옥은 보안관에게 쓸 수 없고, 자기 자신에게도 쓰지 않는다.
            if (t.id === pid || t.role === 'sheriff') continue;
            if (hasSameBlueCard(state, t.id, 'jail')) continue;
            out.push({ type: 'playCard', pid, card, as: explicit, target: t.id });
          }
          break;
        }
        default: {
          // 나머지 파랑 카드는 자기 앞에 장착한다.
          const def = CARD_DEFS[as];
          if (def.category !== 'blue') break;
          if (def.equip === 'weapon') {
            out.push({ type: 'playCard', pid, card, as: explicit });
          } else if (!hasSameBlueCard(state, pid, as)) {
            out.push({ type: 'playCard', pid, card, as: explicit });
          }
          break;
        }
      }
    }
  }
  return out;
}

/** 지금 이 사람이 반응으로 낼 수 있는 카드가 있는가 (UI 힌트용) */
export function hasReaction(state: GameState, pid: PlayerId, as: CardKind): boolean {
  return playableAs(state, pid, as, true).length > 0;
}
