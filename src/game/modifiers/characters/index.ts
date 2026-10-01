/**
 * 캐릭터 능력 훅 등록소.
 *
 * 조회는 항상 런타임에 이루어진다. 정적으로 묶어 두면 캐릭터 복제나
 * 능력 무효화(숙취) 같은 규칙을 견디지 못한다.
 */
import type { CharacterId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

import { bartCassidy } from './bart-cassidy';
import { blackJack } from './black-jack';
import { calamityJanet } from './calamity-janet';
import { elGringo } from './el-gringo';
import { jesseJones } from './jesse-jones';
import { johnnyKisch } from './johnny-kisch';
import { jourdonnais } from './jourdonnais';
import { kitCarlson } from './kit-carlson';
import { luckyDuke } from './lucky-duke';
import { paulRegret } from './paul-regret';
import { pedroRamirez } from './pedro-ramirez';
import { roseDoolan } from './rose-doolan';
import { sidKetchum } from './sid-ketchum';
import { slabTheKiller } from './slab-the-killer';
import { suzyLafayette } from './suzy-lafayette';
import { uncleWill } from './uncle-will';
import { vultureSam } from './vulture-sam';
import { willyTheKid } from './willy-the-kid';
import {
  donBell,
  dutchWill,
  jackyMurieta,
  joshMcCloud,
  madamYto,
  prettyLuzena,
  raddieSnake,
  simeonPicos,
} from './gold-rush';

export const CHARACTER_MODIFIERS: Record<CharacterId, Modifier> = {
  bartCassidy,
  blackJack,
  calamityJanet,
  elGringo,
  jesseJones,
  jourdonnais,
  kitCarlson,
  luckyDuke,
  paulRegret,
  pedroRamirez,
  roseDoolan,
  sidKetchum,
  slabTheKiller,
  suzyLafayette,
  vultureSam,
  willyTheKid,
  uncleWill,
  johnnyKisch,
  donBell,
  dutchWill,
  jackyMurieta,
  joshMcCloud,
  madamYto,
  prettyLuzena,
  raddieSnake,
  simeonPicos,
};

export { SID_KETCHUM_ABILITY } from './sid-ketchum';
export { SUZY_REASON } from './suzy-lafayette';
export { UNCLE_WILL_ABILITY } from './uncle-will';
