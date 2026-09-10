/**
 * 기본판 캐릭터 16종.
 *
 * 능력 텍스트와 총알 수는 도감 이미지
 * reference/sc2-arcade/images/howtoplay_5a3151765feb.jpg 를 직접 읽어 옮겼다.
 * (El Gringo·Paul Regret만 총알 3개, 나머지 4개)
 *
 * 한글 이름은 원본 맵 패치노트의 표기를 따른다.
 */

import type { CharacterDef, CharacterId } from './types';

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
    ability: '<뱅!>을 <빗나감!>으로, <빗나감!>을 <뱅!>으로 사용할 수 있습니다.',
  },
  elGringo: {
    id: 'elGringo',
    name: 'El Gringo',
    nameKo: '엘 그링고',
    maxHp: 3,
    ability: '생명력 1을 잃을 때마다 공격한 사람의 손에서 카드 한 장을 가져옵니다.',
  },
  jesseJones: {
    id: 'jesseJones',
    name: 'Jesse Jones',
    nameKo: '제시 존스',
    maxHp: 4,
    ability:
      "'카드 가져오기' 단계에서 첫 번째 카드를 다른 사람의 손에서 가져올 수도 있습니다.",
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
      "'카드 가져오기' 단계에서 카드 더미 맨 위의 세 장을 보고 가져갈 두 장을 고릅니다.",
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
    ability: '카드 두 장을 버려 생명력을 1 회복할 수 있습니다.',
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
};

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];
