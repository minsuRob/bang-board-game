/**
 * 진행 기록 한 줄을 글 조각으로 나눈다. 순수 함수라 테스트에서 그대로 돌린다.
 *
 * 문장은 renderLog 가 현재 언어로 만든 것이다. 로그에 실린 카드(card·cards·비밀 로그의 card)의 현재 언어
 * 이름이 문장에 나오면 그 자리를 카드 조각으로 떼어 낸다.
 * 화면(LogPanel)은 카드 조각을 따옴표로 감싸고 색을 입히며, 올리면 카드 상세를 띄운다.
 * 가려진 카드와 플레잉 카드가 아닌 id(이벤트 카드 등)는 건너뛴다.
 */

import { ALL_CARDS_BY_ID, CARD_DEFS } from '../data/cards.base';
import { namesFor } from '../../i18n/names';
import type { Lang } from '../../i18n/types';
import type { CardCategory, CardId } from '../data/types';
import { isHidden, type GameEvent } from '../engine';

export type LogSegment = { text: string; card?: undefined } | { text: string; card: CardId; category: CardCategory };

type Named = { name: string; card: CardId; category: CardCategory };

function namedCardsOf(e: GameEvent, lang: Lang): Named[] {
  const names = namesFor(lang);
  const ids = [e.card, e.secret?.card, ...(e.cards ?? [])].filter((c): c is CardId => Boolean(c) && !isHidden(c!));
  const out: Named[] = [];
  for (const id of ids) {
    const inst = ALL_CARDS_BY_ID.get(id);
    if (!inst) continue;
    const def = CARD_DEFS[inst.kind];
    const name = names.cardName(inst.kind);
    if (!out.some((n) => n.name === name)) out.push({ name, card: id, category: def.category });
  }
  // 긴 이름부터 찾는다. 짧은 이름이 긴 이름 안에 들어 있어도 긴 쪽이 이긴다
  return out.sort((a, b) => b.name.length - a.name.length);
}

export function splitLogText(e: GameEvent, text: string, lang: Lang): LogSegment[] {
  const named = namedCardsOf(e, lang);
  if (named.length === 0) return [{ text }];

  // 겹치지 않는 카드 이름 자리들
  const spans: { start: number; end: number; n: Named }[] = [];
  for (const n of named) {
    let from = 0;
    for (;;) {
      const at = text.indexOf(n.name, from);
      if (at < 0) break;
      const end = at + n.name.length;
      if (!spans.some((s) => at < s.end && end > s.start)) spans.push({ start: at, end, n });
      from = end;
    }
  }
  if (spans.length === 0) return [{ text }];
  spans.sort((a, b) => a.start - b.start);

  const out: LogSegment[] = [];
  let pos = 0;
  for (const s of spans) {
    if (s.start > pos) out.push({ text: text.slice(pos, s.start) });
    out.push({ text: s.n.name, card: s.n.card, category: s.n.category });
    pos = s.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}
