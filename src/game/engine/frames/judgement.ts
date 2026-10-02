/**
 * 판정 ('카드 펼치기').
 *
 * 판정은 함수가 아니라 프레임이다. 러키 듀크가 두 장을 보고 고르는 동안
 * 게임 전체가 멈춰서 그 사람의 입력을 기다려야 하기 때문이다.
 * 술통·주르도네·다이너마이트·감옥이 전부 이 한 프레임을 지나간다.
 */

import { RANK_VALUE, SUIT_GLYPH, type Suit } from '../../data/types';
import {
  cardOf,
  defOf,
  drawFromDeck,
  effectiveSuit,
  giveCards,
  inPlay,
  log,
  nameOf,
  playerOf,
  popFrame,
  pushSeq,
  replaceTop,
  toDiscard,
  updatePlayer,
} from '../cards';
import { judgementCardTaker, judgementPeekOf, turnDirectionOf } from '../hooks';
import type { Choice, Frame, GameState, JudgementPurpose, PlayerId } from '../types';
import { skipRestOfTurn } from './turn';
import { eul, ga, neun } from '../josa';

const PURPOSE_LABEL: Record<JudgementPurpose, string> = {
  barrel: '술통',
  jourdonnais: '주르도네',
  dynamite: '다이너마이트',
  jail: '감옥',
  rattlesnake: '방울뱀',
  coloradoBill: '콜로라도 빌',
  terenKill: '테렌 킬',
  donBell: '돈 벨',
  vendetta: '복수',
};

/** 스택에서 가장 위에 있는 뱅! 프레임의 요구 빗나감 장수를 1 줄인다. */
function creditDodge(state: GameState): GameState {
  for (let i = state.stack.length - 1; i >= 0; i--) {
    const f = state.stack[i];
    if (f.k === 'bang') {
      const next: Frame = { ...f, missesRequired: Math.max(0, f.missesRequired - 1) };
      return { ...state, stack: [...state.stack.slice(0, i), next, ...state.stack.slice(i + 1)] };
    }
  }
  return state;
}

/** 스택에서 가장 위에 있는 뱅! 프레임을 피할 수 없게 만든다 (콜로라도 빌) */
function markUnavoidable(state: GameState): GameState {
  for (let i = state.stack.length - 1; i >= 0; i--) {
    const f = state.stack[i];
    if (f.k === 'bang') {
      const next: Frame = { ...f, unavoidable: true };
      return { ...state, stack: [...state.stack.slice(0, i), next, ...state.stack.slice(i + 1)] };
    }
  }
  return state;
}

/** 테렌 킬: 스택의 이 사람 제거 프레임을 거둔다. 살아남았기 때문이다 */
function markSpared(state: GameState, pid: PlayerId): GameState {
  return {
    ...state,
    stack: state.stack.filter((f) => !(f.k === 'eliminate' && f.target === pid)),
  };
}

export function resolveJudgement(
  state: GameState,
  frame: Frame & { k: 'judgement' },
): GameState {
  const p = playerOf(state, frame.pid);
  if (!inPlay(p)) return popFrame(state);

  if (frame.candidates.length > 0) {
    // 이미 후보를 뽑아 두고 선택을 기다리는 중이다.
    return { ...state, awaiting: { k: 'judgementChoice', pid: frame.pid, purpose: frame.purpose, options: frame.candidates } };
  }

  const peek = judgementPeekOf(state, frame.pid);
  const drawn = drawFromDeck(state, peek);
  if (drawn.cards.length === 0) return popFrame(drawn.state);

  if (drawn.cards.length === 1) {
    return applyJudgement(popFrame(drawn.state), frame.pid, frame.purpose, drawn.cards[0], []);
  }
  // 러키 듀크: 두 장을 보고 고른다.
  return {
    ...replaceTop(drawn.state, { ...frame, candidates: drawn.cards }),
    awaiting: {
      k: 'judgementChoice',
      pid: frame.pid,
      purpose: frame.purpose,
      options: drawn.cards,
    },
  };
}

export function respondJudgement(
  state: GameState,
  frame: Frame & { k: 'judgement' },
  choice: Choice,
): GameState {
  const chosen =
    choice.c === 'card' && frame.candidates.includes(choice.card)
      ? choice.card
      : frame.candidates[0];
  const rest = frame.candidates.filter((c) => c !== chosen);
  return applyJudgement(popFrame(state), frame.pid, frame.purpose, chosen, rest);
}

function applyJudgement(
  state: GameState,
  pid: PlayerId,
  purpose: JudgementPurpose,
  card: string,
  discarded: string[],
): GameState {
  const suit = effectiveSuit(state, card);
  const inst = cardOf(card);
  // 존 페인: 손패가 모자라면 펼친 카드를 버린 더미 대신 손으로 가져간다
  const taker = judgementCardTaker(state, pid);
  let cur = toDiscard(state, taker ? discarded : [card, ...discarded]);
  cur = log(cur, {
    t: 'judgement',
    pid,
    card,
    text: `${nameOf(cur, pid)}의 ${PURPOSE_LABEL[purpose]} 판정: ${inst.rank}${SUIT_GLYPH[suit]}`,
  });
  if (taker) {
    cur = giveCards(cur, taker, [card]);
    cur = log(cur, {
      t: 'johnPain',
      pid: taker,
      card,
      text: `${ga(nameOf(cur, taker))} 펼친 ${eul(defOf(card).nameKo)} 손에 넣었다.`,
    });
  }

  switch (purpose) {
    case 'barrel':
    case 'jourdonnais': {
      if (suit !== 'hearts') return cur;
      cur = creditDodge(cur);
      return log(cur, {
        t: 'dodge',
        pid,
        text: `${PURPOSE_LABEL[purpose]} 효과로 빗나감 1회를 얻었다.`,
      });
    }
    case 'dynamite':
      return resolveDynamiteResult(cur, pid, suit, inst.rank);
    case 'jail':
      return resolveJailResult(cur, pid, suit);
    case 'rattlesnake':
      if (suit !== 'spades') return cur;
      cur = log(cur, { t: 'rattlesnake', pid, text: `방울뱀이 ${ga(nameOf(cur, pid))} 물었다.` });
      return pushSeq(cur, [{ k: 'damage', target: pid, amount: 1, source: null, cause: 'rattlesnake' }]);
    case 'coloradoBill':
      if (suit !== 'spades') return cur;
      cur = markUnavoidable(cur);
      return log(cur, { t: 'coloradoBill', pid, text: '♠ — 이 총알은 피할 수 없다.' });
    case 'donBell': {
      if (suit !== 'hearts' && suit !== 'diamonds') return cur;
      cur = { ...cur, turn: { ...cur.turn, extraTurnFor: pid } };
      return log(cur, {
        t: 'donBell',
        pid,
        text: `${neun(nameOf(cur, pid))} 붉은 무늬가 나와 차례를 한 번 더 얻었다.`,
      });
    }
    case 'terenKill': {
      if (suit === 'spades') return cur;
      cur = markSpared(updatePlayer(cur, pid, (x) => ({ ...x, hp: 1 })), pid);
      cur = log(cur, {
        t: 'terenKill',
        pid,
        text: `${neun(nameOf(cur, pid))} 쓰러지지 않았다. 목숨 1로 버틴다.`,
      });
      return pushSeq(cur, [{ k: 'drawCards', pid, count: 1, reason: 'terenKill' }]);
    }
    case 'vendetta': {
      // 돈 벨과 같은 추가 차례 자리를 쓴다. 추가 차례 끝에는 다시 펼치지 않는다
      if (suit !== 'hearts') return cur;
      cur = { ...cur, turn: { ...cur.turn, extraTurnFor: pid } };
      return log(cur, {
        t: 'vendetta',
        pid,
        text: `복수: ${neun(nameOf(cur, pid))} ♥가 나와 차례를 한 번 더 얻었다.`,
      });
    }
  }
}

function resolveDynamiteResult(
  state: GameState,
  pid: PlayerId,
  suit: Suit,
  rank: keyof typeof RANK_VALUE,
): GameState {
  const p = playerOf(state, pid);
  const dyn = p.equipment.find((c) => cardOf(c).kind === 'dynamite');
  if (!dyn) return state;

  const value = RANK_VALUE[rank];
  const explodes = suit === 'spades' && value >= 2 && value <= 9;

  let cur = updatePlayer(state, pid, (x) => ({
    ...x,
    equipment: x.equipment.filter((c) => c !== dyn),
  }));

  if (explodes) {
    cur = toDiscard(cur, [dyn]);
    cur = log(cur, { t: 'dynamite', pid, text: `다이너마이트가 터졌다! ${ga(nameOf(cur, pid))} 목숨 3을 잃는다.` });
    return pushSeq(cur, [
      { k: 'damage', target: pid, amount: 3, source: null, cause: 'dynamite' },
    ]);
  }

  // 다음 사람에게 넘어간다.
  const dir = turnDirectionOf(cur);
  const n = cur.players.length;
  for (let i = 1; i <= n; i++) {
    const seat = (((p.seat + dir * i) % n) + n) % n;
    const cand = cur.players[seat];
    if (!cand.alive) continue;
    cur = updatePlayer(cur, cand.id, (x) => ({ ...x, equipment: [...x.equipment, dyn] }));
    return log(cur, {
      t: 'dynamitePass',
      pid,
      target: cand.id,
      text: `다이너마이트가 ${nameOf(cur, cand.id)}에게 넘어갔다.`,
    });
  }
  return toDiscard(cur, [dyn]);
}

function resolveJailResult(state: GameState, pid: PlayerId, suit: Suit): GameState {
  const p = playerOf(state, pid);
  const jailCard = p.equipment.find((c) => cardOf(c).kind === 'jail');
  if (!jailCard) return state;

  let cur = updatePlayer(state, pid, (x) => ({
    ...x,
    equipment: x.equipment.filter((c) => c !== jailCard),
  }));
  cur = toDiscard(cur, [jailCard]);

  if (suit === 'hearts') {
    return log(cur, { t: 'jailEscape', pid, text: `${ga(nameOf(cur, pid))} 감옥에서 탈출했다.` });
  }
  cur = log(cur, { t: 'jailSkip', pid, text: `${neun(nameOf(cur, pid))} 감옥에 갇혀 차례를 건너뛴다.` });
  return skipRestOfTurn(cur, pid);
}
