/**
 * 모아 둔 카드 이미지를 앱 에셋으로 설치한다.
 *
 *   node scripts/install-art.mjs
 *
 * assets-source/ 에 있는 원본을 assets/cards, assets/board 로 복사한다 (크기는 그대로).
 * assets/ 쪽은 커밋한다. 새 그림을 설치했으면 생긴 파일을 같이 커밋한다.
 * assets-source/ 는 원본 모음이라 .gitignore 다.
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
  // 그림자의 계곡 플레잉 카드는 기본판 카드와 같은 폴더에 kind 이름으로 둔다
  { from: join(SRC, 'cards', 'valley'), to: join(DEST, 'cards', 'card') },
  // 와일드 웨스트 쇼 이벤트. id 가 하이 눈과 겹치지 않아 같은 폴더를 쓴다
  { from: join(SRC, 'cards', 'wildwestshow'), to: join(DEST, 'cards', 'event') },
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
  [join(SRC, 'board', 'player-board.webp'), 'player-board.webp'],
]) {
  if (!existsSync(src)) continue;
  copyFileSync(src, join(DEST, 'board', name));
  console.log(`assets/board/${name} ← 1장`);
  total++;
}

console.log(`\n총 ${total}장 설치. 개발 서버를 다시 시작해야 반영된다.`);
console.log('되돌리려면: rm -rf assets/cards/card assets/cards/character assets/cards/role assets/cards/event assets/cards/back.png assets/board/*.jpg assets/board/*.webp');
