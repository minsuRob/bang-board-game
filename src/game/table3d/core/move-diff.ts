/**
 * 두 상태 사이에서 카드가 어느 존에서 어느 존으로 갔는지.
 *
 * 카드 id 는 게임 내내 안정적이라 (cards.base.ts) 존을 색인해 비교하면 된다.
 * 로그에 카드 id 가 빠진 이동(강탈·캣 발루·드로우)도 이걸로 잡는다.
 */

import type { CardId } from '../../data/types';
import type { GameState } from '../../engine';
import type { CardMove, Zone } from './types';

export function zoneKey(z: Zone | null): string {
  if (!z) return '-';
  switch (z.z) {
    case 'deck':
    case 'discard':
      return z.z;
    case 'hand':
    case 'equipment':
      return `${z.z}:${z.pid}`;
    case 'limbo':
      return `limbo:${z.kind}`;
  }
}

export function sameZone(a: Zone | null, b: Zone | null): boolean {
  return zoneKey(a) === zoneKey(b);
}

/** 카드 → 존. 가운데 펼쳐진 카드는 스택 프레임에서 읽는다 */
export function indexZones(state: GameState): Map<CardId, Zone> {
  const out = new Map<CardId, Zone>();
  for (const c of state.deck) out.set(c, { z: 'deck' });
  for (const c of state.discard) out.set(c, { z: 'discard' });
  for (const p of state.players) {
    for (const c of p.hand) out.set(c, { z: 'hand', pid: p.id });
    for (const c of p.equipment) out.set(c, { z: 'equipment', pid: p.id });
  }
  for (const f of state.stack) {
    if (f.k === 'generalStore') for (const c of f.revealed) out.set(c, { z: 'limbo', kind: 'store' });
    else if (f.k === 'judgement') for (const c of f.candidates) out.set(c, { z: 'limbo', kind: 'judgement' });
    else if (f.k === 'kitCarlson') for (const c of f.candidates) out.set(c, { z: 'limbo', kind: 'kit' });
    else if (f.k === 'blackJackReveal') out.set(f.card, { z: 'limbo', kind: 'blackJack' });
  }
  return out;
}

export function diffZones(prev: GameState, next: GameState): CardMove[] {
  const a = indexZones(prev);
  const b = indexZones(next);
  const moves: CardMove[] = [];
  const seen = new Set<CardId>();
  for (const [card, to] of b) {
    seen.add(card);
    const from = a.get(card) ?? null;
    if (!sameZone(from, to)) moves.push({ card, from, to });
  }
  for (const [card, from] of a) {
    if (!seen.has(card)) moves.push({ card, from, to: null });
  }
  return moves;
}

/** 존 안에서 카드의 순번과 장수. 비행 도착 자리를 잡을 때 쓴다 */
export function positionIn(state: GameState, zone: Zone | null, card: CardId): { index: number; count: number } {
  if (!zone) return { index: 0, count: 1 };
  const list = listOf(state, zone);
  const index = list.indexOf(card);
  return { index: index < 0 ? list.length : index, count: Math.max(1, list.length) };
}

function listOf(state: GameState, zone: Zone): readonly CardId[] {
  switch (zone.z) {
    case 'deck':
      return state.deck;
    case 'discard':
      return state.discard;
    case 'hand':
      return state.players.find((p) => p.id === zone.pid)?.hand ?? [];
    case 'equipment':
      return state.players.find((p) => p.id === zone.pid)?.equipment ?? [];
    case 'limbo':
      for (const f of state.stack) {
        if (zone.kind === 'store' && f.k === 'generalStore') return f.revealed;
        if (zone.kind === 'judgement' && f.k === 'judgement') return f.candidates;
        if (zone.kind === 'kit' && f.k === 'kitCarlson') return f.candidates;
        if (zone.kind === 'blackJack' && f.k === 'blackJackReveal') return [f.card];
      }
      return [];
  }
}
