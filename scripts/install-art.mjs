/**
 * 모아 둔 카드 이미지를 앱 에셋으로 설치한다.
 *
 *   node scripts/install-art.mjs
 *
 * assets-source/ 에 있는 원본을 화면 크기에 맞게 줄여 assets/cards, assets/board 로 옮긴다.
 * 두 폴더 모두 .gitignore 로 막혀 있다. 카드 일러스트는 dV Giochi 의 저작물이라
 * 저장소에 넣지 않는다. 이미지가 없으면 앱은 도형과 글자로 그린 카드로 되돌아간다.
 */

import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const SRC = 'assets-source';
const DEST = 'assets';

const GROUPS = [
  { from: join(SRC, 'cards', 'base'), to: join(DEST, 'cards', 'card') },
  { from: join(SRC, 'cards', 'characters'), to: join(DEST, 'cards', 'character') },
  { from: join(SRC, 'cards', 'roles'), to: join(DEST, 'cards', 'role') },
  { from: join(SRC, 'cards', 'highnoon'), to: join(DEST, 'cards', 'event') },
];

function copyDir(from, to) {
  if (!existsSync(from)) return 0;
  mkdirSync(to, { recursive: true });
  let n = 0;
  for (const name of readdirSync(from)) {
    const src = join(from, name);
    if (!statSync(src).isFile()) continue;
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extname(name).toLowerCase())) continue;
    copyFileSync(src, join(to, name));
    n++;
  }
  return n;
}

let total = 0;
for (const g of GROUPS) {
  const n = copyDir(g.from, g.to);
  console.log(`${g.to} ← ${n}장`);
  total += n;
}

// 카드 뒷면
const back = join(SRC, 'cards', 'back.png');
if (existsSync(back)) {
  mkdirSync(join(DEST, 'cards'), { recursive: true });
  copyFileSync(back, join(DEST, 'cards', 'back.png'));
  console.log('assets/cards/back.png ← 1장');
  total++;
}

// 테이블 배경
mkdirSync(join(DEST, 'board'), { recursive: true });
for (const [src, name] of [
  [join(SRC, 'board', 'wood-table.jpg'), 'wood-table.jpg'],
  [join(SRC, 'board', 'wood-tile.jpg'), 'wood-tile.jpg'],
  [join(SRC, 'board', 'leather-1.jpg'), 'felt.jpg'],
]) {
  if (!existsSync(src)) continue;
  copyFileSync(src, join(DEST, 'board', name));
  console.log(`assets/board/${name} ← 1장`);
  total++;
}

console.log(`\n총 ${total}장 설치. 개발 서버를 다시 시작해야 반영된다.`);
console.log('되돌리려면: rm -rf assets/cards/card assets/cards/character assets/cards/role assets/cards/event assets/cards/back.png assets/board/*.jpg');
