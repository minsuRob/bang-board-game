import { describe, expect, it } from 'vitest';

import { ALL_CARDS_BY_ID, BASE_CARDS_BY_ID, BASE_DECK, CARD_DEFS } from './cards.base';
import { VALLEY_DECK } from './cards.valley';
import { HIGHNOON_EVENTS, HIGHNOON_FINAL_ID, HIGHNOON_SHUFFLED_IDS } from './cards.highnoon';
import {
  WILDWESTSHOW_EVENTS,
  WILDWESTSHOW_FINAL_ID,
  WILDWESTSHOW_SHUFFLED_IDS,
} from './cards.wildwestshow';
import { FISTFUL_EVENTS, FISTFUL_FINAL_ID, FISTFUL_SHUFFLED_IDS } from './cards.fistful';
import {
  EVENT_EXPANSIONS,
  EVENTS,
  eventDeckFor,
  eventDeckSize,
  eventExpansionOf,
  expansionsFor,
} from './events';
import { CHARACTER_IDS, CHARACTERS } from './characters';
import { MAX_PLAYERS, MIN_PLAYERS, ROLE_DISTRIBUTION } from './roles';
import { RANK_VALUE, type CardKind, type Role } from './types';

describe('기본 덱', () => {
  it('총 80장이다', () => {
    expect(BASE_DECK).toHaveLength(80);
  });

  it('카드 id가 전부 고유하다', () => {
    expect(BASE_CARDS_BY_ID.size).toBe(80);
  });

  it('종류별 매수가 원작 룰북과 같다', () => {
    const counts = new Map<CardKind, number>();
    for (const c of BASE_DECK) counts.set(c.kind, (counts.get(c.kind) ?? 0) + 1);

    expect(Object.fromEntries(counts)).toEqual({
      bang: 25,
      missed: 12,
      beer: 6,
      saloon: 1,
      wellsFargo: 1,
      stagecoach: 2,
      generalStore: 2,
      gatling: 1,
      indians: 2,
      duel: 3,
      panic: 4,
      catBalou: 4,
      mustang: 2,
      scope: 1,
      barrel: 2,
      jail: 3,
      dynamite: 1,
      volcanic: 2,
      schofield: 3,
      remington: 1,
      carabine: 1,
      winchester: 1,
    });
  });

  it('22종 전부 정의가 있다', () => {
    const kinds = new Set(BASE_DECK.map((c) => c.kind));
    expect(kinds.size).toBe(22);
    for (const k of kinds) expect(CARD_DEFS[k]).toBeDefined();
  });

  it('무기는 사정거리를 갖고, 무기가 아니면 갖지 않는다', () => {
    for (const def of Object.values(CARD_DEFS)) {
      if (def.equip === 'weapon') expect(def.weaponRange).toBeGreaterThanOrEqual(1);
      else expect(def.weaponRange).toBeUndefined();
    }
    expect(CARD_DEFS.volcanic.weaponRange).toBe(1);
    expect(CARD_DEFS.schofield.weaponRange).toBe(2);
    expect(CARD_DEFS.remington.weaponRange).toBe(3);
    expect(CARD_DEFS.carabine.weaponRange).toBe(4);
    expect(CARD_DEFS.winchester.weaponRange).toBe(5);
  });

  it('파랑 카드만 장착 위치를 갖는다', () => {
    for (const def of Object.values(CARD_DEFS)) {
      if (def.category === 'blue') expect(def.equip).toBeDefined();
      else expect(def.equip).toBeUndefined();
    }
  });

  it('다이너마이트가 터지는 ♠2~9는 덱에 정확히 10장 있다', () => {
    const boom = BASE_DECK.filter(
      (c) => c.suit === 'spades' && RANK_VALUE[c.rank] >= 2 && RANK_VALUE[c.rank] <= 9,
    );
    expect(boom).toHaveLength(10);
  });

  it('하트는 덱에 정확히 20장 있다 (술통·감옥 판정 확률의 근거)', () => {
    expect(BASE_DECK.filter((c) => c.suit === 'hearts')).toHaveLength(20);
  });

  it('무늬별로 정확히 20장씩이다', () => {
    const bySuit = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
    for (const c of BASE_DECK) bySuit[c.suit]++;
    expect(bySuit).toEqual({ hearts: 20, diamonds: 20, clubs: 20, spades: 20 });
  });

  it('역마차 ♠9 두 장처럼 중복되는 카드도 서로 다른 id를 받는다', () => {
    const stage = BASE_DECK.filter((c) => c.kind === 'stagecoach');
    expect(stage).toHaveLength(2);
    expect(stage[0].id).not.toBe(stage[1].id);
    expect(stage.every((c) => c.suit === 'spades' && c.rank === '9')).toBe(true);
  });
});

describe('캐릭터', () => {
  it('기본판 16종 + 하이 눈 프로모 2종 + 그림자의 계곡 8종 + 골드 러시 8종 + 와일드 웨스트 쇼 8종이다', () => {
    expect(CHARACTER_IDS).toHaveLength(42);
    expect(CHARACTER_IDS.filter((id) => CHARACTERS[id].expansion === 'valley')).toHaveLength(8);
    expect(CHARACTER_IDS.filter((id) => !CHARACTERS[id].expansion)).toHaveLength(16);
    expect(CHARACTER_IDS.filter((id) => CHARACTERS[id].expansion === 'highnoon').sort()).toEqual([
      'johnnyKisch',
      'uncleWill',
    ]);
    expect(CHARACTER_IDS.filter((id) => CHARACTERS[id].expansion === 'goldrush')).toHaveLength(8);
    expect(
      CHARACTER_IDS.filter((id) => CHARACTERS[id].expansion === 'wildwestshow').sort(),
    ).toEqual([
      'bigSpencer',
      'flintWestwood',
      'garyLooter',
      'greygoryDeck',
      'johnPain',
      'leeVanKliff',
      'terenKill',
      'youlGrinner',
    ]);
  });

  it('확장판 캐릭터는 기본판 16종 뒤에 붙는다 (기본판 시드 보존)', () => {
    expect(CHARACTER_IDS.slice(0, 16).every((id) => !CHARACTERS[id].expansion)).toBe(true);
  });

  it('기본판 총알 수는 3 또는 4이고, 3인 캐릭터는 El Gringo와 Paul Regret뿐이다', () => {
    const base = CHARACTER_IDS.filter((id) => !CHARACTERS[id].expansion);
    const three = base.filter((id) => CHARACTERS[id].maxHp === 3);
    expect(three.sort()).toEqual(['elGringo', 'paulRegret']);
    for (const id of base) expect([3, 4]).toContain(CHARACTERS[id].maxHp);
  });

  // 총알 수는 카드 그림을 따른다 (assets/cards/character/*.png).
  // 그레고리 덱·시미언 피코스는 그림에 총알 4개. SC2 v0.184 의 "그레고리 덱 목숨 4 → 3" 은 하우스 룰이다.
  it('확장 캐릭터 총알 수: 빅 스펜서 9, 게리 루터 5, 그레고리 덱·시미언 피코스 4, 테렌 킬 3', () => {
    expect(CHARACTERS.bigSpencer.maxHp).toBe(9);
    expect(CHARACTERS.garyLooter.maxHp).toBe(5);
    expect(CHARACTERS.greygoryDeck.maxHp).toBe(4);
    expect(CHARACTERS.terenKill.maxHp).toBe(3);
    expect(CHARACTERS.simeonPicos.maxHp).toBe(4);
    expect(CHARACTERS.tucoFranziskaner.maxHp).toBe(5);
  });

  it('id가 레코드 키와 일치한다', () => {
    for (const id of CHARACTER_IDS) expect(CHARACTERS[id].id).toBe(id);
  });
});

describe('역할 분배', () => {
  it('4~8인이 정의돼 있고 인원수와 길이가 맞는다', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
      expect(ROLE_DISTRIBUTION[n], `${n}인`).toBeDefined();
      expect(ROLE_DISTRIBUTION[n]).toHaveLength(n);
    }
  });

  it('보안관은 항상 정확히 1명이다', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
      const sheriffs = ROLE_DISTRIBUTION[n].filter((r) => r === 'sheriff');
      expect(sheriffs, `${n}인`).toHaveLength(1);
    }
  });

  it('7인 구성이 도감 이미지와 같다 (보안관1·부관2·무법자3·배신자1)', () => {
    const count = (r: Role) => ROLE_DISTRIBUTION[7].filter((x) => x === r).length;
    expect([count('sheriff'), count('deputy'), count('outlaw'), count('renegade')]).toEqual([
      1, 2, 3, 1,
    ]);
  });

  it('4인은 부관이 없다', () => {
    expect(ROLE_DISTRIBUTION[4]).not.toContain('deputy');
  });
});

describe('하이 눈 이벤트', () => {
  it('15종이고 마지막 카드는 하이 눈 하나뿐이다', () => {
    expect(Object.keys(HIGHNOON_EVENTS)).toHaveLength(15);
    const finals = Object.values(HIGHNOON_EVENTS).filter((e) => e.isFinal);
    expect(finals).toHaveLength(1);
    expect(finals[0].id).toBe(HIGHNOON_FINAL_ID);
  });

  it('섞이는 이벤트는 14장이다', () => {
    expect(HIGHNOON_SHUFFLED_IDS).toHaveLength(14);
    expect(HIGHNOON_SHUFFLED_IDS).not.toContain(HIGHNOON_FINAL_ID);
  });
});

describe('그림자의 계곡 카드', () => {
  it('15종 16장이고 id 가 겹치지 않는다', () => {
    expect(VALLEY_DECK).toHaveLength(16);
    expect(new Set(VALLEY_DECK.map((c) => c.kind)).size).toBe(15);
    expect(ALL_CARDS_BY_ID.size).toBe(96);
    for (const c of VALLEY_DECK) expect(CARD_DEFS[c.kind].expansion).toBe('valley');
  });
});

describe('골드 러시 장비 카드', () => {
  it('24장이고 갈색 16 · 검정 8, id 가 겹치지 않는다', async () => {
    const { GOLD_DECK, goldDefOf } = await import('./cards.goldrush');
    expect(GOLD_DECK).toHaveLength(24);
    expect(new Set(GOLD_DECK.map((c) => c.id)).size).toBe(24);
    expect(GOLD_DECK.filter((c) => goldDefOf(c.id).category === 'brown')).toHaveLength(16);
    expect(GOLD_DECK.filter((c) => goldDefOf(c.id).category === 'black')).toHaveLength(8);
  });
});

describe('와일드 웨스트 쇼 이벤트', () => {
  it('10종이고 마지막 카드는 와일드 웨스트 쇼 하나뿐이다', () => {
    expect(Object.keys(WILDWESTSHOW_EVENTS)).toHaveLength(10);
    const finals = Object.values(WILDWESTSHOW_EVENTS).filter((e) => e.isFinal);
    expect(finals.map((e) => e.id)).toEqual([WILDWESTSHOW_FINAL_ID]);
    expect(WILDWESTSHOW_SHUFFLED_IDS).toHaveLength(9);
  });

});

describe('한줌의 카드 이벤트', () => {
  it('15종이고 마지막 카드는 한줌의 카드 하나뿐이다', () => {
    expect(Object.keys(FISTFUL_EVENTS)).toHaveLength(15);
    const finals = Object.values(FISTFUL_EVENTS).filter((e) => e.isFinal);
    expect(finals.map((e) => e.id)).toEqual([FISTFUL_FINAL_ID]);
    expect(FISTFUL_SHUFFLED_IDS).toHaveLength(14);
  });
});

describe('상황 카드 확장판 고르기', () => {
  it('합본 EVENTS 는 40종이고 id 가 키와 같다', () => {
    expect(Object.keys(EVENTS)).toHaveLength(40);
    for (const [id, def] of Object.entries(EVENTS)) expect(def.id).toBe(id);
  });

  it('세 확장판 모두 덱을 하나씩 가진다', () => {
    expect(EVENT_EXPANSIONS).toEqual(['highnoon', 'wildwestshow', 'fistful']);
    expect(eventDeckFor(['highnoon'])?.final).toBe('highNoon');
    expect(eventDeckFor(['wildwestshow'])?.final).toBe('wildWestShow');
    expect(eventDeckFor(['fistful'])?.final).toBe('fistfulOfCards');
    expect(eventDeckSize('curse')).toBe(15);
    expect(eventDeckSize('gag')).toBe(10);
    expect(eventDeckSize('ambush')).toBe(15);
  });

  it('한 판에 이벤트 덱은 하나다. 둘 이상 들어오면 앞의 확장판을 쓴다', () => {
    expect(eventDeckFor([])).toBeNull();
    expect(eventDeckFor(['valley', 'goldrush'])).toBeNull();
    expect(eventDeckFor(['highnoon', 'wildwestshow'])?.final).toBe('highNoon');
    expect(eventDeckFor(['fistful', 'wildwestshow'])?.final).toBe('wildWestShow');
    expect(eventExpansionOf(['valley', 'fistful'])).toBe('fistful');
  });

  it('로비 설정은 상황 카드 하나만 확장판 목록에 넣는다', () => {
    expect(expansionsFor({ event: null })).toEqual([]);
    expect(expansionsFor({ event: 'fistful', valley: true, goldrush: true })).toEqual([
      'fistful',
      'valley',
      'goldrush',
    ]);
  });
});
