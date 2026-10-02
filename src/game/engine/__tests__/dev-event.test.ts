/**
 * 개발용 devEvent (?devEvent=): 판을 시작하자마자 그 이벤트가 걸려 있게 한다.
 * 설정(config)에 들어가므로 같은 시드·같은 액션이면 같은 판이 나와야 한다.
 */

import { describe, expect, it } from 'vitest';

import type { EventCardId, Expansion } from '../../data/types';
import { reduce } from '../reducer';
import type { Action, GameState } from '../types';
import { autoDraft } from './helpers';

function start(devEvent: EventCardId | undefined, expansions: Expansion[], seed = 7): GameState {
  const action: Action = {
    type: 'startGame',
    seed,
    config: { playerCount: 5, expansions, ...(devEvent ? { devEvent } : {}) },
    seats: Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, name: `P${i}` })),
  };
  return autoDraft(reduce(null, action));
}

describe('devEvent', () => {
  it('보안관의 첫 차례부터 그 이벤트가 걸려 있다', () => {
    for (const id of ['sacagaway', 'dorothyRage', 'ghostTown', 'sniper'] as EventCardId[]) {
      const exp: Expansion =
        id === 'ghostTown' ? 'highnoon' : id === 'sniper' ? 'fistful' : 'wildwestshow';
      const s = start(id, [exp]);
      expect(s.event?.current).toBe(id);
      expect(s.turn.round).toBe(1);
      expect(s.log.some((e) => e.t === 'event' && e.card === id)).toBe(true);
    }
  });

  it('공개 효과까지 실제와 똑같이 돈다 (헬레나 존테로 판정)', () => {
    const s = start('helenaZontero', ['wildwestshow']);
    expect(s.event?.current).toBe('helenaZontero');
    expect(s.log.some((e) => e.t === 'judgement')).toBe(true);
  });

  it('없으면 평소대로 1라운드에는 공개하지 않는다', () => {
    expect(start(undefined, ['wildwestshow']).event?.current).toBeNull();
  });

  it('덱에 없는 이벤트면 무시한다', () => {
    const s = start('ghostTown', ['wildwestshow']);
    expect(s.event?.current).toBeNull();
  });

  it('같은 시드면 같은 판이고 JSON 으로 왕복한다', () => {
    const a = start('ladyRoseOfTexas', ['wildwestshow'], 3);
    const b = start('ladyRoseOfTexas', ['wildwestshow'], 3);
    expect(a).toEqual(b);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });
});
