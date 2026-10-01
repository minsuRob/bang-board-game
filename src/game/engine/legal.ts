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
import { canReachAtRange, canReachWithBang, distance } from './distance';
import {
  anytimeAbilitiesOf,
  bangLimitOf,
  canPlayCard,
  canUseCardAs,
  isExplicitAbility,
  immuneToCard,
  playAnyAsAbilitiesOf,
  playableAs,
} from './hooks';
import { hasSameBlueCard } from './play';
import { goldDyingActions, goldPlayActions } from './gold-actions';
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
        action.target2 ?? '',
        action.extra ?? '',
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
    out.push(...playPhaseActions(state, pid));
    out.push(...goldPlayActions(state, pid));
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
    case 'judgementChoice':
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
    case 'newIdentity':
      out.push({ type: 'respond', pid, choice: { c: 'yes' } });
      out.push(pass);
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

      switch (as) {
        case 'bang': {
          if (!bangsLeft) break;
          // 조준: 뱅!과 함께 낼 수 있는 카드
          const aims = unique(me.hand).filter(
            (c) => c !== card && kindOf(c) === 'aim' && canPlayCard(state, pid, 'aim', c, false),
          );
          for (const t of seatedPlayers(state)) {
            if (t.id === pid || !t.alive) continue;
            if (canReachWithBang(state, pid, t.id) && !immuneToCard(state, t.id, card, pid)) {
              out.push({ type: 'playCard', pid, card, as: explicit, target: t.id });
              for (const extra of aims) {
                out.push({ type: 'playCard', pid, card, as: explicit, target: t.id, extra });
              }
            }
          }
          break;
        }
        case 'fanning': {
          if (!bangsLeft) break;
          for (const t of seatedPlayers(state)) {
            if (t.id === pid || !t.alive) continue;
            if (!canReachWithBang(state, pid, t.id)) continue;
            // 두 번째 표적: 첫 표적에서 거리 1, 나 제외 (원본 맵 v0.327)
            const seconds = alivePlayers(state).filter(
              (u) => u.id !== pid && u.id !== t.id && distance(state, t.id, u.id) <= 1,
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
            if (canReachAtRange(state, pid, t.id, 2)) {
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
    }
  }
  out.push(...explicitAbilityActions(state, pid, bangsLeft));
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
