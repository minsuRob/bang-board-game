import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * 번역에서 빠진 한글 리터럴을 막는다.
 *
 * 문자열·템플릿 리터럴·JSX 글자 안에 한글이 있으면 실패한다 (주석은 보지 않는다). 묶음마다 번역이 끝난
 * 곳을 ENFORCED 에 올려 가며 조인다. 최종 목표는 docs/i18n.md 의 훑는 곳 전부다.
 */

const ROOT = process.cwd();
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/;

/** 이미 번역을 마쳐 한글이 없어야 하는 곳 (파일 또는 폴더) */
export const ENFORCED = ['src/app','src/game/ui/settings/SettingsSheet.tsx', 'src/game/ui/codex', 'src/game/table3d', 'src/firebase', 'src/game/store', 'src/game/save', 'src/i18n/messages/en', 'src/i18n/messages/it', 'src/game/ui/AttackBadges.tsx', 'src/game/ui/CardView.tsx', 'src/game/ui/CharacterDetail.tsx', 'src/game/ui/ChatPanel.tsx', 'src/game/ui/DraftPanel.tsx', 'src/game/ui/DraftSeatStatus.tsx', 'src/game/ui/EventCardFace.tsx', 'src/game/ui/FullscreenButton.tsx', 'src/game/ui/GameClock.tsx', 'src/game/ui/Hand.tsx', 'src/game/ui/LogPanel.tsx', 'src/game/ui/PauseButton.tsx', 'src/game/ui/PlayerSeat.tsx', 'src/game/ui/PresenceDot.tsx', 'src/game/ui/QualityPicker.tsx', 'src/game/ui/ResultTable.tsx', 'src/game/ui/RewardLine.tsx', 'src/game/ui/SaveButton.tsx', 'src/game/ui/SavedGames.tsx', 'src/game/ui/SettingsButton.tsx', 'src/game/ui/SoundButton.tsx', 'src/game/ui/SpeedControl.tsx', 'src/game/ui/Table.tsx', 'src/game/ui/TableCenter.tsx', 'src/game/ui/TableMobile.tsx', 'src/game/ui/card-symbols.ts', 'src/game/ui/chat-text.ts', 'src/game/ui/event-progress.ts', 'src/game/ui/fx/CardFxLabels.tsx', 'src/game/ui/fx/GunFxLabels.tsx', 'src/game/ui/fx/WinchesterLabels.tsx', 'src/game/ui/menu', 'src/game/ui/settings', 'src/game/ui/use-table.ts', 'src/game/ui/table-text.ts', 'src/game/ui/ActionBar.tsx', 'src/game/ui/PickSpotlight.tsx', 'src/game/ui/EventAbilityPanel.tsx', 'src/game/ui/GoldPanel.tsx', 'src/game/data', 'src/game/modifiers'];

/** 번역하지 않는 개발용 파일 */
const ALLOW = ['src/game/table3d/demo/FxDemo.tsx'];

function walk(path: string): string[] {
  if (statSync(path).isFile()) return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) ? [path] : [];
  return readdirSync(path).flatMap((n) => (n === '__tests__' ? [] : walk(join(path, n))));
}

export function hangulLiterals(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: string[] = [];
  const visit = (n: ts.Node) => {
    if (
      ts.isStringLiteral(n) ||
      ts.isNoSubstitutionTemplateLiteral(n) ||
      ts.isTemplateHead(n) ||
      ts.isTemplateMiddle(n) ||
      ts.isTemplateTail(n) ||
      ts.isJsxText(n)
    ) {
      if (HANGUL.test(n.text)) out.push(`${file.replace(`${ROOT}/`, '')}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1} ${n.text.trim().slice(0, 30)}`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

describe('한글 리터럴', () => {
  it('번역을 마친 곳에는 한글 리터럴이 없다', () => {
    const offenders = ENFORCED.flatMap((p) => walk(join(ROOT, p)))
      .filter((f) => !ALLOW.some((a) => f.endsWith(a)))
      .flatMap(hangulLiterals);
    expect(offenders).toEqual([]);
  });
});
