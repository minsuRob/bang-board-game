/**
 * 기본판 캐릭터 16종 + 하이 눈 프로모 캐릭터 2종.
 *
 * 능력 텍스트와 총알 수는 도감 이미지
 * reference/sc2-arcade/images/howtoplay_5a3151765feb.jpg 를 직접 읽어 옮겼다.
 * (El Gringo·Paul Regret만 총알 3개, 나머지 4개)
 *
 * 한글 이름은 원본 맵 패치노트의 표기를 따른다.
 *
 * 엉클 윌·조니 키시는 하이 눈과 함께 배포된 프로모 카드다 (훗날 불릿 판에 수록).
 * 능력은 dV Giochi 카드 원문을 옮겼고, 한글 표기는 원본 맵에 없어 음차했다.
 * 기본판 시드가 바뀌지 않도록 반드시 목록 맨 끝에 둔다.
 *
 * 와일드 웨스트 쇼 캐릭터 8종은 dV Giochi 카드(content/6/cards/06_*.png) 원문을 옮겼다.
 * 한글 표기는 원본 맵 패치노트(빅 스펜서·그레고리 덱·율 그리너)를 따르고 나머지는 음차했다.
 * 그레고리 덱의 목숨은 원본 맵 v0.184 밸런스 패치를 따라 4 → 3 으로 둔다.
 */

import type { CharacterDef, CharacterId, Expansion } from './types';

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  bartCassidy: {
    id: 'bartCassidy',
    name: 'Bart Cassidy',
    maxHp: 4,
  },
  blackJack: {
    id: 'blackJack',
    name: 'Black Jack',
    maxHp: 4,
  },
  calamityJanet: {
    id: 'calamityJanet',
    name: 'Calamity Janet',
    maxHp: 4,
  },
  elGringo: {
    id: 'elGringo',
    name: 'El Gringo',
    maxHp: 3,
  },
  jesseJones: {
    id: 'jesseJones',
    name: 'Jesse Jones',
    maxHp: 4,
  },
  jourdonnais: {
    id: 'jourdonnais',
    name: 'Jourdonnais',
    maxHp: 4,
  },
  kitCarlson: {
    id: 'kitCarlson',
    name: 'Kit Carlson',
    maxHp: 4,
  },
  luckyDuke: {
    id: 'luckyDuke',
    name: 'Lucky Duke',
    maxHp: 4,
  },
  paulRegret: {
    id: 'paulRegret',
    name: 'Paul Regret',
    maxHp: 3,
  },
  pedroRamirez: {
    id: 'pedroRamirez',
    name: 'Pedro Ramirez',
    maxHp: 4,
  },
  roseDoolan: {
    id: 'roseDoolan',
    name: 'Rose Doolan',
    maxHp: 4,
  },
  sidKetchum: {
    id: 'sidKetchum',
    name: 'Sid Ketchum',
    maxHp: 4,
  },
  slabTheKiller: {
    id: 'slabTheKiller',
    name: 'Slab the Killer',
    maxHp: 4,
  },
  suzyLafayette: {
    id: 'suzyLafayette',
    name: 'Suzy Lafayette',
    maxHp: 4,
  },
  vultureSam: {
    id: 'vultureSam',
    name: 'Vulture Sam',
    maxHp: 4,
  },
  willyTheKid: {
    id: 'willyTheKid',
    name: 'Willy the Kid',
    maxHp: 4,
  },
  uncleWill: {
    id: 'uncleWill',
    name: 'Uncle Will',
    maxHp: 4,
    expansion: 'highnoon',
  },
  johnnyKisch: {
    id: 'johnnyKisch',
    name: 'Johnny Kisch',
    maxHp: 4,
    expansion: 'highnoon',
  },
  // ----- 그림자의 계곡 (맨 끝에만 붙인다) -----
  blackFlower: {
    id: 'blackFlower',
    name: 'Black Flower',
    maxHp: 4,
    expansion: 'valley',
  },
  coloradoBill: {
    id: 'coloradoBill',
    name: 'Colorado Bill',
    maxHp: 4,
    expansion: 'valley',
  },
  derSpotBurstRinger: {
    id: 'derSpotBurstRinger',
    name: 'Der Spot - Burst Ringer',
    maxHp: 4,
    expansion: 'valley',
  },
  evelynShebang: {
    id: 'evelynShebang',
    name: 'Evelyn Shebang',
    maxHp: 4,
    expansion: 'valley',
  },
  henryBlock: {
    id: 'henryBlock',
    name: 'Henry Block',
    maxHp: 4,
    expansion: 'valley',
  },
  lemonadeJim: {
    id: 'lemonadeJim',
    name: 'Lemonade Jim',
    maxHp: 4,
    expansion: 'valley',
  },
  mickDefender: {
    id: 'mickDefender',
    name: 'Mick Defender',
    maxHp: 4,
    expansion: 'valley',
  },
  tucoFranziskaner: {
    id: 'tucoFranziskaner',
    name: 'Tuco Franziskaner',
    maxHp: 5,
    expansion: 'valley',
  },
  // 골드 러시. 능력은 dV Giochi 카드 원문(content/4/cards)을 옮겼다.
  // 돈 벨·더치 윌은 원본 맵 패치노트 표기, 나머지는 음차했다.
  donBell: {
    id: 'donBell',
    name: 'Don Bell',
    maxHp: 4,
    expansion: 'goldrush',
  },
  dutchWill: {
    id: 'dutchWill',
    name: 'Dutch Will',
    maxHp: 4,
    expansion: 'goldrush',
  },
  jackyMurieta: {
    id: 'jackyMurieta',
    name: 'Jacky Murieta',
    maxHp: 4,
    expansion: 'goldrush',
  },
  joshMcCloud: {
    id: 'joshMcCloud',
    name: 'Josh McCloud',
    maxHp: 4,
    expansion: 'goldrush',
  },
  madamYto: {
    id: 'madamYto',
    name: 'Madam Yto',
    maxHp: 4,
    expansion: 'goldrush',
  },
  prettyLuzena: {
    id: 'prettyLuzena',
    name: 'Pretty Luzena',
    maxHp: 4,
    expansion: 'goldrush',
  },
  raddieSnake: {
    id: 'raddieSnake',
    name: 'Raddie Snake',
    maxHp: 4,
    expansion: 'goldrush',
  },
  simeonPicos: {
    id: 'simeonPicos',
    name: 'Simeon Picos',
    maxHp: 4,
    expansion: 'goldrush',
  },
  bigSpencer: {
    id: 'bigSpencer',
    name: 'Big Spencer',
    maxHp: 9,
    expansion: 'wildwestshow',
  },
  flintWestwood: {
    id: 'flintWestwood',
    name: 'Flint Westwood',
    maxHp: 4,
    expansion: 'wildwestshow',
  },
  garyLooter: {
    id: 'garyLooter',
    name: 'Gary Looter',
    maxHp: 5,
    expansion: 'wildwestshow',
  },
  greygoryDeck: {
    id: 'greygoryDeck',
    name: 'Greygory Deck',
    maxHp: 4,
    expansion: 'wildwestshow',
  },
  johnPain: {
    id: 'johnPain',
    name: 'John Pain',
    maxHp: 4,
    expansion: 'wildwestshow',
  },
  leeVanKliff: {
    id: 'leeVanKliff',
    name: 'Lee Van Kliff',
    maxHp: 4,
    expansion: 'wildwestshow',
  },
  terenKill: {
    id: 'terenKill',
    name: 'Teren Kill',
    maxHp: 3,
    expansion: 'wildwestshow',
  },
  youlGrinner: {
    id: 'youlGrinner',
    name: 'Youl Grinner',
    maxHp: 4,
    expansion: 'wildwestshow',
  },
};

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

/** 이 확장판 조합에서 드래프트에 나오는 캐릭터 (선언 순서 유지) */
export function charactersFor(expansions: readonly Expansion[]): CharacterId[] {
  return CHARACTER_IDS.filter((id) => {
    const ex = CHARACTERS[id].expansion;
    return !ex || expansions.includes(ex);
  });
}
