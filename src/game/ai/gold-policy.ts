/**
 * 골드 러시 행동 점수.
 *
 * 장비 사기·치우기·맥주 팔기·금덩이 능력을 policy.ts 의 척도(0 = 차례 마치기)에 맞춰 매긴다.
 * 점수를 주지 않으면 AI 는 이 행동을 영영 하지 않는다.
 */

import { goldDefOf } from '../data/cards.goldrush';
import type { GoldCardKind } from '../data/types';
import { playerOf, type Action, type GameState, type PlayerId } from '../engine';
import { GOLD_ABILITY } from '../engine/gold';
import { hostility, situation, type Beliefs } from './belief';
import { danger } from './evaluate';

type GoldAction = Extract<
  Action,
  { type: 'buyGold' } | { type: 'removeGold' } | { type: 'beerForGold' } | { type: 'goldAbility' }
>;

/** 검정 장비의 대략적인 가치 */
const BLACK_VALUE: Partial<Record<GoldCardKind, number>> = {
  pickaxe: 7,
  goldPan: 4,
  boots: 4,
  rucksack: 4,
  horseshoe: 3,
  calumet: 3,
  luckyCharm: 3,
  gunBelt: 2,
};

/** 이 정도 적대면 공격해도 된다 */
const HOSTILE = 0.5;

export function scoreGold(
  view: GameState,
  me: PlayerId,
  action: GoldAction,
  beliefs: Beliefs,
): number {
  const my = playerOf(view, me);
  const sit = situation(view, me, beliefs);
  const host = (id?: PlayerId): number => (id ? hostility(view, me, id, beliefs, sit) : 0);
  const missing = my.maxHp - my.hp;
  const risk = danger(view, me);

  switch (action.type) {
    case 'beerForGold':
      // 목숨이 가득할 때만 판다. 다치면 맥주는 목숨이다.
      return missing === 0 ? 6 : -8;

    case 'removeGold': {
      const h = host(action.target);
      return h > 0.6 ? 2 + 4 * h - goldDefOf(action.card).cost : -10;
    }

    case 'goldAbility':
      switch (action.ability) {
        case GOLD_ABILITY.jackyMurieta: {
          if (!action.target) return -10;
          const h = host(action.target);
          if (h < HOSTILE) return -12;
          const t = playerOf(view, action.target);
          return 10 * h + (t.hp === 1 ? 12 * h : 0) - 2;
        }
        case GOLD_ABILITY.rucksack:
          // 죽기 직전이면 무조건 쓴다
          if (my.hp <= 0) return 40;
          return missing > 0 ? 4 + 10 * risk : -10;
        default:
          // 조시 맥클라우드·래디 스네이크·사금채취판: 카드 한 장
          return 5;
      }

    case 'buyGold': {
      const def = goldDefOf(action.card);
      if (def.category === 'black') return (BLACK_VALUE[def.kind] ?? 3) + 2;

      const use = action.use ?? {};
      const h = host(use.target);
      switch (def.kind) {
        case 'shot': {
          if (!use.target) return -10;
          const t = playerOf(view, use.target);
          if (use.target === me) return missing > 0 ? 5 + 8 * risk : -10;
          return h < 0.3 && t.hp < t.maxHp ? 3 : -10;
        }
        case 'bottle':
        case 'pardner':
          if (use.as === 'beer') return missing > 0 ? 4 + 8 * risk : -10;
          if (use.as === 'generalStore') return 3;
          return h > HOSTILE ? 8 * h - 1 : -10;
        case 'goldRush':
          return 4 + missing * 3;
        case 'wanted':
          return h > 0.6 ? 3 : -10;
        case 'rhum':
          return missing >= 2 ? 8 : missing === 1 ? 3 : -10;
        case 'unionPacific':
          return 9;
        default:
          return 0;
      }
    }
  }
}
