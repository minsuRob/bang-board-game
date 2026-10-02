/**
 * 손패에 새로 들어온 카드.
 *
 * 손패를 앞 렌더와 견주어 새로 생긴 카드를 "도착"으로 잡는다. 뽑기·잡화점·강탈 … 어디서 왔든 같다.
 * 덱에서 온 카드는 덱 자리에서 뒷면으로 떨어져 나와 손패 칸까지 날아와 뒤집힌다 (HandFlights 오버레이).
 * 3D 판은 Sequencer 가 덱→내 손 비행을 3D 로 그리지 않고 바로 markLanded(fromDeck) 한다.
 * 다른 곳(잡화점·강탈 …)에서 온 카드는 3D 카드가 화면 아래로 빠진 뒤 손패 자리에서 솟아오른다.
 * 신호가 끝내 오지 않으면(빨리 감기·연출 생략) 스스로 드러낸다.
 *
 * 새로 들어온 카드는 hover 하거나 누르거나 차례가 바뀔 때까지 "새 카드" 표시를 단다.
 */

import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { CardId } from '../data/types';

/** 3D 카드가 내 손 자리에 닿은 시각. fromDeck 이면 손패 줄이 덱에서부터 날려 온다 */
export const handLanding = createStore<{ landed: Record<CardId, number>; fromDeck: Record<CardId, boolean> }>(
  () => ({ landed: {}, fromDeck: {} }),
);

export function markLanded(card: CardId, fromDeck = false) {
  handLanding.setState((s) => ({
    landed: { ...s.landed, [card]: Date.now() },
    fromDeck: { ...s.fromDeck, [card]: fromDeck },
  }));
}

/** 창 좌표 사각형 */
export type ScreenBox = { x: number; y: number; w: number; h: number };

/**
 * 덱이 지금 화면 어디에 있는지 재는 함수. 판(3D·2D·모바일)이 하나 걸어 둔다.
 * 스크롤·카메라로 덱이 움직이므로 위치가 아니라 재는 방법을 둔다.
 */
type DeckMeasure = () => Promise<ScreenBox | null>;
let deckMeasure: DeckMeasure | null = null;

/** 건 함수를 돌려준다. 정리할 때 같은 함수일 때만 지운다 (판이 겹쳐 바뀔 때) */
export function setDeckMeasure(fn: DeckMeasure): () => void {
  deckMeasure = fn;
  return () => {
    if (deckMeasure === fn) deckMeasure = null;
  };
}

export function measureDeck(): Promise<ScreenBox | null> {
  return deckMeasure ? deckMeasure().catch(() => null) : Promise.resolve(null);
}

/** 덱에서 손패 칸까지 날아오는 시간 */
export const FLIGHT_MS = 460;

/** 덱에서 손패 칸으로 날아가는 중인 카드. HandFlights 오버레이가 그린다 */
export type HandFlight = {
  card: CardId;
  from: ScreenBox;
  to: ScreenBox;
  /** 칸에 닿았다. 칸이 진짜 카드를 드러낸다 */
  onLand: () => void;
};

export const handFlights = createStore<{ flights: Record<CardId, HandFlight> }>(() => ({ flights: {} }));

export function launchFlight(f: HandFlight) {
  handFlights.setState((s) => ({ flights: { ...s.flights, [f.card]: f } }));
}

export function finishFlight(card: CardId) {
  handFlights.setState((s) => {
    if (!s.flights[card]) return s;
    const flights = { ...s.flights };
    delete flights[card];
    return { flights };
  });
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
  /** 덱에서 날아와야 하는가. 2D 는 출처를 모르므로 늘 그렇다 */
  fromDeck: (card: CardId) => boolean;
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
  const deckLanded = useStore(handLanding, (s) => s.fromDeck);

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
  // 3D 는 착지 신호가 덱 출처라고 알려 줄 때만. 상한으로 풀린 카드는 솟아오르기로 들어온다
  const fromDeck = (card: CardId) => {
    if (!waitFor3d) return true;
    const v = incoming[card];
    return Boolean(v && (landed[card] ?? 0) > v.after && deckLanded[card]);
  };
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

  return { phase, order, fromDeck, settled, fresh: isFresh, clearFresh };
}

type Arrival = {
  order: number;
  /** 들어올 때 이미 있던 착지 시각. 이보다 뒤의 신호만 이 도착의 것이다 */
  after: number;
  /** 기다림이 끝났다 (2D 이거나 상한을 넘었다) */
  released: boolean;
};

export { STAGGER_MS as ARRIVAL_STAGGER_MS };
