/**
 * 카드 도감에 무엇을 어떤 순서로 늘어놓을지.
 *
 * 데이터 모듈만 읽어 탭 → 섹션 → 항목을 만든다. 화면(app/cards.tsx)은 이 결과를 그리기만 한다.
 * 확장판이 늘면 데이터에 들어온 만큼 도감도 저절로 늘어난다.
 */

import { ALL_CARDS, CARD_DEFS } from '../../data/cards.base';
import { GOLD_CARD_DEFS, GOLD_CARD_KINDS } from '../../data/cards.goldrush';
import { CHARACTER_IDS, CHARACTERS } from '../../data/characters';
import { EVENTS } from '../../data/events';
import { ROLE_DISTRIBUTION } from '../../data/roles';
import type { Messages } from '../../../i18n/types-messages';
import { namesFor, type Names } from '../../../i18n/names';
import {
  RANKS,
  type CardDef,
  type CardId,
  type CardKind,
  type CharacterId,
  type EventCardId,
  type Expansion,
  type GoldCardKind,
  type Rank,
  type Role,
  type Suit,
} from '../../data/types';

export type CodexTab = 'cards' | 'characters' | 'events' | 'gold' | 'roles';

export const CODEX_TABS: readonly { tab: CodexTab }[] = [
  { tab: 'cards' },
  { tab: 'characters' },
  { tab: 'events' },
  { tab: 'gold' },
  { tab: 'roles' },
];

/** 탭 이름이 현재 언어로 붙은 목록 */
export function codexTabs(t: Messages): { tab: CodexTab; label: string }[] {
  return CODEX_TABS.map(({ tab }) => ({ tab, label: t.codex.tabs[tab] }));
}

/** 기본판이거나 확장판 하나 */
export type CodexSet = 'base' | Expansion;

const SET_ORDER: readonly string[] = ['base', 'highnoon', 'valley', 'goldrush', 'wildwestshow', 'fistful'];

// 확장판이 새로 붙어도 깨지지 않게 문자열 키로 읽는다. 모르는 확장판은 id 그대로 보인다
export function setLabel(set: CodexSet, t: Messages): string {
  return (t.codex.sets as Record<string, string>)[set] ?? set;
}

function setRank(set: CodexSet): number {
  const i = SET_ORDER.indexOf(set);
  return i < 0 ? SET_ORDER.length : i;
}

export type CodexItem =
  | { tab: 'cards'; id: CardKind; set: CodexSet; local: string; name: string }
  | { tab: 'characters'; id: CharacterId; set: CodexSet; local: string; name: string }
  | { tab: 'events'; id: EventCardId; set: CodexSet; local: string; name: string }
  | { tab: 'gold'; id: GoldCardKind; set: CodexSet; local: string; name: string }
  | { tab: 'roles'; id: Role; set: CodexSet; local: string; name: string };

export type CodexSection = { key: string; title: string; items: CodexItem[] };

export type CodexFilter = { set: CodexSet | 'all'; query: string };

export const ROLES: readonly Role[] = ['sheriff', 'deputy', 'outlaw', 'renegade'];

/** 도감의 직업 카드에 인쇄된 이름 (dV Giochi 이탈리아어판) */
const ROLE_NAME_PRINTED: Record<Role, string> = {
  sheriff: 'Sceriffo',
  deputy: 'Vice',
  outlaw: 'Fuorilegge',
  renegade: 'Rinnegato',
};

const CARD_KINDS = Object.keys(CARD_DEFS) as CardKind[];
const EVENT_IDS = Object.keys(EVENTS) as EventCardId[];

function itemsOf(tab: CodexTab, names: Names = namesFor('ko')): CodexItem[] {
  switch (tab) {
    case 'cards':
      return CARD_KINDS.map((id) => {
        const d = CARD_DEFS[id];
        return { tab, id, set: d.expansion ?? 'base', local: names.cardName(id), name: d.name };
      });
    case 'characters':
      return CHARACTER_IDS.map((id) => {
        const d = CHARACTERS[id];
        return { tab, id, set: d.expansion ?? 'base', local: names.charName(id), name: d.name };
      });
    case 'events':
      return EVENT_IDS.map((id) => {
        const d = EVENTS[id];
        return { tab, id, set: d.expansion, local: names.eventName(id), name: d.name };
      });
    case 'gold':
      return GOLD_CARD_KINDS.map((id) => {
        const d = GOLD_CARD_DEFS[id];
        return { tab, id, set: 'goldrush', local: names.goldName(id), name: d.nameEn };
      });
    case 'roles':
      return ROLES.map((id) => ({ tab, id, set: 'base', local: names.roleName(id), name: ROLE_NAME_PRINTED[id] }));
  }
}

/** 이 탭에 실제로 들어 있는 기본판·확장판 (칩을 만들 때) */
export function setsIn(tab: CodexTab): CodexSet[] {
  const sets = new Set(itemsOf(tab).map((i) => i.set));
  return [...sets].sort((a, b) => setRank(a) - setRank(b));
}

function squash(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

function matches(item: CodexItem, filter: CodexFilter): boolean {
  if (filter.set !== 'all' && item.set !== filter.set) return false;
  const q = squash(filter.query);
  if (!q) return true;
  return squash(item.local).includes(q) || squash(item.name).includes(q);
}

/** 같은 확장판끼리 모으고, 확장판 안에서 다시 group 으로 나눈다. 빈 섹션은 뺀다 */
function sectionsBy(
  t: Messages,
  items: CodexItem[],
  groups: { key: string; title: string | null; test: (i: CodexItem) => boolean }[],
  sort?: (a: CodexItem, b: CodexItem) => number,
): CodexSection[] {
  const sets = [...new Set(items.map((i) => i.set))].sort((a, b) => setRank(a) - setRank(b));
  const out: CodexSection[] = [];
  for (const set of sets) {
    const inSet = items.filter((i) => i.set === set);
    for (const g of groups) {
      const picked = inSet.filter(g.test);
      if (sort) picked.sort(sort);
      if (picked.length === 0) continue;
      out.push({ key: `${set}:${g.key}`, title: g.title ? `${setLabel(set, t)} · ${g.title}` : setLabel(set, t), items: picked });
    }
  }
  return out;
}

function cardDef(i: CodexItem): CardDef {
  return CARD_DEFS[i.id as CardKind];
}

export function codexSections(tab: CodexTab, filter: CodexFilter, t: Messages, names: Names = namesFor('ko')): CodexSection[] {
  const sec = t.codex.sections;
  const items = itemsOf(tab, names).filter((i) => matches(i, filter));
  switch (tab) {
    case 'cards':
      return sectionsBy(
        t,
        items,
        [
          { key: 'brown', title: sec.brown, test: (i) => cardDef(i).category === 'brown' },
          { key: 'weapon', title: sec.weapon, test: (i) => cardDef(i).equip === 'weapon' },
          { key: 'gear', title: sec.gear, test: (i) => cardDef(i).category === 'blue' && cardDef(i).equip !== 'weapon' },
        ],
        // 무기만 사정거리 순. 나머지는 데이터 순서 그대로 (정렬은 안정적이다)
        (a, b) => (cardDef(a).weaponRange ?? 0) - (cardDef(b).weaponRange ?? 0),
      );
    case 'characters':
      return sectionsBy(t, items, [{ key: 'all', title: null, test: () => true }]).map((s) =>
        s.key.startsWith('highnoon:') ? { ...s, title: t.codex.highnoonPromo } : s,
      );
    case 'events':
      // 덱 맨 밑에 고정되는 마지막 카드는 섹션 끝으로
      return sectionsBy(
        t,
        items,
        [{ key: 'all', title: null, test: () => true }],
        (a, b) => Number(!!EVENTS[a.id as EventCardId].isFinal) - Number(!!EVENTS[b.id as EventCardId].isFinal),
      );
    case 'gold':
      return sectionsBy(
        t,
        items,
        [
          { key: 'brown', title: sec.goldBrown, test: (i) => GOLD_CARD_DEFS[i.id as GoldCardKind].category === 'brown' },
          { key: 'black', title: sec.goldBlack, test: (i) => GOLD_CARD_DEFS[i.id as GoldCardKind].category === 'black' },
        ],
        (a, b) => GOLD_CARD_DEFS[a.id as GoldCardKind].cost - GOLD_CARD_DEFS[b.id as GoldCardKind].cost,
      ).map((s) => ({ ...s, title: s.title.replace(`${setLabel('goldrush', t)} · `, '') }));
    case 'roles':
      return items.length ? [{ key: 'roles', title: sec.roles, items }] : [];
  }
}

/** 홈 버튼에 적는 수 */
export function codexCounts(): { cards: number; characters: number; events: number } {
  return { cards: CARD_KINDS.length + GOLD_CARD_KINDS.length, characters: CHARACTER_IDS.length, events: EVENT_IDS.length };
}

// ---------------------------------------------------------------------------
// 플레잉 카드 매수와 무늬·숫자
// ---------------------------------------------------------------------------

const SUIT_ORDER: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

/** 카드에 인쇄된 순서는 A 가 처음이지만, 읽을 때는 2 ~ A 로 A 를 맨 위에 둔다 */
const RANK_ORDER: readonly Rank[] = [...RANKS.slice(1), RANKS[0]];

export type DeckSpread = { total: number; bySuit: { suit: Suit; count: number; ranks: string }[] };

/** 덱에 든 이 종류의 장수와, 무늬마다 어떤 숫자인지 (판정을 읽을 때 쓴다) */
export function deckSpread(kind: CardKind): DeckSpread {
  const cards = ALL_CARDS.filter((c) => c.kind === kind);
  const bySuit = SUIT_ORDER.map((suit) => {
    const ranks = cards.filter((c) => c.suit === suit).map((c) => c.rank);
    return { suit, count: ranks.length, ranks: formatRanks(ranks) };
  }).filter((s) => s.count > 0);
  return { total: cards.length, bySuit };
}

/** 이어진 숫자는 2~9 처럼 줄이고, 같은 숫자가 여럿이면 9×2 */
export function formatRanks(ranks: readonly Rank[]): string {
  const counts = new Map<Rank, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const idx = [...counts.keys()].map((r) => RANK_ORDER.indexOf(r)).sort((a, b) => a - b);
  const parts: string[] = [];
  let run: number[] = [];
  const flush = () => {
    if (run.length >= 3) parts.push(`${RANK_ORDER[run[0]]}~${RANK_ORDER[run[run.length - 1]]}`);
    else parts.push(...run.map((i) => RANK_ORDER[i]));
    run = [];
  };
  for (const i of idx) {
    const n = counts.get(RANK_ORDER[i])!;
    if (n > 1) {
      flush();
      parts.push(`${RANK_ORDER[i]}×${n}`);
      continue;
    }
    if (run.length && i !== run[run.length - 1] + 1) flush();
    run.push(i);
  }
  flush();
  return parts.join(' ');
}

/** CardView 에 넘길 이 종류의 아무 한 장 */
export function sampleCardId(kind: CardKind): CardId {
  const card = ALL_CARDS.find((c) => c.kind === kind);
  if (!card) throw new Error(`card kind not in the deck: ${kind}`);
  return card.id;
}

// ---------------------------------------------------------------------------
// 직업
// ---------------------------------------------------------------------------

/** 로비에서 고를 수 있는 인원수 */
const LOBBY_COUNTS = [4, 5, 6, 7] as const;

/** 인원수마다 이 직업이 몇 명인지 */
export function roleCounts(role: Role): { players: number; count: number }[] {
  return LOBBY_COUNTS.map((players) => ({
    players,
    count: ROLE_DISTRIBUTION[players].filter((r) => r === role).length,
  }));
}
