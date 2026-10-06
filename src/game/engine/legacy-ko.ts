/**
 * 엔진 로그 문장에만 남아 있는 한국어 이름표 (임시).
 *
 * 로그 문장을 엔진이 만드는 동안(GameEvent.text) 이름이 필요해서 둔다. 화면에 보이는 이름은 이 표가 아니라
 * i18n/content 와 names.ts 가 낸다. 로그를 LogMsg 로 바꾸면(번역 묶음 D) 이 파일을 통째로 지운다.
 * 이 표에 새 항목을 더하지 않는다 — 새 카드·캐릭터 이름은 content/ko.ts 에만 쓰고, 여기엔 로그가 필요한 만큼만.
 */

import type { CardKind, CharacterId, EventCardId, GoldCardKind, Role, AbilityKey, CardDef, CharacterDef, EventCardDef, GoldCardDef } from '../data/types';
import type { ResultReason } from './types';

const CARD: Record<CardKind, string> = {
  bandidos: '반디도스',
  escape: '탈출',
  aim: '조준',
  poker: '포커',
  backfire: '역화',
  saved: '구조!',
  fanning: '패닝',
  tomahawk: '토마호크',
  tornado: '토네이도',
  lastCall: '라스트 콜',
  ghost: '유령',
  lemat: '르매트',
  rattlesnake: '방울뱀',
  shotgun: '샷건',
  bounty: '포상금',
  bang: '뱅!',
  missed: '빗나감!',
  beer: '맥주',
  saloon: '주점',
  stagecoach: '역마차',
  wellsFargo: '웰스 파고',
  generalStore: '잡화점',
  gatling: '기관총',
  indians: '인디언!',
  duel: '결투',
  panic: '강탈',
  catBalou: '캣 벌로우',
  volcanic: '볼캐닉',
  schofield: '스코필드',
  remington: '레밍턴',
  carabine: '카빈',
  winchester: '윈체스터',
  scope: '조준경',
  mustang: '야생마',
  barrel: '술통',
  jail: '감옥',
  dynamite: '다이너마이트',
};

const CHARACTER: Record<CharacterId, string> = {
  bartCassidy: '바트 캐시디',
  blackJack: '블랙 잭',
  calamityJanet: '칼라미티 자넷',
  elGringo: '엘 그링고',
  jesseJones: '제시 존스',
  jourdonnais: '주르도네',
  kitCarlson: '킷 칼슨',
  luckyDuke: '러키 듀크',
  paulRegret: '폴 리그렛',
  pedroRamirez: '페드로 라미레즈',
  roseDoolan: '로즈 둘란',
  sidKetchum: '시드 케첨',
  slabTheKiller: '슬랩 더 킬러',
  suzyLafayette: '수지 라파예트',
  vultureSam: '벌쳐 샘',
  willyTheKid: '윌리 더 키드',
  uncleWill: '엉클 윌',
  johnnyKisch: '조니 키시',
  blackFlower: '블랙 플라워',
  coloradoBill: '콜로라도 빌',
  derSpotBurstRinger: '더 스팟 버스트 링거',
  evelynShebang: '이블린 쉬뱅',
  henryBlock: '헨리 블록',
  lemonadeJim: '레모네이드 짐',
  mickDefender: '믹 디펜더',
  tucoFranziskaner: '투코 프란치스카너',
  donBell: '돈 벨',
  dutchWill: '더치 윌',
  jackyMurieta: '재키 무리에타',
  joshMcCloud: '조시 맥클라우드',
  madamYto: '마담 이토',
  prettyLuzena: '프리티 루제나',
  raddieSnake: '래디 스네이크',
  simeonPicos: '시미언 피코스',
  bigSpencer: '빅 스펜서',
  flintWestwood: '플린트 웨스트우드',
  garyLooter: '게리 루터',
  greygoryDeck: '그레고리 덱',
  johnPain: '존 페인',
  leeVanKliff: '리 반 클리프',
  terenKill: '테렌 킬',
  youlGrinner: '율 그리너',
};

const EVENT: Record<EventCardId, string> = {
  blessing: '축복',
  curse: '저주',
  ghostTown: '유령도시',
  goldRush: '골드러시',
  hangover: '숙취',
  shootout: '총격전',
  theDaltons: '달톤 형제',
  theDoctor: '의사',
  theReverend: '목사',
  theSermon: '설교',
  trainArrival: '기차도착',
  thirst: '갈증',
  newIdentity: '새로운 신분',
  handcuffs: '수갑',
  highNoon: '하이 눈',
  gag: '재갈',
  boneOrchard: '묘지',
  darlingValentine: '달링 발렌타인',
  dorothyRage: '도로시 레이지',
  helenaZontero: '헬레나 존테로',
  ladyRoseOfTexas: '레이디 로즈 오브 텍사스',
  missSusanna: '미스 수잔나',
  showdown: '결전',
  sacagaway: '사카가웨이',
  wildWestShow: '와일드 웨스트 쇼',
  abandonedMine: '폐광',
  ambush: '매복',
  bloodBrothers: '의형제',
  deadMan: '망자',
  hardLiquor: '독한 술',
  lasso: '올가미',
  lawOfTheWest: '서부의 법',
  peyote: '피요테',
  ranch: '목장',
  ricochet: '리코체',
  russianRoulette: '러시안 룰렛',
  sniper: '저격수',
  theJudge: '판사',
  vendetta: '복수',
  fistfulOfCards: '한줌의 카드',
};

const GOLD: Record<GoldCardKind, string> = {
  shot: '한잔의 술',
  bottle: '병',
  pardner: '동업자',
  goldRush: '황금 러시',
  wanted: '수배',
  rhum: '럼',
  unionPacific: '유니언 퍼시픽',
  calumet: '칼루멧',
  gunBelt: '탄띠',
  horseshoe: '편자',
  pickaxe: '곡괭이',
  goldPan: '사금채취판',
  boots: '장화',
  luckyCharm: '부적',
  rucksack: '배낭',
};

const ROLE: Record<Role, string> = { sheriff: '보안관', deputy: '부관', outlaw: '무법자', renegade: '배신자' };

const ABILITY: Record<AbilityKey, string> = {
  sidKetchum: '카드 2장을 버리고 목숨 1 회복',
  derSpotBurstRinger: '뱅! → 기관총',
  uncleWill: '카드 1장 → 잡화점',
  leeVanKliff: '뱅!을 버려 한 번 더',
  blackFlower: '♣ 카드 → 추가 뱅!',
  flintWestwood: '카드 1장 ↔ 남의 손 2장',
  jackyMurieta: '뱅!을 쐈다',
  joshMcCloud: '장비 덱 맨 위 카드를 뽑았다',
  raddieSnake: '카드 한 장을 가져왔다',
  goldPan: '사금채취판으로 카드 한 장을 가져왔다',
  rucksack: '배낭으로 목숨 1을 회복했다',
};

const REASON: Record<ResultReason, string> = {
  nobodyAlive: '아무도 살아남지 못했다.',
  lastStanding: '마지막까지 살아남았다.',
  sheriffDownRenegadeLeft: '보안관이 제거되고 배신자만 남았다.',
  sheriffDown: '보안관이 제거되었다.',
  lawWon: '모든 무법자와 배신자가 제거되었다.',
};

type AnyDef = CardDef | CharacterDef | EventCardDef | GoldCardDef;

/** 카드·캐릭터·이벤트·골드 정의 어느 것이든 한국어 이름을 낸다 */
export function nameKo(def: AnyDef): string {
  if ('cost' in def) return GOLD[def.kind];
  if ('maxHp' in def) return CHARACTER[def.id];
  if ('symbols' in def) return CARD[def.kind];
  return EVENT[def.id];
}

export const roleKo = (r: Role): string => ROLE[r];
export const abilityKo = (k: string): string => ABILITY[k as AbilityKey] ?? k;
/** lastStanding 은 마지막 생존자 이름 뒤에 붙는다: `${ga(name)} ${reasonKo(...)}` */
export const reasonKo = (r: ResultReason): string => REASON[r];
