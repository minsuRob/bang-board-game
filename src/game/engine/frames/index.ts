/**
 * 프레임 해결기 디스패처.
 *
 * 스택 맨 위 프레임 하나를 해당 해결기에 넘긴다. 해결기는 프레임을 직접 pop 하거나,
 * 진행 상태를 갱신해 replaceTop 하거나, 입력이 필요하면 awaiting 을 세우고 멈춘다.
 */

import type { Choice, Frame, GameState } from '../types';
import { resolveDutchWill, resolveGainNuggets, resolveGoldUse, respondDutchWill, respondGoldUse } from '../gold-actions';
import {
  resolveBang,
  resolveDuel,
  resolveGatling,
  resolveIndians,
  respondBang,
  respondDuel,
  respondIndians,
} from './combat';
import {
  resolveBlackJackReveal,
  resolveDrawCards,
  resolveDrawFromPlayer,
  resolveGeneralStore,
  resolveJesseJones,
  resolveKitCarlson,
  resolvePedroRamirez,
  resolveSteal,
  resolveTakeAllCards,
  respondGeneralStore,
  respondJesseJones,
  respondKitCarlson,
  respondPedroRamirez,
  respondSteal,
  resolveDiscardSameName,
} from './cards';
import {
  resolveBountyOrPenalty,
  resolveCheckDeath,
  resolveDamage,
  resolveEliminate,
  resolveEliminateCleanup,
  resolveHeal,
  resolveSaloon,
  resolveWantedReward,
  respondCheckDeath,
} from './damage';
import { resolveJudgement, respondJudgement } from './judgement';
import {
  resolveAdvanceTurn,
  resolveDaltonsDiscard,
  resolveDeclareSuit,
  resolveDiscardPhase,
  resolveDrawPhase,
  resolveEventTurnStart,
  resolveNewIdentity,
  resolvePlayPhase,
  resolveRevealEvent,
  resolveTurnEnd,
  resolveTurnStart,
  respondDaltonsDiscard,
  respondDeclareSuit,
  respondNewIdentity,
} from './turn';
import { resolveCheckWin } from './win';
import {
  resolveBandidos,
  resolveEvelyn,
  resolveLemonadeJim,
  respondEvelyn,
  respondLemonadeJim,
  resolveSavedOffer,
  resolveSavedReward,
  respondSavedOffer,
  respondSavedReward,
  resolveEvade,
  respondEvade,
  resolveShotgunDiscard,
  respondShotgunDiscard,
  resolvePoker,
  resolveTornado,
  respondBandidos,
  respondPoker,
  respondTornado,
} from './valley';

export function resolveFrame(state: GameState, frame: Frame): GameState {
  switch (frame.k) {
    case 'turnStart':
      return resolveTurnStart(state, frame);
    case 'revealEvent':
      return resolveRevealEvent(state);
    case 'eventTurnStart':
      return resolveEventTurnStart(state, frame);
    case 'drawPhase':
      return resolveDrawPhase(state, frame);
    case 'playPhase':
      return resolvePlayPhase(state, frame);
    case 'discardPhase':
      return resolveDiscardPhase(state, frame);
    case 'turnEnd':
      return resolveTurnEnd(state, frame);
    case 'advanceTurn':
      return resolveAdvanceTurn(state, frame);
    case 'judgement':
      return resolveJudgement(state, frame);
    case 'bang':
      return resolveBang(state, frame);
    case 'gatling':
      return resolveGatling(state, frame);
    case 'indians':
      return resolveIndians(state, frame);
    case 'duel':
      return resolveDuel(state, frame);
    case 'damage':
      return resolveDamage(state, frame);
    case 'checkDeath':
      return resolveCheckDeath(state, frame);
    case 'eliminate':
      return resolveEliminate(state, frame);
    case 'eliminateCleanup':
      return resolveEliminateCleanup(state, frame);
    case 'bountyOrPenalty':
      return resolveBountyOrPenalty(state, frame);
    case 'wantedReward':
      return resolveWantedReward(state, frame);
    case 'dutchWill':
      return resolveDutchWill(state, frame);
    case 'goldUse':
      return resolveGoldUse(state, frame);
    case 'gainNuggets':
      return resolveGainNuggets(state, frame);
    case 'drawCards':
      return resolveDrawCards(state, frame);
    case 'drawFromPlayer':
      return resolveDrawFromPlayer(state, frame);
    case 'takeAllCards':
      return resolveTakeAllCards(state, frame);
    case 'heal':
      return resolveHeal(state, frame);
    case 'saloon':
      return resolveSaloon(state, frame);
    case 'generalStore':
      return resolveGeneralStore(state, frame);
    case 'steal':
      return resolveSteal(state, frame);
    case 'discardSameName':
      return resolveDiscardSameName(state, frame);
    case 'kitCarlson':
      return resolveKitCarlson(state, frame);
    case 'daltonsDiscard':
      return resolveDaltonsDiscard(state, frame);
    case 'newIdentity':
      return resolveNewIdentity(state, frame);
    case 'declareSuit':
      return resolveDeclareSuit(state, frame);
    case 'jesseJonesChoice':
      return resolveJesseJones(state, frame);
    case 'pedroRamirezChoice':
      return resolvePedroRamirez(state, frame);
    case 'blackJackReveal':
      return resolveBlackJackReveal(state, frame);
    case 'checkWin':
      return resolveCheckWin(state);
    case 'bandidos':
      return resolveBandidos(state, frame);
    case 'poker':
      return resolvePoker(state, frame);
    case 'tornado':
      return resolveTornado(state, frame);
    case 'shotgunDiscard':
      return resolveShotgunDiscard(state, frame);
    case 'evade':
      return resolveEvade(state, frame);
    case 'evelyn':
      return resolveEvelyn(state, frame);
    case 'lemonadeJim':
      return resolveLemonadeJim(state, frame);
    case 'savedOffer':
      return resolveSavedOffer(state, frame);
    case 'savedReward':
      return resolveSavedReward(state, frame);
    default: {
      const never: never = frame;
      throw new Error(`해결기가 없는 프레임: ${JSON.stringify(never)}`);
    }
  }
}

/** 입력 대기를 받은 프레임에 응답을 전달한다. */
export function respondToFrame(state: GameState, frame: Frame, choice: Choice): GameState {
  switch (frame.k) {
    case 'judgement':
      return respondJudgement(state, frame, choice);
    case 'bang':
      return respondBang(state, frame, choice);
    case 'indians':
      return respondIndians(state, frame, choice);
    case 'duel':
      return respondDuel(state, frame, choice);
    case 'checkDeath':
      return respondCheckDeath(state, frame, choice);
    case 'generalStore':
      return respondGeneralStore(state, frame, choice);
    case 'steal':
      return respondSteal(state, frame, choice);
    case 'kitCarlson':
      return respondKitCarlson(state, frame, choice);
    case 'daltonsDiscard':
      return respondDaltonsDiscard(state, frame, choice);
    case 'newIdentity':
      return respondNewIdentity(state, frame, choice);
    case 'declareSuit':
      return respondDeclareSuit(state, frame, choice);
    case 'jesseJonesChoice':
      return respondJesseJones(state, frame, choice);
    case 'pedroRamirezChoice':
      return respondPedroRamirez(state, frame, choice);
    case 'bandidos':
      return respondBandidos(state, frame, choice);
    case 'poker':
      return respondPoker(state, frame, choice);
    case 'tornado':
      return respondTornado(state, frame, choice);
    case 'shotgunDiscard':
      return respondShotgunDiscard(state, frame, choice);
    case 'evade':
      return respondEvade(state, frame, choice);
    case 'evelyn':
      return respondEvelyn(state, frame, choice);
    case 'lemonadeJim':
      return respondLemonadeJim(state, frame, choice);
    case 'savedOffer':
      return respondSavedOffer(state, frame, choice);
    case 'savedReward':
      return respondSavedReward(state, frame, choice);
    case 'dutchWill':
      return respondDutchWill(state, frame, choice);
    case 'goldUse':
      return respondGoldUse(state, frame, choice);
    default:
      throw new Error(`${frame.k} 프레임은 응답을 받지 않는다`);
  }
}
