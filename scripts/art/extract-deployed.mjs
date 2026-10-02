/**
 * 배포된 사이트의 번들에서 카드 그림을 꺼내 assets/ 에 깐다. 2026-10 에 그림을 처음 커밋할 때 썼다.
 *
 *   node scripts/art/extract-deployed.mjs [https://bang-board.web.app]
 *
 * expo export 는 그림을 /assets/assets/{cards|board}/{이름}.{해시}.{확장자} 로 내보낸다.
 * 해시를 떼면 assets/ 아래 원래 경로가 된다. 이미 있는 파일은 픽셀이 더 많은 쪽을 남긴다.
 * 다 받은 뒤 npm run art:check 로 확인하고 커밋한다.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ASSETS, imageSize, writeAsset } from './lib.mjs';

const site = (process.argv[2] || 'https://bang-board.web.app').replace(/\/$/, '');

async function text(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.text();
}

async function main() {
  const html = await text(`${site}/`);
  const bundles = [...new Set(html.match(/\/_expo\/static\/js\/web\/[^"']+\.js/g) ?? [])];
  if (bundles.length === 0) throw new Error('번들을 찾지 못했다.');

  const paths = new Set();
  for (const b of bundles) {
    for (const m of (await text(site + b)).matchAll(/"(\/assets\/assets\/(?:cards|board)\/[^"]+)"/g)) paths.add(m[1]);
  }
  console.log(`번들 ${bundles.length}개에서 그림 ${paths.size}장을 찾았다.`);

  const tally = { new: 0, better: 0, kept: 0 };
  for (const p of [...paths].sort()) {
    // /assets/assets/cards/character/bartCassidy.8bf3….png → cards/character/bartCassidy.png
    const key = p.replace(/^\/assets\/assets\//, '').replace(/\.[0-9a-f]{32}(\.\w+)$/, '$1');
    const res = await fetch(site + p);
    if (!res.ok) throw new Error(`${p}: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());

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
  console.log(`새로 ${tally.new} · 더 선명한 것으로 교체 ${tally.better} · 기존 유지 ${tally.kept}`);
  console.log('다음: npm run art:check → git add assets/cards assets/board');
}

function pixels(buf) {
  const s = imageSize(buf);
  return s ? s.width * s.height : 0;
}

main().catch((e) => {
  console.error(`[extract-deployed] ${e.message}`);
  process.exit(1);
});
