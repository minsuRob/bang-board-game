import { describe, expect, it } from 'vitest';

import { BASE_CARDS_BY_ID, BASE_DECK, CARD_DEFS } from './cards.base';
import { HIGHNOON_EVENTS, HIGHNOON_FINAL_ID, HIGHNOON_SHUFFLED_IDS } from './cards.highnoon';
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
  it('16종이다', () => {
    expect(CHARACTER_IDS).toHaveLength(16);
  });

  it('총알 수는 3 또는 4이고, 3인 캐릭터는 El Gringo와 Paul Regret뿐이다', () => {
    const three = CHARACTER_IDS.filter((id) => CHARACTERS[id].maxHp === 3);
    expect(three.sort()).toEqual(['elGringo', 'paulRegret']);
    for (const id of CHARACTER_IDS) expect([3, 4]).toContain(CHARACTERS[id].maxHp);
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
