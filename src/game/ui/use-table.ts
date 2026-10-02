/**
 * 화면과 엔진 사이의 얇은 층.
 *
 * "지금 무엇을 누를 수 있는가"를 전부 legalActions() 하나에서 끌어온다.
 * 화면이 규칙을 따로 판단하면 엔진과 어긋난다.
 */

import { useCallback, useMemo, useState } from 'react';

import { CARD_DEFS } from '../data/cards.base';
import { eul, ga } from '../engine/josa';
import type { CardId, CardKind, CharacterId, Suit } from '../data/types';
import {
  actionKey,
  kindOf,
  legalActions,
  isExplicitAbility,
  playAnyAsAbilitiesOf,
  type Action,
  type Choice,
  type GameState,
  type PlayerId,
} from '../engine';
import type { GoldUse } from '../engine/types';
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
  /** 골드 러시 갈색 카드 사용법 (조시 맥클라우드가 뽑았을 때) */
  goldUses?: GoldUse[];
  /** 빨강·검정 고르기 (피요테) */
  colors?: boolean;
  /** 넘기기 단추 문구. 없으면 '반응하지 않음' */
  passLabel?: string;
  steal: { target: PlayerId; handCount: number; equipment: CardId[] } | null;
  /** 테이블 가운데 창에서 고른다 (잡화점·강탈·캣 발루). 있으면 하단 바는 안내만 한다 */
  center: CenterPick | null;
};

/** 가운데 창에 펼칠 카드. 손패는 뒷면으로, 나머지는 앞면으로 */
export type CenterPick = {
  /** 앞면 카드 (잡화점 카드, 앞에 놓인 장비) */
  cards: CardId[];
  /** 앞면 카드를 눌렀을 때 보낼 응답 */
  zone: 'option' | 'equipment';
  /** 뒷면으로 깔 손패 장수 */
  handCount: number;
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
  /** 손의 아무 카드나 다른 종류로 내는 능력 (엉클 윌). 이번 차례에 쓸 수 있는 것만 */
  playAsAbilities: { key: string; label: string; as: CardKind }[];
  /** 켜 둔 playAs 능력. 켜져 있으면 손패는 그 능력으로만 낸다 */
  armed: string | null;
  arm: (key: string | null) => void;
  /** 캐릭터 드래프트 중이면 내 후보와 진행 상황. 아니면 null */
  draft: DraftInfo | null;
  pickCharacter: (id: CharacterId) => void;
  /** 골드 러시 합법 수 (사기·치우기·맥주 팔기·금덩이 능력) */
  goldActions: Action[];
  sendGold: (a: Action) => void;
};

export type DraftInfo = {
  offers: CharacterId[];
  picked: CharacterId | null;
  /** 고른 사람 수 / 전체 */
  done: number;
  total: number;
};

export function useTable(view: GameState | null, viewer: PlayerId | null): TableApi {
  const submit = useGameStore((s) => s.submit);
  const [selected, setSelected] = useState<CardId | null>(null);
  // 켠 차례를 같이 적어 두어, 차례가 넘어가면 저절로 꺼지게 한다
  const [armedFor, setArmedFor] = useState<{ key: string; turn: string } | null>(null);
  const turnId = view ? `${view.turn.round}:${view.turn.active}` : '';

  const allLegal = useMemo<Action[]>(
    () => (view && viewer ? legalActions(view, viewer) : []),
    [view, viewer],
  );

  // '아무 카드나 ~로' 능력(엉클 윌)은 켰을 때만 손패에 드러낸다.
  // 늘 섞어 두면 빗나감! 한 장이 소리 없이 잡화점으로 나가 버린다.
  const playAs = useMemo(
    () => (view && viewer ? playAnyAsAbilitiesOf(view, viewer) : []),
    [view, viewer],
  );
  // 이 액션이 어느 차례당 한 번 능력으로 내는 것인가. 조건이 붙은 능력(블랙 플라워·더 스팟)은
  // 액션에 ability 가 적혀 있고, 엉클 윌은 '다른 종류로 냈다'로 알아본다.
  const abilityOf = useCallback(
    (a: Action): string | null => {
      if (a.type !== 'playCard') return null;
      if (a.ability) return playAs.some((ab) => ab.key === a.ability) ? a.ability : null;
      if (a.as === undefined || a.as === kindOf(a.card)) return null;
      return playAs.find((ab) => !isExplicitAbility(ab) && ab.as === a.as)?.key ?? null;
    },
    [playAs],
  );
  const playAsAbilities = useMemo(
    () =>
      playAs
        .filter((ab) => allLegal.some((a) => abilityOf(a) === ab.key))
        .map((ab) => ({ key: ab.key, label: ab.label, as: ab.as })),
    [playAs, allLegal, abilityOf],
  );
  const armedAbility =
    armedFor && armedFor.turn === turnId
      ? playAs.find((ab) => ab.key === armedFor.key && playAsAbilities.some((x) => x.key === ab.key))
      : undefined;
  const armed = armedAbility?.key ?? null;

  const legal = useMemo<Action[]>(
    () =>
      allLegal.filter((a) => {
        if (a.type !== 'playCard') return true;
        return abilityOf(a) === (armedAbility?.key ?? null);
      }),
    [allLegal, armedAbility, abilityOf],
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
      setArmedFor(null);
    },
    [legal, submit],
  );

  const arm = useCallback(
    (key: string | null) => {
      setArmedFor(key ? { key, turn: turnId } : null);
      setSelected(null);
    },
    [turnId],
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

  const draft = useMemo<DraftInfo | null>(() => {
    const d = view?.draft;
    if (!d || !viewer) return null;
    const picks = Object.values(d.picked);
    return {
      offers: d.offers[viewer] ?? [],
      picked: d.picked[viewer] ?? null,
      done: picks.filter((c) => c !== null).length,
      total: picks.length,
    };
  }, [view, viewer]);

  const pickCharacter = useCallback(
    (id: CharacterId) => {
      const match = legal.find((a) => a.type === 'pickCharacter' && a.character === id);
      if (match) submit(match);
    },
    [legal, submit],
  );

  const prompt = useMemo(() => (view && waitingOnMe ? buildPrompt(view) : null), [view, waitingOnMe]);

  // 골드 러시: 사기·치우기·맥주 팔기·금덩이 능력. 배낭은 죽기 직전에도 나온다.
  const goldActions = useMemo(
    () =>
      allLegal.filter(
        (a) =>
          a.type === 'buyGold' ||
          a.type === 'removeGold' ||
          a.type === 'beerForGold' ||
          a.type === 'goldAbility',
      ),
    [allLegal],
  );
  const sendGold = useCallback((a: Action) => submit(a), [submit]);

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
    playAsAbilities,
    armed,
    arm,
    draft,
    pickCharacter,
    goldActions,
    sendGold,
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
    center: null,
  };
}

function buildPrompt(view: GameState): Prompt | null {
  const a = view.awaiting;
  if (!a) return null;
  const base = empty();

  switch (a.k) {
    case 'missed': {
      // 쏜 사람이 없는 뱅! (한줌의 카드)
      const who = a.source ? `${nameOf(view, a.source)}의 뱅!` : '한줌의 카드 — 뱅!';
      return {
        ...base,
        title: a.remaining > 1 ? `${who} — 빗나감 ${a.remaining}장이 필요하다` : who,
        hint: '빗나감!을 내거나 그냥 맞는다',
        cardOptions: a.options,
        canPass: true,
      };
    }
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
      return {
        ...base,
        title: '잡화점',
        hint: '가져갈 카드를 고른다',
        // 숫자키로 고를 수 있게 cardOptions 도 둔다. 카드는 가운데 창에만 그린다
        cardOptions: a.options,
        center: { cards: a.options, zone: 'option', handCount: 0 },
      };
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
        // 좌석에서 고르던 것을 가운데 창으로 옮겼다. 좌석은 펼치지 않는다
        center: { cards: a.equipment, zone: 'equipment', handCount: a.handCount },
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
    case 'evelyn':
      return {
        ...base,
        title: `이블린 쉬뱅 — 가져올 카드 ${a.remaining}장`,
        hint: '1장 대신 쏠 사람을 고르거나, 남은 카드를 그대로 가져온다',
        players: a.targets,
        canPass: true,
      };
    case 'saved':
      return {
        ...base,
        title: `${ga(nameOf(view, a.target))} 목숨을 잃으려 한다`,
        hint: '구조!를 내면 목숨 1을 지켜 준다. 살아남으면 2장을 가져온다',
        cardOptions: a.options,
        canPass: true,
      };
    case 'savedReward':
      return {
        ...base,
        title: '구조! 보상',
        hint: `그렇게 한다: ${nameOf(view, a.target)}의 손에서 2장 · 반응하지 않음: 덱에서 2장`,
        yesNo: true,
        canPass: true,
      };
    case 'evade':
      return {
        ...base,
        title: `${nameOf(view, a.source)}의 ${CARD_DEFS[a.kind].nameKo}`,
        hint: '탈출(또는 빗나감!)을 내면 이 카드의 효과를 피한다',
        cardOptions: a.options,
        canPass: true,
      };
    case 'discardChoice': {
      const TITLE = { bandidos: '반디도스!', poker: '포커', tornado: '토네이도', shotgun: '샷건', lemonadeJim: '레모네이드 짐' } as const;
      const HINT = {
        bandidos: `손패 ${a.remaining}장을 버리거나, 버리지 않고 목숨 1을 잃는다`,
        poker: '손패 1장을 엎어 낸다. 에이스가 없으면 낸 사람이 가져간다',
        tornado: '손패 1장을 버린다. 그 뒤 2장을 가져온다',
        shotgun: '샷건에 맞았다. 손패 1장을 골라 버린다',
        lemonadeJim: '손패 1장을 버리면 나도 목숨 1을 회복한다',
      } as const;
      return {
        ...base,
        title: a.remaining > 1 && a.reason === 'bandidos' ? `${TITLE[a.reason]} (${a.remaining}장 더)` : TITLE[a.reason],
        hint: HINT[a.reason],
        cardOptions: a.options,
        canPass: a.canPass,
      };
    }
    case 'declareSuit':
      return { ...base, title: '수갑', hint: '이번 차례에 쓸 무늬를 선언한다', suits: SUIT_ALL };
    case 'dutchWill':
      return {
        ...base,
        title: '더치 윌',
        hint: '방금 뽑은 카드 중 버릴 1장을 고른다. 금덩이 1개를 받는다',
        cardOptions: a.options,
      };
    case 'goldUse':
      return {
        ...base,
        title: '골드 러시 카드',
        hint: '이 카드를 어떻게 쓸지 고른다',
        goldUses: a.options,
      };
    case 'russianRoulette':
      return {
        ...base,
        title: '러시안 룰렛',
        hint: '빗나감!을 버리지 않으면 목숨 2를 잃고 룰렛이 멈춘다',
        cardOptions: a.options,
        canPass: true,
        passLabel: '목숨 2를 잃는다 (W)',
      };
    case 'bloodBrothers':
      return {
        ...base,
        title: '의형제',
        hint: '목숨 1을 잃고 고른 사람의 목숨을 1 회복시킨다',
        players: a.targets,
        canPass: true,
        passLabel: '넘겨주지 않는다 (W)',
      };
    case 'hardLiquor':
      return {
        ...base,
        title: '독한 술',
        hint: '카드를 가져오지 않고 목숨을 1 회복할까',
        yesNo: true,
        canPass: true,
        passLabel: '카드를 가져온다 (W)',
      };
    case 'peyote':
      return { ...base, title: '피요테', hint: '덱 맨 위 카드의 색을 맞힌다', colors: true };
    case 'ranch':
      return {
        ...base,
        title: '목장',
        hint:
          a.picked.length > 0
            ? `${a.picked.length}장을 골랐다. 더 고르거나 확정한다`
            : '버리고 새로 가져올 카드를 고른다',
        cardOptions: a.options,
        canPass: true,
        passLabel: a.picked.length > 0 ? `${a.picked.length}장 바꾼다 (W)` : '바꾸지 않는다 (W)',
      };
    case 'ricochet':
      return {
        ...base,
        title: `리코체 — ${nameOf(view, a.source)}`,
        hint: `${eul(CARD_DEFS[kindOf(a.card)].nameKo)} 지키려면 빗나감!을 낸다`,
        cardOptions: a.options,
        canPass: true,
        passLabel: '카드를 내준다 (W)',
      };
  }
}
