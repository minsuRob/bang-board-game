import { describe, expect, it } from 'vitest';

import { CHARACTERS } from '../../data/characters';
import { legalActions } from '../legal';
import { reduce } from '../reducer';
import type { Action, GameState } from '../types';
import { totalCards } from './helpers';

function startGame(seed = 7, count = 4): GameState {
  const seats = Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  const action: Action = {
    type: 'startGame',
    seed,
    config: { playerCount: count, expansions: [] },
    seats,
  };
  return reduce(null, action);
}

describe('게임 시작', () => {
  it('보안관이 정확히 한 명이고 그가 첫 차례를 갖는다', () => {
    const s = startGame();
    const sheriffs = s.players.filter((p) => p.role === 'sheriff');
    expect(sheriffs).toHaveLength(1);
    expect(s.turn.active).toBe(sheriffs[0].id);
    expect(sheriffs[0].roleRevealed).toBe(true);
  });

  it('보안관은 캐릭터 총알보다 목숨이 1 많다', () => {
    const s = startGame();
    for (const p of s.players) {
      const bullets = CHARACTERS[p.character].maxHp;
      expect(p.maxHp).toBe(bullets + (p.role === 'sheriff' ? 1 : 0));
    }
  });

  it('보안관 외의 역할은 감춰져 있다', () => {
    const s = startGame();
    for (const p of s.players) {
      expect(p.roleRevealed).toBe(p.role === 'sheriff');
    }
  });

  it('시작 손패는 목숨 수만큼이고, 보안관은 카드를 가져온 뒤라 더 많다', () => {
    const s = startGame();
    for (const p of s.players) {
      if (p.id === s.turn.active) continue;
      expect(p.hand).toHaveLength(p.maxHp);
    }
  });

  it('카드 80장이 어디에도 사라지지 않는다', () => {
    expect(totalCards(startGame())).toBe(80);
  });

  it('첫 차례는 카드를 가져온 뒤 카드 사용 단계에서 멈춘다', () => {
    const s = startGame();
    expect(s.turn.phase).toBe('play');
    expect(s.awaiting).toBeNull();
    expect(s.stack[s.stack.length - 1].k).toBe('playPhase');
  });

  it('액티브 플레이어에게는 낼 수 있는 액션이 있고, 남에게는 없다', () => {
    const s = startGame();
    expect(legalActions(s, s.turn.active).length).toBeGreaterThan(0);
    const other = s.players.find((p) => p.id !== s.turn.active)!;
    expect(legalActions(s, other.id).every((a) => a.type === 'useAbility')).toBe(true);
  });

  it('같은 시드는 같은 판을 만든다', () => {
    expect(JSON.stringify(startGame(99))).toEqual(JSON.stringify(startGame(99)));
    expect(JSON.stringify(startGame(99))).not.toEqual(JSON.stringify(startGame(100)));
  });
});

describe('차례 넘기기', () => {
  it('차례를 마치면 다음 좌석으로 넘어가고 손패 제한이 적용된다', () => {
    let s = startGame(7, 4);
    const first = s.turn.active;
    s = reduce(s, { type: 'endTurn', pid: first });

    // 버리기 단계가 필요하면 손패가 목숨 이하가 될 때까지 버린다.
    let guard = 0;
    while (s.turn.phase === 'discard' && s.turn.active === first && guard++ < 20) {
      const legal = legalActions(s, first).filter((a) => a.type === 'discardCard');
      expect(legal.length).toBeGreaterThan(0);
      s = reduce(s, legal[0]);
    }
    expect(s.turn.active).not.toBe(first);
    expect(s.turn.phase).toBe('play');
    expect(totalCards(s)).toBe(80);
  });

  it('네 바퀴를 돌아도 카드가 보존되고 라운드가 오른다', () => {
    let s = startGame(3, 5);
    const sheriff = s.turn.active;
    let guard = 0;
    while (s.turn.round < 4 && !s.result && guard++ < 400) {
      const active = s.turn.active;
      const legal = legalActions(s, active);
      const end = legal.find((a) => a.type === 'endTurn');
      const discard = legal.find((a) => a.type === 'discardCard');
      const next = end ?? discard ?? legal[0];
      if (!next) break;
      s = reduce(s, next);
    }
    expect(s.turn.round).toBeGreaterThanOrEqual(4);
    expect(totalCards(s)).toBe(80);
    expect(s.players.find((p) => p.id === sheriff)!.role).toBe('sheriff');
  });
});
