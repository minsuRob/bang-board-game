import { describe, expect, it } from 'vitest';

import { CARD_DEFS } from '../../data/cards.base';
import { GOLD_CARD_KINDS } from '../../data/cards.goldrush';
import { CHARACTER_IDS } from '../../data/characters';
import { EVENTS } from '../../data/events';
import { CODEX_TABS, codexSections, deckSpread, formatRanks, roleCounts, sampleCardId, setsIn, type CodexTab } from './codex-model';
import { ruleNoteIds, ruleNotes } from './rule-notes';

const ALL = { set: 'all', query: '' } as const;

function idsOf(tab: CodexTab): string[] {
  return codexSections(tab, ALL).flatMap((s) => s.items.map((i) => i.id));
}

describe('카드 도감', () => {
  it('모든 항목이 정확히 한 번씩 나온다', () => {
    expect(idsOf('cards').sort()).toEqual(Object.keys(CARD_DEFS).sort());
    expect(idsOf('characters').sort()).toEqual([...CHARACTER_IDS].sort());
    expect(idsOf('events').sort()).toEqual(Object.keys(EVENTS).sort());
    expect(idsOf('gold').sort()).toEqual([...GOLD_CARD_KINDS].sort());
    expect(idsOf('roles')).toEqual(['sheriff', 'deputy', 'outlaw', 'renegade']);
  });

  it('플레잉 카드는 확장판 → 즉시 사용 · 무기 · 장비 순이고 무기는 사정거리 순이다', () => {
    const sections = codexSections('cards', ALL);
    expect(sections.slice(0, 3).map((s) => s.title)).toEqual(['기본판 · 즉시 사용', '기본판 · 무기', '기본판 · 장비']);
    expect(sections[1].items.map((i) => i.id)).toEqual(['volcanic', 'schofield', 'remington', 'carabine', 'winchester']);
    expect(sections.some((s) => s.title.startsWith('그림자의 계곡'))).toBe(true);
  });

  it('이벤트의 마지막 카드는 섹션 끝에 온다', () => {
    for (const s of codexSections('events', ALL)) {
      const finals = s.items.filter((i) => EVENTS[i.id as keyof typeof EVENTS].isFinal);
      if (finals.length) expect(s.items[s.items.length - 1]).toBe(finals[0]);
    }
  });

  it('확장판 칩과 검색으로 거른다', () => {
    expect(setsIn('cards')).toEqual(['base', 'valley']);
    expect(setsIn('roles')).toEqual(['base']);
    const valley = codexSections('cards', { set: 'valley', query: '' });
    expect(valley.every((s) => s.items.every((i) => i.set === 'valley'))).toBe(true);
    expect(idsOf('cards')).toContain('bang');
    expect(codexSections('cards', { set: 'all', query: '빗나' }).flatMap((s) => s.items.map((i) => i.id))).toEqual(['missed']);
    expect(codexSections('characters', { set: 'all', query: 'willy' }).flatMap((s) => s.items.map((i) => i.id))).toEqual(['willyTheKid']);
  });

  it('뱅!은 25장이고 무늬마다 숫자를 줄여 적는다', () => {
    const bang = deckSpread('bang');
    expect(bang.total).toBe(25);
    expect(bang.bySuit).toEqual([
      { suit: 'hearts', count: 3, ranks: 'Q~A' },
      { suit: 'diamonds', count: 13, ranks: '2~A' },
      { suit: 'clubs', count: 8, ranks: '2~9' },
      { suit: 'spades', count: 1, ranks: 'A' },
    ]);
    // 역마차는 ♠9 가 두 장이다
    expect(deckSpread('stagecoach').bySuit).toEqual([{ suit: 'spades', count: 2, ranks: '9×2' }]);
    expect(formatRanks(['2', '3', '5', 'J', 'Q'])).toBe('2 3 5 J Q');
  });

  it('기본판 카드를 다 세면 80장이다', () => {
    const base = codexSections('cards', { set: 'base', query: '' }).flatMap((s) => s.items);
    expect(base.reduce((n, i) => n + deckSpread(i.id as keyof typeof CARD_DEFS).total, 0)).toBe(80);
    expect(sampleCardId('dynamite')).toMatch(/^dynamite-/);
  });

  it('직업 분배는 로비 인원수(4~7)를 따른다', () => {
    expect(roleCounts('deputy')).toEqual([
      { players: 4, count: 0 },
      { players: 5, count: 1 },
      { players: 6, count: 1 },
      { players: 7, count: 2 },
    ]);
  });

  it('규칙 메모는 도감에 있는 항목에만 붙는다', () => {
    expect(ruleNotes('cards', 'beer').length).toBeGreaterThan(0);
    expect(ruleNotes('cards', 'nothing')).toEqual([]);
    for (const { tab } of CODEX_TABS) {
      const ids = new Set(idsOf(tab));
      for (const id of ruleNoteIds(tab)) expect(ids, `${tab}:${id}`).toContain(id);
    }
  });
});
