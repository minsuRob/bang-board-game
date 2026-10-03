/** CARD_FX의 도감·문서용 메타데이터 표를 docs/card-fx.md에 반영한다. */
import { readFileSync, writeFileSync } from 'node:fs';

import { CARD_DEFS } from '../src/game/data/cards.base';
import { CARD_FX } from '../src/game/ui/fx/card-fx';

const START = '<!-- generated:card-fx:start -->';
const END = '<!-- generated:card-fx:end -->';

function table(): string {
  const rows = Object.entries(CARD_FX)
    .filter((entry): entry is [keyof typeof CARD_DEFS, NonNullable<(typeof CARD_FX)[keyof typeof CARD_FX]>] => Boolean(entry[1]))
    .map(([kind, fx]) => {
      const d = CARD_DEFS[kind];
      const m = fx.doc;
      return `| ${d.nameKo} (${kind}) | ${m.prototype} ${m.title} | ${m.durationMs}ms | ${m.placement} | ${m.sounds} | ${m.quality} |`;
    })
    .join('\n');
  return [
    START,
    '| 카드 | 시안·연출 | 길이 | 그림 속 자리 | 소리 | 화질 |',
    '|---|---|---:|---|---|---|',
    rows,
    END,
  ].join('\n');
}

const path = 'docs/card-fx.md';
const source = readFileSync(path, 'utf8');
const pattern = new RegExp(`${START}[\\s\\S]*?${END}`);
if (!pattern.test(source)) throw new Error(`${path}에 생성 표 영역(${START} … ${END})이 없다`);
const next = source.replace(pattern, table());
if (next !== source) writeFileSync(path, next);
console.log(`${path}: 카드 연출 ${Object.keys(CARD_FX).length}개를 반영했다`);
