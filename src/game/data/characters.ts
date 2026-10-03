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
    nameKo: '바트 캐시디',
    maxHp: 4,
    ability: '생명력 1을 잃을 때마다 카드 더미에서 카드 한 장을 가져옵니다.',
  },
  blackJack: {
    id: 'blackJack',
    name: 'Black Jack',
    nameKo: '블랙 잭',
    maxHp: 4,
    ability:
      "'카드 가져오기' 단계에서 가져온 두 번째 카드를 공개합니다. 그 카드가 하트나 다이아몬드면 한 장 더 가져옵니다.",
  },
  calamityJanet: {
    id: 'calamityJanet',
    name: 'Calamity Janet',
    nameKo: '칼라미티 자넷',
    maxHp: 4,
    ability:
      '<뱅!>을 <빗나감!>으로, <빗나감!>을 <뱅!>으로 사용할 수 있습니다. <빗나감!>을 <뱅!>으로 내도 차례당 <뱅!> 1장 제한을 받습니다.',
  },
  elGringo: {
    id: 'elGringo',
    name: 'El Gringo',
    nameKo: '엘 그링고',
    maxHp: 3,
    ability: '다른 사람이 낸 카드로 생명력 1을 잃을 때마다 그 사람의 손에서 카드 한 장을 무작위로 가져옵니다.',
  },
  jesseJones: {
    id: 'jesseJones',
    name: 'Jesse Jones',
    nameKo: '제시 존스',
    maxHp: 4,
    ability:
      "'카드 가져오기' 단계에서 첫 번째 카드를 다른 사람의 손에서 무작위로 가져올 수도 있습니다. 두 번째 카드는 카드 더미에서 가져옵니다.",
  },
  jourdonnais: {
    id: 'jourdonnais',
    name: 'Jourdonnais',
    nameKo: '주르도네',
    maxHp: 4,
    ability:
      "<뱅!>의 표적이 될 때마다 '카드 펼치기'를 할 수 있으며, 하트가 나오면 총알이 빗나갑니다.",
  },
  kitCarlson: {
    id: 'kitCarlson',
    name: 'Kit Carlson',
    nameKo: '킷 칼슨',
    maxHp: 4,
    ability:
      "'카드 가져오기' 단계에서 카드 더미 맨 위의 세 장을 보고 가져갈 두 장을 고릅니다. 남은 한 장은 카드 더미 맨 위로 되돌립니다.",
  },
  luckyDuke: {
    id: 'luckyDuke',
    name: 'Lucky Duke',
    nameKo: '러키 듀크',
    maxHp: 4,
    ability: "'카드 펼치기'를 할 때마다 두 장을 보고 원하는 한 장을 펼칩니다.",
  },
  paulRegret: {
    id: 'paulRegret',
    name: 'Paul Regret',
    nameKo: '폴 리그렛',
    maxHp: 3,
    ability: '다른 사람이 볼 때 거리가 1 멀어집니다.',
  },
  pedroRamirez: {
    id: 'pedroRamirez',
    name: 'Pedro Ramirez',
    nameKo: '페드로 라미레즈',
    maxHp: 4,
    ability:
      "'카드 가져오기' 단계에서 첫 번째 카드를 버려진 카드 더미에서 가져올 수도 있습니다.",
  },
  roseDoolan: {
    id: 'roseDoolan',
    name: 'Rose Doolan',
    nameKo: '로즈 둘란',
    maxHp: 4,
    ability: '다른 사람을 볼 때 거리가 1 가까워집니다.',
  },
  sidKetchum: {
    id: 'sidKetchum',
    name: 'Sid Ketchum',
    nameKo: '시드 케첨',
    maxHp: 4,
    ability: '언제든지 손패 두 장을 버려 생명력을 1 회복할 수 있습니다.',
  },
  slabTheKiller: {
    id: 'slabTheKiller',
    name: 'Slab the Killer',
    nameKo: '슬랩 더 킬러',
    maxHp: 4,
    ability: '<빗나감!> 두 장으로 막도록 <뱅!> 카드를 사용합니다.',
  },
  suzyLafayette: {
    id: 'suzyLafayette',
    name: 'Suzy Lafayette',
    nameKo: '수지 라파예트',
    maxHp: 4,
    ability: '손에 남은 카드가 한 장도 없다면 즉시 카드 더미에서 카드 한 장을 가져옵니다.',
  },
  vultureSam: {
    id: 'vultureSam',
    name: 'Vulture Sam',
    nameKo: '벌쳐 샘',
    maxHp: 4,
    ability: '게임에서 제거되는 인물이 생길 때마다 그 사람의 모든 카드를 가져와 손에 둡니다.',
  },
  willyTheKid: {
    id: 'willyTheKid',
    name: 'Willy the Kid',
    nameKo: '윌리 더 키드',
    maxHp: 4,
    ability: '<뱅!>을 원하는 만큼 사용할 수 있습니다.',
  },
  uncleWill: {
    id: 'uncleWill',
    name: 'Uncle Will',
    nameKo: '엉클 윌',
    maxHp: 4,
    ability: '자기 차례에 한 번, 손의 카드 아무거나 한 장을 <잡화점>으로 사용할 수 있습니다.',
    expansion: 'highnoon',
  },
  johnnyKisch: {
    id: 'johnnyKisch',
    name: 'Johnny Kisch',
    nameKo: '조니 키시',
    maxHp: 4,
    ability: '카드를 앞에 내려놓을 때마다, 누구 앞에 있든 같은 이름의 다른 카드를 모두 버립니다.',
    expansion: 'highnoon',
  },
  // ----- 그림자의 계곡 (맨 끝에만 붙인다) -----
  blackFlower: {
    id: 'blackFlower',
    name: 'Black Flower',
    nameKo: '블랙 플라워',
    maxHp: 4,
    ability: '자기 차례에 한 번, ♣ 카드 아무거나를 추가 <뱅!>으로 쓸 수 있습니다.',
    expansion: 'valley',
  },
  coloradoBill: {
    id: 'coloradoBill',
    name: 'Colorado Bill',
    nameKo: '콜로라도 빌',
    maxHp: 4,
    ability: "<뱅!> 카드를 낼 때마다 '카드 펼치기'를 해서 ♠가 나오면 그 총알은 피할 수 없습니다.",
    expansion: 'valley',
  },
  derSpotBurstRinger: {
    id: 'derSpotBurstRinger',
    name: 'Der Spot - Burst Ringer',
    nameKo: '더 스팟 버스트 링거',
    maxHp: 4,
    ability: '자기 차례에 한 번, <뱅!> 카드를 <기관총>으로 쓸 수 있습니다.',
    expansion: 'valley',
  },
  evelynShebang: {
    id: 'evelynShebang',
    name: 'Evelyn Shebang',
    nameKo: '이블린 쉬뱅',
    maxHp: 4,
    ability:
      "'카드 가져오기' 단계에서 카드를 덜 가져올 수 있습니다. 안 가져온 한 장마다 사정거리 안의 서로 다른 사람에게 <뱅!>을 쏩니다.",
    expansion: 'valley',
  },
  henryBlock: {
    id: 'henryBlock',
    name: 'Henry Block',
    nameKo: '헨리 블록',
    maxHp: 4,
    ability: '내 카드(손패든 앞에 놓인 것이든)를 가져가거나 버리게 한 사람은 <뱅!>의 표적이 됩니다.',
    expansion: 'valley',
  },
  lemonadeJim: {
    id: 'lemonadeJim',
    name: 'Lemonade Jim',
    nameKo: '레모네이드 짐',
    maxHp: 4,
    ability: '다른 사람이 <맥주>를 낼 때마다, 손패 1장을 버리고 나도 목숨 1을 회복할 수 있습니다.',
    expansion: 'valley',
  },
  mickDefender: {
    id: 'mickDefender',
    name: 'Mick Defender',
    nameKo: '믹 디펜더',
    maxHp: 4,
    ability: '<뱅!>이 아닌 갈색 카드의 대상이 되면 <빗나감!>을 내서 그 카드를 피할 수 있습니다.',
    expansion: 'valley',
  },
  tucoFranziskaner: {
    id: 'tucoFranziskaner',
    name: 'Tuco Franziskaner',
    nameKo: '투코 프란치스카너',
    maxHp: 5,
    ability: "'카드 가져오기' 단계에 앞에 놓인 파랑 카드가 없으면 2장을 더 가져옵니다.",
    expansion: 'valley',
  },
  // 골드 러시. 능력은 dV Giochi 카드 원문(content/4/cards)을 옮겼다.
  // 돈 벨·더치 윌은 원본 맵 패치노트 표기, 나머지는 음차했다.
  donBell: {
    id: 'donBell',
    name: 'Don Bell',
    nameKo: '돈 벨',
    maxHp: 4,
    ability: "자기 차례가 끝날 때 '카드 펼치기'를 합니다. 하트나 다이아몬드면 차례를 한 번 더 진행합니다.",
    expansion: 'goldrush',
  },
  dutchWill: {
    id: 'dutchWill',
    name: 'Dutch Will',
    nameKo: '더치 윌',
    maxHp: 4,
    ability: '카드를 2장 가져와 그중 1장을 버리고, 금덩이 1개를 받습니다.',
    expansion: 'goldrush',
  },
  jackyMurieta: {
    id: 'jackyMurieta',
    name: 'Jacky Murieta',
    nameKo: '재키 무리에타',
    maxHp: 4,
    ability: '자기 차례에 금덩이 2개를 내고 <뱅!>을 한 번 더 쏠 수 있습니다.',
    expansion: 'goldrush',
  },
  joshMcCloud: {
    id: 'joshMcCloud',
    name: 'Josh McCloud',
    nameKo: '조시 맥클라우드',
    maxHp: 4,
    ability: '금덩이 2개를 내고 장비 덱 맨 위 카드를 가져올 수 있습니다.',
    expansion: 'goldrush',
  },
  madamYto: {
    id: 'madamYto',
    name: 'Madam Yto',
    nameKo: '마담 이토',
    maxHp: 4,
    ability: '누군가 <맥주>를 낼 때마다 카드 더미에서 카드 한 장을 가져옵니다.',
    expansion: 'goldrush',
  },
  prettyLuzena: {
    id: 'prettyLuzena',
    name: 'Pretty Luzena',
    nameKo: '프리티 루제나',
    maxHp: 4,
    ability: '차례에 한 번, 장비 한 장을 금덩이 1개 싸게 살 수 있습니다.',
    expansion: 'goldrush',
  },
  raddieSnake: {
    id: 'raddieSnake',
    name: 'Raddie Snake',
    nameKo: '래디 스네이크',
    maxHp: 4,
    ability: '자기 차례에 금덩이 1개를 버리고 카드 한 장을 가져올 수 있습니다 (2번까지).',
    expansion: 'goldrush',
  },
  simeonPicos: {
    id: 'simeonPicos',
    name: 'Simeon Picos',
    nameKo: '시미언 피코스',
    maxHp: 4,
    ability: '목숨 1을 잃을 때마다 금덩이 1개를 받습니다.',
    expansion: 'goldrush',
  },
  bigSpencer: {
    id: 'bigSpencer',
    name: 'Big Spencer',
    nameKo: '빅 스펜서',
    maxHp: 9,
    ability: '카드 5장을 들고 시작합니다. <빗나감!> 카드를 낼 수 없습니다.',
    expansion: 'wildwestshow',
  },
  flintWestwood: {
    id: 'flintWestwood',
    name: 'Flint Westwood',
    nameKo: '플린트 웨스트우드',
    maxHp: 4,
    ability: '자기 차례에 한 번, 손의 카드 1장을 다른 사람의 손에서 무작위로 뽑은 카드 2장과 맞바꿀 수 있습니다.',
    expansion: 'wildwestshow',
  },
  garyLooter: {
    id: 'garyLooter',
    name: 'Gary Looter',
    nameKo: '게리 루터',
    maxHp: 5,
    ability: '다른 사람이 차례를 마치며 손패 초과로 버리는 카드를 모두 가져갑니다.',
    expansion: 'wildwestshow',
  },
  greygoryDeck: {
    id: 'greygoryDeck',
    name: 'Greygory Deck',
    nameKo: '그레고리 덱',
    maxHp: 4,
    ability: '차례 시작에 캐릭터 2장을 무작위로 뽑을 수 있습니다. 뽑은 캐릭터들의 능력을 모두 가집니다.',
    expansion: 'wildwestshow',
  },
  johnPain: {
    id: 'johnPain',
    name: 'John Pain',
    nameKo: '존 페인',
    maxHp: 4,
    ability: "손패가 6장 미만이면, 누가 '카드 펼치기'를 하든 펼친 카드를 손으로 가져옵니다.",
    expansion: 'wildwestshow',
  },
  leeVanKliff: {
    id: 'leeVanKliff',
    name: 'Lee Van Kliff',
    nameKo: '리 반 클리프',
    maxHp: 4,
    ability: '자기 차례에 <뱅!> 1장을 버려, 방금 낸 갈색 카드의 효과를 한 번 더 냅니다.',
    expansion: 'wildwestshow',
  },
  terenKill: {
    id: 'terenKill',
    name: 'Teren Kill',
    nameKo: '테렌 킬',
    maxHp: 3,
    ability: "제거될 때마다 '카드 펼치기'를 합니다. 스페이드가 아니면 목숨 1로 남고 카드 1장을 가져옵니다.",
    expansion: 'wildwestshow',
  },
  youlGrinner: {
    id: 'youlGrinner',
    name: 'Youl Grinner',
    nameKo: '율 그리너',
    maxHp: 4,
    ability: "'카드 가져오기' 전에, 손패가 자기보다 많은 사람은 각자 고른 카드 1장을 율에게 줍니다.",
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
