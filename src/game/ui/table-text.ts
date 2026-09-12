/**
 * 테이블 문구와 카드 탭 흐름.
 *
 * 2D 와 3D 테이블이 같이 쓴다. 규칙 판단은 전부 TableApi(=legalActions) 에 맡긴다.
 */

import type { CardId } from '../data/types';
import { ROLE_LABEL } from '../data/roles';
import type { GameState, PlayerId } from '../engine';
import { ga } from '../engine/josa';
import type { TableApi } from './use-table';

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
  const active = view.players.find((p) => p.id === view.turn.active);
  const who = active?.id === viewer ? '내' : `${active?.name}의`;
  const phase = view.turn.phase === 'discard' ? '버리기' : view.turn.phase === 'draw' ? '카드 가져오기' : '카드 사용';
  return `${who} 차례 · ${phase} 단계 · ${view.turn.round}라운드`;
}

export function bottomStatus(view: GameState, viewer: PlayerId, api: TableApi): string {
  if (view.result) return '게임이 끝났다.';
  if (api.waitingOnMe) return '';
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
  if (api.selected) return '지목할 상대를 고른다 (Esc 취소)';
  return '낼 카드를 고른다';
}
