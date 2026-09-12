/**
 * 연출 큐. 전이 → 배치가 여기 쌓이고, 씬의 시퀀서가 하나씩 꺼내 돈다.
 * React 는 numbers/caption 만 구독한다 (드물게 바뀐다).
 */

import { createStore } from 'zustand/vanilla';

import type { CardId } from '../../data/types';
import type { PlayerId } from '../../engine';
import type { FxBatch } from './types';

export type FloatingNumber = {
  id: number;
  pid: PlayerId;
  text: string;
  tone: 'damage' | 'heal' | 'info';
  at: number;
};

export type Caption = { id: number; text: string; until: number };

export type FxState = {
  queue: FxBatch[];
  numbers: FloatingNumber[];
  caption: Caption | null;
  /** 큐에 든 배치가 움직일 카드. settle 이 이 카드들을 미리 옮기지 않는다 */
  reserved: Record<CardId, number>;
  timeScale: number;
};

export const fxStore = createStore<FxState>(() => ({
  queue: [],
  numbers: [],
  caption: null,
  reserved: {},
  timeScale: 1,
}));

/** 이보다 많이 밀리면 오래된 배치는 빠르게 넘긴다 */
const FAST_THRESHOLD = 3;

let nextId = 1;

function cardsOf(batch: FxBatch): CardId[] {
  const out: CardId[] = [];
  for (const step of batch.steps) for (const c of step) if (c.k === 'moveCard') out.push(c.card);
  return out;
}

export function enqueueFx(batch: FxBatch) {
  fxStore.setState((s) => {
    const reserved = { ...s.reserved };
    for (const c of cardsOf(batch)) reserved[c] = (reserved[c] ?? 0) + 1;
    const queue = [...s.queue, batch];
    if (queue.length > FAST_THRESHOLD) {
      for (let i = 0; i < queue.length - 1; i++) queue[i] = { ...queue[i], fast: true };
    }
    return { queue, reserved };
  });
}

export function shiftFx(): FxBatch | undefined {
  const { queue } = fxStore.getState();
  if (queue.length === 0) return undefined;
  const [head, ...rest] = queue;
  fxStore.setState({ queue: rest });
  return head;
}

/** 배치가 끝났다. 예약을 푼다 */
export function finishFx(batch: FxBatch) {
  fxStore.setState((s) => {
    const reserved = { ...s.reserved };
    for (const c of cardsOf(batch)) {
      const n = (reserved[c] ?? 0) - 1;
      if (n <= 0) delete reserved[c];
      else reserved[c] = n;
    }
    return { reserved };
  });
}

export function isReserved(card: CardId): boolean {
  return (fxStore.getState().reserved[card] ?? 0) > 0;
}

export function clearFx() {
  fxStore.setState({ queue: [], reserved: {}, numbers: [], caption: null });
}

export function pushNumber(pid: PlayerId, text: string, tone: FloatingNumber['tone'], now: number) {
  fxStore.setState((s) => ({ numbers: [...s.numbers, { id: nextId++, pid, text, tone, at: now }] }));
}

export function dropNumber(id: number) {
  fxStore.setState((s) => ({ numbers: s.numbers.filter((n) => n.id !== id) }));
}

export function setCaption(text: string, until: number) {
  fxStore.setState({ caption: { id: nextId++, text, until } });
}

export function clearCaption(id: number) {
  fxStore.setState((s) => (s.caption?.id === id ? { caption: null } : {}));
}
