/**
 * 화면과 엔진 사이의 얇은 층.
 *
 * "지금 무엇을 누를 수 있는가"를 전부 legalActions() 하나에서 끌어온다.
 * 화면이 규칙을 따로 판단하면 엔진과 어긋난다.
 */

import { useCallback, useMemo, useState } from 'react';

import { CARD_DEFS } from '../data/cards.base';
import type { CardId, Suit } from '../data/types';
import {
  actionKey,
  kindOf,
  legalActions,
  type Action,
  type Choice,
  type GameState,
  type PlayerId,
} from '../engine';
import { selectActor, useGameStore } from '../store/game-store';

export type Prompt = {
  title: string;
  hint: string;
  /** 손패나 펼쳐진 카드 중에서 고를 것 */
  cardOptions: CardId[];
  canPass: boolean;
  suits: Suit[];
  yesNo: boolean;
  players: PlayerId[];
  steal: { target: PlayerId; handCount: number; equipment: CardId[] } | null;
};

export type TableApi = {
  view: GameState | null;
  viewer: PlayerId | null;
  actor: PlayerId | null;
  myTurn: boolean;
  waitingOnMe: boolean;
  playable: Set<CardId>;
  discardable: Set<CardId>;
  selected: CardId | null;
  select: (card: CardId | null) => void;
  targetsFor: (card: CardId) => PlayerId[];
  playCard: (card: CardId, target?: PlayerId) => void;
  canEndTurn: boolean;
  endTurn: () => void;
  discard: (card: CardId) => void;
  prompt: Prompt | null;
  respond: (choice: Choice) => void;
  abilities: { key: string; label: string; cards: CardId[] }[];
  useAbility: (key: string, cards: CardId[]) => void;
};

export function useTable(view: GameState | null, viewer: PlayerId | null): TableApi {
  const submit = useGameStore((s) => s.submit);
  const [selected, setSelected] = useState<CardId | null>(null);

  const legal = useMemo<Action[]>(
    () => (view && viewer ? legalActions(view, viewer) : []),
    [view, viewer],
  );

  const actor = selectActor(view);
  const myTurn = Boolean(view && viewer && view.turn.active === viewer && !view.awaiting);
  const waitingOnMe = Boolean(view?.awaiting && view.awaiting.pid === viewer);

  const playable = useMemo(() => {
    const set = new Set<CardId>();
    for (const a of legal) if (a.type === 'playCard') set.add(a.card);
    return set;
  }, [legal]);

  const discardable = useMemo(() => {
    const set = new Set<CardId>();
    for (const a of legal) if (a.type === 'discardCard') set.add(a.card);
    return set;
  }, [legal]);

  const targetsFor = useCallback(
    (card: CardId) => {
      const out = new Set<PlayerId>();
      for (const a of legal) {
        if (a.type === 'playCard' && a.card === card && a.target) out.add(a.target);
      }
      return [...out];
    },
    [legal],
  );

  const playCard = useCallback(
    (card: CardId, target?: PlayerId) => {
      const match = legal.find(
        (a) => a.type === 'playCard' && a.card === card && a.target === target,
      );
      if (!match) return;
      submit(match);
      setSelected(null);
    },
    [legal, submit],
  );

  const canEndTurn = legal.some((a) => a.type === 'endTurn');

  const endTurn = useCallback(() => {
    const match = legal.find((a) => a.type === 'endTurn');
    if (match) submit(match);
  }, [legal, submit]);

  const discard = useCallback(
    (card: CardId) => {
      const match = legal.find((a) => a.type === 'discardCard' && a.card === card);
      if (match) submit(match);
    },
    [legal, submit],
  );

  const respond = useCallback(
    (choice: Choice) => {
      if (!viewer) return;
      const wanted = actionKey({ type: 'respond', pid: viewer, choice });
      const match = legal.find((a) => actionKey(a) === wanted);
      if (match) submit(match);
    },
    [legal, submit, viewer],
  );

  const abilities = useMemo(() => {
    const out: { key: string; label: string; cards: CardId[] }[] = [];
    for (const a of legal) {
      if (a.type !== 'useAbility') continue;
      out.push({ key: a.ability, label: '카드 2장 → 목숨 1', cards: a.cards ?? [] });
    }
    return out;
  }, [legal]);

  const useAbility = useCallback(
    (key: string, cards: CardId[]) => {
      if (!viewer) return;
      const wanted = actionKey({ type: 'useAbility', pid: viewer, ability: key, cards });
      const match = legal.find((a) => actionKey(a) === wanted);
      if (match) submit(match);
    },
    [legal, submit, viewer],
  );

  const prompt = useMemo(() => (view && waitingOnMe ? buildPrompt(view) : null), [view, waitingOnMe]);

  return {
    view,
    viewer,
    actor,
    myTurn,
    waitingOnMe,
    playable,
    discardable,
    selected,
    select: setSelected,
    targetsFor,
    playCard,
    canEndTurn,
    endTurn,
    discard,
    prompt,
    respond,
    abilities,
    useAbility,
  };
}

const SUIT_ALL: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

function nameOf(view: GameState, pid: PlayerId): string {
  return view.players.find((p) => p.id === pid)?.name ?? pid;
}

function empty(): Prompt {
  return {
    title: '',
    hint: '',
    cardOptions: [],
    canPass: false,
    suits: [],
    yesNo: false,
    players: [],
    steal: null,
  };
}

function buildPrompt(view: GameState): Prompt | null {
  const a = view.awaiting;
  if (!a) return null;
  const base = empty();

  switch (a.k) {
    case 'missed':
      return {
        ...base,
        title:
          a.remaining > 1
            ? `${nameOf(view, a.source)}의 뱅! — 빗나감 ${a.remaining}장이 필요하다`
            : `${nameOf(view, a.source)}의 뱅!`,
        hint: '빗나감!을 내거나 그냥 맞는다',
        cardOptions: a.options,
        canPass: true,
      };
    case 'indiansBang':
      return {
        ...base,
        title: '인디언!이 몰려온다',
        hint: '뱅!을 버리지 않으면 목숨 1을 잃는다',
        cardOptions: a.options,
        canPass: true,
      };
    case 'duelBang':
      return {
        ...base,
        title: `${nameOf(view, a.opponent)}와의 결투`,
        hint: '뱅!을 내지 못하면 목숨 1을 잃는다',
        cardOptions: a.options,
        canPass: true,
      };
    case 'beerToSurvive':
      return {
        ...base,
        title: '쓰러지기 직전',
        hint: `맥주 ${a.needed}장을 마시면 버틸 수 있다`,
        cardOptions: a.options,
        canPass: true,
      };
    case 'judgementChoice':
      return {
        ...base,
        title: '카드 펼치기',
        hint: '두 장 중 어느 쪽을 펼칠지 고른다',
        cardOptions: a.options,
      };
    case 'generalStore':
      return { ...base, title: '잡화점', hint: '가져갈 카드를 고른다', cardOptions: a.options };
    case 'kitCarlson':
      return {
        ...base,
        title: '카드 가져오기',
        hint: `${a.remaining}장을 더 고른다. 남은 한 장은 덱으로 돌아간다`,
        cardOptions: a.options,
      };
    case 'daltonsDiscard':
      return {
        ...base,
        title: '달톤 형제',
        hint: '앞에 놓인 파랑 카드 1장을 버린다',
        cardOptions: a.options,
      };
    case 'stealCard':
      return {
        ...base,
        title: `${nameOf(view, a.target)}의 카드`,
        hint:
          a.mode === 'panic' ? '가져올 카드를 고른다' : '버리게 할 카드를 고른다',
        steal: { target: a.target, handCount: a.handCount, equipment: a.equipment },
      };
    case 'jesseJones':
      return {
        ...base,
        title: '첫 번째 카드를 어디서 가져올까',
        hint: '남의 손에서 한 장을 뽑거나, 덱에서 뽑는다',
        players: a.targets,
        canPass: true,
      };
    case 'pedroRamirez':
      return {
        ...base,
        title: '버린 더미에서 가져올까',
        hint: `맨 위: ${CARD_DEFS[kindOf(a.topDiscard)].nameKo}`,
        yesNo: true,
        canPass: true,
      };
    case 'newIdentity':
      return {
        ...base,
        title: '새로운 신분',
        hint: '예비 캐릭터로 바꾸면 목숨 2로 시작한다',
        yesNo: true,
        canPass: true,
      };
    case 'declareSuit':
      return { ...base, title: '수갑', hint: '이번 차례에 쓸 무늬를 선언한다', suits: SUIT_ALL };
  }
}
