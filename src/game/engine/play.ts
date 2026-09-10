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
import { outgoingBangMissesOf } from './hooks';
import type { Frame, GameState, PlayerId } from './types';
import { eul, ga } from './josa';

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
): GameState {
  const def = CARD_DEFS[as];
  let cur = state;

  // 카드를 손에서 뗀다.
  cur = updatePlayer(cur, pid, (p) => ({ ...p, hand: p.hand.filter((c) => c !== card) }));

  if (def.category === 'blue') {
    cur = equipBlueCard(cur, pid, card, as, target);
  } else {
    cur = toDiscard(cur, [card]);
  }

  cur = log(cur, {
    t: 'playCard',
    pid,
    card,
    target,
    text:
      `${ga(nameOf(cur, pid))} ${eul(def.nameKo)} 냈다` +
      (target ? ` → ${nameOf(cur, target)}.` : '.'),
  });

  if (as === 'bang') {
    cur = { ...cur, turn: { ...cur.turn, bangsPlayed: cur.turn.bangsPlayed + 1 } };
  }

  return pushSeq(cur, effectFrames(cur, pid, as, target));
}

function equipBlueCard(
  state: GameState,
  pid: PlayerId,
  card: CardId,
  as: CardKind,
  target?: PlayerId,
): GameState {
  const def = CARD_DEFS[as];

  // 감옥은 상대 앞에 놓는다.
  if (def.equip === 'other') {
    if (!target) throw new Error('감옥은 대상이 필요하다');
    return equipCard(state, target, card);
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
  target?: PlayerId,
): Frame[] {
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
        },
      ];
    case 'beer':
      return [{ k: 'heal', pid, amount: 1 }];
    case 'saloon':
      return [{ k: 'saloon', queue: alivePlayers(state).map((p) => p.id) }];
    case 'stagecoach':
      return [{ k: 'drawCards', pid, count: 2, reason: 'stagecoach' }];
    case 'wellsFargo':
      return [{ k: 'drawCards', pid, count: 3, reason: 'wellsFargo' }];
    case 'generalStore':
      return [{ k: 'generalStore', source: pid, queue: generalStoreQueue(state, pid), revealed: [] }];
    case 'gatling':
      return [{ k: 'gatling', source: pid, queue: othersInOrder(state, pid) }];
    case 'indians':
      return [{ k: 'indians', source: pid, queue: othersInOrder(state, pid) }];
    case 'duel':
      if (!target) return [];
      return [{ k: 'duel', a: pid, b: target, toPlay: target }];
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
