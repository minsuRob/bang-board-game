/**
 * 휴리스틱 행동 점수.
 *
 * "지금 이 수가 얼마나 좋아 보이는가"를 한 번의 조회로 매긴다.
 * 중 난이도는 이 점수만으로 두고, 상 난이도는 이 점수로 후보를 추린 뒤
 * 시뮬레이션으로 다시 고른다.
 */

import { BASE_CARDS_BY_ID, CARD_DEFS } from '../data/cards.base';
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
import {
  canUseCardAs,
  handLimitOf,
  isRepeatAbility,
  isSwapAbility,
  outgoingBangMissesOf,
  turnDirectionOf,
} from '../engine/hooks';
import { rightNeighborOf } from '../engine/distance';
import { CHARACTER_VALUE } from './draft';
import { scoreGold } from './gold-policy';
import {
  analyze,
  hostility,
  situation,
  type Beliefs,
  type InferDepth,
  type Situation,
} from './belief';
import { cardValue, danger } from './evaluate';
import { firstWinsDuel, knownHand, knownReactive } from './open-hands';

const NEUTRAL = 0;

export function beliefsFor(view: GameState, me: PlayerId, depth: InferDepth = 'full'): Beliefs {
  return analyze(view, me, depth);
}

/** 이보다 적대도가 낮으면 같은 편으로 본다 */
const FRIEND = 0.15;

function hasKind(cards: readonly CardId[], kind: CardKind): boolean {
  return cards.some((c) => !isHidden(c) && kindOf(c) === kind);
}

/**
 * 보안관이 죽으면 지는 쪽인가.
 * 보안관 편은 물론이고, 무법자가 살아 있는 동안의 배신자도 그렇다.
 */
function needsSheriffAlive(view: GameState, me: PlayerId, sit: Situation): boolean {
  const role = playerOf(view, me).role;
  if (role === 'sheriff' || role === 'deputy') return true;
  return role === 'renegade' && sit.alive.outlaw > 0.5 && sit.othersAlive > 1;
}

/**
 * 광역 카드 (기관총·인디언).
 * 적이 맞는 만큼 더하고 같은 편이 맞는 만큼 뺀다. 보안관이 한 방에 죽을 수 있으면
 * 역할에 따라 결정타이거나 자살이다.
 */
function scoreArea(
  view: GameState,
  me: PlayerId,
  beliefs: Beliefs,
  sit: Situation,
  perHit: number,
  dodge?: CardKind,
): number {
  let s = 0;
  for (const p of alivePlayers(view)) {
    if (p.id === me) continue;
    const h = hostility(view, me, p.id, beliefs, sit);
    const w = (h - 0.4) * perHit * (dodge ? areaHitWeight(view, p.id, dodge) : 1);
    s += w;
    if (p.hp === 1) s += w;
  }
  if (sit.sheriffId && sit.sheriffId !== me) {
    const role = playerOf(view, me).role;
    if (needsSheriffAlive(view, me, sit)) {
      if (sit.sheriffHp === 1) s -= 100;
      else if (sit.sheriffHp === 2) s -= 12;
    } else if (role === 'outlaw' && sit.sheriffHp === 1) {
      s += 30;
    }
  }
  return s;
}

/**
 * 광역 카드가 그 사람에게 실제로 들어가는 정도.
 * 손패가 펼쳐져 있으면(사카가웨이) 막을 카드가 있는지 안다. 막더라도 카드 한 장은 쓰게 한다.
 */
function areaHitWeight(view: GameState, pid: PlayerId, dodge: CardKind): number {
  const n = knownReactive(view, pid, dodge);
  if (n === null) return 1;
  return n > 0 ? 0.35 : 1.25;
}

/**
 * 손패가 펼쳐져 있을 때 뱅!(같은 계열)이 들어갈지 보고 점수를 고친다.
 * 막을 빗나감!이 모자라면 확실히 맞고, 넉넉하면 빗나감! 한 장만 버리게 한다.
 * 술통은 판정이라 여전히 운이다. 손을 모르면 0.
 */
function openHandBangEdge(view: GameState, target: PlayerId, needed: number, enemy: number): number {
  const dodges = knownReactive(view, target, 'missed');
  if (dodges === null) return 0;
  const t = playerOf(view, target);
  const barrel = t.equipment.some((c) => !isHidden(c) && kindOf(c) === 'barrel');
  if (dodges >= needed) return -6 * enemy;
  let s = (barrel ? 3 : 6) * enemy;
  if (t.hp === 1) s += (barrel ? 4 : 10) * enemy;
  return s;
}

/**
 * 결투를 걸면 이기는가. 지목당한 쪽이 먼저 내므로 상대가 내 장수보다 많이 쥐어야 이긴다.
 * 상대 손을 모르면 null.
 */
function duelOutcome(view: GameState, me: PlayerId, target: PlayerId, spent: CardId): 'win' | 'lose' | null {
  const theirs = knownReactive(view, target, 'bang');
  if (theirs === null) return null;
  return firstWinsDuel(theirs, duelAmmo(view, me, spent)) ? 'lose' : 'win';
}

/**
 * 같은 편을 해치는 수인가.
 *
 * 하 난이도는 자주 엉뚱한 수를 두지만, 같은 편을 쏘는 일만은 하지 않는다.
 * 사람도 초보는 수를 못 읽을 뿐 제 편이 누군지는 안다.
 */
export function isBetrayal(view: GameState, me: PlayerId, action: Action, beliefs: Beliefs): boolean {
  if (action.type !== 'playCard') return false;
  const kind = action.as ?? safeKind(action.card);
  if (!kind) return false;
  const sit = situation(view, me, beliefs);

  if (kind === 'gatling' || kind === 'indians') {
    return needsSheriffAlive(view, me, sit) && sit.sheriffHp === 1 && sit.sheriffId !== me;
  }
  if (!action.target || action.target === me) return false;
  const h = hostility(view, me, action.target, beliefs, sit);
  if (h >= FRIEND) return false;
  if (kind === 'bang' || kind === 'duel' || kind === 'jail') return true;
  if (kind === 'panic' || kind === 'catBalou') {
    // 같은 편의 감옥·다이너마이트를 떼어 주는 것은 돕는 수다
    const eq = playerOf(view, action.target).equipment;
    return !hasKind(eq, 'jail') && !hasKind(eq, 'dynamite');
  }
  return false;
}

/**
 * 결투에서 맞받아 낼 수 있는 카드 수. 결투를 거는 데 쓰는 카드는 빼고 센다.
 * 빗나감!을 뱅!으로 내는 능력(캘러미티 자넷)도 Modifier 훅으로 함께 센다.
 */
function duelAmmo(view: GameState, me: PlayerId, spent: CardId): number {
  return playerOf(view, me).hand.filter(
    (c) => c !== spent && !isHidden(c) && canUseCardAs(view, me, kindOf(c), 'bang'),
  ).length;
}

/**
 * 반드시 지는 결투인가.
 *
 * 내 손에 맞받아 낼 카드가 한 장도 없고 상대 손에 카드가 있으면, 상대가 뱅!을
 * 한 장이라도 쥐었을 때 목숨만 잃는다. 이길 길이 없으니 하·중·상 모두 걸지 않는다.
 * 손패가 펼쳐져 있으면 상대가 내 장수보다 많이 쥐었을 때 반드시 진다.
 */
export function isHopelessDuel(view: GameState, me: PlayerId, action: Action): boolean {
  if (action.type !== 'playCard' || !action.target || action.target === me) return false;
  const kind = action.as ?? safeKind(action.card);
  if (kind !== 'duel') return false;
  const target = playerOf(view, action.target);
  // 손패가 펼쳐져 있으면 셈으로 안다 (사카가웨이)
  const known = duelOutcome(view, me, target.id, action.card);
  if (known) return known === 'lose';
  return target.hand.length > 0 && duelAmmo(view, me, action.card) === 0;
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
      if (isSwapAbility(view, me, action.ability)) return scoreSwap(view, me, action, beliefs);
      // 리 반 클리프: 뱅! 한 장을 치르고 같은 효과를 한 번 더 낸다
      if (isRepeatAbility(view, me, action.ability)) {
        return scorePlay(view, me, action, beliefs) - cardValue('bang') * 0.8;
      }
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
    case 'eventAbility':
      return scoreEventAbility(view, me, action, beliefs);
    case 'endTurn':
      return NEUTRAL;
    case 'buyGold':
    case 'removeGold':
    case 'beerForGold':
    case 'goldAbility':
      return scoreGold(view, me, action, beliefs);
    default:
      return NEUTRAL;
  }
}

// ---------------------------------------------------------------------------
// 이벤트 행동 (와일드 웨스트 쇼)
// ---------------------------------------------------------------------------

/** 도로시 레이지로 남에게 시켜서 좋은 카드: 대상을 치는 카드 */
const FORCED_ATTACK: Partial<Record<CardKind, number>> = { bang: 10, duel: 8, panic: 7, catBalou: 6, tomahawk: 9 };

/**
 * 레이디 로즈: 오른쪽 사람이 차례를 한 번 잃는다. 적이면 좋고 같은 편이면 나쁘다.
 * 도로시 레이지: 시킨 사람이 그 카드를 가졌을 확률 × 대상을 친 값. 남의 손은 모르니 장수로 어림한다.
 */
function scoreEventAbility(
  view: GameState,
  me: PlayerId,
  action: Extract<Action, { type: 'eventAbility' }>,
  beliefs: Beliefs,
): number {
  const sit = situation(view, me, beliefs);
  if (action.ability === 'ladyRose') {
    const right = rightNeighborOf(view, me, turnDirectionOf(view));
    if (!right) return -10;
    const h = hostility(view, me, right, beliefs, sit);
    return h >= 0.5 ? 6 + 6 * h : -8;
  }
  const { forced, kind, target } = action;
  if (!forced || !kind) return -10;
  const per = FORCED_ATTACK[kind];
  if (per === undefined || !target || target === me) return -6;
  const x = view.players.find((p) => p.id === forced);
  if (!x) return -10;
  // 펼쳐진 손패(사카가웨이)면 확실히 안다
  const seen = x.hand.filter((c) => !isHidden(c));
  const odds = seen.length === x.hand.length
    ? (seen.some((c) => kindOf(c) === kind) ? 1 : 0)
    : Math.min(1, (x.hand.length * countInDeck(kind)) / 80);
  const enemy = hostility(view, me, target, beliefs, sit);
  if (enemy < FRIEND) return -6;
  // 같은 편에게 시키면 그 사람의 카드를 쓰게 만드는 셈이라 조금 뺀다
  const cost = hostility(view, me, forced, beliefs, sit) < FRIEND ? 2 : 0;
  return odds * per * enemy - cost - 1;
}

function countInDeck(kind: CardKind): number {
  let n = 0;
  for (const c of BASE_CARDS_BY_ID.values()) if (c.kind === kind) n++;
  return Math.max(1, n);
}

// ---------------------------------------------------------------------------
// 카드 사용
// ---------------------------------------------------------------------------

/**
 * 플린트 웨스트우드: 덜 아까운 카드 1장을 주고 무작위로 2장을 받는다.
 * 손패가 많은 적에게서 빼앗을수록 좋고, 같은 편의 손은 건드리지 않는다.
 */
function scoreSwap(
  view: GameState,
  me: PlayerId,
  action: Action & { type: 'playCard' },
  beliefs: Beliefs,
): number {
  if (!action.target) return -10;
  const target = playerOf(view, action.target);
  const enemy = hostility(view, me, target.id, beliefs, situation(view, me, beliefs));
  if (enemy < FRIEND) return -8;
  const given = safeKind(action.card);
  const cost = given ? cardValue(given) : 5;
  const taken = Math.min(2, target.hand.length);
  // 무작위로 받는 카드 한 장의 값어치는 대략 4
  return taken * 4 - cost * 1.2 + 3 * enemy + Math.min(2, target.hand.length - 2);
}

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
  const sit = situation(view, me, beliefs);
  const enemy = target ? hostility(view, me, target.id, beliefs, sit) : 0;
  const survivors = alivePlayers(view).length;
  const friend = target !== null && target.id !== me && enemy < FRIEND;

  switch (kind) {
    case 'bang': {
      if (!target) return -10;
      // 리코체: 뱅!을 버려 앞에 놓인 카드 한 장을 노린다
      if (action.pick?.zone === 'equipment') return scoreRicochet(action.pick.card, friend, enemy);
      if (friend) return -12;
      let s = 12 * enemy;
      // 마지막 한 대면 크게 오른다
      if (target.hp === 1) s += 18 * enemy;
      // 술통을 낀 상대는 기대값이 떨어진다
      if (target.equipment.some((c) => kindOf(c) === 'barrel')) s -= 3;
      // 손패가 펼쳐져 있으면 빗나감!이 있는지 안다
      const needed = action.also !== undefined ? 2 : outgoingBangMissesOf(view, me);
      s += openHandBangEdge(view, target.id, needed, enemy);
      // 손에 뱅!이 넘치면 아끼지 않는다
      s += Math.min(3, countKind(view, me, 'bang') - 1);
      // 조준을 함께 내면 한 방이 두 배다. 대신 조준 한 장을 쓴다
      if (action.extra) s += target.hp <= 2 ? 14 * enemy : 5 * enemy - 3;
      // 저격수: 빗나감 2장을 요구한다. 두 번째 카드 값을 치른다
      if (action.also !== undefined) {
        const second = safeKind(action.also);
        s += (target.hand.length <= 2 ? 8 : 4) * enemy - (second ? cardValue(second) : 6) * 0.8;
      }
      // 능력으로 내는 뱅!(블랙 플라워 등)은 낼 카드의 값어치를 치른다
      if (action.ability) {
        const own = safeKind(action.card);
        if (own && own !== 'bang') s -= cardValue(own) * 0.8;
      }
      return s;
    }
    case 'missed':
      // 자기 차례에 낼 이유가 없다
      return -20;
    case 'beer': {
      const d = danger(view, me);
      // 효과 없는 맥주는 내지 않는다 (목숨이 가득이거나 생존자가 2명뿐)
      if (my.hp >= my.maxHp || alivePlayers(view).length <= 2) return -20;
      return d > 0.7 ? 16 : d > 0.4 ? 5 : -2;
    }
    case 'saloon': {
      // 나와 아군이 얼마나 회복하는가에서, 적이 회복하는 만큼을 뺀다
      let s = my.hp < my.maxHp ? 5 : -2;
      for (const p of alivePlayers(view)) {
        if (p.id === me || p.hp >= p.maxHp) continue;
        s += (0.4 - hostility(view, me, p.id, beliefs, sit)) * 8;
        // 보안관이 살아야 이기는 쪽이면 다친 보안관을 챙긴다
        if (p.id === sit.sheriffId && needsSheriffAlive(view, me, sit)) s += p.hp <= 2 ? 8 : 3;
      }
      return s;
    }
    case 'stagecoach':
      return 9;
    case 'wellsFargo':
      return 13;
    case 'generalStore': {
      // 내가 먼저 고르니 이득이지만 모두가 카드를 얻는다
      const base = survivors <= 4 ? 7 : 4;
      const own = safeKind(action.card);
      if (!own || own === 'generalStore') return base;
      // 다른 카드를 잡화점으로 낸다(엉클 윌). 그 카드의 값어치를 치른다.
      // 어차피 버릴 카드(손패가 넘칠 때)면 거의 공짜다.
      const overflow = my.hand.length > handLimitOf(view, me);
      return base - cardValue(own) * 1.2 + (overflow ? cardValue(own) : 0);
    }
    case 'gatling':
      return scoreArea(view, me, beliefs, sit, 15, 'missed') + 2;
    case 'indians':
      // 뱅!을 버리게 만드는 것 자체도 이득이다
      return scoreArea(view, me, beliefs, sit, 12, 'bang') + 1;
    case 'duel': {
      if (!target) return -10;
      if (friend) return -12;
      if (isHopelessDuel(view, me, action)) return -15;
      // 상대 손이 비었으면 뱅!을 낼 수 없으니 반드시 이긴다
      if (target.hand.length === 0) return 16 * enemy;
      // 손패가 펼쳐져 있으면 이기는 결투다. 상대가 낼 뱅!만큼 내 뱅!도 쓴다
      if (duelOutcome(view, me, target.id, action.card) === 'win') {
        const theirs = knownReactive(view, target.id, 'bang') ?? 0;
        return (16 + (target.hp === 1 ? 14 : 0)) * enemy - theirs * 1.5;
      }
      // 내 손의 뱅!이 많을수록 이길 가능성이 높다
      const myBangs = duelAmmo(view, me, action.card);
      const edge = myBangs - Math.min(2, target.hand.length / 2);
      return 10 * enemy + edge * 3;
    }
    case 'panic': {
      if (!target) return -10;
      if (target.id === me) {
        // 자기 앞의 다이너마이트를 치우는 용도
        return my.equipment.some((c) => kindOf(c) === 'dynamite') ? 14 : -8;
      }
      const rescue = rescueScore(view, me, target.id, friend, sit);
      if (rescue !== null) return rescue;
      let s = 9 * enemy;
      if (target.equipment.some((c) => kindOf(c) === 'barrel')) s += 5 * enemy;
      if (target.equipment.some((c) => CARD_DEFS[kindOf(c)].equip === 'weapon')) s += 4 * enemy;
      return s;
    }
    case 'catBalou': {
      if (!target) return -10;
      if (target.id === me) {
        return my.equipment.some((c) => kindOf(c) === 'dynamite') ? 15 : -8;
      }
      const rescue = rescueScore(view, me, target.id, friend, sit);
      if (rescue !== null) return rescue;
      let s = 8 * enemy;
      if (target.equipment.some((c) => kindOf(c) === 'barrel')) s += 5 * enemy;
      if (target.hand.length === 0 && target.equipment.length === 0) s -= 20;
      return s;
    }
    case 'jail': {
      if (!target) return -10;
      if (friend) return -12;
      // 강한 적의 차례를 통째로 날린다
      let s = 12 * enemy + (target.hand.length > 3 ? 3 * enemy : 0);
      // 확신이 없는 보안관은 쏘기보다 가둔다. 부관이어도 벌칙이 없다
      if (my.role === 'sheriff' && maxProb(beliefs, target.id) < 0.6) s += 3;
      return s;
    }
    // ----- 그림자의 계곡 -----
    case 'tomahawk':
    case 'fanning': {
      if (!target) return -10;
      if (friend) return -12;
      let s = 12 * enemy + (target.hp === 1 ? 18 * enemy : 0);
      if (target.equipment.some((c) => kindOf(c) === 'barrel')) s -= 3;
      s += openHandBangEdge(view, target.id, 1, enemy);
      if (kind === 'fanning' && action.target2) {
        const e2 = hostility(view, me, action.target2, beliefs, sit);
        s += e2 < FRIEND ? -12 : 10 * e2;
      }
      // 토마호크는 뱅! 횟수를 쓰지 않는다
      return kind === 'tomahawk' ? s + 2 : s;
    }
    case 'lastCall': {
      const d = danger(view, me);
      if (my.hp >= my.maxHp) return -20;
      return d > 0.6 ? 14 : d > 0.3 ? 5 : -1;
    }
    case 'bandidos':
      return scoreArea(view, me, beliefs, sit, 10) + 1;
    case 'poker':
      return survivors >= 3 ? 7 : 2;
    case 'tornado':
      // 손이 빈약할수록 이득이다
      return my.hand.length <= 2 ? 6 : 1;
    case 'rattlesnake':
    case 'bounty':
      if (!target || friend) return -10;
      return 6 * enemy;
    case 'ghost':
      // 죽은 아군을 되살리면 좋다. 역할이 공개돼 있으니 적대도가 정확하다
      if (!target) return -10;
      return enemy < FRIEND ? 8 : -12;
    case 'lemat':
    case 'shotgun': {
      // 사정거리는 1뿐이지만 효과가 있다. 더 긴 무기를 버릴 만큼은 아니다
      return weaponRangeOf(view, me) > 1 ? 1 : 7;
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
      // 역화는 되쏘기까지 하니 먼저 쓴다. 뱅!을 빗나감으로 쓰는 것(칼라미티 자넷)은 조금 아깝다.
      // 쏜 사람이 없는 뱅!(한줌의 카드)에는 되쏠 곳이 없으니 역화를 아낀다
      if (kind === 'backfire') {
        if (a.source === null) return 18;
        return hostility(view, me, a.source, beliefs, situation(view, me, beliefs)) >= FRIEND ? 28 : 18;
      }
      return kind === 'bang' ? 22 : 25;
    }

    case 'indiansBang':
      if (choice.c !== 'card') return my.hp > 2 ? -3 : -25;
      return 20;

    case 'duelBang': {
      // 손패가 펼쳐져 있으면 끝까지 셈이 선다. 질 결투에 뱅!을 쏟아붓지 않는다
      const theirs = knownReactive(view, a.opponent, 'bang');
      if (theirs !== null) {
        if (firstWinsDuel(a.options.length, theirs)) return choice.c === 'card' ? 30 : -30;
        if (my.hp > 1) return choice.c === 'card' ? -5 : 10;
      }
      if (choice.c !== 'card') return my.hp > 2 ? -5 : -30;
      return 22;
    }

    case 'judgementChoice': {
      if (choice.c !== 'card') return 0;
      const suit = effectiveSuit(view, choice.card);
      if (a.purpose === 'dynamite') {
        // 터지지 않는 쪽을 고른다
        return explodes(view, choice.card) ? -50 : 50;
      }
      if (a.purpose === 'rattlesnake') return suit === 'spades' ? -50 : 50;
      if (a.purpose === 'coloradoBill') return suit === 'spades' ? 50 : -50;
      if (a.purpose === 'terenKill') return suit === 'spades' ? -50 : 50;
      return suit === 'hearts' ? 50 : -50;
    }

    case 'generalStore':
    case 'kitCarlson': {
      if (choice.c !== 'card') return 0;
      const kind = safeKind(choice.card);
      return kind ? cardValue(kind) * 4 : 0;
    }

    // ----- 그림자의 계곡 -----
    case 'discardChoice': {
      if (choice.c !== 'card') {
        // 반디도스: 목숨이 넉넉하면 맞고 카드를 지킨다. 레모네이드 짐: 안 마셔도 그만
        if (a.reason === 'lemonadeJim') return 0;
        return my.hp > 2 ? -2 : -40;
      }
      const kind = safeKind(choice.card);
      // 가장 덜 아까운 카드를 버린다
      const cost = kind ? cardValue(kind) : 0;
      if (a.reason === 'lemonadeJim') return 6 - cost * 1.5;
      return 10 - cost;
    }
    case 'evade':
      // 피할 수 있으면 피한다. 목숨이 넉넉하고 카드가 귀하면 덜
      return choice.c === 'card' ? (my.hp > 2 ? 8 : 30) : 0;
    case 'saved': {
      if (choice.c !== 'card') return 0;
      const sit = situation(view, me, beliefs);
      const e = hostility(view, me, a.target, beliefs, sit);
      const t = playerOf(view, a.target);
      if (e >= FRIEND) return -20;
      // 아군이 죽기 직전이면 반드시 구한다
      return t.hp <= 1 ? 40 : 8;
    }
    case 'savedReward': {
      // 적의 손에서 빼앗는 편이 이득이다
      const e = hostility(view, me, a.target, beliefs, situation(view, me, beliefs));
      return choice.c === 'yes' ? (e >= FRIEND ? 5 : -5) : 0;
    }
    case 'evelyn': {
      if (choice.c !== 'player') return 0;
      const e = hostility(view, me, choice.pid, beliefs, situation(view, me, beliefs));
      // 카드 1장을 포기할 만큼 확실한 적만 쏜다
      return e >= FRIEND ? 10 * e - 3 : -15;
    }

    case 'daltonsDiscard': {
      if (choice.c !== 'card') return 0;
      const kind = safeKind(choice.card);
      // 값어치가 낮은 장비를 버린다
      return kind ? 40 - cardValue(kind) * 4 : 0;
    }

    case 'stealCard': {
      if (choice.c !== 'pick') return 0;
      const ally = a.target !== me && hostility(view, me, a.target, beliefs) < FRIEND;
      if (choice.pick.zone === 'equipment') {
        const kind = safeKind(choice.pick.card);
        if (!kind) return 20;
        // 감옥·다이너마이트는 같은 편이면 떼어 주고, 적이면 그대로 둔다
        if (kind === 'jail' || kind === 'dynamite') return ally || a.target === me ? 80 : 5;
        // 같은 편의 장비는 건드리지 않는다
        if (ally) return 0;
        // 무기는 사정거리를, 술통은 방어를 빼앗는다
        return 20 + cardValue(kind) * 3;
      }
      // 손패는 무작위 1장이다 (번호를 골라도 엔진이 무작위로 뽑는다). 손패가 펼쳐져 있으면(사카가웨이)
      // 평균 값어치로 장비와 견준다. 같은 편에게서는 덜 아까울수록, 적에게서는 값질수록 낫다
      const kinds = (knownHand(view, a.target) ?? []).map(safeKind).filter((k): k is CardKind => k !== null);
      if (kinds.length > 0) {
        const avg = kinds.reduce((n, k) => n + cardValue(k), 0) / kinds.length;
        return ally ? 10 - avg * 0.5 : 18 + avg * 3;
      }
      return ally ? 10 : 20;
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

    // ----- 와일드 웨스트 쇼 -----
    case 'borrowCharacters': {
      // 빌린 능력이 평균보다 못하면 새로 뽑는다
      if (choice.c !== 'yes') return 0;
      const avg = a.current.reduce((n, c) => n + (CHARACTER_VALUE[c] ?? 5), 0) / a.current.length;
      return 6.2 - avg;
    }
    case 'giveCard': {
      // 가장 덜 아까운 카드를 준다
      if (choice.c !== 'card') return 0;
      const kind = safeKind(choice.card);
      return kind ? 10 - cardValue(kind) : 0;
    }

    case 'declareSuit': {
      if (choice.c !== 'suit') return 0;
      return handSuitCount(view, me, choice.suit) * 10;
    }

    // 한줌의 카드
    case 'russianRoulette':
      // 빗나감 한 장으로 목숨 2를 막는다
      return choice.c === 'card' ? 30 : my.hp <= 2 ? -100 : -40;

    case 'ricochet': {
      const kind = safeKind(a.card);
      // 내 앞의 감옥·다이너마이트는 버려지는 편이 낫다
      if (kind === 'jail' || kind === 'dynamite') return choice.c === 'card' ? -20 : 10;
      if (choice.c !== 'card') return 0;
      return (kind ? cardValue(kind) : 5) * 2 - cardValue('missed') - (my.hp <= 2 ? 6 : 0);
    }

    case 'ranch': {
      if (choice.c !== 'card') return 3;
      const kind = safeKind(choice.card);
      // 평균(대략 5)보다 못한 카드만 바꾼다
      return kind ? 5 - cardValue(kind) + 1 : 0;
    }

    case 'hardLiquor': {
      if (choice.c !== 'yes') return 0;
      if (my.hp >= my.maxHp) return -20;
      const d = danger(view, me);
      return d > 0.6 ? 12 : my.hand.length >= 4 ? 4 : -6;
    }

    case 'bloodBrothers': {
      if (choice.c !== 'player') return 0;
      if (my.hp <= 2) return -20;
      const t = playerOf(view, choice.pid);
      const h = hostility(view, me, t.id, beliefs);
      if (h >= FRIEND) return -15;
      // 보안관이 살아야 이기는 쪽이면 다친 보안관을 챙긴다
      const sit = situation(view, me, beliefs);
      const sheriff = t.id === sit.sheriffId && needsSheriffAlive(view, me, sit) && t.hp <= 2 ? 10 : 0;
      return (FRIEND - h) * 20 + sheriff + (t.hp === 1 ? 6 : 0) - 2;
    }

    case 'peyote':
      if (choice.c !== 'color') return 0;
      return unseenColorCount(view, me, choice.color);

    default:
      return 0;
  }
}

/** 리코체로 앞의 카드를 노리는 수. 상대가 빗나감!으로 막을 수 있으니 확실하지 않다 */
function scoreRicochet(card: CardId, friend: boolean, enemy: number): number {
  const kind = safeKind(card);
  if (!kind) return -5;
  const cost = cardValue('bang') * 0.6;
  if (kind === 'jail' || kind === 'dynamite') return friend ? 9 - cost : -10;
  if (friend) return -12;
  return (4 + cardValue(kind)) * enemy - cost - 2;
}

/** 아직 보지 못한 기본 카드 중 그 색 장수. 피요테에서 더 많은 쪽을 부른다 */
function unseenColorCount(view: GameState, me: PlayerId, color: 'red' | 'black'): number {
  const seen = new Set<CardId>(view.discard);
  for (const p of view.players) for (const c of p.equipment) seen.add(c);
  for (const c of playerOf(view, me).hand) seen.add(c);
  let n = 0;
  for (const c of BASE_CARDS_BY_ID.values()) {
    if (seen.has(c.id)) continue;
    const red = c.suit === 'hearts' || c.suit === 'diamonds';
    if (red === (color === 'red')) n++;
  }
  return n;
}

/**
 * 같은 편 앞의 감옥·다이너마이트를 떼어 주는 수의 점수.
 * 같은 편이 아니면 null (평소처럼 적을 괴롭히는 수로 매긴다).
 */
function rescueScore(
  view: GameState,
  me: PlayerId,
  target: PlayerId,
  friend: boolean,
  sit: Situation,
): number | null {
  if (!friend) return null;
  const eq = playerOf(view, target).equipment;
  const jailed = hasKind(eq, 'jail');
  const dynamite = hasKind(eq, 'dynamite');
  if (!jailed && !dynamite) return -10;
  let s = jailed ? 11 : 8;
  // 갇힌 보안관은 한 차례를 통째로 잃는다. 보안관이 살아야 이기는 쪽이면 더 급하다
  if (target === sit.sheriffId && needsSheriffAlive(view, me, sit)) s += 5;
  return s;
}

function maxProb(beliefs: Beliefs, id: PlayerId): number {
  const pr = beliefs[id]?.probs;
  return pr ? Math.max(pr.sheriff, pr.deputy, pr.outlaw, pr.renegade) : 1;
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
