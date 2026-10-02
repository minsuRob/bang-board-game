/**
 * UI 가 화면 테마를 따르는지 지킨다.
 *
 * `Colors` 는 판(텍스처·카드 앞면·좌석) 전용 고정 팔레트다. 그 밖의 UI 가 `Colors` 를 읽으면
 * 설정에서 라이트·다크를 바꿔도 그 부분만 그대로 남는다. 새 UI 는 `useColors()` / `themedStyles()` 를 쓴다.
 * 라이트·다크 팔레트의 이름이 같은지는 `ThemeColors` 타입이 typecheck 에서 지킨다.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..', '..');

/** 판을 그리는 파일. 테마와 상관없이 늘 같은 색이다 */
const BOARD = new Set([
  'src/game/table3d/materials/textures.ts',
  'src/game/table3d/scene/TableGeometry.ts',
  'src/game/table3d/overlay/FloatingNumbers.tsx',
  'src/game/table3d/demo/FxDemo.tsx',
  'src/game/ui/CardView.tsx',
  'src/game/ui/CharacterCard.tsx',
  'src/game/ui/EventCardFace.tsx',
  'src/game/ui/card-symbols.ts',
  'src/game/ui/PlayerSeat.tsx',
  'src/game/ui/TableCenter.tsx',
  'src/game/ui/HandArrival.tsx',
  'src/game/ui/PaperPlaque.tsx',
  'src/game/ui/codex/CodexFaces.tsx',
  'src/game/ui/codex/CodexDetail.tsx',
  'src/game/ui/fx/GunshotFx.tsx',
]);

/** 판과 UI 가 섞여 있어 일부만 `Colors` 로 남긴 파일 (판 부분만 고정색이다) */
const MIXED = new Set([
  'src/game/ui/Table.tsx',
  'src/game/ui/TableMobile.tsx',
  'src/game/ui/PlayedCardSpotlight.tsx',
  'src/game/table3d/Table3D.tsx',
  'src/app/game/[id].tsx',
  'src/game/ui/AttackBadges.tsx',
  'src/game/ui/DraftSeatStatus.tsx',
  'src/game/ui/PresenceDot.tsx',
  'src/game/table3d/overlay/CharacterHover.tsx',
  'src/game/table3d/overlay/EventHover.tsx',
  'src/game/table3d/overlay/SeatLabel.tsx',
]);

/** 아직 옮기지 못한 UI. 옮기면 여기서 지운다 */
const PENDING = new Set([
  'src/game/table3d/overlay/Overlay3D.tsx',
  'src/game/table3d/overlay/CardHover.tsx',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

function importsColors(source: string): boolean {
  return /import\s*\{[^}]*\bColors\b[^}]*\}\s*from\s*'@\/constants\/theme'/.test(source);
}

describe('화면 테마', () => {
  const files = ['src/app', 'src/game/ui', 'src/game/table3d']
    .flatMap((d) => walk(join(ROOT, d)))
    .map((f) => relative(ROOT, f).split('\\').join('/'));

  it('판이 아닌 UI 는 고정 팔레트 Colors 를 읽지 않는다', () => {
    const offenders = files.filter(
      (f) => !BOARD.has(f) && !MIXED.has(f) && !PENDING.has(f) && importsColors(readFileSync(join(ROOT, f), 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
