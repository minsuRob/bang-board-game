/**
 * 연출 길이 (ms). AI 구동기가 이만큼 기다리므로 여기 숫자가 곧 게임 템포다.
 */

import type { FlightStyle, FxBatch, FxCommand } from './types';

export const DUR = {
  flight: 440,
  deal: 260,
  dealStagger: 70,
  drop: 320,
  deflect: 480,
  scatter: 520,
  reveal: 640,
  revealHold: 650,
  via: 300,
  slam: 150,
  ring: 420,
  focus: 550,
  bang: 260,
  streak: 160,
  fanStagger: 90,
  shield: 380,
  flash: 320,
  number: 1100,
  caption: 1400,
} as const;

export function flightMs(style: FlightStyle): number {
  switch (style) {
    case 'arc':
      return DUR.flight;
    case 'deal':
      return DUR.deal;
    case 'drop':
      return DUR.drop;
    case 'deflect':
      return DUR.deflect;
    case 'scatter':
      return DUR.scatter;
    case 'reveal':
      return DUR.reveal;
  }
}

/** 명령 하나가 걸리는 시간. 뒤따르는 명령을 막지 않는 것(포커스·숫자)은 0 */
export function commandMs(cmd: FxCommand): number {
  switch (cmd.k) {
    case 'moveCard': {
      const hold = cmd.style === 'reveal' ? (cmd.holdMs ?? DUR.revealHold) + DUR.drop : 0;
      const via = cmd.via ? DUR.via : 0;
      return (cmd.delayMs ?? 0) + flightMs(cmd.style) + via + hold + (cmd.slam ? DUR.slam : 0);
    }
    case 'bang':
      return DUR.bang;
    case 'fanOut':
      return DUR.streak + cmd.staggerMs * Math.max(0, cmd.to.length - 1);
    case 'shield':
      return DUR.shield;
    case 'shockwave':
      return DUR.ring;
    case 'wait':
      return cmd.ms;
    case 'shake':
      return Math.min(cmd.ms, 200);
    default:
      return 0;
  }
}

export function estimateBatchMs(steps: FxCommand[][]): number {
  let total = 0;
  for (const step of steps) {
    let longest = 0;
    for (const c of step) longest = Math.max(longest, commandMs(c));
    total += longest;
  }
  return total;
}

export function makeBatch(seq: number, steps: FxCommand[][], extra: Partial<FxBatch> = {}): FxBatch {
  return { seq, steps, estMs: estimateBatchMs(steps), ...extra };
}
