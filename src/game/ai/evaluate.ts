/**
 * 상태 평가.
 *
 * 하드 AI 가 시뮬레이션 결과를 점수로 바꿀 때 쓴다.
 * 역할마다 좋은 상태의 정의가 다르다는 게 이 게임의 전부다.
 */

import type { GameState, PlayerId } from '../engine';
import { alivePlayers, playerOf } from '../engine';

export const WIN_SCORE = 1000;

export function evaluate(state: GameState, me: PlayerId): number {
  const my = state.players.find((p) => p.id === me);
  if (!my) return 0;

  if (state.result) {
    return state.result.winnerIds.includes(me) ? WIN_SCORE : -WIN_SCORE;
  }

  const alive = alivePlayers(state);
  const sheriff = state.players.find((p) => p.role === 'sheriff');
  const sheriffHp = sheriff?.alive ? sheriff.hp : 0;

  const mine = my.alive ? my.hp * 4 + my.hand.length * 1.5 + my.equipment.length * 2 : -60;

  switch (my.role) {
    case 'sheriff':
    case 'deputy': {
      const enemies = alive.filter((p) => p.role === 'outlaw' || p.role === 'renegade');
      const enemyPower = enemies.reduce((n, p) => n + p.hp * 3 + p.hand.length, 0);
      return mine + sheriffHp * 8 - enemyPower;
    }
    case 'outlaw': {
      const allies = alive.filter((p) => p.role === 'outlaw' && p.id !== me).length;
      const law = alive.filter((p) => p.role === 'sheriff' || p.role === 'deputy');
      const lawPower = law.reduce((n, p) => n + p.hp * 3 + p.hand.length, 0);
      return mine * 0.6 - sheriffHp * 10 - lawPower + allies * 6;
    }
    case 'renegade': {
      // 혼자 남는 게 목표다. 남은 사람이 적을수록, 내가 튼튼할수록 좋다.
      const others = alive.length - (my.alive ? 1 : 0);
      const spread = alive.reduce((n, p) => (p.id === me ? n : n + p.hp), 0);
      return mine - others * 10 - spread * 1.5 - Math.abs(sheriffHp - 2) * 2;
    }
  }
}

/** 카드 종류별 대략적인 값어치. 버릴 카드를 고르거나 잡화점에서 집을 때 쓴다. */
export const CARD_VALUE: Record<string, number> = {
  bang: 6,
  missed: 6,
  beer: 7,
  saloon: 4,
  stagecoach: 5,
  wellsFargo: 7,
  generalStore: 4,
  gatling: 9,
  indians: 7,
  duel: 6,
  panic: 5,
  catBalou: 5,
  volcanic: 9,
  schofield: 6,
  remington: 7,
  carabine: 8,
  winchester: 8,
  scope: 5,
  mustang: 6,
  barrel: 7,
  jail: 5,
  dynamite: 1,
};

export function cardValue(kind: string): number {
  return CARD_VALUE[kind] ?? 3;
}

/** 지금 내 상태가 얼마나 위험한가 (0 안전 ~ 1 위급) */
export function danger(state: GameState, me: PlayerId): number {
  const my = playerOf(state, me);
  if (!my.alive) return 1;
  return Math.max(0, Math.min(1, 1 - (my.hp - 1) / Math.max(1, my.maxHp - 1)));
}
