/**
 * 휴리스틱 행동 점수.
 *
 * "지금 이 수가 얼마나 좋아 보이는가"를 한 번의 조회로 매긴다.
 * 중 난이도는 이 점수만으로 두고, 상 난이도는 이 점수로 후보를 추린 뒤
 * 시뮬레이션으로 다시 고른다.
 */

import { CARD_DEFS } from '../data/cards.base';
import type { CardId, CardKind, Suit } from '../data/types';
import { SUITS } from '../data/types';
import {
  alivePlayers,
  canReachWithBang,
  effectiveSuit,
  kindOf,
  playerOf,
  weaponRangeOf,
  type Action,
  type GameState,
  type PlayerId,
} from '../engine';
import { isHidden } from '../engine/view';
import { analyze, hostility, type Beliefs } from './belief';
import { cardValue, danger } from './evaluate';

const NEUTRAL = 0;

export function beliefsFor(view: GameState, me: PlayerId, naive = false): Beliefs {
  return analyze(view, me, naive);
}

/** 손패에서 이 종류의 카드를 몇 장 들고 있는가 */
function countKind(view: GameState, pid: PlayerId, kind: CardKind): number {
  return playerOf(view, pid).hand.filter((c) => !isHidden(c) && kindOf(c) === kind).length;
}

function safeKind(card: CardId): CardKind | null {
  return isHidden(card) ? null : kindOf(card);
}

export function scoreAction(
  view: GameState,
  me: PlayerId,
  action: Action,
  beliefs: Beliefs,
): number {
  switch (action.type) {
    case 'playCard':
      return scorePlay(view, me, action, beliefs);
    case 'respond':
      return scoreRespond(view, me, action, beliefs);
    case 'discardCard': {
      const kind = safeKind(action.card);
      // 값어치가 낮은 카드를 버릴수록 좋다.
      return kind ? 20 - cardValue(kind) : 0;
    }
    case 'useAbility':
      // 시드 케첨: 위급할수록 값어치가 오른다.
      return danger(view, me) > 0.6 ? 14 : -4;
    case 'endTurn':
      return NEUTRAL;
    default:
      return NEUTRAL;
  }
}

// ---------------------------------------------------------------------------
// 카드 사용
// ---------------------------------------------------------------------------

function scorePlay(
  view: GameState,
  me: PlayerId,
  action: Action & { type: 'playCard' },
  beliefs: Beliefs,
): number {
  const my = playerOf(view, me);
  const kind = action.as ?? safeKind(action.card);
  if (!kind) return 0;

  const target = action.target ? playerOf(view, action.target) : null;
  const enemy = target ? hostility(view, me, target.id, beliefs) : 0;
  const survivors = alivePlayers(view).length;

  switch (kind) {
    case 'bang': {
      if (!target) return -10;
      let s = 12 * enemy;
      // 마지막 한 대면 크게 오른다
      if (target.hp === 1) s += 18 * enemy;
      // 술통을 낀 상대는 기대값이 떨어진다
      if (target.equipment.some((c) => kindOf(c) === 'barrel')) s -= 3;
      // 손에 뱅!이 넘치면 아끼지 않는다
      s += Math.min(3, countKind(view, me, 'bang') - 1);
      return s;
    }
    case 'missed':
      // 자기 차례에 낼 이유가 없다
      return -20;
    case 'beer': {
      const d = danger(view, me);
      if (my.hp >= my.maxHp) return -20;
      return d > 0.7 ? 16 : d > 0.4 ? 5 : -2;
    }
    case 'saloon': {
      // 나와 아군이 얼마나 회복하는가에서, 적이 회복하는 만큼을 뺀다
      let s = my.hp < my.maxHp ? 5 : -2;
      for (const p of alivePlayers(view)) {
        if (p.id === me || p.hp >= p.maxHp) continue;
        s += hostility(view, me, p.id, beliefs) > 0.5 ? -3 : 2;
      }
      return s;
    }
    case 'stagecoach':
      return 9;
    case 'wellsFargo':
      return 13;
    case 'generalStore':
      // 내가 먼저 고르니 이득이지만 모두가 카드를 얻는다
      return survivors <= 4 ? 7 : 4;
    case 'gatling': {
      let s = 0;
      for (const p of alivePlayers(view)) {
        if (p.id === me) continue;
        const h = hostility(view, me, p.id, beliefs);
        s += h > 0.5 ? 9 : -6;
        if (p.hp === 1 && h > 0.5) s += 10;
      }
      return s;
    }
    case 'indians': {
      let s = 0;
      for (const p of alivePlayers(view)) {
        if (p.id === me) continue;
        const h = hostility(view, me, p.id, beliefs);
        // 뱅!을 버리게 만드는 것 자체도 이득이다
        s += h > 0.5 ? 7 : -5;
      }
      return s;
    }
    case 'duel': {
      if (!target) return -10;
      // 내 손의 뱅!이 많을수록 이길 가능성이 높다
      const myBangs = countKind(view, me, 'bang');
      const edge = myBangs - Math.min(2, target.hand.length / 2);
      return 10 * enemy + edge * 3;
    }
    case 'panic': {
      if (!target) return -10;
      if (target.id === me) {
        // 자기 앞의 다이너마이트를 치우는 용도
        return my.equipment.some((c) => kindOf(c) === 'dynamite') ? 14 : -8;
      }
      let s = 9 * enemy;
      if (target.equipment.some((c) => kindOf(c) === 'barrel')) s += 5;
      if (target.equipment.some((c) => CARD_DEFS[kindOf(c)].equip === 'weapon')) s += 4;
      return s;
    }
    case 'catBalou': {
      if (!target) return -10;
      if (target.id === me) {
        return my.equipment.some((c) => kindOf(c) === 'dynamite') ? 15 : -8;
      }
      let s = 8 * enemy;
      if (target.equipment.some((c) => kindOf(c) === 'barrel')) s += 5;
      if (target.hand.length === 0 && target.equipment.length === 0) s -= 20;
      return s;
    }
    case 'jail': {
      if (!target) return -10;
      // 강한 적의 차례를 통째로 날린다
      return 12 * enemy + (target.hand.length > 3 ? 3 : 0);
    }
    case 'dynamite':
      // 스스로 들 이유가 거의 없다. 아주 가끔만.
      return -6;
    case 'barrel':
      return 11;
    case 'mustang':
      return 9;
    case 'scope':
      return 8;
    default: {
      const def = CARD_DEFS[kind];
      if (def.equip === 'weapon') {
        const gain = (def.weaponRange ?? 1) - weaponRangeOf(view, me);
        return gain > 0 ? 6 + gain * 3 : -3;
      }
      return 1;
    }
  }
}

// ---------------------------------------------------------------------------
// 반응
// ---------------------------------------------------------------------------

function scoreRespond(
  view: GameState,
  me: PlayerId,
  action: Action & { type: 'respond' },
  beliefs: Beliefs,
): number {
  const a = view.awaiting;
  if (!a) return 0;
  const choice = action.choice;
  const my = playerOf(view, me);

  switch (a.k) {
    case 'beerToSurvive':
      // 살 수 있으면 무조건 산다
      return choice.c === 'card' ? 100 : -100;

    case 'missed': {
      if (choice.c !== 'card') {
        // 목숨이 넉넉하고 빗나감이 귀하면 그냥 맞는 편이 나을 때도 있다
        return my.hp > 2 ? -2 : -30;
      }
      const kind = safeKind(choice.card);
      // 뱅!을 빗나감으로 쓰는 것(칼라미티 자넷)은 조금 아깝다
      return kind === 'bang' ? 22 : 25;
    }

    case 'indiansBang':
      if (choice.c !== 'card') return my.hp > 2 ? -3 : -25;
      return 20;

    case 'duelBang':
      if (choice.c !== 'card') return my.hp > 2 ? -5 : -30;
      return 22;

    case 'judgementChoice': {
      if (choice.c !== 'card') return 0;
      const suit = effectiveSuit(view, choice.card);
      if (a.purpose === 'dynamite') {
        const def = CARD_DEFS[kindOf(choice.card)];
        void def;
        // 터지지 않는 쪽을 고른다
        return explodes(view, choice.card) ? -50 : 50;
      }
      return suit === 'hearts' ? 50 : -50;
    }

    case 'generalStore':
    case 'kitCarlson': {
      if (choice.c !== 'card') return 0;
      const kind = safeKind(choice.card);
      return kind ? cardValue(kind) * 4 : 0;
    }

    case 'daltonsDiscard': {
      if (choice.c !== 'card') return 0;
      const kind = safeKind(choice.card);
      // 값어치가 낮은 장비를 버린다
      return kind ? 40 - cardValue(kind) * 4 : 0;
    }

    case 'stealCard': {
      if (choice.c !== 'pick') return 0;
      if (choice.pick.zone === 'equipment') {
        const kind = safeKind(choice.pick.card);
        return kind ? 20 + cardValue(kind) * 3 : 20;
      }
      // 손패는 뒷면이라 어느 장이든 같다
      return 20;
    }

    case 'jesseJones': {
      if (choice.c !== 'player') return 5;
      const t = playerOf(view, choice.pid);
      return 10 * hostility(view, me, t.id, beliefs) + Math.min(4, t.hand.length);
    }

    case 'pedroRamirez': {
      if (choice.c !== 'yes') return 5;
      const top = a.topDiscard;
      const kind = safeKind(top);
      return kind ? cardValue(kind) * 2 : 5;
    }

    case 'newIdentity':
      // 목숨이 2 이하로 떨어졌으면 새 신분이 이득이다
      return choice.c === 'yes' ? (my.hp <= 2 ? 20 : -10) : 0;

    case 'declareSuit': {
      if (choice.c !== 'suit') return 0;
      return handSuitCount(view, me, choice.suit) * 10;
    }

    default:
      return 0;
  }
}

function explodes(view: GameState, card: CardId): boolean {
  const suit = effectiveSuit(view, card);
  if (suit !== 'spades') return false;
  const rank = card.split('-')[1]?.slice(1) ?? '';
  const value = rank === 'A' ? 1 : rank === 'J' ? 11 : rank === 'Q' ? 12 : rank === 'K' ? 13 : Number(rank);
  return value >= 2 && value <= 9;
}

function handSuitCount(view: GameState, me: PlayerId, suit: Suit): number {
  return playerOf(view, me).hand.filter(
    (c) => !isHidden(c) && effectiveSuit(view, c) === suit,
  ).length;
}

/** 선언할 무늬 후보 중 가장 많이 들고 있는 것 */
export function bestSuit(view: GameState, me: PlayerId): Suit {
  return [...SUITS].sort((a, b) => handSuitCount(view, me, b) - handSuitCount(view, me, a))[0];
}

/** 사정거리 안에 있는 적들 (UI 힌트와 공유하기 좋은 형태) */
export function reachableEnemies(
  view: GameState,
  me: PlayerId,
  beliefs: Beliefs,
): { id: PlayerId; hostility: number }[] {
  return alivePlayers(view)
    .filter((p) => p.id !== me && canReachWithBang(view, me, p.id))
    .map((p) => ({ id: p.id, hostility: hostility(view, me, p.id, beliefs) }))
    .sort((a, b) => b.hostility - a.hostility);
}
