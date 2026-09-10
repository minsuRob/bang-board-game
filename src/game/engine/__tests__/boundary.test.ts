import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 경계 규칙 강제.
 *
 * 엔진·데이터·능력 훅·AI 는 순수 TypeScript 여야 한다. UI 가 엔진을 알고,
 * 엔진은 UI 를 모른다. 이 방향이 한 번 뒤집히면 테스트도 시뮬레이터도 못 돌린다.
 */

const ROOT = join(process.cwd(), 'src', 'game');
const PURE_DIRS = ['engine', 'data', 'modifiers', 'ai'];
const FORBIDDEN = [
  'react',
  'react-native',
  'react-dom',
  'expo',
  'expo-router',
  'zustand',
  'firebase',
  '@react-native-async-storage',
];

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** 주석을 걷어낸다. 주석에 적힌 금지어까지 잡으면 문서를 못 쓴다. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function importsOf(source: string): string[] {
  const out: string[] = [];
  const re = /(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) out.push(m[1] ?? m[2]);
  return out;
}

const files = PURE_DIRS.flatMap((d) => {
  try {
    return walk(join(ROOT, d));
  } catch {
    return [];
  }
});

describe('엔진 경계', () => {
  it('검사할 파일이 실제로 있다', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('순수 영역에서 UI·네트워크 라이브러리를 import 하지 않는다', () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const imp of importsOf(readFileSync(file, 'utf8'))) {
        if (FORBIDDEN.some((f) => imp === f || imp.startsWith(`${f}/`))) {
          offenders.push(`${file.replace(process.cwd(), '')} → ${imp}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("순수 영역에서 '@/' 별칭을 쓰지 않는다 (번들러 없이도 돌아야 한다)", () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const imp of importsOf(readFileSync(file, 'utf8'))) {
        if (imp.startsWith('@/')) offenders.push(`${file.replace(process.cwd(), '')} → ${imp}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('전역 Math.random() 을 쓰지 않는다', () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (file.includes('__tests__')) continue;
      if (stripComments(readFileSync(file, 'utf8')).includes('Math.random')) {
        offenders.push(file.replace(process.cwd(), ''));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('엔진 코어가 캐릭터 id 로 직접 분기하지 않는다', () => {
    const engineFiles = walk(join(ROOT, 'engine')).filter((f) => !f.includes('__tests__'));
    const characterIds = [
      'bartCassidy', 'blackJack', 'calamityJanet', 'elGringo', 'jesseJones',
      'jourdonnais', 'kitCarlson', 'luckyDuke', 'paulRegret', 'pedroRamirez',
      'roseDoolan', 'slabTheKiller', 'suzyLafayette', 'vultureSam', 'willyTheKid',
    ];
    const offenders: string[] = [];
    for (const file of engineFiles) {
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const id of characterIds) {
        // 프레임 이름(kitCarlson 등)은 예외로 둔다. 비교 연산에 쓰인 경우만 잡는다.
        const re = new RegExp(`===\\s*'${id}'|'${id}'\\s*===`);
        if (re.test(src)) offenders.push(`${file.replace(process.cwd(), '')} → ${id}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
