/**
 * 게임 데이터에 필요한 카드 그림이 assets/ 에 다 있는지 본다.
 *
 *   npm run art:check
 *
 * 그림은 git 에 커밋돼 있으니 어느 폴더에서든 결과가 같아야 한다. 다르면 커밋이 빠진 것이다.
 * 캐릭터는 제작사 스캔 크기(250×389)보다 작으면 흐리게 보이므로 따로 알린다.
 */

import { scanInstalled } from './lib.mjs';

import { CARD_DEFS } from '../../src/game/data/cards.base';
import { GOLD_CARD_KINDS } from '../../src/game/data/cards.goldrush';
import { CHARACTER_IDS } from '../../src/game/data/characters';
import { EVENTS } from '../../src/game/data/events';
import { ROLE_IDS } from '../../src/game/data/roles';

/** card-art.ts 가 찾는 그림. assets/ 아래 경로 */
const EXPECTED: Record<string, string[]> = {
  카드: Object.keys(CARD_DEFS).map((k) => `cards/card/${k}.png`),
  캐릭터: CHARACTER_IDS.map((id) => `cards/character/${id}.png`),
  역할: ROLE_IDS.map((r) => `cards/role/${r}.png`),
  이벤트: Object.keys(EVENTS).map((id) => `cards/event/${id}.png`),
  '골드 장비': GOLD_CARD_KINDS.map((k) => `cards/gold/${k}.png`),
  뒷면: ['cards/back.png'],
  보드: ['board/felt.jpg', 'board/player-board.webp'],
};

const installed: Record<string, { width: number; height: number } | null> = scanInstalled();

console.log(`설치된 그림 ${Object.keys(installed).length}장\n`);
for (const [label, keys] of Object.entries(EXPECTED)) {
  const absent = keys.filter((k) => !(k in installed));
  const note = absent.length ? `  빠짐: ${short(absent)}` : '';
  console.log(`${absent.length ? '!' : '✓'} ${label} ${keys.length - absent.length}/${keys.length}${note}`);
}

const blurry = CHARACTER_IDS.map((id) => `cards/character/${id}.png`).filter((k) => {
  const s = installed[k];
  return s && s.height < 389;
});
if (blurry.length) console.log(`\n! 저화질 캐릭터 ${blurry.length} (세로 389 미만): ${short(blurry)}`);

function short(keys: string[]) {
  const names = keys.map((k) => k.replace(/^cards\/[a-z]+\//, '').replace(/\.png$/, ''));
  return names.length > 6 ? `${names.slice(0, 6).join(', ')} 외 ${names.length - 6}` : names.join(', ');
}
