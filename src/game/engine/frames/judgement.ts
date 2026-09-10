/**
 * 판정 ('카드 펼치기').
 *
 * 판정은 함수가 아니라 프레임이다. 러키 듀크가 두 장을 보고 고르는 동안
 * 게임 전체가 멈춰서 그 사람의 입력을 기다려야 하기 때문이다.
 * 술통·주르도네·다이너마이트·감옥이 전부 이 한 프레임을 지나간다.
 */

import { RANK_VALUE } from '../../data/types';
import {
  cardOf,
  drawFromDeck,
  effectiveSuit,
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
import { judgementPeekOf, turnDirectionOf } from '../hooks';
import type { Choice, Frame, GameState, JudgementPurpose, PlayerId } from '../types';
import { skipRestOfTurn } from './turn';

const PURPOSE_LABEL: Record<JudgementPurpose, string> = {
  barrel: '술통',
  jourdonnais: '주르도네',
  dynamite: '다이너마이트',
  jail: '감옥',
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

export function resolveJudgement(
  state: GameState,
  frame: Frame & { k: 'judgement' },
): GameState {
  const p = playerOf(state, frame.pid);
  if (!inPlay(p)) return popFrame(state);

  if (frame.candidates.length > 0) {
    // 이미 후보를 뽑아 두고 선택을 기다리는 중이다.
    return { ...state, awaiting: { k: 'luckyDuke', pid: frame.pid, purpose: frame.purpose, options: frame.candidates } };
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
      k: 'luckyDuke',
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
  let cur = toDiscard(state, [card, ...discarded]);
  cur = log(cur, {
    t: 'judgement',
    pid,
    card,
    text: `${nameOf(cur, pid)}의 ${PURPOSE_LABEL[purpose]} 판정: ${inst.rank}${suit}`,
  });

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
  }
}

function resolveDynamiteResult(
  state: GameState,
  pid: PlayerId,
  suit: string,
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
    cur = log(cur, { t: 'dynamite', pid, text: `다이너마이트가 터졌다! ${p.name}이(가) 목숨 3을 잃는다.` });
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
      text: `다이너마이트가 ${cand.name}에게 넘어갔다.`,
    });
  }
  return toDiscard(cur, [dyn]);
}

function resolveJailResult(state: GameState, pid: PlayerId, suit: string): GameState {
  const p = playerOf(state, pid);
  const jailCard = p.equipment.find((c) => cardOf(c).kind === 'jail');
  if (!jailCard) return state;

  let cur = updatePlayer(state, pid, (x) => ({
    ...x,
    equipment: x.equipment.filter((c) => c !== jailCard),
  }));
  cur = toDiscard(cur, [jailCard]);

  if (suit === 'hearts') {
    return log(cur, { t: 'jailEscape', pid, text: `${p.name}이(가) 감옥에서 탈출했다.` });
  }
  cur = log(cur, { t: 'jailSkip', pid, text: `${p.name}은(는) 감옥에 갇혀 차례를 건너뛴다.` });
  return skipRestOfTurn(cur, pid);
}
