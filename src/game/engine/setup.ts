/**
 * 게임 생성.
 *
 * 같은 시드 + 같은 설정이면 언제나 똑같은 판이 만들어진다.
 * (락스텝 멀티플레이는 모든 클라이언트가 이 함수를 각자 돌려 같은 판을 얻는 데서 출발한다)
 */

import { BASE_DECK } from '../data/cards.base';
import { HIGHNOON_FINAL_ID, HIGHNOON_SHUFFLED_IDS } from '../data/cards.highnoon';
import { CHARACTER_IDS, CHARACTERS } from '../data/characters';
import { MAX_PLAYERS, MIN_PLAYERS, ROLE_DISTRIBUTION } from '../data/roles';
import type { EventCardId } from '../data/types';
import { createRng, shuffle } from './rng';
import type { GameConfig, GameState, Player, PlayerId } from './types';

export type Seat = { id: PlayerId; name: string };

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

  // 캐릭터 분배. 하이 눈 '새로운 신분'을 위해 1인당 예비 캐릭터를 한 장 더 뽑는다.
  const useSpare = config.expansions.includes('highnoon');
  const needed = count * (useSpare ? 2 : 1);
  if (needed > CHARACTER_IDS.length) {
    throw new Error(`캐릭터가 모자란다: ${needed}장 필요, ${CHARACTER_IDS.length}종 보유`);
  }
  const charsRolled = shuffle(rng, CHARACTER_IDS);
  rng = charsRolled.rng;
  const chars = charsRolled.value;

  const players: Player[] = seats.map((seat, i) => {
    const role = roles[i];
    const character = chars[i];
    const maxHp = CHARACTERS[character].maxHp + (role === 'sheriff' ? 1 : 0);
    return {
      id: seat.id,
      seat: i,
      name: seat.name,
      role,
      character,
      spareCharacter: useSpare ? chars[count + i] : null,
      hp: maxHp,
      maxHp,
      hand: [],
      equipment: [],
      alive: true,
      ghost: false,
      roleRevealed: role === 'sheriff',
      usedThisTurn: [],
    };
  });

  // 플레잉 카드 덱
  const deckRolled = shuffle(rng, BASE_DECK.map((c) => c.id));
  rng = deckRolled.rng;
  let deck = deckRolled.value;

  // 시작 손패는 목숨 수만큼
  const dealt = players.map((p) => {
    const hand = deck.slice(deck.length - p.hp);
    deck = deck.slice(0, deck.length - p.hp);
    return { ...p, hand };
  });

  // 이벤트 덱: 하이 눈 카드를 맨 밑에 두고 나머지 14장을 섞어 그 위에 쌓는다
  let event: GameState['event'] = null;
  if (useSpare) {
    const evRolled = shuffle(rng, HIGHNOON_SHUFFLED_IDS);
    rng = evRolled.rng;
    const evDeck: EventCardId[] = [...evRolled.value, HIGHNOON_FINAL_ID];
    event = { deck: evDeck, current: null, past: [] };
  }

  const sheriff = dealt.find((p) => p.role === 'sheriff');
  if (!sheriff) throw new Error('보안관이 없다');

  return {
    config,
    rng,
    players: dealt,
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
    stack: [{ k: 'turnStart', pid: sheriff.id }],
    awaiting: null,
    event,
    log: [
      {
        t: 'gameStart',
        text: `${count}명이 자리에 앉았다. 보안관은 ${sheriff.name}.`,
        seq: 0,
      },
    ],
    result: null,
    seq: 0,
  };
}
