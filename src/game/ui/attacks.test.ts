import { describe, expect, it } from 'vitest';

import { BASE_DECK } from '../data/cards.base';
import type { CardId, CardKind } from '../data/types';
import { handCard, scenario } from '../engine/__tests__/helpers';
import { reduce, viewFor, type GameEvent } from '../engine';
import { attacksBy } from './attacks';

const idOf = (kind: CardKind): CardId => BASE_DECK.find((c) => c.kind === kind)!.id;

function play(pid: string, kind: CardKind, target?: string): GameEvent {
  return { t: 'playCard', pid, card: idOf(kind), target, msg: { k: 'timeout' }, seq: 0 };
}

describe('나를 겨눈 카드 세기', () => {
  it('종류별로 센다', () => {
    const log = [
      play('p1', 'bang', 'p0'),
      play('p1', 'bang', 'p0'),
      play('p1', 'duel', 'p0'),
      play('p1', 'catBalou', 'p0'),
      play('p1', 'panic', 'p0'),
      play('p1', 'jail', 'p0'),
    ];
    expect(attacksBy(log, 'p1', 'p0')).toEqual({ bang: 2, duel: 1, catBalou: 1, panic: 1, jail: 1 });
  });

  it('남을 겨눈 것, 남이 낸 것, 대상 없는 카드, 해롭지 않은 카드는 뺀다', () => {
    const log = [
      play('p1', 'bang', 'p2'),
      play('p2', 'bang', 'p0'),
      play('p1', 'gatling'),
      play('p1', 'beer'),
      play('p1', 'panic', 'p1'),
    ];
    expect(attacksBy(log, 'p1', 'p0')).toEqual({});
  });

  it('후속 로그는 다시 세지 않는다', () => {
    const log: GameEvent[] = [
      play('p1', 'panic', 'p0'),
      { t: 'panic', pid: 'p1', target: 'p0', msg: { k: 'timeout' }, seq: 0 },
      play('p1', 'duel', 'p0'),
      { t: 'duelBang', pid: 'p0', target: 'p1', card: idOf('bang'), msg: { k: 'timeout' }, seq: 0 },
    ];
    expect(attacksBy(log, 'p1', 'p0')).toEqual({ panic: 1, duel: 1 });
  });

  it('대상과 함께 낸 빗나감!은 칼라미티 자넷의 뱅!으로 센다', () => {
    expect(attacksBy([play('p1', 'missed', 'p0')], 'p1', 'p0')).toEqual({ bang: 1 });
  });

  it('실제 판의 로그에서 내 시점으로도 센다', () => {
    const s0 = scenario({
      players: [
        { role: 'sheriff', hand: ['bang'] },
        { role: 'outlaw', hp: 4 },
        { role: 'deputy' },
        { role: 'renegade' },
      ],
    });
    const s = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'bang'), target: 'p1' });
    expect(attacksBy(viewFor(s, 'p1').log, 'p0', 'p1')).toEqual({ bang: 1 });
  });
});
