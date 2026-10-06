/**
 * en·it 사전에 번역이 빠진 곳을 목록으로 본다.
 *
 *   npm run i18n:check
 *
 * - 한글이 남은 값
 * - ko 와 똑같은 값 (고유명사·기호·짧은 값은 번역이 같을 수 있어 알리기만 한다)
 * 한글이 남았으면 종료 코드 1, 같은 값은 알림만 한다.
 */

import { en as enContent } from '../../src/i18n/content/en';
import { it as itContent } from '../../src/i18n/content/it';
import { ko as koContent } from '../../src/i18n/content/ko';
import { en } from '../../src/i18n/messages/en';
import { it } from '../../src/i18n/messages/it';
import { ko } from '../../src/i18n/messages/ko';

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/;

/** 값이 문자열이면 그대로, 함수면 대표 인자로 불러 본다. 객체는 따라 들어간다 */
function flatten(node: unknown, path: string, out: Map<string, string>) {
  if (typeof node === 'string') out.set(path, node);
  else if (typeof node === 'function') {
    try {
      const probe = (node as (...a: unknown[]) => unknown)(2, 'X', 'Y', 'Z');
      if (typeof probe === 'string') out.set(`${path}()`, probe);
    } catch {
      /* 인자 모양이 달라 못 부르는 함수는 건너뛴다 */
    }
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) flatten(v, path ? `${path}.${k}` : k, out);
  }
}

function table(root: unknown, label: string) {
  const m = new Map<string, string>();
  flatten(root, label, m);
  return m;
}

const sets = [
  { ko: table(ko, 'messages'), en: table(en, 'messages'), it: table(it, 'messages') },
  { ko: table(koContent, 'content'), en: table(enContent, 'content'), it: table(itContent, 'content') },
];

let hangul = 0;
let same = 0;
for (const s of sets) {
  for (const lang of ['en', 'it'] as const) {
    for (const [key, value] of s[lang]) {
      if (HANGUL.test(value)) {
        hangul++;
        console.log(`한글 남음 [${lang}] ${key}: ${value.slice(0, 40)}`);
      } else if (s.ko.get(key) === value && value.length > 3) {
        same++;
        console.log(`ko 와 같음 [${lang}] ${key}: ${value.slice(0, 40)}`);
      }
    }
  }
}
console.log(`\n한글 남음 ${hangul}건, ko 와 같은 값 ${same}건`);
process.exit(hangul ? 1 : 0);
