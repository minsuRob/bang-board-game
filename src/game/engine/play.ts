/**
 * 손패에서 카드를 내는 순간의 처리.
 *
 * 카드는 여기서 손을 떠나고, 그 뒤의 모든 일은 프레임이 맡는다.
 * 즉시 해결하려 들면 반응 체인이 무너진다.
 */

import { CARD_DEFS } from '../data/cards.base';
import type { CardId, CardKind } from '../data/types';
import {
  alivePlayers,
  defOf,
  equipCard,
  kindOf,
  log,
  nameOf,
  playerOf,
  pushSeq,
  toDiscard,
  updatePlayer,
  weaponOf,
} from './cards';
import { generalStoreQueue } from './frames/cards';
import {
  canUseCardAs,
  immuneToCard,
  isRepeatAbility,
  onPutInPlayFrames,
  outgoingBangMissesOf,
  playAnyAsAbilitiesOf,
  onBeerPlayedFrames,
  onOtherPlaysCardFrames,
  onPlayBangFrames,
  revealEventOnPlayFrames,
  withEvade,
} from './hooks';
import type { Frame, GameState, PlayerId, StealPick } from './types';
import { eul, ga, ro } from './josa';
import { nameKo } from './legacy-ko';

/** 대상 한 명을 지목하는 갈색 효과 중 탈출로 피할 수 있는 것 */
const SINGLE_TARGET_EVADABLE: readonly Frame['k'][] = ['duel', 'steal', 'bang'];

export type PlayOptions = {
  target2?: PlayerId;
  extra?: CardId;
  ability?: string;
  /** 저격수: 함께 버리는 두 번째 뱅! */
  also?: CardId;
  /** 리코체: 뱅!으로 노리는 앞의 카드 */
  pick?: StealPick;
};

/** 이 능력 key 가 뱅! 횟수를 쓰지 않는 추가 뱅!인가 (블랙 플라워) */
function isExtraBang(state: GameState, pid: PlayerId, ability?: string): boolean {
  if (!ability) return false;
  return playAnyAsAbilitiesOf(state, pid, true).some((ab) => ab.key === ability && ab.extra === true);
}

/** 자신을 제외한 생존자를, 자기 왼쪽(다음 좌석)부터 시계 방향으로 */
export function othersInOrder(state: GameState, source: PlayerId): PlayerId[] {
  const alive = alivePlayers(state);
  const start = alive.findIndex((p) => p.id === source);
  const ordered = start < 0 ? alive : [...alive.slice(start + 1), ...alive.slice(0, start)];
  return ordered.filter((p) => p.id !== source).map((p) => p.id);
}

/**
 * 카드 한 장을 사용한다.
 * `as` 는 칼라미티 자넷처럼 다른 종류로 취급해 쓸 때의 종류다.
 */
export function applyPlayCard(
  state: GameState,
  pid: PlayerId,
  card: CardId,
  as: CardKind,
  target?: PlayerId,
  opts: PlayOptions = {},
): GameState {
  const def = CARD_DEFS[as];
  const own = kindOf(card);
  let cur = state;

  // 명시한 차례당 한 번 능력 (블랙 플라워·더 스팟 등)
  if (opts.ability) {
    const key = opts.ability;
    cur = updatePlayer(cur, pid, (p) => ({ ...p, usedThisTurn: [...p.usedThisTurn, key] }));
  }

  // 칼라미티 자넷식 치환이 아닌데 종류가 다르면, 차례당 한 번 능력(엉클 윌)을 쓴 것이다.
  if (!opts.ability && as !== own && !canUseCardAs(cur, pid, own, as)) {
    const ability = playAnyAsAbilitiesOf(cur, pid).find((ab) => ab.as === as);
    if (ability) {
      cur = updatePlayer(cur, pid, (p) => ({
        ...p,
        usedThisTurn: [...p.usedThisTurn, ability.key],
      }));
    }
  }

  // 카드를 손에서 뗀다.
  cur = updatePlayer(cur, pid, (p) => ({ ...p, hand: p.hand.filter((c) => c !== card) }));

  // 리 반 클리프가 다시 낼 수 있는 '방금 낸 갈색 카드'. 다시 낸 효과는 또 다시 내지 못한다.
  const repeat = isRepeatAbility(cur, pid, opts.ability);
  const lastBrown = def.category === 'brown' && !repeat ? as : undefined;
  // JSON 왕복에서 undefined 필드가 남지 않게, 없으면 키를 뺀다
  const { lastBrown: _prev, ...turnRest } = cur.turn;
  cur = { ...cur, turn: lastBrown ? { ...turnRest, lastBrown } : turnRest };

  const frames: Frame[] = [];
  if (def.category === 'blue') {
    cur = equipBlueCard(cur, pid, card, as, target);
    const holder = (def.equip === 'other' || def.equip === 'eliminated') && target ? target : pid;
    frames.push(...onPutInPlayFrames(cur, pid, card, holder));
  } else {
    cur = toDiscard(cur, [card]);
  }

  // 리코체(한줌의 카드): 뱅!에 앞의 카드가 붙으면 사람이 아니라 그 카드를 노린다.
  const ricochet = as === 'bang' && target && opts.pick?.zone === 'equipment' ? opts.pick.card : null;

  const played =
    as === own
      ? eul(nameKo(def))
      : `${eul(nameKo(CARD_DEFS[own]))} ${ro(nameKo(def))}`;
  cur = log(cur, {
    t: 'playCard',
    pid,
    card,
    as: as === own ? undefined : as,
    target,
    text:
      `${ga(nameOf(cur, pid))}${ricochet ? ' 리코체로' : ''}${repeat ? ' 한 번 더,' : ''} ${played} 냈다` +
      (target ? ` → ${nameOf(cur, target)}.` : '.'),
  });

  if (ricochet && target) {
    // 버림이지 사용이 아니다. 뱅! 횟수를 쓰지 않고, 뱅!에 반응하는 능력도 울리지 않는다.
    return pushSeq(cur, [{ k: 'ricochet', source: pid, target, card: ricochet }]);
  }

  // 조준: 뱅!과 함께 낸 카드도 손을 떠난다.
  if (opts.extra) {
    const extra = opts.extra;
    cur = updatePlayer(cur, pid, (p) => ({ ...p, hand: p.hand.filter((c) => c !== extra) }));
    cur = toDiscard(cur, [extra]);
    cur = log(cur, {
      t: 'playCard',
      pid,
      card: extra,
      target,
      text: `${ga(nameOf(cur, pid))} ${eul(nameKo(CARD_DEFS[kindOf(extra)]))} 함께 냈다.`,
    });
  }

  // 저격수: 두 번째 뱅!도 손을 떠난다. 둘이 합쳐 뱅! 1회다.
  if (opts.also) {
    const also = opts.also;
    cur = updatePlayer(cur, pid, (p) => ({ ...p, hand: p.hand.filter((c) => c !== also) }));
    cur = toDiscard(cur, [also]);
    cur = log(cur, {
      t: 'playCard',
      pid,
      card: also,
      target,
      text: `${ga(nameOf(cur, pid))} 저격수로 ${eul(nameKo(CARD_DEFS[kindOf(also)]))} 함께 냈다.`,
    });
  }

  // 패닝은 차례당 한 번인 뱅!으로 친다. 추가 뱅!(블랙 플라워)과 리 반 클리프가 다시 낸 뱅!은 횟수를 쓰지 않는다.
  if ((as === 'bang' || as === 'fanning') && !repeat && !isExtraBang(cur, pid, opts.ability)) {
    cur = { ...cur, turn: { ...cur.turn, bangsPlayed: cur.turn.bangsPlayed + 1 } };
  }

  // 와일드 웨스트 쇼: 역마차·웰스 파고를 내면 낸 사람이 이벤트 더미 맨 위를 공개한다 (효과보다 먼저)
  frames.push(...revealEventOnPlayFrames(cur, pid, as, repeat));
  if (as === 'bang' && target) frames.push(...onPlayBangFrames(cur, pid, target));
  frames.push(
    ...effectFrames(cur, pid, as, target, opts, card)
      // 저격수: 빗나감! 2장으로만 막는다 (슬랩 더 킬러면 그대로 2장 이상)
      .map((f) => (opts.also && f.k === 'bang' ? { ...f, missesRequired: Math.max(2, f.missesRequired) } : f))
      .map((f) =>
        // 탈출·믹 디펜더: 뱅!이 아닌 갈색 카드의 대상은 피할 기회를 얻는다
        target && SINGLE_TARGET_EVADABLE.includes(f.k) ? withEvade(cur, target, pid, as, f) : f,
      ),
  );
  frames.push(...onOtherPlaysCardFrames(cur, pid, as));
  // 마담 이토: 목숨을 회복하려고 낸 보통 맥주에도 받는다. 생존자 2명이라 효과가 없어도 맥주를 낸 것이다.
  // (골드 러시 해설 "It doesn't matter whether the Beer was played to regain a life point or to take a gold nugget")
  if (as === 'beer' && own === 'beer') frames.push(...onBeerPlayedFrames(cur, pid));
  return pushSeq(cur, frames);
}

function equipBlueCard(
  state: GameState,
  pid: PlayerId,
  card: CardId,
  as: CardKind,
  target?: PlayerId,
): GameState {
  const def = CARD_DEFS[as];

  // 감옥·방울뱀·포상금은 상대 앞에, 유령은 제거된 사람 앞에 놓는다.
  if (def.equip === 'other' || def.equip === 'eliminated') {
    if (!target) throw new Error(`대상이 필요하다: ${nameKo(def)}`);
    const placed = equipCard(state, target, card);
    if (def.equip !== 'eliminated') return placed;
    // 유령: 제거된 사람이 목숨 없이 게임에 돌아온다.
    return log(updatePlayer(placed, target, (p) => ({ ...p, ghost: true })), {
      t: 'ghostRise',
      pid: target,
      text: `${ga(nameOf(placed, target))} 유령으로 돌아왔다.`,
    });
  }

  // 무기는 한 번에 하나. 기존 무기는 버려진다.
  if (def.equip === 'weapon') {
    const old = weaponOf(state, pid);
    let cur = state;
    if (old) {
      cur = updatePlayer(cur, pid, (p) => ({
        ...p,
        equipment: p.equipment.filter((c) => c !== old),
      }));
      cur = toDiscard(cur, [old]);
    }
    return equipCard(cur, pid, card);
  }

  return equipCard(state, pid, card);
}

function effectFrames(
  state: GameState,
  pid: PlayerId,
  as: CardKind,
  target: PlayerId | undefined,
  opts: PlayOptions,
  card?: CardId,
): Frame[] {
  // 칼루멧: 남이 낸 ♦ 광역 카드(기관총·인디언·노상강도 ♦Q·포커)는 그 사람을 건너뛴다.
  // 이로운 광역 카드(주점·잡화점)와 자기도 끼는 토네이도는 거르지 않는다 (EC-130 결정).
  const hit = (ids: PlayerId[]) =>
    card ? ids.filter((t) => !immuneToCard(state, t, card, pid)) : ids;
  switch (as) {
    case 'bang':
      if (!target) return [];
      return [
        {
          k: 'bang',
          source: pid,
          target,
          missesRequired: outgoingBangMissesOf(state, pid),
          cause: 'bang',
          dodgeChecked: false,
          ...(opts.extra ? { damage: 2 } : {}),
        },
      ];
    case 'fanning': {
      if (!target) return [];
      const shots: PlayerId[] = opts.target2 ? [target, opts.target2] : [target];
      // 패닝은 뱅! 카드가 아니다. 슬랩 더 킬러의 빗나감! 2장 요구는 뱅! 카드에만 붙는다
      // (VoS 룰 5쪽 "but not Gatling, Fanning", 기본판 FAQ Q19). 기관총처럼 1장씩
      return shots.map((t): Frame => ({
        k: 'bang',
        source: pid,
        target: t,
        missesRequired: 1,
        cause: 'fanning',
        dodgeChecked: false,
      }));
    }
    case 'beer':
      // 생존자가 2명뿐이면 낼 수는 있지만 아무 효과가 없다 (카드만 버려진다).
      if (alivePlayers(state).length <= 2) return [];
      return [{ k: 'heal', pid, amount: 1 }];
    case 'lastCall':
      return [{ k: 'heal', pid, amount: 1 }];
    case 'tomahawk':
      if (!target) return [];
      return [
        { k: 'bang', source: pid, target, missesRequired: 1, cause: 'tomahawk', dodgeChecked: false },
      ];
    case 'saloon':
      return [{ k: 'saloon', queue: alivePlayers(state).map((p) => p.id) }];
    case 'stagecoach':
      return [{ k: 'drawCards', pid, count: 2, reason: 'stagecoach' }];
    case 'wellsFargo':
      return [{ k: 'drawCards', pid, count: 3, reason: 'wellsFargo' }];
    case 'generalStore':
      return [{ k: 'generalStore', source: pid, queue: generalStoreQueue(state, pid), revealed: [] }];
    case 'gatling':
      return [{ k: 'gatling', source: pid, queue: hit(othersInOrder(state, pid)) }];
    case 'indians':
      return [{ k: 'indians', source: pid, queue: hit(othersInOrder(state, pid)) }];
    case 'duel':
      if (!target) return [];
      return [{ k: 'duel', a: pid, b: target, toPlay: target }];
    case 'bandidos':
      return [{ k: 'bandidos', source: pid, queue: hit(othersInOrder(state, pid)) }];
    case 'poker':
      return [{ k: 'poker', source: pid, queue: hit(othersInOrder(state, pid)), pot: [] }];
    case 'tornado':
      return [{ k: 'tornado', queue: [pid, ...othersInOrder(state, pid)] }];
    case 'panic':
      if (!target) return [];
      return [{ k: 'steal', source: pid, target, mode: 'panic' }];
    case 'catBalou':
      if (!target) return [];
      return [{ k: 'steal', source: pid, target, mode: 'catBalou' }];
    default:
      // 파랑 카드는 장착으로 끝난다.
      return [];
  }
}

/** 같은 이름의 파랑 카드를 이미 앞에 두고 있는가 */
export function hasSameBlueCard(state: GameState, pid: PlayerId, kind: CardKind): boolean {
  return playerOf(state, pid).equipment.some((c) => kindOf(c) === kind);
}

/** 무기인가 */
export function isWeapon(card: CardId): boolean {
  return defOf(card).equip === 'weapon';
}
