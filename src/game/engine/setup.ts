/**
 * 게임 생성.
 *
 * 같은 시드 + 같은 설정이면 언제나 똑같은 판이 만들어진다.
 * (락스텝 멀티플레이는 모든 클라이언트가 이 함수를 각자 돌려 같은 판을 얻는 데서 출발한다)
 *
 * 판은 캐릭터 드래프트로 시작한다. 각자 후보 몇 장을 받아 하나를 고르고,
 * 모두 고른 뒤에야 목숨이 정해지고 시작 손패가 돌아간다 (frames/draft.ts).
 */

import { BASE_DECK } from '../data/cards.base';
import { HIGHNOON_FINAL_ID, HIGHNOON_SHUFFLED_IDS } from '../data/cards.highnoon';
import { CHARACTER_IDS } from '../data/characters';
import { MAX_PLAYERS, MIN_PLAYERS, ROLE_DISTRIBUTION } from '../data/roles';
import type { CharacterId, EventCardId } from '../data/types';
import { createRng, shuffle } from './rng';
import type { GameConfig, GameState, Player, PlayerId } from './types';

export type Seat = { id: PlayerId; name: string };

/** 드래프트 후보 장수. 5인 이하 3장, 6인 이상 2장 */
export function draftOfferCount(playerCount: number): number {
  return playerCount <= 5 ? 3 : 2;
}

export function createGame(seed: number, config: GameConfig, seats: Seat[]): GameState {
  const count = seats.length;
  if (count !== config.playerCount) {
    throw new Error(`인원수가 맞지 않는다: config ${config.playerCount} / 좌석 ${count}`);
  }
  if (count < MIN_PLAYERS || count > MAX_PLAYERS) {
    throw new Error(`인원수는 ${MIN_PLAYERS}~${MAX_PLAYERS}명이어야 한다 (${count})`);
  }
  const ids = new Set(seats.map((s) => s.id));
  if (ids.size !== count) throw new Error('좌석 id 가 중복된다');

  let rng = createRng(seed);

  // 역할 분배
  const rolesRolled = shuffle(rng, ROLE_DISTRIBUTION[count]);
  rng = rolesRolled.rng;
  const roles = rolesRolled.value;

  // 캐릭터 후보. 하이 눈 '새로운 신분'의 예비 캐릭터는 드래프트에서 안 고른 후보로 준다.
  const per = draftOfferCount(count);
  const needed = count * per;
  if (needed > CHARACTER_IDS.length) {
    throw new Error(`캐릭터가 모자란다: ${needed}장 필요, ${CHARACTER_IDS.length}종 보유`);
  }
  const charsRolled = shuffle(rng, CHARACTER_IDS);
  rng = charsRolled.rng;
  const chars = charsRolled.value;

  const offers: Record<PlayerId, CharacterId[]> = {};
  const picked: Record<PlayerId, CharacterId | null> = {};
  seats.forEach((seat, i) => {
    offers[seat.id] = chars.slice(i * per, (i + 1) * per);
    picked[seat.id] = null;
  });

  const players: Player[] = seats.map((seat, i) => {
    const role = roles[i];
    return {
      id: seat.id,
      seat: i,
      name: seat.name,
      role,
      // 드래프트가 끝날 때까지의 자리표시자. 목숨 0 · 손패 0 이라 어떤 능력도 걸리지 않는다.
      character: offers[seat.id][0],
      spareCharacter: null,
      hp: 0,
      maxHp: 0,
      hand: [],
      equipment: [],
      alive: true,
      ghost: false,
      roleRevealed: role === 'sheriff',
      usedThisTurn: [],
    };
  });

  // 플레잉 카드 덱. 시작 손패는 드래프트가 끝나고 목숨이 정해진 뒤에 돌린다.
  const deckRolled = shuffle(rng, BASE_DECK.map((c) => c.id));
  rng = deckRolled.rng;
  const deck = deckRolled.value;

  // 이벤트 덱: 하이 눈 카드를 맨 밑에 두고 나머지 14장을 섞어 그 위에 쌓는다
  let event: GameState['event'] = null;
  if (config.expansions.includes('highnoon')) {
    const evRolled = shuffle(rng, HIGHNOON_SHUFFLED_IDS);
    rng = evRolled.rng;
    const evDeck: EventCardId[] = [...evRolled.value, HIGHNOON_FINAL_ID];
    event = { deck: evDeck, current: null, past: [] };
  }

  const sheriff = players.find((p) => p.role === 'sheriff');
  if (!sheriff) throw new Error('보안관이 없다');

  return {
    config,
    rng,
    players,
    turn: {
      active: sheriff.id,
      phase: 'draw',
      bangsPlayed: 0,
      round: 0,
      handcuffsSuit: null,
      drawn: false,
    },
    deck,
    discard: [],
    // 드래프트가 끝나면 보안관의 turnStart 가 쌓인다
    stack: [],
    awaiting: null,
    event,
    log: [
      {
        t: 'gameStart',
        text: `${count}명이 자리에 앉았다. 보안관은 ${sheriff.name}. 캐릭터를 고른다.`,
        seq: 0,
      },
    ],
    result: null,
    seq: 0,
    draft: { offers, picked },
  };
}
