/**
 * 카드 그림 스크립트 공용 함수. 그림은 assets/cards, assets/board 에 커밋돼 있다.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, sep } from 'node:path';

export const ASSETS = join(process.cwd(), 'assets');

/** assets/ 아래에서 그림으로 다루는 폴더. card-art.ts 의 require.context 와 같다 */
const ART_DIRS = ['cards', 'board'];
const EXTS = ['.png', '.jpg', '.jpeg', '.webp'];

/** 설치된 그림 전부. 키는 `cards/character/bartCassidy.png` 꼴, 값은 픽셀 크기 */
export function scanInstalled() {
  /** @type {Record<string, { width: number, height: number } | null>} */
  const out = {};
  for (const dir of ART_DIRS) walk(join(ASSETS, dir), out);
  return out;
}

function walk(dir, out) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXTS.includes(extname(name).toLowerCase())) {
      out[relative(ASSETS, p).split(sep).join('/')] = imageSize(readFileSync(p));
    }
  }
}

export function writeAsset(key, buf) {
  const p = join(ASSETS, ...key.split('/'));
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, buf);
}

/** 픽셀 크기. PNG · JPEG · WebP 헤더만 읽는다 @param {Buffer} b */
export function imageSize(b) {
  // PNG: IHDR
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) {
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  }
  // JPEG: SOFn 마커를 찾는다
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
      }
      i += 2 + len;
    }
    return null;
  }
  // WebP
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
  }
  return null;
}
