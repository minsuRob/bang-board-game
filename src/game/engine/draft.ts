/**
 * 캐릭터 드래프트.
 *
 * 게임이 시작되면 각자 후보 몇 장(setup.ts draftOfferCount)을 받고 동시에 하나씩 고른다.
 * 마지막 사람이 고르는 순간 목숨이 정해지고, 시작 손패가 돌고, 보안관의 차례가 쌓인다.
 *
 * 드래프트 중에는 스택이 비어 있고 resolveStack 도 멈춰 있다. 자리표시자 캐릭터의
 * 능력(수지 라파예트 등)이 빈 손패에 반응하면 안 되기 때문이다.
 */

import { CHARACTERS } from '../data/characters';
import type { CharacterId } from '../data/types';
import { log, nameOf, push } from './cards';
import { startingHandOf } from './hooks';
import { ga } from './josa';
import type { GameState, PlayerId } from './types';

/** 아직 고르지 않은 사람들 (좌석 순) */
export function undrafted(state: GameState): PlayerId[] {
  const d = state.draft;
  if (!d) return [];
  return state.players.filter((p) => d.picked[p.id] === null).map((p) => p.id);
}

export function applyPick(state: GameState, pid: PlayerId, character: CharacterId): GameState {
  const d = state.draft;
  if (!d) return state;
  let cur: GameState = {
    ...state,
    draft: { ...d, picked: { ...d.picked, [pid]: character } },
  };
  cur = log(cur, {
    t: 'draftPick',
    pid,
    text: `${ga(nameOf(cur, pid))} 캐릭터를 골랐다.`,
  });
  return undrafted(cur).length === 0 ? finishDraft(cur) : cur;
}

function finishDraft(state: GameState): GameState {
  const d = state.draft!;
  const useSpare = state.config.expansions.includes('highnoon');

  let deck = state.deck;
  const players = state.players.map((p) => {
    const character = d.picked[p.id]!;
    const maxHp = CHARACTERS[character].maxHp + (p.role === 'sheriff' ? 1 : 0);
    // 시작 손패는 목숨 수만큼(빅 스펜서는 5장), 좌석 순서대로
    const size = startingHandOf(character, maxHp);
    const hand = deck.slice(deck.length - size);
    deck = deck.slice(0, deck.length - size);
    const spare = useSpare ? (d.offers[p.id].find((c) => c !== character) ?? null) : null;
    return { ...p, character, spareCharacter: spare, hp: maxHp, maxHp, hand };
  });

  let cur: GameState = { ...state, players, deck, draft: null };
  const reveal = players
    .map((p) => `${p.name}·${CHARACTERS[p.character].nameKo}`)
    .join(', ');
  cur = log(cur, {
    t: 'draftDone',
    text: `모두 캐릭터를 골랐다. ${reveal}`,
  });

  const sheriff = players.find((p) => p.role === 'sheriff')!;
  // 개발용 devEvent: 첫 차례부터 그 이벤트가 걸려 있게 바로 공개한다
  const devReveal = Boolean(cur.config.devEvent && cur.event?.deck[0] === cur.config.devEvent);
  return push(cur, { k: 'turnStart', pid: sheriff.id, ...(devReveal ? { reveal: true } : {}) });
}
