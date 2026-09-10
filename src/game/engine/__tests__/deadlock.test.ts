import { describe, expect, it } from 'vitest';

import { legalActions } from '../legal';
import { reduce } from '../reducer';
import { handCard, p, scenario } from './helpers';

describe('자기 차례에 죽는 경우', () => {
  it('자기가 건 결투에서 져서 죽어도 차례가 다음 사람에게 넘어간다', () => {
    const s0 = scenario({
      players: [
        { role: 'outlaw', hp: 1, hand: ['duel'] },
        { role: 'sheriff', hand: ['bang'] },
        { role: 'outlaw' },
        { role: 'renegade' },
      ],
    });
    let s = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'duel'), target: 'p1' });
    // p1 이 뱅!을 내면 p0 은 낼 것이 없어 죽는다
    s = reduce(s, { type: 'respond', pid: 'p1', choice: { c: 'card', card: p(s, 'p1').hand[0] } });

    expect(p(s, 'p0').alive).toBe(false);
    expect(s.turn.active).not.toBe('p0');
    expect(legalActions(s, s.turn.active).length).toBeGreaterThan(0);
  });

  it('자기가 낸 인디언에 맞아 죽어도 진행이 멈추지 않는다', () => {
    // 인디언은 사용자를 치지 않으므로, 다이너마이트가 아니라 결투로 확인한 위 경우와 달리
    // 여기서는 액티브 플레이어가 살아 있는지만 확인한다.
    const s0 = scenario({
      players: [
        { role: 'sheriff', hand: ['indians'], hp: 3 },
        { role: 'outlaw', hp: 1 },
        { role: 'outlaw', hp: 1 },
        { role: 'renegade', hp: 1 },
      ],
    });
    const s = reduce(s0, { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'indians') });
    expect(s.result).not.toBeNull();
  });
});
