import { describe, expect, it } from 'vitest';

import { CARD_DEFS } from '../../game/data/cards.base';
import { GOLD_CARD_DEFS } from '../../game/data/cards.goldrush';
import { CHARACTERS } from '../../game/data/characters';
import { EVENTS } from '../../game/data/events';
import { EXPANSIONS } from '../../game/data/types';
import { en } from '../content/en';
import { it as itDict } from '../content/it';
import { ko } from '../content/ko';
import type { Content } from '../content/types';
import { namesFor } from '../names';

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/;

/** 사전을 [경로, 값] 으로 편다 (함수 값은 한 번 불러 본 문장) */
function leaves(obj: unknown, path = ''): [string, string][] {
  if (typeof obj === 'string') return [[path, obj]];
  if (typeof obj === 'function') return [[path, (obj as (a: never) => string)('Name' as never) ?? '']];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
}

const DICTS: [string, Content][] = [['ko', ko], ['en', en], ['it', itDict]];

describe('게임 내용 사전', () => {
  it('data 의 모든 카드·캐릭터·이벤트·골드·확장판이 세 언어에 있다', () => {
    for (const [lang, c] of DICTS) {
      expect(Object.keys(c.cards).sort(), lang).toEqual(Object.keys(CARD_DEFS).sort());
      expect(Object.keys(c.characters).sort(), lang).toEqual(Object.keys(CHARACTERS).sort());
      expect(Object.keys(c.events).sort(), lang).toEqual(Object.keys(EVENTS).sort());
      expect(Object.keys(c.gold).sort(), lang).toEqual(Object.keys(GOLD_CARD_DEFS).sort());
      expect(Object.keys(c.expansions).sort(), lang).toEqual([...EXPANSIONS].sort());
    }
  });

  it('en·it 는 ko 와 같은 키를 갖고 값이 비지 않는다', () => {
    const base = leaves(ko).map(([k]) => k);
    for (const [lang, c] of [['en', en], ['it', itDict]] as const) {
      const got = leaves(c);
      expect(got.map(([k]) => k), lang).toEqual(base);
      expect(got.filter(([, v]) => v.trim() === '').map(([k]) => k), lang).toEqual([]);
    }
  });

  it('en·it 에는 한글이 없다', () => {
    for (const [lang, c] of [['en', en], ['it', itDict]] as const) {
      expect(leaves(c).filter(([, v]) => HANGUL.test(v)).map(([k]) => `${lang}:${k}`)).toEqual([]);
    }
  });

  it('고유명(캐릭터)이 아닌 값은 ko 와 같지 않다', () => {
    // ko 는 한글이라 en·it 가 같으면 한글이 남은 것이다 (함수 값인 aiSpeed 는 시험 입력이 같아 예외)
    const base = new Map(leaves(ko));
    for (const [lang, c] of [['en', en], ['it', itDict]] as const) {
      const same = leaves(c).filter(([k, v]) => v === base.get(k) && k !== 'aiSpeed');
      expect(same.map(([k]) => `${lang}:${k}`)).toEqual([]);
    }
  });

  it('카드·골드 이름: it 는 인쇄된 이름, en 은 nameEn 을 따른다', () => {
    for (const [kind, d] of Object.entries(GOLD_CARD_DEFS)) {
      expect(en.gold[kind as keyof typeof en.gold].name).toBe(d.nameEn);
      expect(itDict.gold[kind as keyof typeof itDict.gold].name.toLowerCase()).toBe(d.name.toLowerCase());
    }
    for (const [kind, d] of Object.entries(CARD_DEFS)) {
      expect(itDict.cards[kind as keyof typeof itDict.cards].name.toLowerCase(), kind).toBe(d.name.toLowerCase());
    }
    for (const [id, d] of Object.entries(CHARACTERS)) {
      expect(en.characters[id as keyof typeof en.characters].name).toBe(d.name);
    }
  });

  it('조회 도우미: 모르는 키는 키 자체를 낸다', () => {
    const n = namesFor('en');
    expect(n.cardName('bang')).toBe('BANG!');
    expect(n.abilityLabel('nope')).toBe('nope');
    expect(namesFor('ko').roleName('sheriff')).toBe('보안관');
    expect(namesFor('ko').resultReason({ reason: 'lastStanding', winnerIds: ['p1'] }, [{ id: 'p1', name: '철수' }])).toBe(
      '철수가 마지막까지 살아남았다.',
    );
  });

  // 기본판 룰북(base.txt)의 조건이 한국어 문구에서 빠지지 않게 한다
  it('ko 기본 캐릭터 문구에 원문의 조건이 들어 있다', () => {
    const t = (id: keyof typeof ko.characters) => ko.characters[id].text;
    // "If she plays a Missed! as a BANG!, she cannot play another BANG! card that turn"
    expect(t('calamityJanet')).toContain('차례당 <뱅!> 1장 제한');
    // "at any time, he may discard 2 cards from his hand"
    expect(t('sidKetchum')).toContain('언제든지');
    // "randomly from the hand of any other player" / "draws a random card from the hands of that player"
    expect(t('jesseJones')).toContain('무작위');
    expect(t('elGringo')).toContain('무작위');
    // "puts the other one back on the top of the deck"
    expect(t('kitCarlson')).toContain('남은 한 장은 카드 더미 맨 위로');
  });
});
