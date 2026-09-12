/**
 * 전이 하나 → 연출 배치 하나.
 *
 * 같은 seq 의 로그를 순서대로 읽으며 카드 이동(존 diff)에 연출을 입힌다.
 * 순수 함수라 테스트에서 실제 엔진으로 상태를 만들어 검증한다.
 */

import type { CardId } from '../../data/types';
import { kindOf, type GameEvent, type GameState, type PlayerId } from '../../engine';
import type { Transition } from '../../store/transition-bus';
import { DUR, makeBatch } from './durations';
import { positionIn } from './move-diff';
import type { CardMove, FlightStyle, FxBatch, FxCommand, Zone } from './types';

type MoveCmd = Extract<FxCommand, { k: 'moveCard' }>;

export function planFx(t: Transition, moves: CardMove[], viewer: PlayerId | null): FxBatch {
  const { prev, next } = t;
  // 첫 상태거나 여러 액션을 한꺼번에 따라잡는 중이면 그냥 놓는다
  if (!prev || next.seq - prev.seq !== 1) return makeBatch(next.seq, [], { snap: true });

  const events = next.log.filter((e) => e.seq === next.seq);
  const steps: FxCommand[][] = [];
  const consumed = new Set<CardId>();
  const push = (...cmds: FxCommand[]) => {
    if (cmds.length) steps.push(cmds);
  };

  const faceFor = (zone: Zone | null): 'up' | 'down' => {
    if (!zone) return 'up';
    if (zone.z === 'deck') return 'down';
    if (zone.z === 'hand' && zone.pid !== viewer) return 'down';
    return 'up';
  };

  const moveCmd = (m: CardMove, style: FlightStyle, extra: Partial<MoveCmd> = {}): MoveCmd => {
    consumed.add(m.card);
    const from = positionIn(prev, m.from, m.card);
    const to = positionIn(next, m.to, m.card);
    return {
      k: 'moveCard',
      card: m.card,
      from: m.from,
      to: m.to,
      face: faceFor(m.to),
      style,
      fromIndex: from.index,
      fromCount: from.count,
      toIndex: to.index,
      toCount: to.count,
      ...extra,
    };
  };

  const moveOf = (card: CardId | undefined): CardMove | undefined =>
    card ? moves.find((m) => m.card === card && !consumed.has(m.card)) : undefined;

  const movesTo = (pred: (m: CardMove) => boolean) => moves.filter((m) => !consumed.has(m.card) && pred(m));

  // 리셔플은 더미 높이만 바뀌면 된다
  const reshuffled = movesTo((m) => m.from?.z === 'discard' && m.to?.z === 'deck');
  if (reshuffled.length >= 8) for (const m of reshuffled) consumed.add(m.card);

  const alive = (state: GameState) => state.players.filter((p) => p.alive || p.ghost).map((p) => p.id);
  const duelOpponent = (pid: PlayerId): PlayerId | undefined => {
    for (let i = prev.stack.length - 1; i >= 0; i--) {
      const f = prev.stack[i];
      if (f.k === 'duel') return f.a === pid ? f.b : f.a;
    }
    return undefined;
  };
  const indiansSource = (): PlayerId | undefined => {
    for (let i = prev.stack.length - 1; i >= 0; i--) {
      const f = prev.stack[i];
      if (f.k === 'indians') return f.source;
    }
    return undefined;
  };

  const hasPlayMissed = (target: PlayerId) => events.some((e) => e.t === 'playMissed' && e.pid === target);
  const hasDynamite = events.some((e) => e.t === 'dynamite');

  for (const e of events) {
    switch (e.t) {
      case 'turnStart':
        if (e.pid) push({ k: 'cameraFocus', pid: e.pid, holdMs: DUR.focus }, { k: 'seatFlash', pid: e.pid, tone: 'gold' });
        break;

      case 'playCard': {
        const m = moveOf(e.card);
        const kind = e.card ? kindOf(e.card) : null;
        if (m && e.pid) {
          // 지목 카드는 대상 위에서 한 번 머물렀다가 떨어진다 (감옥은 대상 앞에 장착되므로 diff 가 처리)
          const hover = e.target && m.to?.z === 'discard' && e.target !== e.pid;
          push(moveCmd(m, 'arc', { slam: true, via: hover ? e.target : undefined }));
        }
        if (kind === 'bang' && e.pid && e.target) push({ k: 'bang', from: e.pid, to: e.target });
        if ((kind === 'gatling' || kind === 'indians') && e.pid) {
          const pid = e.pid;
          push({ k: 'fanOut', from: pid, to: alive(prev).filter((p) => p !== pid), staggerMs: DUR.fanStagger });
        }
        if (kind === 'duel' && e.target) push({ k: 'cameraFocus', pid: e.target, holdMs: DUR.focus });
        break;
      }

      case 'playMissed': {
        const m = moveOf(e.card);
        if (m) push(moveCmd(m, 'deflect'), ...(e.pid ? [{ k: 'shield', pid: e.pid } as FxCommand] : []));
        break;
      }

      case 'missed':
        if (e.target && !hasPlayMissed(e.target)) push({ k: 'shield', pid: e.target });
        break;

      case 'indiansBang': {
        const m = moveOf(e.card);
        const src = indiansSource();
        if (m) push(moveCmd(m, 'arc', { slam: true }));
        if (e.pid && src) push({ k: 'bang', from: e.pid, to: src });
        break;
      }

      case 'duelBang': {
        const m = moveOf(e.card);
        const opp = e.pid ? duelOpponent(e.pid) : undefined;
        if (m) push(moveCmd(m, 'arc', { slam: true }));
        if (e.pid && opp) push({ k: 'bang', from: e.pid, to: opp });
        break;
      }

      case 'damage':
        if (e.target) {
          const n = e.amount ?? 1;
          push(
            { k: 'seatFlash', pid: e.target, tone: 'red' },
            { k: 'shockwave', pid: e.target, strength: n },
            { k: 'shake', strength: 0.06 + 0.05 * n, ms: 260 },
            { k: 'number', pid: e.target, text: `-${n}`, tone: 'damage' },
          );
        }
        break;

      case 'heal':
        if (e.target)
          push(
            { k: 'seatFlash', pid: e.target, tone: 'green' },
            { k: 'particles', preset: 'sparkle', pid: e.target },
            { k: 'number', pid: e.target, text: `+${e.amount ?? 1}`, tone: 'heal' },
          );
        break;

      case 'beerSurvive': {
        const m = moveOf(e.card);
        if (m) push(moveCmd(m, 'arc', { slam: true }));
        if (e.pid) push({ k: 'particles', preset: 'sparkle', pid: e.pid });
        break;
      }

      case 'eliminate': {
        if (!e.target) break;
        const target = e.target;
        push({ k: 'seatFlash', pid: target, tone: 'red' }, { k: 'shake', strength: 0.18, ms: 320 });
        const scattered = movesTo(
          (m) => (m.from?.z === 'hand' || m.from?.z === 'equipment') && m.from.pid === target,
        );
        push(...scattered.map((m, i) => moveCmd(m, 'scatter', { delayMs: i * 60 })));
        break;
      }

      case 'judgement': {
        const m = moveOf(e.card);
        if (m) push(moveCmd(m, 'reveal', { holdMs: DUR.revealHold }), { k: 'caption', text: e.text, ms: DUR.caption });
        break;
      }

      case 'dynamite':
        if (e.pid)
          push(
            { k: 'shockwave', pid: e.pid, strength: 3 },
            { k: 'particles', preset: 'explosion', pid: e.pid },
            { k: 'shake', strength: 0.5, ms: 520 },
          );
        break;

      case 'draw': {
        if (!e.pid) break;
        const pid = e.pid;
        const dealt = movesTo((m) => m.to?.z === 'hand' && m.to.pid === pid && m.from?.z === 'deck');
        push(...dealt.map((m, i) => moveCmd(m, 'deal', { delayMs: i * DUR.dealStagger })));
        break;
      }

      case 'discard': {
        const m = moveOf(e.card);
        if (m) push(moveCmd(m, 'drop'));
        break;
      }

      case 'generalStore': {
        const spread = movesTo((m) => m.to?.z === 'limbo' && m.to.kind === 'store');
        push(...spread.map((m, i) => moveCmd(m, 'deal', { delayMs: i * DUR.dealStagger })));
        break;
      }

      case 'generalStorePick': {
        const m = moveOf(e.card);
        if (m) push(moveCmd(m, 'arc'));
        break;
      }

      case 'event':
        push({ k: 'caption', text: e.text, ms: DUR.caption });
        break;

      default:
        break;
    }
  }

  // 로그가 설명하지 않은 이동 (강탈·캣 발루·벌쳐 샘·다이너마이트 넘기기 …)
  const rest = movesTo((m) => m.to !== null);
  if (rest.length) push(...rest.map((m, i) => moveCmd(m, 'arc', { delayMs: i * 60 })));

  // 다이너마이트가 터진 판정은 폭발까지 한 배치. 위에서 순서대로 넣었으니 그대로.
  void hasDynamite;

  return makeBatch(next.seq, steps);
}

/** 이 전이가 어떤 카드를 냈는가 (데모·디버그용) */
export function playedCard(events: GameEvent[]): CardId | undefined {
  return events.find((e) => e.t === 'playCard')?.card;
}
