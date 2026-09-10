import { describe, expect, it } from 'vitest';

import { HIGHNOON_EVENT_IDS } from '../../data/cards.highnoon';
import type { CharacterId, EventCardId } from '../../data/types';
import { distance } from '../distance';
import { legalActions } from '../legal';
import { reduce } from '../reducer';
import type { Action, GameState, PlayerId } from '../types';
import {
  beginTurn,
  handCard,
  logged,
  loggedCount,
  p,
  resolveStack,
  scenario,
  totalCards,
} from './helpers';

// ---------------------------------------------------------------------------
// 이 파일 전용 보조 도구
// ---------------------------------------------------------------------------

/** 하이 눈 확장을 켠 실제 판 */
function startGame(seed: number, count = 4, expansions: 'highnoon'[] = ['highnoon']): GameState {
  const seats = Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  const action: Action = {
    type: 'startGame',
    seed,
    config: { playerCount: count, expansions },
    seats,
  };
  return reduce(null, action);
}

/** 지금 행동해야 하는 사람에게 제한시간 기본 행동을 한 번 먹인다. */
function step(state: GameState): GameState {
  const pid: PlayerId = state.awaiting ? state.awaiting.pid : state.turn.active;
  return reduce(state, { type: 'timeout', pid });
}

/** 보안관이 그 라운드를 시작할 때까지 판을 굴린다. */
function playUntilRound(state: GameState, round: number): GameState {
  let s = state;
  for (let i = 0; i < 3000 && s.turn.round < round && !s.result; i++) s = step(s);
  return s;
}

/** 입력 대기가 남아 있는 동안 기본 행동으로 밀어낸다. */
function settle(state: GameState): GameState {
  let s = state;
  for (let i = 0; i < 60 && s.awaiting && !s.result; i++) s = step(s);
  if (s.awaiting) throw new Error('입력 대기가 풀리지 않는다');
  return s;
}

/** 이벤트 카드를 실제로 '공개'한다 (달톤 형제·의사처럼 공개 순간에 발동하는 카드용) */
function revealEvent(state: GameState, id: EventCardId): GameState {
  return resolveStack({
    ...state,
    event: { deck: [id], current: null, past: [] },
    stack: [{ k: 'revealEvent' }],
    awaiting: null,
  });
}

/** 예비 캐릭터를 심는다 (scenario 는 언제나 null 로 둔다) */
function withSpare(state: GameState, pid: PlayerId, spare: CharacterId): GameState {
  return {
    ...state,
    players: state.players.map((x) => (x.id === pid ? { ...x, spareCharacter: spare } : x)),
  };
}

const bangAt = (s: GameState, pid: PlayerId, target: PlayerId): Action => ({
  type: 'playCard',
  pid,
  card: handCard(s, pid, 'bang'),
  target,
});

// ---------------------------------------------------------------------------
// 이벤트 덱 진행
// ---------------------------------------------------------------------------

describe('이벤트 덱 진행', () => {
  it('하이 눈 카드가 덱 맨 밑에 놓인다 (v0.141)', () => {
    const s = startGame(7);
    expect(s.event!.deck[s.event!.deck.length - 1]).toBe('highNoon');
  });

  it('나머지 14장이 그 위에 중복 없이 쌓인다', () => {
    const s = startGame(7);
    expect(s.event!.deck).toHaveLength(15);
    expect(new Set(s.event!.deck).size).toBe(15);
    expect([...s.event!.deck].sort()).toEqual([...HIGHNOON_EVENT_IDS].sort());
  });

  it('보안관의 첫 차례에는 이벤트가 없다', () => {
    const s = startGame(7);
    expect(s.turn.round).toBe(1);
    expect(s.event!.current).toBeNull();
  });

  it('보안관의 두 번째 차례에 첫 이벤트가 공개된다 (v0.141)', () => {
    const s = playUntilRound(startGame(7), 2);
    expect(s.event!.current).not.toBeNull();
    expect(s.event!.deck).toHaveLength(14);
  });

  it('새 카드가 공개되면 이전 이벤트를 대체한다', () => {
    const s2 = playUntilRound(startGame(7), 2);
    const first = s2.event!.current!;
    const s3 = playUntilRound(s2, 3);
    expect(s3.event!.current).not.toBe(first);
    expect(s3.event!.past).toContain(first);
  });

  it('확장을 끄면 이벤트가 아예 없다', () => {
    const s = playUntilRound(startGame(7, 4, []), 3);
    expect(s.event).toBeNull();
    expect(logged(s, 'event')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 축복 · 저주
// ---------------------------------------------------------------------------

describe('축복', () => {
  it('♣ 카드로도 술통 판정에 성공한다 (v0.275)', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { equipment: ['barrel'] }, {}, {}],
      deckTop: [{ kind: 'missed', suit: 'clubs', rank: '10' }],
      event: 'blessing',
    });
    const s = reduce(s0, bangAt(s0, 'p0', 'p1'));
    expect(logged(s, 'dodge')).toBe(true);
    expect(p(s, 'p1').hp).toBe(4);
    expect(totalCards(s)).toBe(80);
  });

  it('다이너마이트는 절대 터지지 않는다', () => {
    const s0 = scenario({
      players: [{ equipment: ['dynamite'] }, {}, {}, {}],
      deckTop: [{ kind: 'missed', suit: 'spades', rank: '5' }],
      event: 'blessing',
    });
    const s = beginTurn(s0, 'p0');
    expect(logged(s, 'dynamite')).toBe(false);
    expect(p(s, 'p1').equipment).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });

  it('♣ 카드로도 감옥에서 탈출한다 (v0.43)', () => {
    const s0 = scenario({
      players: [{}, { equipment: ['jail'] }, {}, {}],
      deckTop: [{ kind: 'missed', suit: 'clubs', rank: '10' }],
      event: 'blessing',
    });
    const s = beginTurn(s0, 'p1');
    expect(logged(s, 'jailEscape')).toBe(true);
    expect(s.turn.active).toBe('p1');
    expect(totalCards(s)).toBe(80);
  });

  it('블랙 잭의 두 번째 카드 공개도 축복을 따른다', () => {
    const s0 = scenario({
      players: [{ character: 'blackJack' }, {}, {}, {}],
      deckTop: [
        { kind: 'bang', suit: 'clubs', rank: '2' },
        { kind: 'missed', suit: 'clubs', rank: '10' },
      ],
      event: 'blessing',
    });
    const s = beginTurn(s0, 'p0');
    expect(p(s, 'p0').hand).toHaveLength(3);
    expect(totalCards(s)).toBe(80);
  });
});

describe('저주', () => {
  it('♥ 카드로도 술통 판정에 실패한다 (v0.43)', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { equipment: ['barrel'] }, {}, {}],
      deckTop: [{ kind: 'beer', suit: 'hearts', rank: '6' }],
      event: 'curse',
    });
    const s = reduce(s0, bangAt(s0, 'p0', 'p1'));
    expect(logged(s, 'dodge')).toBe(false);
    expect(p(s, 'p1').hp).toBe(3);
    expect(totalCards(s)).toBe(80);
  });

  it('숫자만 2~9 면 다이너마이트가 터진다', () => {
    const s0 = scenario({
      players: [{ equipment: ['dynamite'] }, {}, {}, {}],
      deckTop: [{ kind: 'beer', suit: 'hearts', rank: '6' }],
      event: 'curse',
    });
    const s = beginTurn(s0, 'p0');
    expect(logged(s, 'dynamite')).toBe(true);
    expect(p(s, 'p0').hp).toBe(2);
    expect(totalCards(s)).toBe(80);
  });

  it('♥ 카드로도 감옥을 탈출하지 못한다', () => {
    const s0 = scenario({
      players: [{}, { equipment: ['jail'] }, {}, {}],
      deckTop: [{ kind: 'beer', suit: 'hearts', rank: '6' }],
      event: 'curse',
    });
    const s = beginTurn(s0, 'p1');
    expect(logged(s, 'jailSkip')).toBe(true);
    expect(p(s, 'p1').hand).toHaveLength(0);
    expect(totalCards(s)).toBe(80);
  });

  it('블랙 잭은 ♥ 를 뽑아도 한 장 더 가져오지 않는다', () => {
    const s0 = scenario({
      players: [{ character: 'blackJack' }, {}, {}, {}],
      deckTop: [
        { kind: 'bang', suit: 'clubs', rank: '2' },
        { kind: 'beer', suit: 'hearts', rank: '6' },
      ],
      event: 'curse',
    });
    const s = beginTurn(s0, 'p0');
    expect(p(s, 'p0').hand).toHaveLength(2);
    expect(totalCards(s)).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// 유령도시
// ---------------------------------------------------------------------------

describe('유령도시', () => {
  it('제거된 플레이어가 자기 차례에 유령으로 되살아난다', () => {
    const s0 = scenario({
      players: [{}, { alive: false, hp: 0 }, {}, {}],
      event: 'ghostTown',
    });
    const s = reduce(s0, { type: 'endTurn', pid: 'p0' });
    expect(s.turn.active).toBe('p1');
    expect(p(s, 'p1').ghost).toBe(true);
    expect(p(s, 'p1').alive).toBe(false);
    expect(logged(s, 'ghostRise')).toBe(true);
    expect(totalCards(s)).toBe(80);
  });

  it('유령은 카드를 3장 가져온다', () => {
    const s0 = scenario({
      players: [{}, { alive: false, hp: 0 }, {}, {}],
      event: 'ghostTown',
    });
    const s = reduce(s0, { type: 'endTurn', pid: 'p0' });
    expect(p(s, 'p1').hand).toHaveLength(3);
    expect(totalCards(s)).toBe(80);
  });

  it('유령은 뱅!에 목숨을 잃지 않는다', () => {
    const s0 = scenario({
      players: [{}, {}, { alive: false, ghost: true, hp: 0 }, {}],
      event: 'ghostTown',
    });
    const s = resolveStack({
      ...s0,
      stack: [
        { k: 'bang', source: 'p0', target: 'p2', missesRequired: 1, cause: 'bang', dodgeChecked: false },
      ],
    });
    expect(p(s, 'p2').hp).toBe(0);
    expect(p(s, 'p2').ghost).toBe(true);
    expect(logged(s, 'ghostImmune')).toBe(true);
    expect(totalCards(s)).toBe(80);
  });

  it('결투에서 진 피해로도 목숨을 잃지 않는다 (v0.429)', () => {
    const s0 = scenario({
      players: [{}, {}, { alive: false, ghost: true, hp: 0 }, {}],
      event: 'ghostTown',
    });
    const s = resolveStack({
      ...s0,
      stack: [{ k: 'damage', target: 'p2', amount: 1, source: 'p0', credit: 'p0', cause: 'duel' }],
    });
    expect(p(s, 'p2').hp).toBe(0);
    // 피해 적용은 멱등해야 한다. 감소 이벤트가 두 번 발행되면 안 된다.
    expect(loggedCount(s, 'ghostImmune')).toBe(1);
    expect(loggedCount(s, 'damage')).toBe(0);
    expect(totalCards(s)).toBe(80);
  });

  it('유령도 결투의 상대가 된다 (v0.429)', () => {
    const s0 = scenario({
      players: [{}, {}, { alive: false, ghost: true, hp: 0 }, {}],
      event: 'ghostTown',
    });
    const s = resolveStack({
      ...s0,
      stack: [{ k: 'duel', a: 'p0', b: 'p2', toPlay: 'p2' }],
    });
    expect(logged(s, 'duelLoss')).toBe(true);
    expect(logged(s, 'ghostImmune')).toBe(true);
    expect(p(s, 'p2').hp).toBe(0);
    expect(totalCards(s)).toBe(80);
  });

  it('유령은 하이 눈 피해도 받지 않는다', () => {
    const s0 = scenario({
      players: [{}, {}, { alive: false, ghost: true, hp: 0 }, {}],
      event: 'ghostTown',
    });
    const s = resolveStack({
      ...s0,
      stack: [{ k: 'damage', target: 'p2', amount: 1, source: null, cause: 'highNoon' }],
    });
    expect(p(s, 'p2').hp).toBe(0);
    expect(logged(s, 'ghostImmune')).toBe(true);
    expect(totalCards(s)).toBe(80);
  });

  it('차례가 끝나면 다시 사라지고 들고 있던 카드가 전부 정리된다 (v0.43)', () => {
    const s0 = scenario({
      players: [
        {},
        {},
        { alive: false, ghost: true, hp: 0, hand: ['bang', 'beer'], equipment: ['barrel'] },
        {},
      ],
      event: 'ghostTown',
      activeSeat: 2,
    });
    let s = reduce(s0, { type: 'endTurn', pid: 'p2' });
    for (let i = 0; i < 10 && s.turn.active === 'p2'; i++) s = step(s);
    expect(p(s, 'p2').ghost).toBe(false);
    expect(p(s, 'p2').hand).toHaveLength(0);
    expect(p(s, 'p2').equipment).toHaveLength(0);
    expect(totalCards(s)).toBe(80);
  });

  it('유령은 거리 계산의 원에 남는다 (v0.227)', () => {
    const s = scenario({
      players: [{}, {}, { alive: false, ghost: true, hp: 0 }, {}],
      event: 'ghostTown',
    });
    expect(distance(s, 'p0', 'p2')).toBe(2);
    expect(distance(s, 'p2', 'p0')).toBe(2);
  });

  it('유령이 주점을 써도 자신은 회복되지 않는다 (쟁점 E)', () => {
    const s0 = scenario({
      players: [
        { hp: 2 },
        { hp: 1 },
        { alive: false, ghost: true, hp: 0, hand: ['saloon'] },
        { hp: 3 },
      ],
      event: 'ghostTown',
      activeSeat: 2,
    });
    const s = reduce(s0, { type: 'playCard', pid: 'p2', card: handCard(s0, 'p2', 'saloon') });
    expect(p(s, 'p2').hp).toBe(0);
    expect(p(s, 'p0').hp).toBe(3);
    expect(p(s, 'p1').hp).toBe(2);
    expect(totalCards(s)).toBe(80);
  });

  it('유령이 된 무법자가 보안관을 처치해도 무법자의 승리다 (v0.178)', () => {
    const s0 = scenario({
      players: [
        { role: 'sheriff', hp: 1 },
        { role: 'outlaw', alive: false, ghost: true, hp: 0, hand: ['bang'] },
        { role: 'outlaw', alive: false, hp: 0 },
        { role: 'deputy' },
      ],
      event: 'ghostTown',
      activeSeat: 1,
    });
    const s = reduce(s0, bangAt(s0, 'p1', 'p0'));
    expect(s.result).toMatchObject({ winners: ['outlaw'] });
    expect(totalCards(s)).toBe(80);
  });

  it('유령이 잡화점을 써도 진행이 멈추지 않는다 (v0.418)', () => {
    const s0 = scenario({
      players: [{}, {}, { alive: false, ghost: true, hp: 0, hand: ['generalStore'] }, {}],
      event: 'ghostTown',
      activeSeat: 2,
    });
    const s = settle(reduce(s0, {
      type: 'playCard',
      pid: 'p2',
      card: handCard(s0, 'p2', 'generalStore'),
    }));
    expect(s.turn.active).toBe('p2');
    expect(s.turn.phase).toBe('play');
    expect(totalCards(s)).toBe(80);
  });

  it('유령도 잡화점의 참여자에 포함된다 (v0.418)', () => {
    const s0 = scenario({
      players: [{ hand: ['generalStore'] }, {}, { alive: false, ghost: true, hp: 0 }, {}],
      event: 'ghostTown',
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'generalStore'),
    });
    // 펼치는 장수는 '생존자 수'가 아니라 '현재 링 참여자 수'다.
    expect(s.awaiting!.k === 'generalStore' ? s.awaiting.options : []).toHaveLength(4);
    expect(totalCards(s)).toBe(80);
  });

  it('유령이 인디언을 써도 진행이 멈추지 않는다 (v0.203)', () => {
    const s0 = scenario({
      players: [{}, {}, { alive: false, ghost: true, hp: 0, hand: ['indians'] }, {}],
      event: 'ghostTown',
      activeSeat: 2,
    });
    const s = settle(reduce(s0, {
      type: 'playCard',
      pid: 'p2',
      card: handCard(s0, 'p2', 'indians'),
    }));
    expect(s.turn.active).toBe('p2');
    expect(p(s, 'p1').hp).toBe(3);
    expect(totalCards(s)).toBe(80);
  });

  it('유령이 기관총을 써도 진행이 멈추지 않는다 (v0.43)', () => {
    const s0 = scenario({
      players: [{}, {}, { alive: false, ghost: true, hp: 0, hand: ['gatling'] }, {}],
      event: 'ghostTown',
      activeSeat: 2,
    });
    const s = settle(reduce(s0, {
      type: 'playCard',
      pid: 'p2',
      card: handCard(s0, 'p2', 'gatling'),
    }));
    expect(s.turn.active).toBe('p2');
    expect(p(s, 'p1').hp).toBe(3);
    expect(totalCards(s)).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// 골드러시
// ---------------------------------------------------------------------------

describe('골드러시', () => {
  it('차례가 반시계 방향으로 진행된다', () => {
    const s0 = scenario({ players: [{}, {}, {}, {}], event: 'goldRush' });
    const s = reduce(s0, { type: 'endTurn', pid: 'p0' });
    expect(s.turn.active).toBe('p3');
    expect(totalCards(s)).toBe(80);
  });

  it('다이너마이트도 반대 방향으로 넘어간다 (v0.46)', () => {
    const s0 = scenario({
      players: [{}, { equipment: ['dynamite'] }, {}, {}],
      deckTop: [{ kind: 'beer', suit: 'hearts', rank: '6' }],
      event: 'goldRush',
    });
    const s = beginTurn(s0, 'p1');
    expect(p(s, 'p0').equipment).toHaveLength(1);
    expect(p(s, 'p2').equipment).toHaveLength(0);
    expect(totalCards(s)).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// 숙취
// ---------------------------------------------------------------------------

describe('숙취', () => {
  it('바트 캐시디가 피해를 받아도 카드를 뽑지 않는다 (v0.154)', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { character: 'bartCassidy' }, {}, {}],
      event: 'hangover',
    });
    const s = reduce(s0, bangAt(s0, 'p0', 'p1'));
    expect(p(s, 'p1').hp).toBe(3);
    expect(p(s, 'p1').hand).toHaveLength(0);
    expect(totalCards(s)).toBe(80);
  });

  it('폴 리그렛의 거리 보정 같은 지속형 능력도 죽는다 (v0.154)', () => {
    const s0 = scenario({ players: [{}, { character: 'paulRegret' }, {}, {}] });
    expect(distance(s0, 'p0', 'p1')).toBe(2);

    const s = scenario({ players: [{}, { character: 'paulRegret' }, {}, {}], event: 'hangover' });
    expect(distance(s, 'p0', 'p1')).toBe(1);
  });

  it('러키 듀크의 판정이 1장으로 돌아온다', () => {
    const s0 = scenario({
      players: [{ character: 'luckyDuke', equipment: ['dynamite'] }, {}, {}, {}],
      deckTop: [
        { kind: 'missed', suit: 'spades', rank: '5' },
        { kind: 'beer', suit: 'hearts', rank: '6' },
      ],
      event: 'hangover',
    });
    const s = beginTurn(s0, 'p0');
    // 두 장을 보고 고르는 선택 창이 뜨지 않고 첫 장으로 곧장 폭발한다.
    expect(s.awaiting).toBeNull();
    expect(logged(s, 'dynamite')).toBe(true);
    expect(p(s, 'p0').hp).toBe(2);
    expect(totalCards(s)).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// 총격전
// ---------------------------------------------------------------------------

describe('총격전', () => {
  it('뱅!을 두 번까지 쓸 수 있다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang', 'bang'] }, {}, {}, {}],
      event: 'shootout',
    });
    let s = reduce(s0, bangAt(s0, 'p0', 'p1'));
    s = reduce(s, bangAt(s, 'p0', 'p1'));
    expect(s.turn.bangsPlayed).toBe(2);
    expect(p(s, 'p1').hp).toBe(2);
    expect(logged(s, 'rejected')).toBe(false);
    expect(totalCards(s)).toBe(80);
  });

  it('세 번째 뱅!은 거부된다', () => {
    const s0 = scenario({
      players: [{ hand: ['bang', 'bang', 'bang'] }, {}, {}, {}],
      event: 'shootout',
    });
    let s = reduce(s0, bangAt(s0, 'p0', 'p1'));
    s = reduce(s, bangAt(s, 'p0', 'p1'));
    s = reduce(s, bangAt(s, 'p0', 'p1'));
    expect(s.turn.bangsPlayed).toBe(2);
    expect(logged(s, 'rejected')).toBe(true);
    expect(totalCards(s)).toBe(80);
  });

  it('볼캐닉과 겹쳐도 무제한이다 (EC-30)', () => {
    const s0 = scenario({
      players: [{ hand: ['bang', 'bang', 'bang'], equipment: ['volcanic'] }, {}, {}, {}],
      event: 'shootout',
    });
    let s: GameState = s0;
    for (let i = 0; i < 3; i++) s = reduce(s, bangAt(s, 'p0', 'p1'));
    expect(s.turn.bangsPlayed).toBe(3);
    expect(logged(s, 'rejected')).toBe(false);
    expect(totalCards(s)).toBe(80);
  });

  it('윌리 더 키드와 겹쳐도 무제한이다', () => {
    const s0 = scenario({
      players: [{ character: 'willyTheKid', hand: ['bang', 'bang', 'bang'] }, {}, {}, {}],
      event: 'shootout',
    });
    let s: GameState = s0;
    for (let i = 0; i < 3; i++) s = reduce(s, bangAt(s, 'p0', 'p1'));
    expect(s.turn.bangsPlayed).toBe(3);
    expect(logged(s, 'rejected')).toBe(false);
    expect(totalCards(s)).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// 달톤 형제
// ---------------------------------------------------------------------------

describe('달톤 형제', () => {
  it('공개되는 순간 파랑 카드를 가진 모두가 1장 버린다 (v0.46)', () => {
    const s0 = scenario({
      players: [
        { equipment: ['barrel', 'scope', 'mustang'] },
        { equipment: ['mustang'] },
        {},
        {},
      ],
    });
    const s = settle(revealEvent(s0, 'theDaltons'));
    expect(p(s, 'p0').equipment).toHaveLength(2);
    expect(p(s, 'p1').equipment).toHaveLength(0);
    expect(totalCards(s)).toBe(80);
  });

  it('야생마도 파랑 카드로 센다 (v0.418)', () => {
    const s0 = scenario({ players: [{ equipment: ['mustang'] }, {}, {}, {}] });
    const s = settle(revealEvent(s0, 'theDaltons'));
    expect(p(s, 'p0').equipment).toHaveLength(0);
    expect(logged(s, 'daltons')).toBe(true);
    expect(totalCards(s)).toBe(80);
  });

  it('파랑 카드가 없으면 건너뛴다', () => {
    const s0 = scenario({ players: [{ hand: ['bang'] }, {}, {}, {}] });
    const s = revealEvent(s0, 'theDaltons');
    expect(s.awaiting).toBeNull();
    expect(logged(s, 'daltons')).toBe(false);
    expect(p(s, 'p0').hand).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// 의사
// ---------------------------------------------------------------------------

describe('의사', () => {
  it('공개되는 순간 목숨이 가장 적은 사람이 1 회복한다', () => {
    const s0 = scenario({ players: [{ hp: 3 }, { hp: 1 }, { hp: 2 }, { hp: 4 }] });
    const s = revealEvent(s0, 'theDoctor');
    expect(p(s, 'p1').hp).toBe(2);
    expect(p(s, 'p2').hp).toBe(2);
    expect(p(s, 'p0').hp).toBe(3);
    expect(totalCards(s)).toBe(80);
  });

  it('동률이면 전부 회복한다', () => {
    const s0 = scenario({ players: [{ hp: 1 }, { hp: 1 }, { hp: 3 }, { hp: 4 }] });
    const s = revealEvent(s0, 'theDoctor');
    expect(p(s, 'p0').hp).toBe(2);
    expect(p(s, 'p1').hp).toBe(2);
    expect(p(s, 'p2').hp).toBe(3);
    expect(totalCards(s)).toBe(80);
  });

  it('제거된 사람은 회복 대상이 아니다', () => {
    const s0 = scenario({ players: [{ hp: 2 }, { alive: false, hp: 0 }, { hp: 3 }, { hp: 4 }] });
    const s = revealEvent(s0, 'theDoctor');
    expect(p(s, 'p1').hp).toBe(0);
    expect(p(s, 'p0').hp).toBe(3);
    expect(totalCards(s)).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// 목사
// ---------------------------------------------------------------------------

describe('목사', () => {
  it('자기 차례에 맥주를 쓸 수 없다', () => {
    const s0 = scenario({
      players: [{ hand: ['beer'], hp: 2 }, {}, {}, {}],
      event: 'theReverend',
    });
    const s = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'beer') });
    expect(logged(s, 'rejected')).toBe(true);
    expect(p(s, 'p0').hp).toBe(2);
    expect(totalCards(s)).toBe(80);
  });

  it('죽음 회피용 맥주도 막힌다 (쟁점 D)', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, { hp: 1, hand: ['beer'] }, {}, {}],
      event: 'theReverend',
    });
    const s = reduce(s0, bangAt(s0, 'p0', 'p1'));
    expect(s.awaiting).toBeNull();
    expect(p(s, 'p1').alive).toBe(false);
    expect(totalCards(s)).toBe(80);
  });

  it('주점은 막지 않는다 (v0.99)', () => {
    const s0 = scenario({
      players: [{ hand: ['saloon'], hp: 2 }, { hp: 1 }, {}, {}],
      event: 'theReverend',
    });
    const s = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'saloon') });
    expect(logged(s, 'rejected')).toBe(false);
    expect(p(s, 'p0').hp).toBe(3);
    expect(p(s, 'p1').hp).toBe(2);
    expect(totalCards(s)).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// 설교
// ---------------------------------------------------------------------------

describe('설교', () => {
  it('자기 차례에 뱅! 카드를 쓸 수 없다 (v0.61)', () => {
    const s0 = scenario({
      players: [{ hand: ['bang'] }, {}, {}, {}],
      event: 'theSermon',
    });
    expect(legalActions(s0, 'p0').filter((a) => a.type === 'playCard')).toHaveLength(0);
    const s = reduce(s0, bangAt(s0, 'p0', 'p1'));
    expect(logged(s, 'rejected')).toBe(true);
    expect(p(s, 'p1').hp).toBe(4);
    expect(totalCards(s)).toBe(80);
  });

  it('기관총은 뱅! 카드가 아니므로 쓸 수 있다 (v0.129)', () => {
    const s0 = scenario({
      players: [{ hand: ['gatling'] }, {}, {}, {}],
      event: 'theSermon',
    });
    const s = settle(reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'gatling'),
    }));
    expect(logged(s, 'rejected')).toBe(false);
    expect(p(s, 'p1').hp).toBe(3);
    expect(totalCards(s)).toBe(80);
  });

  it('남의 차례의 인디언 대응은 막지 않는다 (쟁점 B)', () => {
    const s0 = scenario({
      players: [{ hand: ['indians'] }, { hand: ['bang'] }, {}, {}],
      event: 'theSermon',
    });
    const s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'indians'),
    });
    expect(s.awaiting).toMatchObject({ k: 'indiansBang', pid: 'p1' });
    expect(s.awaiting!.k === 'indiansBang' ? s.awaiting.options : []).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });

  it('결투를 건 사람도 뱅!으로 응수할 수 있다 (쟁점 B, v0.429 를 따르지 않는다)', () => {
    const s0 = scenario({
      players: [{ hand: ['duel', 'bang'] }, { hand: ['bang'] }, {}, {}],
      event: 'theSermon',
    });
    let s = reduce(s0, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s0, 'p0', 'duel'),
      target: 'p1',
    });
    const reply = s.awaiting!.k === 'duelBang' ? s.awaiting.options[0] : '';
    s = reduce(s, { type: 'respond', pid: 'p1', choice: { c: 'card', card: reply } });
    expect(s.awaiting).toMatchObject({ k: 'duelBang', pid: 'p0' });
    expect(s.awaiting!.k === 'duelBang' ? s.awaiting.options : []).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// 기차도착 · 갈증
// ---------------------------------------------------------------------------

describe('기차도착', () => {
  it('카드 가져오기 단계에서 3장을 가져온다', () => {
    const s0 = scenario({
      players: [{ character: 'willyTheKid' }, {}, {}, {}],
      event: 'trainArrival',
    });
    const s = beginTurn(s0, 'p0');
    expect(p(s, 'p0').hand).toHaveLength(3);
    expect(totalCards(s)).toBe(80);
  });
});

describe('갈증', () => {
  it('카드 가져오기 단계에서 1장만 가져온다', () => {
    const s0 = scenario({
      players: [{ character: 'willyTheKid' }, {}, {}, {}],
      event: 'thirst',
    });
    const s = beginTurn(s0, 'p0');
    expect(p(s, 'p0').hand).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });

  it('블랙 잭은 두 번째 카드가 없어 공개도 추가 드로우도 없다 (v0.61)', () => {
    const s0 = scenario({
      players: [{ character: 'blackJack' }, {}, {}, {}],
      event: 'thirst',
    });
    const s = beginTurn(s0, 'p0');
    expect(p(s, 'p0').hand).toHaveLength(1);
    expect(logged(s, 'blackJack')).toBe(false);
    expect(totalCards(s)).toBe(80);
  });

  it('킷 칼슨이 들여다보는 장수도 함께 줄어든다 (v0.128)', () => {
    const s0 = scenario({
      players: [{ character: 'kitCarlson' }, {}, {}, {}],
      event: 'thirst',
    });
    const s = beginTurn(s0, 'p0');
    expect(s.awaiting).toMatchObject({ k: 'kitCarlson', pid: 'p0', remaining: 1 });
    expect(s.awaiting!.k === 'kitCarlson' ? s.awaiting.options : []).toHaveLength(2);
    expect(totalCards(s)).toBe(80);
  });

  it('킷 칼슨도 결국 1장만 가져간다', () => {
    const s0 = scenario({
      players: [{ character: 'kitCarlson' }, {}, {}, {}],
      event: 'thirst',
    });
    const s = settle(beginTurn(s0, 'p0'));
    expect(p(s, 'p0').hand).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// 새로운 신분
// ---------------------------------------------------------------------------

describe('새로운 신분', () => {
  it('차례 시작에 예비 캐릭터로 바꾸면 목숨 2로 시작한다', () => {
    const base = scenario({
      players: [{ character: 'willyTheKid' }, {}, {}, {}],
      event: 'newIdentity',
    });
    const s0 = withSpare(base, 'p0', 'paulRegret');
    let s = beginTurn(s0, 'p0');
    expect(s.awaiting).toMatchObject({ k: 'newIdentity', pid: 'p0', spare: 'paulRegret' });

    s = reduce(s, { type: 'respond', pid: 'p0', choice: { c: 'yes' } });
    expect(p(s, 'p0').character).toBe('paulRegret');
    expect(p(s, 'p0').hp).toBe(2);
    expect(totalCards(s)).toBe(80);
  });

  it('거절하면 캐릭터도 목숨도 그대로다', () => {
    const base = scenario({
      players: [{ character: 'willyTheKid', hp: 4 }, {}, {}, {}],
      event: 'newIdentity',
    });
    const s0 = withSpare(base, 'p0', 'paulRegret');
    let s = beginTurn(s0, 'p0');
    s = reduce(s, { type: 'respond', pid: 'p0', choice: { c: 'pass' } });
    expect(p(s, 'p0').character).toBe('willyTheKid');
    expect(p(s, 'p0').hp).toBe(4);
    expect(totalCards(s)).toBe(80);
  });

  it('예비 캐릭터가 없으면 물어보지 않는다', () => {
    const s0 = scenario({
      players: [{ character: 'willyTheKid' }, {}, {}, {}],
      event: 'newIdentity',
    });
    const s = beginTurn(s0, 'p0');
    expect(logged(s, 'newIdentity')).toBe(false);
    expect(s.turn.phase).toBe('play');
    expect(totalCards(s)).toBe(80);
  });

  it('바꾼 뒤에는 새 캐릭터의 능력이 작동한다', () => {
    const base = scenario({
      players: [{ character: 'willyTheKid' }, { hand: ['bang'] }, {}, {}],
      event: 'newIdentity',
    });
    const s0 = withSpare(base, 'p0', 'bartCassidy');
    let s = beginTurn(s0, 'p0');
    s = reduce(s, { type: 'respond', pid: 'p0', choice: { c: 'yes' } });
    const handBefore = p(s, 'p0').hand.length;

    // 바트 캐시디는 목숨을 잃을 때마다 1장을 가져온다.
    s = resolveStack({
      ...s,
      stack: [{ k: 'damage', target: 'p0', amount: 1, source: 'p1', cause: 'bang' }],
    });
    expect(p(s, 'p0').hand).toHaveLength(handBefore + 1);
    expect(totalCards(s)).toBe(80);
  });

  it('바꾼 뒤에는 옛 캐릭터의 능력이 죽는다', () => {
    const base = scenario({
      players: [{ character: 'willyTheKid', hand: ['bang', 'bang'] }, {}, {}, {}],
      event: 'newIdentity',
    });
    const s0 = withSpare(base, 'p0', 'paulRegret');
    let s = beginTurn(s0, 'p0');
    s = reduce(s, { type: 'respond', pid: 'p0', choice: { c: 'yes' } });

    s = reduce(s, bangAt(s, 'p0', 'p1'));
    s = reduce(s, bangAt(s, 'p0', 'p1'));
    // 윌리의 무제한 뱅!은 사라졌다.
    expect(s.turn.bangsPlayed).toBe(1);
    expect(logged(s, 'rejected')).toBe(true);
    expect(totalCards(s)).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// 수갑
// ---------------------------------------------------------------------------

describe('수갑', () => {
  const cuffed = () =>
    scenario({
      players: [
        {
          character: 'willyTheKid',
          hand: [
            { kind: 'bang', suit: 'hearts', rank: 'Q' },
            { kind: 'bang', suit: 'spades', rank: 'A' },
          ],
        },
        {},
        {},
        {},
      ],
      deckTop: [
        { kind: 'jail', suit: 'spades', rank: '10' },
        { kind: 'volcanic', suit: 'clubs', rank: '10' },
      ],
      event: 'handcuffs',
    });

  it('카드 가져오기 뒤에 무늬 선언을 요구한다 (v0.64)', () => {
    const s = beginTurn(cuffed(), 'p0');
    expect(s.awaiting).toMatchObject({ k: 'declareSuit', pid: 'p0' });
    expect(p(s, 'p0').hand).toHaveLength(4);
    expect(totalCards(s)).toBe(80);
  });

  it('선언한 무늬의 카드만 쓸 수 있다', () => {
    const s0 = cuffed();
    const [hearts, spades] = p(s0, 'p0').hand;
    let s = beginTurn(s0, 'p0');
    s = reduce(s, { type: 'respond', pid: 'p0', choice: { c: 'suit', suit: 'hearts' } });
    expect(s.turn.handcuffsSuit).toBe('hearts');

    const cards = legalActions(s, 'p0')
      .filter((a) => a.type === 'playCard')
      .map((a) => (a.type === 'playCard' ? a.card : ''));
    expect(cards).toContain(hearts);
    expect(cards).not.toContain(spades);
    expect(totalCards(s)).toBe(80);
  });

  it('반응(결투 응수)은 무늬 제약을 받지 않는다', () => {
    const s0 = scenario({
      players: [
        {
          character: 'willyTheKid',
          hand: [
            { kind: 'duel', suit: 'diamonds', rank: 'Q' },
            { kind: 'bang', suit: 'spades', rank: 'A' },
          ],
        },
        { hand: ['bang'] },
        {},
        {},
      ],
      event: 'handcuffs',
    });
    let s: GameState = {
      ...s0,
      turn: { ...s0.turn, handcuffsSuit: 'diamonds' },
    };
    s = reduce(s, {
      type: 'playCard',
      pid: 'p0',
      card: handCard(s, 'p0', 'duel'),
      target: 'p1',
    });
    const reply = s.awaiting!.k === 'duelBang' ? s.awaiting.options[0] : '';
    s = reduce(s, { type: 'respond', pid: 'p1', choice: { c: 'card', card: reply } });
    // ♠ 뱅!이지만 응수는 '사용'이 아니라 '버림'이므로 허용된다.
    expect(s.awaiting).toMatchObject({ k: 'duelBang', pid: 'p0' });
    expect(s.awaiting!.k === 'duelBang' ? s.awaiting.options : []).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });

  it('남의 차례에는 제약이 없다', () => {
    const s0 = scenario({
      players: [
        { hand: [{ kind: 'missed', suit: 'spades', rank: '2' }] },
        { hand: [{ kind: 'bang', suit: 'hearts', rank: 'Q' }] },
        {},
        {},
      ],
      event: 'handcuffs',
      activeSeat: 1,
    });
    // ♥ 를 선언한 것은 액티브 플레이어인 p1 이다. p0 의 ♠ 빗나감!은 제약을 받지 않는다.
    const s = reduce(
      { ...s0, turn: { ...s0.turn, handcuffsSuit: 'hearts' } },
      bangAt(s0, 'p1', 'p0'),
    );
    expect(s.awaiting).toMatchObject({ k: 'missed', pid: 'p0' });
    expect(s.awaiting!.k === 'missed' ? s.awaiting.options : []).toHaveLength(1);
    expect(totalCards(s)).toBe(80);
  });

  it('차례가 넘어가면 선언이 사라진다', () => {
    const s0 = cuffed();
    let s = beginTurn(s0, 'p0');
    s = reduce(s, { type: 'respond', pid: 'p0', choice: { c: 'suit', suit: 'hearts' } });
    s = beginTurn(s, 'p1');
    expect(s.turn.handcuffsSuit).toBeNull();
    expect(totalCards(s)).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// 하이 눈
// ---------------------------------------------------------------------------

describe('하이 눈', () => {
  it('모든 플레이어가 차례 시작에 목숨 1을 잃는다', () => {
    const s0 = scenario({ players: [{}, {}, {}, {}], event: 'highNoon' });
    const s = beginTurn(s0, 'p1');
    expect(p(s, 'p1').hp).toBe(3);
    expect(p(s, 'p0').hp).toBe(5);
    expect(totalCards(s)).toBe(80);
  });

  it('보안관도 예외가 아니다', () => {
    const s0 = scenario({ players: [{}, {}, {}, {}], event: 'highNoon' });
    const s = beginTurn(s0, 'p0');
    expect(p(s, 'p0').hp).toBe(4);
    expect(p(s, 'p0').maxHp).toBe(5);
    expect(totalCards(s)).toBe(80);
  });

  it('그 피해로 죽을 수도 있다', () => {
    const s0 = scenario({
      players: [{}, { hp: 1 }, {}, {}],
      event: 'highNoon',
    });
    const s = beginTurn(s0, 'p1');
    expect(p(s, 'p1').alive).toBe(false);
    expect(s.turn.active).toBe('p2');
    expect(totalCards(s)).toBe(80);
  });

  it('가해자가 없으므로 현상금은 없다 (EC-57)', () => {
    const s0 = scenario({
      players: [{ role: 'sheriff' }, { role: 'outlaw', hp: 1 }, { role: 'outlaw' }, { role: 'renegade' }],
      event: 'highNoon',
    });
    const s = beginTurn(s0, 'p1');
    expect(p(s, 'p1').alive).toBe(false);
    expect(logged(s, 'bounty')).toBe(false);
    expect(totalCards(s)).toBe(80);
  });

  it('하이 눈 피해가 다이너마이트 판정보다 먼저다 (EC-108)', () => {
    const s0 = scenario({
      players: [{}, { hp: 1, equipment: ['dynamite'] }, {}, {}],
      deckTop: [{ kind: 'beer', suit: 'hearts', rank: '6' }],
      event: 'highNoon',
    });
    const s = beginTurn(s0, 'p1');
    expect(p(s, 'p1').alive).toBe(false);
    // 이미 죽었으므로 판정은 아예 수행되지 않는다.
    expect(logged(s, 'judgement')).toBe(false);
    expect(totalCards(s)).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// 조합
// ---------------------------------------------------------------------------

describe('유령도시 + 벌쳐 샘', () => {
  it('유령의 차례에는 벌쳐 샘이 카드를 가져가지 않는다', () => {
    const s0 = scenario({
      players: [
        { character: 'vultureSam' },
        {},
        { alive: false, ghost: true, hp: 0, hand: ['bang'] },
        {},
      ],
      event: 'ghostTown',
      activeSeat: 2,
    });
    let s = reduce(s0, { type: 'endTurn', pid: 'p2' });
    for (let i = 0; i < 10 && s.turn.active === 'p2'; i++) s = step(s);
    expect(p(s, 'p2').hand).toHaveLength(0);
    expect(totalCards(s)).toBe(80);
  });
});
