/**
 * 캐릭터 능력 훅 등록소.
 *
 * 조회는 항상 런타임에 이루어진다. 정적으로 묶어 두면 캐릭터 복제나
 * 능력 무효화(숙취) 같은 규칙을 견디지 못한다.
 */
import type { CharacterId } from '../../data/types';
import type { Modifier } from '../../engine/modifier';

import { bartCassidy } from './bart-cassidy';
import { bigSpencer } from './big-spencer';
import { blackJack } from './black-jack';
import { calamityJanet } from './calamity-janet';
import { elGringo } from './el-gringo';
import { flintWestwood } from './flint-westwood';
import { garyLooter } from './gary-looter';
import { greygoryDeck } from './greygory-deck';
import { jesseJones } from './jesse-jones';
import { johnPain } from './john-pain';
import { johnnyKisch } from './johnny-kisch';
import { jourdonnais } from './jourdonnais';
import { kitCarlson } from './kit-carlson';
import { leeVanKliff } from './lee-van-kliff';
import { luckyDuke } from './lucky-duke';
import { paulRegret } from './paul-regret';
import { pedroRamirez } from './pedro-ramirez';
import { roseDoolan } from './rose-doolan';
import { sidKetchum } from './sid-ketchum';
import { slabTheKiller } from './slab-the-killer';
import { suzyLafayette } from './suzy-lafayette';
import { terenKill } from './teren-kill';
import { uncleWill } from './uncle-will';
import { vultureSam } from './vulture-sam';
import { willyTheKid } from './willy-the-kid';
import { blackFlower } from './black-flower';
import { coloradoBill } from './colorado-bill';
import { derSpotBurstRinger } from './der-spot-burst-ringer';
import { evelynShebang } from './evelyn-shebang';
import { henryBlock } from './henry-block';
import { lemonadeJim } from './lemonade-jim';
import { mickDefender } from './mick-defender';
import { tucoFranziskaner } from './tuco-franziskaner';
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
import { youlGrinner } from './youl-grinner';

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
  blackFlower,
  coloradoBill,
  derSpotBurstRinger,
  evelynShebang,
  henryBlock,
  lemonadeJim,
  mickDefender,
  tucoFranziskaner,
  donBell,
  dutchWill,
  jackyMurieta,
  joshMcCloud,
  madamYto,
  prettyLuzena,
  raddieSnake,
  simeonPicos,
  bigSpencer,
  flintWestwood,
  garyLooter,
  greygoryDeck,
  johnPain,
  leeVanKliff,
  terenKill,
  youlGrinner,
};

export { SID_KETCHUM_ABILITY } from './sid-ketchum';
export { SUZY_REASON } from './suzy-lafayette';
export { UNCLE_WILL_ABILITY } from './uncle-will';
export { BLACK_FLOWER_ABILITY } from './black-flower';
export { DER_SPOT_ABILITY } from './der-spot-burst-ringer';
export { FLINT_WESTWOOD_ABILITY } from './flint-westwood';
export { LEE_VAN_KLIFF_ABILITY } from './lee-van-kliff';
