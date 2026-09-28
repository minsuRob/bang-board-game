/**
 * 캐릭터 드래프트에서 고를 캐릭터.
 *
 * 전투가 없는 한 번의 선택이라 시뮬레이션하지 않는다. 캐릭터 가치표에
 * 역할에 따른 가산점을 얹고 시드로 살짝 흔든다.
 */

import type { CharacterId, Role } from '../data/types';
import { playerOf, type Action, type GameState, type PlayerId } from '../engine';
import { nextInt, type RngState } from '../engine/rng';

/** 대략적인 캐릭터 세기 (10점 만점) */
const CHARACTER_VALUE: Record<CharacterId, number> = {
  willyTheKid: 9,
  slabTheKiller: 8,
  jourdonnais: 8,
  kitCarlson: 7,
  blackJack: 7,
  sidKetchum: 7,
  bartCassidy: 7,
  luckyDuke: 6,
  calamityJanet: 6,
  suzyLafayette: 6,
  pedroRamirez: 6,
  jesseJones: 6,
  vultureSam: 6,
  paulRegret: 5,
  roseDoolan: 5,
  elGringo: 5,
};

/** 역할이 좋아하는 성향 */
const ROLE_BONUS: Partial<Record<Role, Partial<Record<CharacterId, number>>>> = {
  // 보안관은 오래 버텨야 한다
  sheriff: { jourdonnais: 2, sidKetchum: 1, bartCassidy: 1, paulRegret: 1 },
  // 무법자는 공격적으로
  outlaw: { willyTheKid: 1, slabTheKiller: 1, roseDoolan: 1 },
  // 배신자는 끝까지 살아남아야 한다
  renegade: { sidKetchum: 2, jourdonnais: 1, vultureSam: 1 },
};

export function chooseDraft(
  view: GameState,
  me: PlayerId,
  legal: Action[],
  rng: RngState,
  randomOnly: boolean,
): Action {
  if (randomOnly) return legal[nextInt(rng, legal.length).value];

  const role = playerOf(view, me).role;
  let cur = rng;
  let best = legal[0];
  let bestScore = -Infinity;
  for (const a of legal) {
    if (a.type !== 'pickCharacter') continue;
    const rolled = nextInt(cur, 1000);
    cur = rolled.rng;
    const score =
      (CHARACTER_VALUE[a.character] ?? 5) +
      (ROLE_BONUS[role]?.[a.character] ?? 0) +
      (rolled.value / 1000) * 1.5;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
}
