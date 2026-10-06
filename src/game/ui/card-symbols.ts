/**
 * 카드 심벌을 화면에 그릴 조각으로 바꾼다.
 *
 * 도감의 심벌 범례(reference/sc2-arcade/images/howtoplay_8d3e2f235798.jpg)를
 * 그대로 옮긴 것이라, 이 표만 알면 모든 카드를 읽을 수 있다.
 * 원본 일러스트는 dV Giochi 의 저작물이라 쓰지 않는다. 도형과 글자로 대신한다.
 */

import type { CardSymbol } from '../data/types';
import { ko } from '../../i18n/messages/ko';
import type { Messages } from '../../i18n/types-messages';
import { Colors } from '@/constants/theme';

export type SymbolChip = {
  glyph: string;
  label: string;
  color: string;
};

export function chipFor(symbol: CardSymbol, t: Messages = ko): SymbolChip {
  const s = t.ui.symbols;
  switch (symbol.s) {
    case 'bang':
      return { glyph: '✸', label: s.bang, color: Colors.danger };
    case 'missed':
      return { glyph: '⌒', label: s.missed, color: Colors.deputy };
    case 'heal':
      return { glyph: '✚', label: s.heal(symbol.amount), color: Colors.success };
    case 'draw':
      return { glyph: '↧', label: s.draw(symbol.amount), color: Colors.sheriff };
    case 'discard':
      return { glyph: '✕', label: s.discard(symbol.amount), color: Colors.danger };
    case 'extraCost':
      return { glyph: '≡', label: s.extraCost(symbol.amount), color: Colors.textMuted };
    case 'targetAny':
      return { glyph: '◎', label: s.targetAny, color: Colors.textMuted };
    case 'targetAll':
      return { glyph: '◍', label: s.targetAll, color: Colors.textMuted };
    case 'targetReachable':
      return { glyph: '◉', label: s.targetReachable, color: Colors.textMuted };
    case 'range1':
      return { glyph: '①', label: s.range1, color: Colors.textMuted };
    case 'weaponRange':
      return { glyph: RANGE_GLYPH[symbol.range] ?? '①', label: s.weaponRange(symbol.range), color: Colors.cardBlue };
  }
}

const RANGE_GLYPH: Record<number, string> = {
  1: '①',
  2: '②',
  3: '③',
  4: '④',
  5: '⑤',
};
