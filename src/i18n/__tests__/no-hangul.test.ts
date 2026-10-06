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
export const ENFORCED = ['src/game/ui/settings/SettingsSheet.tsx', 'src/i18n/messages/en', 'src/i18n/messages/it'];

/** 번역하지 않는 개발용 파일 */
const ALLOW = ['src/game/table3d/demo/FxDemo.tsx'];

function walk(path: string): string[] {
  if (statSync(path).isFile()) return /\.tsx?$/.test(path) ? [path] : [];
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
