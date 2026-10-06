/**
 * 테이블 문구와 카드 탭 흐름.
 *
 * 2D 와 3D 테이블이 같이 쓴다. 규칙 판단은 전부 TableApi(=legalActions) 에 맡긴다.
 */

import type { CardId } from '../data/types';
import { kindOf, type GameState, type PlayerId } from '../engine';
import type { Messages } from '../../i18n/types-messages';
import { namesFor, type Names } from '../../i18n/names';
import { CAN_HOVER, cardPeek, setPeek } from './card-peek';
import type { TableApi } from './use-table';

/** 손패 탭. 폰은 첫 탭이 보기, 같은 카드를 다시 탭하면 낸다 (웹은 hover 가 보기) */
export function handleHandTap(api: TableApi, card: CardId) {
  if (!CAN_HOVER && cardPeek.getState().card !== card) {
    setPeek(card);
    return;
  }
  setPeek(null);
  handleCardPress(api, card);
}

export function handleCardPress(api: TableApi, card: CardId) {
  // 버리기 단계에서는 누르는 즉시 버린다.
  if (api.discardable.has(card)) {
    api.discard(card);
    return;
  }
  if (!api.playable.has(card)) return;
  if (api.selected === card) {
    api.select(null);
    return;
  }
  // 결전: 원래대로도, 뱅!으로도 낼 수 있으면 종류부터 고른다
  if (api.kindsFor(card).length > 1) {
    api.askKind(card);
    return;
  }

  const targets = api.targetsFor(card);
  if (targets.length === 0) {
    api.playCard(card);
    return;
  }
  // 지목이 필요한 카드는 한 번 더 눌러 대상을 고르게 한다.
  api.select(card);
}

export function statusMessage(view: GameState, viewer: PlayerId, t: Messages, names: Names = namesFor('ko')): string {
  const s = t.table.status;
  if (view.result) return s.won(names.resultReason(view.result, view.players), view.result.winners.map((r) => names.roleName(r)));
  if (view.draft) {
    const picks = Object.values(view.draft.picked);
    return s.draft(picks.filter((c) => c !== null).length, picks.length);
  }
  const active = view.players.find((p) => p.id === view.turn.active);
  const phase = view.turn.phase === 'discard' ? s.phase.discard : view.turn.phase === 'draw' ? s.phase.draw : s.phase.play;
  return s.turn(active?.id === viewer, active?.name ?? '', phase, view.turn.round);
}

export function bottomStatus(view: GameState, viewer: PlayerId, api: TableApi, t: Messages, names: Names = namesFor('ko')): string {
  const s = t.table.status;
  if (view.result) return s.over;
  if (api.waitingOnMe) return '';
  if (api.draft) return api.draft.picked ? s.draftWaiting : s.draftPick;
  if (view.awaiting) {
    const who = view.players.find((p) => p.id === view.awaiting!.pid)?.name;
    return s.waitingReaction(who);
  }
  if (view.turn.active !== viewer) {
    const name = view.players.find((p) => p.id === view.turn.active)?.name ?? '';
    return s.thinking(name);
  }
  if (view.turn.phase === 'discard') {
    const me = view.players.find((p) => p.id === viewer)!;
    return s.discardTo(me.hp);
  }
  if (api.selected) {
    const name = names.cardName(api.selectedAs ?? kindOf(api.selected));
    const lead = api.selectedAs ? s.leadAs(name) : s.leadPlain;
    // 대상 없이도 낼 수 있으면 내 자리를 누르면 된다 (결전의 맥주 등)
    if (api.canPlayUntargeted(api.selected) && api.targetsFor(api.selected).includes(viewer)) {
      return s.leadUntargeted(lead, name);
    }
    // 강탈·캣 벌로우는 내 앞의 카드도 치울 수 있다
    if (api.targetsFor(api.selected).includes(viewer)) return s.leadOwnEquipment(lead);
    return s.leadEsc(lead);
  }
  if (api.armed) {
    const ab = api.playAsAbilities.find((x) => x.key === api.armed);
    if (ab?.status) return ab.status;
    return s.armed(ab?.as ? names.cardName(ab.as) : s.abilityWord);
  }
  // 서부의 법: 보여 준 카드를 내기 전에는 차례를 마칠 수 없다
  const must = view.turn.mustPlay;
  if (must !== undefined && !api.canEndTurn) return s.mustPlay(names.cardName(kindOf(must)));
  return s.pickCard;
}
