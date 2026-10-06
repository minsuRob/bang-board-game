import { describe, expect, it } from 'vitest';

import { decide } from '../../game/ai';
import type { AiTier } from '../../game/ai/types';
import type { Expansion } from '../../game/data/types';
import { actorsOf, reduce, type Action, type GameEvent, type GameState, type LogMsg } from '../../game/engine';
import { logCtx, renderLog } from '../log';
import type { Lang } from '../types';

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/;
const LANGS: Lang[] = ['ko', 'en', 'it'];

/** 렌더 결과가 깨졌는지: 비었거나 undefined·NaN 이 찍혔거나, 조사 자리표시가 남았거나, 영·이탈리아어에 한글이 섞였다 */
function problems(text: string, lang: Lang): string[] {
  const out: string[] = [];
  if (text.trim() === '') out.push('빈 문장');
  if (/undefined|NaN|\[object|null/.test(text)) out.push('undefined/NaN');
  if (/이\(가\)|을\(를\)|은\(는\)|\(으\)로|와\(과\)/.test(text)) out.push('조사 자리표시');
  if (lang !== 'ko' && HANGUL.test(text)) out.push('한글');
  return out;
}

function playGame(seed: number, count: number, expansions: Expansion[], tier: AiTier): GameState {
  const seats = Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  let state = reduce(null, { type: 'startGame', seed, config: { playerCount: count, expansions }, seats });
  for (let steps = 0; !state.result && steps < 3000; steps++) {
    const actor = actorsOf(state)[0];
    const action = decide(state, actor, tier, seed * 7919 + steps);
    if (!action) break;
    state = reduce(state, action as Action);
  }
  return state;
}

describe('로그 렌더러', () => {
  it('시드 판의 모든 로그를 3개 언어로 렌더해도 깨지지 않는다', { timeout: 180_000 }, () => {
    const setups: [Expansion[], number][] = [
      [[], 4],
      [[], 7],
      [['highnoon'], 5],
      [['fistful'], 6],
      [['wildwestshow'], 5],
      [['valley'], 6],
      [['goldrush'], 5],
    ];
    const seen = new Set<string>();
    const bad: string[] = [];
    let games = 0;
    for (const [expansions, count] of setups) {
      for (const seed of [11, 12, 13]) {
        const state = playGame(seed, count, expansions, 'easy');
        games++;
        for (const lang of LANGS) {
          const ctx = logCtx(lang, state.players);
          for (const e of state.log) {
            seen.add(e.msg.k);
            for (const p of problems(renderLog(e, lang, ctx), lang)) bad.push(`${lang} ${e.msg.k}: ${p}`);
          }
        }
      }
    }
    expect(games).toBeGreaterThan(0);
    expect(seen.size).toBeGreaterThan(30);
    expect([...new Set(bad)]).toEqual([]);
  });

  /** 모든 종류의 견본. Record 라서 LogMsg 에 종류를 더하면 여기도 채워야 컴파일된다 */
  const SAMPLES: { [K in LogMsg['k']]: Extract<LogMsg, { k: K }> } = {
    legacy: { k: 'legacy' },
    gameStart: { k: 'gameStart', count: 5, sheriff: 'p0' },
    reshuffle: { k: 'reshuffle', amount: 12 },
    goldReshuffle: { k: 'goldReshuffle', amount: 1 },
    rejected: { k: 'rejected', action: 'playCard' },
    timeout: { k: 'timeout' },
    turnStart: { k: 'turnStart', who: 'p0' },
    extraTurn: { k: 'extraTurn', who: 'p0' },
    event: { k: 'event', event: 'blessing', by: 'p1' },
    gameEnd: { k: 'gameEnd', reason: 'sheriffDown', roles: ['outlaw'], ids: ['p2'], byPlayer: false },
    draftPick: { k: 'draftPick', who: 'p0' },
    draftDone: { k: 'draftDone', picks: [{ who: 'p0', character: 'bartCassidy' }] },
    played: { k: 'played', who: 'p0', card: 'bang', as: 'missed', to: 'p1', ricochet: true, again: true },
    playedWith: { k: 'playedWith', who: 'p0', card: 'bang', sniper: true },
    discard: { k: 'discard', who: 'p0', onDeck: true },
    draw: { k: 'draw', who: 'p0', fromDiscard: 1, fromDeck: 1 },
    steal: { k: 'steal', who: 'p0', from: 'p1', amount: 1 },
    panic: { k: 'panic', who: 'p0', target: 'p1', fromHand: true, card: 'bang' },
    catBalou: { k: 'catBalou', who: 'p0', target: 'p1', fromHand: true, card: 'bang' },
    generalStore: { k: 'generalStore', amount: 5 },
    generalStorePick: { k: 'generalStorePick', who: 'p0', card: 'beer' },
    missed: { k: 'missed', who: 'p0' },
    playMissed: { k: 'playMissed', who: 'p0', card: 'backfire', backfireTo: 'p1' },
    ghostImmune: { k: 'ghostImmune', who: 'p0', from: 'bullet' },
    indiansBang: { k: 'indiansBang', who: 'p0' },
    duelBang: { k: 'duelBang', who: 'p0' },
    duelLoss: { k: 'duelLoss', who: 'p0' },
    damage: { k: 'damage', who: 'p0', amount: 2, left: 1 },
    heal: { k: 'heal', who: 'p0', hp: 3 },
    beerSurvive: { k: 'beerSurvive', who: 'p0' },
    eliminate: { k: 'eliminate', who: 'p0', role: 'renegade' },
    bounty: { k: 'bounty', who: 'p0', cards: 3 },
    penalty: { k: 'penalty', who: 'p0' },
    judgement: { k: 'judgement', who: 'p0', purpose: 'barrel', rank: 'A', suit: 'hearts' },
    dodge: { k: 'dodge', purpose: 'jourdonnais' },
    rattlesnake: { k: 'rattlesnake', who: 'p0' },
    dynamite: { k: 'dynamite', who: 'p0' },
    dynamitePass: { k: 'dynamitePass', to: 'p1' },
    jailEscape: { k: 'jailEscape', who: 'p0' },
    jailSkip: { k: 'jailSkip', who: 'p0' },
    blackJack: { k: 'blackJack', who: 'p0', suit: 'spades', bonus: false },
    sidKetchum: { k: 'sidKetchum', who: 'p0' },
    garyLooter: { k: 'garyLooter', who: 'p0', from: 'p1' },
    vultureSam: { k: 'vultureSam', who: 'p0', from: 'p1', amount: 4 },
    flintWestwood: { k: 'flintWestwood', who: 'p0', target: 'p1', amount: 2 },
    discardSameName: { k: 'discardSameName', who: 'p0', card: 'barrel', owners: ['p1', 'p2'] },
    pedroRamirez: { k: 'pedroRamirez', who: 'p0', card: 'bang' },
    johnPain: { k: 'johnPain', who: 'p0', card: 'bang' },
    coloradoBill: { k: 'coloradoBill', who: 'p0' },
    donBell: { k: 'donBell', who: 'p0' },
    vendetta: { k: 'vendetta', who: 'p0' },
    terenKill: { k: 'terenKill', who: 'p0' },
    bandidosHit: { k: 'bandidosHit', who: 'p0' },
    bandidosDiscard: { k: 'bandidosDiscard', who: 'p0' },
    evelyn: { k: 'evelyn', who: 'p0', target: 'p1' },
    lemonadeJim: { k: 'lemonadeJim', who: 'p0' },
    dutchWill: { k: 'dutchWill', who: 'p0' },
    youlGrinner: { k: 'youlGrinner', who: 'p0', to: 'p1' },
    borrowCharacters: { k: 'borrowCharacters', who: 'p0', characters: ['bartCassidy', 'blackJack'] },
    borrowKeep: { k: 'borrowKeep', who: 'p0' },
    evade: { k: 'evade', who: 'p0', card: 'escape', from: 'panic' },
    saved: { k: 'saved', who: 'p0', target: 'p1' },
    ricochetSave: { k: 'ricochetSave', who: 'p0' },
    ricochetHit: { k: 'ricochetHit', target: 'p1', card: 'barrel' },
    ghostRise: { k: 'ghostRise', who: 'p0', fromCard: false },
    ghostLeave: { k: 'ghostLeave', who: 'p0' },
    ghostDiscard: { k: 'ghostDiscard', who: 'p0', amount: 3 },
    newIdentityKeep: { k: 'newIdentityKeep', who: 'p0' },
    newIdentitySwap: { k: 'newIdentitySwap', from: 'bartCassidy', to: 'blackJack' },
    declareSuit: { k: 'declareSuit', who: 'p0', suit: 'clubs' },
    daltons: { k: 'daltons', who: 'p0', card: 'mustang' },
    missSusanna: { k: 'missSusanna', who: 'p0', played: 1 },
    deadMan: { k: 'deadMan', who: 'p0', hp: 2 },
    fistfulBang: { k: 'fistfulBang', who: 'p0', left: 2 },
    russianRoulette: { k: 'russianRoulette', who: 'p0' },
    rouletteLoss: { k: 'rouletteLoss', who: 'p0' },
    bloodBrothers: { k: 'bloodBrothers', who: 'p0', to: 'p1' },
    hardLiquor: { k: 'hardLiquor', who: 'p0' },
    peyote: { k: 'peyote', who: 'p0', color: 'black', right: false },
    peyoteStop: { k: 'peyoteStop', who: 'p0' },
    ranch: { k: 'ranch', who: 'p0', amount: 2 },
    lawOfTheWest: { k: 'lawOfTheWest', who: 'p0' },
    ladyRose: { k: 'ladyRose', who: 'p0', other: 'p1' },
    ladyRoseSkip: { k: 'ladyRoseSkip', who: 'p0' },
    dorothyRage: { k: 'dorothyRage', who: 'p0', forced: 'p1', card: 'bang', to: 'p2' },
    dorothyRageMiss: { k: 'dorothyRageMiss', who: 'p0', card: 'bang', hand: ['beer', 'missed'] },
    darlingValentine: { k: 'darlingValentine', who: 'p0', amount: 3 },
    helenaKeep: { k: 'helenaKeep' },
    rolesShuffled: { k: 'rolesShuffled' },
    boneOrchard: { k: 'boneOrchard', who: 'p0' },
    pokerBet: { k: 'pokerBet', who: 'p0' },
    pokerReveal: { k: 'pokerReveal', ace: true },
    pokerTake: { k: 'pokerTake', who: 'p0', card: 'bang' },
    tornadoDiscard: { k: 'tornadoDiscard', who: 'p0' },
    shotgun: { k: 'shotgun', who: 'p0' },
    nugget: { k: 'nugget', who: 'p0', amount: 2 },
    buyGold: { k: 'buyGold', who: 'p0', gold: 'shot', price: 2 },
    removeGold: { k: 'removeGold', who: 'p0', target: 'p1', gold: 'gunBelt', price: 4 },
    beerForGold: { k: 'beerForGold', who: 'p0' },
    goldAbility: { k: 'goldAbility', who: 'p0', ability: 'jackyMurieta', cost: 1, to: 'p1' },
    goldDup: { k: 'goldDup', who: 'p0', gold: 'gunBelt' },
    goldAs: { k: 'goldAs', who: 'p0', gold: 'bottle', as: 'beer', to: 'p1' },
    goldRush: { k: 'goldRush', who: 'p0' },
    wantedPlaced: { k: 'wantedPlaced', to: 'p1' },
    wanted: { k: 'wanted', who: 'p0' },
    rhum: { k: 'rhum', count: 4, suits: 1 },
    joshDraw: { k: 'joshDraw', gold: 'rucksack' },
  };

  it('모든 종류의 견본이 3개 언어로 문장이 된다', () => {
    const players = ['p0', 'p1', 'p2'].map((id, i) => ({
      id,
      name: `P${i}`,
      character: (['bartCassidy', 'blackJack', 'calamityJanet'] as const)[i],
    }));
    const bad: string[] = [];
    for (const lang of LANGS) {
      const ctx = logCtx(lang, players);
      for (const msg of Object.values(SAMPLES)) {
        if (msg.k === 'legacy') continue;
        const e: GameEvent = { t: msg.k, msg, seq: 0 };
        for (const p of problems(renderLog(e, lang, ctx), lang)) bad.push(`${lang} ${msg.k}: ${p}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('한국어: 조사가 받침에 맞고 원래 문장이 그대로 나온다', () => {
    const players = [
      { id: 'p0', name: 'A', character: 'blackJack' as const },
      { id: 'p1', name: 'B', character: 'bartCassidy' as const },
    ];
    const ko = (msg: LogMsg) => renderLog({ t: msg.k, msg, seq: 0 }, 'ko', players);
    expect(ko({ k: 'catBalou', who: 'p0', target: 'p1', fromHand: true, card: 'bang' })).toBe(
      '블랙 잭이 바트 캐시디의 "뱅!"을 버리게 했다.',
    );
    expect(ko({ k: 'catBalou', who: 'p0', target: 'p1', fromHand: false, card: 'barrel' })).toBe(
      '블랙 잭이 바트 캐시디의 술통을 버리게 했다.',
    );
    expect(ko({ k: 'panic', who: 'p0', target: 'p1', fromHand: true })).toBe('블랙 잭이 바트 캐시디의 카드를 강탈했다.');
    expect(ko({ k: 'played', who: 'p0', card: 'bang', to: 'p1' })).toBe('블랙 잭이 뱅!을 냈다 → 바트 캐시디.');
    expect(ko({ k: 'newIdentitySwap', from: 'blackJack', to: 'paulRegret' })).toBe(
      '블랙 잭이 폴 리그렛으로 신분을 바꿨다 (목숨 2).',
    );
    expect(ko({ k: 'dorothyRageMiss', who: 'p0', card: 'bang', hand: ['beer', 'missed'] })).toBe(
      '블랙 잭은 뱅!을 낼 수 없어 손패를 모두에게 보여 줬다: 맥주, 빗나감!.',
    );
  });

  it('옛 저장 파일의 문장(legacyText)은 어느 언어에서도 그대로 나온다', () => {
    const e: GameEvent = { t: 'turnStart', msg: { k: 'legacy' }, legacyText: '블랙 잭의 차례.', seq: 1 };
    for (const lang of LANGS) expect(renderLog(e, lang, [])).toBe('블랙 잭의 차례.');
  });
});
