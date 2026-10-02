/**
 * dV Giochi 공식 카드 목록(bang.dvgiochi.com/cardslist.php)에서 확장판 그림을 받아 assets/ 에 깐다.
 * 배포본 번들(extract-deployed.mjs)에 없던 그림을 채울 때 썼다.
 *
 *   node scripts/art/fetch-dvgiochi.mjs [미리 받아 둔 폴더]
 *
 * 사이트가 느리다. 공식 파일 이름 그대로 받아 둔 폴더를 주면 거기 있는 것은 다시 받지 않는다.
 * 공식 파일 이름은 이탈리아어라 아래 표로 게임 id 에 맞춘다. 이미 있는 파일은 픽셀이 더 많은 쪽을 남긴다.
 * 다 받은 뒤 npm run art:check 로 확인한다.
 */

import { Buffer } from 'node:buffer';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ASSETS, imageSize, writeAsset } from './lib.mjs';

const SITE = 'https://bang.dvgiochi.com';
const CACHE = process.argv[2];

/** cardslist.php?id= → { 공식 파일 이름: assets/ 아래 경로 } */
const SETS = {
  // 골드 러시: 장비 15장 + 캐릭터 8명 (그림자 배신자 변형은 넣지 않았다)
  4: {
    '04_bicchierino.png': 'cards/gold/shot.png',
    '04_bottiglia.png': 'cards/gold/bottle.png',
    '04_complice.png': 'cards/gold/pardner.png',
    '04_corsa_all_oro.png': 'cards/gold/goldRush.png',
    '04_ricercato.png': 'cards/gold/wanted.png',
    '04_rum.png': 'cards/gold/rhum.png',
    '04_union_pacific.png': 'cards/gold/unionPacific.png',
    '04_calumet.png': 'cards/gold/calumet.png',
    '04_cinturone.png': 'cards/gold/gunBelt.png',
    '04_ferro_di_cavallo.png': 'cards/gold/horseshoe.png',
    '04_piccone.png': 'cards/gold/pickaxe.png',
    '04_setaccio.png': 'cards/gold/goldPan.png',
    '04_stivali.png': 'cards/gold/boots.png',
    '04_talismano.png': 'cards/gold/luckyCharm.png',
    '04_zaino.png': 'cards/gold/rucksack.png',
    '04_don_bell.png': 'cards/character/donBell.png',
    '04_dutch_will.png': 'cards/character/dutchWill.png',
    '04_jacky_murieta.png': 'cards/character/jackyMurieta.png',
    '04_josh_mccloud.png': 'cards/character/joshMcCloud.png',
    '04_madame_yto.png': 'cards/character/madamYto.png',
    '04_pretty_luzena.png': 'cards/character/prettyLuzena.png',
    '04_raddie_snake.png': 'cards/character/raddieSnake.png',
    '04_simeon_picos.png': 'cards/character/simeonPicos.png',
  },
  // 와일드 웨스트 쇼: 이벤트 10장 (캐릭터 그림은 배포본에 이미 있다)
  6: {
    '06_bavaglio.png': 'cards/event/gag.png',
    '06_camposanto.png': 'cards/event/boneOrchard.png',
    '06_darlingvalentine.png': 'cards/event/darlingValentine.png',
    '06_dorothyrage.png': 'cards/event/dorothyRage.png',
    '06_helenazontero.png': 'cards/event/helenaZontero.png',
    '06_ladyrosadeltexas.png': 'cards/event/ladyRoseOfTexas.png',
    '06_misssusanna.png': 'cards/event/missSusanna.png',
    '06_regolamentodiconti.png': 'cards/event/showdown.png',
    '06_sacagaway.png': 'cards/event/sacagaway.png',
    '06_wildwestshow.png': 'cards/event/wildWestShow.png',
  },
  // 그림자의 계곡: 플레잉 카드 15종
  7: {
    '07_bandidos.png': 'cards/card/bandidos.png',
    '07_fuga.png': 'cards/card/escape.png',
    '07_mira.png': 'cards/card/aim.png',
    '07_poker.png': 'cards/card/poker.png',
    '07_ritornodifiamma.png': 'cards/card/backfire.png',
    '07_salvo.png': 'cards/card/saved.png',
    '07_sventagliata.png': 'cards/card/fanning.png',
    '07_tomahawk.png': 'cards/card/tomahawk.png',
    '07_tornado.png': 'cards/card/tornado.png',
    '07_ultimogiro.png': 'cards/card/lastCall.png',
    '07_fantasma.png': 'cards/card/ghost.png',
    '07_lemat.png': 'cards/card/lemat.png',
    '07_serpenteasonagli.png': 'cards/card/rattlesnake.png',
    '07_shotgun.png': 'cards/card/shotgun.png',
    '07_taglia.png': 'cards/card/bounty.png',
  },
};

async function main() {
  const tally = { new: 0, better: 0, kept: 0 };
  for (const [id, files] of Object.entries(SETS)) {
    for (const [name, key] of Object.entries(files)) {
      const buf = await download(id, name);

      const local = join(ASSETS, ...key.split('/'));
      if (existsSync(local)) {
        if (pixels(readFileSync(local)) >= pixels(buf)) {
          tally.kept++;
          continue;
        }
        tally.better++;
      } else {
        tally.new++;
      }
      writeAsset(key, buf);
    }
  }
  console.log(`새로 ${tally.new} · 더 선명한 것으로 교체 ${tally.better} · 기존 유지 ${tally.kept}`);
  console.log('다음: npm run art:check → git add assets/cards');
}

async function download(id, name) {
  const cached = CACHE && join(CACHE, name);
  if (cached && existsSync(cached)) return readFileSync(cached);
  const url = `${SITE}/content/${id}/cards/${name}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function pixels(buf) {
  const s = imageSize(buf);
  return s ? s.width * s.height : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
