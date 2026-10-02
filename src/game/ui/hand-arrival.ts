/**
 * 손패에 새로 들어온 카드.
 *
 * 손패를 앞 렌더와 견주어 새로 생긴 카드를 "도착"으로 잡는다. 뽑기·잡화점·강탈 … 어디서 왔든 같다.
 * 3D 판에서는 덱에서 날아간 3D 카드가 화면 아래로 빠지는 순간(Sequencer 가 markLanded)을 기다렸다가
 * 손패 자리에서 솟아오르게 한다. 신호가 끝내 오지 않으면(빨리 감기·연출 생략) 스스로 드러낸다.
 *
 * 새로 들어온 카드는 hover 하거나 누르거나 차례가 바뀔 때까지 "새 카드" 표시를 단다.
 */

import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { CardId } from '../data/types';

/** 3D 카드가 내 손 자리에 닿은 시각 */
export const handLanding = createStore<{ landed: Record<CardId, number> }>(() => ({ landed: {} }));

export function markLanded(card: CardId) {
  handLanding.setState((s) => ({ landed: { ...s.landed, [card]: Date.now() } }));
}

/** 2D 판에서 여러 장이 들어올 때 한 장씩 벌리는 간격 */
const STAGGER_MS = 90;
/** 3D 신호를 이만큼 기다려도 안 오면 그냥 드러낸다 (연출 큐가 밀려도 AI 를 2초 넘게 세우지 않는다) */
const WAIT_LIMIT_MS = 1600;

export type ArrivalPhase = 'waiting' | 'entering' | 'idle';

export type HandArrivals = {
  phase: (card: CardId) => ArrivalPhase;
  /** entering 카드가 몇 번째로 들어오는가 (소리·지연을 벌리는 데 쓴다) */
  order: (card: CardId) => number;
  /** 등장 애니메이션이 끝났다 */
  settled: (card: CardId) => void;
  fresh: (card: CardId) => boolean;
  clearFresh: (card: CardId) => void;
};

export function useHandArrivals(
  cards: CardId[],
  opts: {
    /** 3D 비행이 끝나기를 기다린다 */
    waitFor3d: boolean;
    /** 손패 주인. 바뀌면(핫시트 교대) 견주지 않는다 */
    owner?: string | null;
    /** 바뀌면 새 카드 표시를 모두 지운다 (차례가 넘어갈 때) */
    resetKey?: string;
  },
): HandArrivals {
  const { waitFor3d, owner, resetKey } = opts;
  // 앞 렌더의 손패·주인·리셋 키. 렌더 중에 견주어 바로 고친다 (effect 를 한 번 더 돌리지 않는다)
  const [seen, setSeen] = useState({ cards, owner, resetKey });
  // 도착한 카드 → 들어온 순번, 기다림이 끝났는가. 등장이 끝나면 지운다
  const [incoming, setIncoming] = useState<Record<CardId, Arrival>>({});
  const [fresh, setFresh] = useState<ReadonlySet<CardId>>(() => new Set());
  const landed = useStore(handLanding, (s) => s.landed);

  if (seen.cards !== cards || seen.owner !== owner || seen.resetKey !== resetKey) {
    const sameOwner = seen.owner === owner;
    const added = sameOwner ? cards.filter((c) => !seen.cards.includes(c)) : [];
    const keep = (c: CardId) => sameOwner && cards.includes(c);
    setSeen({ cards, owner, resetKey });
    setIncoming((cur) => {
      const next: Record<CardId, Arrival> = {};
      for (const [c, v] of Object.entries(cur)) if (keep(c)) next[c] = v;
      // 착지 신호는 이 카드가 들어온 뒤의 것만 센다 (같은 카드가 손을 떠났다 돌아온 경우)
      added.forEach((c, order) => {
        next[c] = { order, after: landed[c] ?? 0, released: !waitFor3d };
      });
      return next;
    });
    setFresh((cur) => {
      const base = seen.resetKey !== resetKey ? [] : [...cur].filter(keep);
      return new Set([...base, ...added]);
    });
  }

  // 기다림 상한. 신호가 오지 않아도 드러낸다
  const waitingKey = Object.entries(incoming)
    .filter(([, v]) => !v.released)
    .map(([c]) => c)
    .join(',');
  useEffect(() => {
    if (!waitingKey) return;
    const ids = waitingKey.split(',');
    const timer = setTimeout(() => {
      setIncoming((cur) => {
        const next = { ...cur };
        for (const c of ids) if (next[c]) next[c] = { ...next[c], released: true };
        return next;
      });
    }, WAIT_LIMIT_MS);
    return () => clearTimeout(timer);
  }, [waitingKey]);

  const phase = (card: CardId): ArrivalPhase => {
    const v = incoming[card];
    if (!v) return 'idle';
    return v.released || (landed[card] ?? 0) > v.after ? 'entering' : 'waiting';
  };
  // 3D 신호를 따로 받은 카드는 이미 벌어져 들어온다. 2D 만 순번만큼 늦춘다
  const order = (card: CardId) => (waitFor3d ? 0 : (incoming[card]?.order ?? 0));
  const settled = useCallback((card: CardId) => {
    setIncoming((cur) => {
      if (!cur[card]) return cur;
      const next = { ...cur };
      delete next[card];
      return next;
    });
  }, []);
  const isFresh = (card: CardId) => fresh.has(card);
  const clearFresh = useCallback((card: CardId) => {
    setFresh((cur) => {
      if (!cur.has(card)) return cur;
      const next = new Set(cur);
      next.delete(card);
      return next;
    });
  }, []);

  return { phase, order, settled, fresh: isFresh, clearFresh };
}

type Arrival = {
  order: number;
  /** 들어올 때 이미 있던 착지 시각. 이보다 뒤의 신호만 이 도착의 것이다 */
  after: number;
  /** 기다림이 끝났다 (2D 이거나 상한을 넘었다) */
  released: boolean;
};

export { STAGGER_MS as ARRIVAL_STAGGER_MS };
