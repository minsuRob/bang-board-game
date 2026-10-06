import { SUIT_GLYPH } from '../../game/data/types';
import { eul, ga, neun, ro, wa } from '../../game/engine/josa';
import type { LogRenderer } from './types';

/** 한국어 로그. 조사는 engine/josa.ts 가 받침에 맞춰 붙인다 */
export const koLog: LogRenderer = {
  legacy: () => '',
  gameStart: (m, c) => `${m.count}명이 자리에 앉았다. 보안관은 ${c.nick(m.sheriff)}. 캐릭터를 고른다.`,
  reshuffle: (m) => `버린 더미 ${m.amount}장을 섞어 새 덱을 만들었다.`,
  goldReshuffle: (m) => `버린 장비 ${m.amount}장을 섞어 장비 덱을 새로 만들었다.`,
  rejected: (m) => `허용되지 않는 행동이라 무시되었다 (${m.action}).`,
  timeout: () => '제한시간이 지나 기본 행동이 대신 수행되었다.',
  turnStart: (m, c) => `${c.who(m.who)}의 차례.`,
  extraTurn: (m, c) => `${ga(c.who(m.who))} 차례를 한 번 더 진행한다.`,
  event: (m, c) => `${m.by ? `${ga(c.who(m.by))} 더미를 가져가 ` : ''}이벤트 공개 — ${c.n.eventName(m.event)}`,
  gameEnd: (m, c) => {
    const who = m.byPlayer ? m.ids.map((id) => c.nick(id)).join('·') : m.roles.map((r) => c.n.roleName(r)).join('·');
    const why = c.n.resultReason({ reason: m.reason, winnerIds: m.ids }, c.players);
    return who ? `${who} 승리. ${why}` : `승자 없음. ${why}`;
  },
  draftPick: (m, c) => `${ga(c.nick(m.who))} 캐릭터를 골랐다.`,
  draftDone: (m, c) => `모두 캐릭터를 골랐다. ${m.picks.map((p) => `${c.nick(p.who)}·${c.n.charName(p.character)}`).join(', ')}`,

  played: (m, c) => {
    const played = m.as ? `${eul(c.n.cardName(m.card))} ${ro(c.n.cardName(m.as))}` : eul(c.n.cardName(m.card));
    return (
      `${ga(c.who(m.who))}${m.ricochet ? ' 리코체로' : ''}${m.again ? ' 한 번 더,' : ''} ${played} 냈다` +
      (m.to ? ` → ${c.who(m.to)}.` : '.')
    );
  },
  playedWith: (m, c) => `${ga(c.who(m.who))} ${m.sniper ? '저격수로 ' : ''}${eul(c.n.cardName(m.card))} 함께 냈다.`,
  discard: (m, c) =>
    m.onDeck ? `${ga(c.who(m.who))} 카드를 덱 위에 뒷면으로 올렸다.` : `${ga(c.who(m.who))} 카드를 버렸다.`,
  draw: (m, c) =>
    m.fromDiscard > 0
      ? `${ga(c.who(m.who))} 버린 더미에서 ${m.fromDiscard}장` +
        (m.fromDeck ? `, 덱에서 ${m.fromDeck}장을 가져왔다.` : '을 가져왔다.')
      : `${ga(c.who(m.who))} 카드 ${m.fromDeck}장을 가져왔다.`,
  steal: (m, c) => `${ga(c.who(m.who))} ${c.who(m.from)}의 손에서 ${m.amount}장을 가져갔다.`,
  panic: (m, c) => {
    const name = m.card ? c.n.cardName(m.card) : '';
    const obj = !m.card ? '카드를' : m.fromHand ? `"${name}"${eul(name).slice(-1)}` : eul(name);
    return `${ga(c.who(m.who))} ${c.who(m.target)}의 ${obj} 강탈했다.`;
  },
  catBalou: (m, c) => {
    const name = c.n.cardName(m.card);
    const obj = m.fromHand ? `"${name}"${eul(name).slice(-1)}` : eul(name);
    return `${ga(c.who(m.who))} ${c.who(m.target)}의 ${obj} 버리게 했다.`;
  },
  generalStore: (m) => `잡화점: 카드 ${m.amount}장이 펼쳐졌다.`,
  generalStorePick: (m, c) => `${ga(c.who(m.who))} 잡화점에서 ${eul(c.n.cardName(m.card))} 골랐다.`,

  missed: (m, c) => `${ga(c.who(m.who))} 총알을 피했다.`,
  playMissed: (m, c) =>
    m.backfireTo
      ? `${ga(c.who(m.who))} 역화를 냈다. 총알이 ${c.who(m.backfireTo)}에게 되돌아간다.`
      : `${ga(c.who(m.who))} ${eul(c.n.cardName(m.card === 'backfire' ? 'backfire' : 'missed'))} 냈다.`,
  ghostImmune: (m, c) =>
    `${neun(c.who(m.who))} 유령이라 ${m.from === 'bullet' ? '총알이 통하지 않는다' : '피해를 받지 않는다'}.`,
  indiansBang: (m, c) => `${ga(c.who(m.who))} 뱅!을 버려 인디언을 물리쳤다.`,
  duelBang: (m, c) => `${ga(c.who(m.who))} 결투에서 뱅!을 냈다.`,
  duelLoss: (m, c) => `${ga(c.who(m.who))} 결투에서 졌다.`,
  damage: (m, c) => `${ga(c.who(m.who))} 목숨 ${m.amount}을 잃었다 (남은 목숨 ${m.left}).`,
  heal: (m, c) => `${ga(c.who(m.who))} 목숨을 회복했다 (${m.hp}).`,
  beerSurvive: (m, c) => `${ga(c.who(m.who))} 맥주를 마시고 버텼다.`,
  eliminate: (m, c) => `${ga(c.who(m.who))} 게임에서 제거되었다. 역할은 ${c.n.roleName(m.role)}.`,
  bounty: (m, c) => `${ga(c.who(m.who))} 무법자를 처치해 현상금 ${m.cards}장을 받는다.`,
  penalty: (m, c) => `보안관이 부관을 쏘았다. ${neun(c.who(m.who))} 손패와 장비를 전부 잃는다.`,

  judgement: (m, c) => `${c.who(m.who)}의 ${c.n.judgementName(m.purpose)} 판정: ${m.rank}${SUIT_GLYPH[m.suit]}`,
  dodge: (m, c) => `${c.n.judgementName(m.purpose)} 효과로 빗나감 1회를 얻었다.`,
  rattlesnake: (m, c) => `방울뱀이 ${eul(c.who(m.who))} 물었다.`,
  dynamite: (m, c) => `다이너마이트가 터졌다! ${ga(c.who(m.who))} 목숨 3을 잃는다.`,
  dynamitePass: (m, c) => `다이너마이트가 ${c.who(m.to)}에게 넘어갔다.`,
  jailEscape: (m, c) => `${ga(c.who(m.who))} 감옥에서 탈출했다.`,
  jailSkip: (m, c) => `${neun(c.who(m.who))} 감옥에 갇혀 차례를 건너뛴다.`,
  blackJack: (m, c) =>
    `${c.who(m.who)}의 두 번째 카드 공개 ${SUIT_GLYPH[m.suit]} ${m.bonus ? '— 한 장 더!' : '— 그대로'}`,

  sidKetchum: (m, c) => `${ga(c.who(m.who))} 카드 2장을 버리고 목숨을 1 회복했다.`,
  garyLooter: (m, c) => `${ga(c.who(m.who))} ${c.who(m.from)}의 버린 카드를 챙겼다.`,
  vultureSam: (m, c) => `${ga(c.who(m.who))} ${c.who(m.from)}의 카드 ${m.amount}장을 챙겼다.`,
  flintWestwood: (m, c) =>
    `${ga(c.who(m.who))} ${c.who(m.target)}에게 카드 1장을 주고 ${m.amount}장을 가져왔다.`,
  discardSameName: (m, c) =>
    `${ga(c.who(m.who))} ${eul(c.n.cardName(m.card))} 내려놓아 ${m.owners.map((id) => c.who(id)).join('·')} 앞의 같은 카드가 버려졌다.`,
  pedroRamirez: (m, c) => `${ga(c.who(m.who))} 버린 더미에서 ${eul(c.n.cardName(m.card))} 가져왔다.`,
  johnPain: (m, c) => `${ga(c.who(m.who))} 펼친 ${eul(c.n.cardName(m.card))} 손에 넣었다.`,
  coloradoBill: () => '♠ — 이 총알은 피할 수 없다.',
  donBell: (m, c) => `${neun(c.who(m.who))} 붉은 무늬가 나와 차례를 한 번 더 얻었다.`,
  vendetta: (m, c) => `복수: ${neun(c.who(m.who))} ♥가 나와 차례를 한 번 더 얻었다.`,
  terenKill: (m, c) => `${neun(c.who(m.who))} 쓰러지지 않았다. 목숨 1로 버틴다.`,
  bandidosHit: (m, c) => `${ga(c.who(m.who))} 카드를 버리지 않고 목숨을 내놓았다.`,
  bandidosDiscard: (m, c) => `${ga(c.who(m.who))} 반디도스에 카드를 버렸다.`,
  evelyn: (m, c) => `${ga(c.who(m.who))} 카드 1장을 포기하고 ${c.who(m.target)}에게 뱅!을 쏜다.`,
  lemonadeJim: (m, c) => `${ga(c.who(m.who))} 카드 1장을 버리고 같이 한잔했다.`,
  dutchWill: (m, c) => `${ga(c.who(m.who))} 카드 1장을 버리고 금덩이 1개를 받았다.`,
  youlGrinner: (m, c) => `${ga(c.who(m.who))} ${c.who(m.to)}에게 카드 1장을 건넸다.`,
  borrowCharacters: (m, c) =>
    `${ga(c.who(m.who))} ${m.characters.map((id) => c.n.charName(id)).join(', ')}의 능력을 빌렸다.`,
  borrowKeep: (m, c) => `${neun(c.who(m.who))} 빌린 능력을 그대로 둔다.`,
  evade: (m, c) =>
    `${ga(c.who(m.who))} ${eul(c.n.cardName(m.card))} 내서 ${c.n.cardName(m.from)}의 효과를 피했다.`,
  saved: (m, c) => `${ga(c.who(m.who))} 구조!로 ${c.who(m.target)}의 목숨 1을 지켰다.`,
  ricochetSave: (m, c) => `${ga(c.who(m.who))} 빗나감!으로 카드를 지켰다.`,
  ricochetHit: (m, c) => `리코체: ${c.who(m.target)} 앞의 ${ga(c.n.cardName(m.card))} 버려졌다.`,

  ghostRise: (m, c) => `${ga(c.who(m.who))} 유령으로 ${m.fromCard ? '돌아왔다' : '되살아났다'}.`,
  ghostLeave: (m, c) => `${c.who(m.who)}의 유령이 사라졌다.`,
  ghostDiscard: (m, c) => `${neun(c.who(m.who))} 유령이라 차례 끝에 손패 ${m.amount}장을 모두 버렸다.`,

  newIdentityKeep: (m, c) => `${neun(c.who(m.who))} 신분을 그대로 유지했다.`,
  newIdentitySwap: (m, c) =>
    `${ga(c.n.charName(m.from))} ${ro(c.n.charName(m.to))} 신분을 바꿨다 (목숨 2).`,
  declareSuit: (m, c) => `${ga(c.who(m.who))} 무늬 ${SUIT_GLYPH[m.suit]}를 선언했다.`,
  daltons: (m, c) => `달톤 형제: ${ga(c.who(m.who))} ${eul(c.n.cardName(m.card))} 버렸다.`,
  missSusanna: (m, c) => `미스 수잔나: ${neun(c.who(m.who))} 카드를 ${m.played}장만 내서 목숨 1을 잃는다.`,
  deadMan: (m, c) => `${ga(c.who(m.who))} 망자로 돌아왔다 (목숨 ${m.hp}).`,
  fistfulBang: (m, c) => `한줌의 카드: ${ga(c.who(m.who))} 뱅!을 맞는다 (남은 ${m.left}발).`,
  russianRoulette: (m, c) => `러시안 룰렛: ${ga(c.who(m.who))} 빗나감!을 버렸다.`,
  rouletteLoss: (m, c) => `러시안 룰렛: ${ga(c.who(m.who))} 빗나감!을 버리지 못해 목숨 2를 잃는다.`,
  bloodBrothers: (m, c) => `의형제: ${ga(c.who(m.who))} ${c.who(m.to)}에게 목숨 1을 넘겼다.`,
  hardLiquor: (m, c) => `독한 술: ${neun(c.who(m.who))} 카드를 가져오지 않고 목숨을 회복한다.`,
  peyote: (m, c) => {
    const said = m.color === 'red' ? '빨강' : '검정';
    return m.right
      ? `피요테: ${ga(c.who(m.who))} ${eul(said)} 맞혀 카드를 가져왔다.`
      : `피요테: ${ga(c.who(m.who))} ${eul(said)} 불렀지만 틀렸다.`;
  },
  peyoteStop: (m, c) => `피요테: ${neun(c.who(m.who))} 그만 맞히기로 했다.`,
  ranch: (m, c) => `목장: ${ga(c.who(m.who))} ${m.amount}장을 버리고 새로 가져온다.`,
  lawOfTheWest: (m, c) => `서부의 법: ${ga(c.who(m.who))} 두 번째로 가져온 카드를 보여 줬다.`,
  ladyRose: (m, c) =>
    `레이디 로즈 오브 텍사스: ${ga(c.who(m.who))} ${wa(c.who(m.other))} 자리를 바꿨다. ${neun(c.who(m.other))} 다음 차례를 건너뛴다.`,
  ladyRoseSkip: (m, c) => `${neun(c.who(m.who))} 자리를 빼앗겨 이번 차례를 건너뛴다.`,
  dorothyRage: (m, c) =>
    `도로시 레이지: ${ga(c.who(m.who))} ${c.who(m.forced)}에게 ${eul(c.n.cardName(m.card))} 내라고 시켰다${m.to ? ` → ${c.who(m.to)}` : ''}.`,
  dorothyRageMiss: (m, c) =>
    `${neun(c.who(m.who))} ${eul(c.n.cardName(m.card))} 낼 수 없어 손패를 모두에게 보여 줬다: ${m.hand.length ? m.hand.map((k) => c.n.cardName(k)).join(', ') : '없음'}.`,
  darlingValentine: (m, c) => `달링 발렌타인: ${ga(c.who(m.who))} 손패 ${m.amount}장을 버리고 새로 가져온다.`,
  helenaKeep: () => '헬레나 존테로: 검은 무늬라 역할은 그대로다.',
  rolesShuffled: () => '헬레나 존테로: 보안관을 뺀 살아 있는 사람들의 역할을 섞어 다시 나눴다.',
  boneOrchard: (m, c) => `묘지: ${ga(c.who(m.who))} 목숨 1로 돌아왔다. 역할은 제거된 사람들의 것 중에서 다시 받았다.`,

  pokerBet: (m, c) => `${ga(c.who(m.who))} 포커에 카드 1장을 엎어 냈다.`,
  pokerReveal: (m) => (m.ace ? '포커: 에이스가 나와 모두 버려졌다.' : '포커: 에이스가 없다.'),
  pokerTake: (m, c) => `${ga(c.who(m.who))} 판돈에서 ${eul(c.n.cardName(m.card))} 가져갔다.`,
  tornadoDiscard: (m, c) => `${ga(c.who(m.who))} 토네이도에 카드를 버렸다.`,
  shotgun: (m, c) => `샷건: ${ga(c.who(m.who))} 카드 1장을 버렸다.`,

  nugget: (m, c) => `${ga(c.who(m.who))} 금덩이 ${m.amount}개를 받았다.`,
  buyGold: (m, c) => `${ga(c.who(m.who))} 금덩이 ${m.price}개로 ${eul(c.n.goldName(m.gold))} 샀다.`,
  removeGold: (m, c) =>
    `${ga(c.who(m.who))} 금덩이 ${m.price}개를 내고 ${c.who(m.target)}의 ${eul(c.n.goldName(m.gold))} 버리게 했다.`,
  beerForGold: (m, c) => `${ga(c.who(m.who))} 맥주를 금덩이 1개로 바꿨다.`,
  goldAbility: (m, c) =>
    `${ga(c.who(m.who))} 금덩이 ${m.cost}개를 내고 ${c.n.abilityLabel(m.ability)}` + (m.to ? ` → ${c.who(m.to)}.` : '.'),
  goldDup: (m, c) => `${ga(c.who(m.who))} 이미 ${eul(c.n.goldName(m.gold))} 가지고 있어 버렸다.`,
  goldAs: (m, c) =>
    `${ga(c.who(m.who))} ${eul(c.n.goldName(m.gold))} ${ro(c.n.cardName(m.as))} 썼다` + (m.to ? ` → ${c.who(m.to)}.` : '.'),
  goldRush: (m, c) => `${ga(c.who(m.who))} 목숨을 모두 회복하고 차례를 마친 뒤 한 번 더 진행한다.`,
  wantedPlaced: (m, c) => `${c.who(m.to)}에게 수배가 붙었다.`,
  wanted: (m, c) => `수배범을 잡았다. ${ga(c.who(m.who))} 카드 2장과 금덩이 1개를 받는다.`,
  rhum: (m) => `럼: 카드 ${m.count}장을 펼쳐 무늬 ${m.suits}가지가 나왔다.`,
  joshDraw: (m, c) => `장비 덱에서 ${eul(c.n.goldName(m.gold))} 가져왔다.`,
};
