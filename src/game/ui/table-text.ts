/**
 * 테이블 문구와 카드 탭 흐름.
 *
 * 2D 와 3D 테이블이 같이 쓴다. 규칙 판단은 전부 TableApi(=legalActions) 에 맡긴다.
 */

import { CARD_DEFS } from '../data/cards.base';
import type { CardId } from '../data/types';
import { ROLE_LABEL } from '../data/roles';
import { kindOf, type GameState, type PlayerId } from '../engine';
import { eul, ga, ro } from '../engine/josa';
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

  const targets = api.targetsFor(card);
  if (targets.length === 0) {
    api.playCard(card);
    return;
  }
  // 지목이 필요한 카드는 한 번 더 눌러 대상을 고르게 한다.
  api.select(api.selected === card ? null : card);
}

export function statusMessage(view: GameState, viewer: PlayerId): string {
  if (view.result) {
    return `${view.result.reason} — ${view.result.winners.map((r) => ROLE_LABEL[r]).join('·')} 승리`;
  }
  if (view.draft) {
    const picks = Object.values(view.draft.picked);
    return `캐릭터 선택 · ${picks.filter((c) => c !== null).length}/${picks.length}명 완료`;
  }
  const active = view.players.find((p) => p.id === view.turn.active);
  const who = active?.id === viewer ? '내' : `${active?.name}의`;
  const phase = view.turn.phase === 'discard' ? '버리기' : view.turn.phase === 'draw' ? '카드 가져오기' : '카드 사용';
  return `${who} 차례 · ${phase} 단계 · ${view.turn.round}라운드`;
}

export function bottomStatus(view: GameState, viewer: PlayerId, api: TableApi): string {
  if (view.result) return '게임이 끝났다.';
  if (api.waitingOnMe) return '';
  if (api.draft) return api.draft.picked ? '다른 사람이 고르기를 기다리는 중' : '캐릭터를 고른다';
  if (view.awaiting) {
    const who = view.players.find((p) => p.id === view.awaiting!.pid)?.name;
    return `${who}의 반응을 기다리는 중`;
  }
  if (view.turn.active !== viewer) {
    const name = view.players.find((p) => p.id === view.turn.active)?.name ?? '';
    return `${ga(name)} 생각하는 중`;
  }
  if (view.turn.phase === 'discard') {
    const me = view.players.find((p) => p.id === viewer)!;
    return `손패를 목숨 수(${me.hp}장)까지 줄여야 한다`;
  }
  if (api.selected) {
    // 대상 없이도 낼 수 있으면 내 자리를 누르면 된다 (결전의 맥주 등)
    if (api.targetsFor(api.selected).includes(viewer)) {
      return `지목할 상대를 고른다 · 내 자리를 누르면 ${eul(CARD_DEFS[kindOf(api.selected)].nameKo)} 그대로 낸다 (Esc 취소)`;
    }
    return '지목할 상대를 고른다 (Esc 취소)';
  }
  if (api.armed) {
    const ab = api.playAsAbilities.find((x) => x.key === api.armed);
    if (ab?.status) return ab.status;
    const name = ab?.as ? CARD_DEFS[ab.as].nameKo : '능력';
    return `${ro(name)} 낼 카드를 고른다 (Esc 취소)`;
  }
  // 서부의 법: 보여 준 카드를 내기 전에는 차례를 마칠 수 없다
  const must = view.turn.mustPlay;
  if (must !== undefined && !api.canEndTurn) {
    return `서부의 법 — ${eul(CARD_DEFS[kindOf(must)].nameKo)} 내야 차례를 마칠 수 있다`;
  }
  return '낼 카드를 고른다';
}
