/**
 * 화면과 엔진 사이의 얇은 층.
 *
 * "지금 무엇을 누를 수 있는가"를 전부 legalActions() 하나에서 끌어온다.
 * 화면이 규칙을 따로 판단하면 엔진과 어긋난다.
 */

import { useCallback, useMemo, useState } from 'react';

import { CARD_DEFS } from '../data/cards.base';
import { CHARACTERS } from '../data/characters';
import { eul, ga, ro } from '../engine/josa';
import { SUIT_GLYPH, type CardId, type CardKind, type CharacterId, type Suit } from '../data/types';
import { SID_KETCHUM_ABILITY } from '../modifiers';
import {
  actionKey,
  anytimeAbilitiesOf,
  cardOf,
  kindOf,
  legalActions,
  isExplicitAbility,
  isRepeatableBrown,
  playAnyAsAbilitiesOf,
  repeatAbilitiesOf,
  swapAbilitiesOf,
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
  /** 테이블 가운데 창에서 고른다 (잡화점·강탈·캣 벌로우). 있으면 하단 바는 안내만 한다 */
  center: CenterPick | null;
  /** 같은 카드·같은 대상을 여러 방법으로 낼 수 있을 때 고를 문구 (조준·패닝·결전 등). 누르면 variant 응답 */
  variants?: string[];
};

/** 화면 안에서만 쓰는 응답. 엔진의 Choice 에 '낼 방법 고르기'를 더한다 */
export type UiChoice = Choice | { c: 'variant'; index: number };

/** 한줌의 카드 이벤트가 여는 뱅! 사용법. 손패에 섞지 않고 켜야만 쓴다 */
type EventMode = 'sniper' | 'ricochet';

function eventModeOf(a: Action): EventMode | null {
  if (a.type !== 'playCard') return null;
  if (a.also !== undefined) return 'sniper';
  if (a.pick?.zone === 'equipment') return 'ricochet';
  return null;
}

const EVENT_MODE_INFO: Record<EventMode, { label: string; status: string }> = {
  sniper: {
    label: '저격수 · 뱅! 2장',
    status: '함께 버릴 뱅! 한 장을 고르고 상대를 지목한다 (Esc 취소)',
  },
  ricochet: {
    label: '리코체 · 앞의 카드 맞히기',
    status: '버릴 뱅!을 고르고, 노릴 카드가 있는 상대를 지목한다 (Esc 취소)',
  },
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
  /** 대상 없이 그대로 낼 수 있는가 (결전의 맥주처럼 지목해서도 낼 수 있는 카드에서 내 자리의 뜻) */
  canPlayUntargeted: (card: CardId) => boolean;
  /** 이 카드를 낼 수 있는 종류들. 둘 이상이면(결전·르맷의 '뱅!으로') 먼저 고르게 한다 */
  kindsFor: (card: CardId) => CardKind[];
  /** 낼 종류를 고르는 창을 연다 */
  askKind: (card: CardId) => void;
  /** 고른 카드를 무슨 종류로 내기로 했는가. 고르지 않았으면 null */
  selectedAs: CardKind | null;
  playCard: (card: CardId, target?: PlayerId) => void;
  canEndTurn: boolean;
  endTurn: () => void;
  discard: (card: CardId) => void;
  prompt: Prompt | null;
  respond: (choice: UiChoice) => void;
  abilities: { key: string; label: string; cards: CardId[] }[];
  useAbility: (key: string, cards: CardId[]) => void;
  /** 능력은 있지만 지금 쓸 수 없을 때 흐리게 보여 줄 문구 (시드 케첨: 목숨이 가득 참). 없으면 null */
  abilityBlocked: string | null;
  /**
   * 켜고 끄는 사용법. 손의 아무 카드나 다른 종류로 내는 능력(엉클 윌), 맞바꾸기(플린트 웨스트우드),
   * 갈색 카드 한 번 더(리 반 클리프), 한줌의 카드 이벤트의 저격수·리코체. 이번 차례에 쓸 수 있는 것만
   */
  playAsAbilities: { key: string; label: string; as?: CardKind; status?: string }[];
  /** 켜 둔 playAs 능력. 켜져 있으면 손패는 그 능력으로만 낸다 */
  armed: string | null;
  arm: (key: string | null) => void;
  /** 캐릭터 드래프트 중이면 내 후보와 진행 상황. 아니면 null */
  draft: DraftInfo | null;
  pickCharacter: (id: CharacterId) => void;
  /** 골드 러시 합법 수 (사기·치우기·맥주 팔기·금덩이 능력) */
  goldActions: Action[];
  sendGold: (a: Action) => void;
  /** 이벤트가 주는 차례당 한 번 행동 (레이디 로즈 오브 텍사스·도로시 레이지) */
  eventActions: Extract<Action, { type: 'eventAbility' }>[];
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
  // 와일드 웨스트 쇼: 플린트의 맞바꾸기, 리 반 클리프의 한 번 더. 이것도 켜야만 쓴다.
  // 맞바꾸기는 카드를 내는 게 아니라서, 모르고 누르면 카드가 남의 손으로 가 버린다.
  const turnModes = useMemo(() => {
    if (!view || !viewer) return [];
    const out: { key: string; label: string; status: string }[] = [];
    for (const ab of swapAbilitiesOf(view, viewer)) {
      out.push({
        key: ab.key,
        label: `능력 · ${ab.label}`,
        status: '줄 카드를 고르고, 맞바꿀 상대를 지목한다 (Esc 취소)',
      });
    }
    const last = view.turn.lastBrown;
    if (last) {
      const name = CARD_DEFS[last].nameKo;
      for (const ab of repeatAbilitiesOf(view, viewer)) {
        out.push({
          key: ab.key,
          label: `능력 · ${name} 한 번 더`,
          status: `버릴 뱅!을 고른다 — ${eul(name)} 한 번 더 낸다 (Esc 취소)`,
        });
      }
    }
    return out.filter((m) => allLegal.some((a) => a.type === 'playCard' && a.ability === m.key));
  }, [view, viewer, allLegal]);

  // 이 액션이 어느 차례당 한 번 능력으로 내는 것인가. 조건이 붙은 능력(블랙 플라워·더 스팟)은
  // 액션에 ability 가 적혀 있고, 엉클 윌은 '다른 종류로 냈다'로 알아본다.
  const abilityOf = useCallback(
    (a: Action): string | null => {
      if (a.type !== 'playCard') return null;
      if (a.ability) {
        const known =
          playAs.some((ab) => ab.key === a.ability) || turnModes.some((m) => m.key === a.ability);
        return known ? a.ability : null;
      }
      if (a.as === undefined || a.as === kindOf(a.card)) return null;
      return playAs.find((ab) => !isExplicitAbility(ab) && ab.as === a.as)?.key ?? null;
    },
    [playAs],
  );
  const eventModes = useMemo(() => {
    const out = new Set<EventMode>();
    for (const a of allLegal) {
      const m = eventModeOf(a);
      if (m) out.add(m);
    }
    return [...out];
  }, [allLegal]);
  const playAsAbilities = useMemo(
    () => [
      ...playAs
        .filter((ab) => allLegal.some((a) => abilityOf(a) === ab.key))
        .map((ab) => ({ key: ab.key, label: `능력 · ${ab.label}`, as: ab.as })),
      ...turnModes,
      ...eventModes.map((m) => ({
        key: m,
        label: EVENT_MODE_INFO[m].label,
        as: 'bang' as CardKind,
        status: EVENT_MODE_INFO[m].status,
      })),
    ],
    [playAs, allLegal, abilityOf, eventModes, turnModes],
  );
  const armedLive = armedFor && armedFor.turn === turnId ? armedFor.key : null;
  const armedAbility = armedLive
    ? playAs.find((ab) => ab.key === armedLive && playAsAbilities.some((x) => x.key === ab.key))
    : undefined;
  const armedTurnMode = turnModes.find((m) => m.key === armedLive)?.key ?? null;
  const armedMode = eventModes.find((m) => m === armedLive) ?? null;
  const armed = armedAbility?.key ?? armedTurnMode ?? armedMode ?? null;

  const legal = useMemo<Action[]>(
    () =>
      allLegal.filter((a) => {
        if (a.type !== 'playCard') return true;
        // 저격수·리코체 수는 하단 바에서 켰을 때만 쓴다
        const mode = eventModeOf(a);
        if (armedMode) return mode === armedMode;
        if (mode) return false;
        return abilityOf(a) === (armedAbility?.key ?? armedTurnMode ?? null);
      }),
    [allLegal, armedAbility, armedTurnMode, armedMode, abilityOf],
  );

  // 리코체: 상대를 지목한 뒤 그 앞의 카드가 여럿이면 어느 것을 노릴지 한 번 더 고른다
  const [ricochetAt, setRicochetAt] = useState<{ card: CardId; target: PlayerId; turn: string } | null>(
    null,
  );
  // 같은 카드·같은 대상인데 낼 방법이 여럿이면(조준을 붙일지, 패닝의 두 번째 표적, 결전의 '뱅!으로')
  // 첫 수만 나가 버린다. 그때는 방법을 한 번 더 고르게 한다. 이것도 이 화면에만 있는 단계다
  const [variantAt, setVariantAt] = useState<{ card: CardId; keys: string[]; turn: string } | null>(null);
  // 버릴 카드를 고르는 능력(시드 케첨). 조합이 여럿이면 손에서 한 장씩 고른다
  const [abilityPick, setAbilityPick] = useState<{ key: string; picked: CardId[]; turn: string } | null>(
    null,
  );
  // 결전처럼 한 카드를 원래대로도, 뱅!으로도 낼 수 있으면 대상을 고르기 전에 종류부터 고른다.
  // 대상을 합쳐 두면 거리 2 상대를 누른 강탈이 말없이 뱅!으로 나간다
  const [kindAsk, setKindAsk] = useState<{ card: CardId; kinds: CardKind[]; turn: string } | null>(null);
  const [kindPick, setKindPick] = useState<{ card: CardId; as: CardKind; turn: string } | null>(null);

  const actor = selectActor(view);
  const myTurn = Boolean(view && viewer && view.turn.active === viewer && !view.awaiting);
  const waitingOnMe = Boolean(view?.awaiting && view.awaiting.pid === viewer);

  const playable = useMemo(() => {
    const set = new Set<CardId>();
    for (const a of legal) {
      if (a.type !== 'playCard') continue;
      set.add(a.card);
      // 저격수: 쌍의 어느 쪽을 골라도 된다
      if (a.also !== undefined) set.add(a.also);
    }
    return set;
  }, [legal]);

  const discardable = useMemo(() => {
    const set = new Set<CardId>();
    for (const a of legal) if (a.type === 'discardCard') set.add(a.card);
    return set;
  }, [legal]);

  /** 이 카드로 낼 수 있는 모든 수. 저격수 쌍은 어느 쪽 카드로 골라도 잡힌다 */
  const allPlays = useCallback(
    (card: CardId) =>
      legal.filter(
        (a): a is Extract<Action, { type: 'playCard' }> =>
          a.type === 'playCard' && (a.card === card || a.also === card),
      ),
    [legal],
  );

  const kindsFor = useCallback(
    (card: CardId) => {
      const kinds = new Set(allPlays(card).map(playedKind));
      // 원래 종류를 먼저
      return [...kinds].sort((x, y) => Number(y === kindOf(card)) - Number(x === kindOf(card)));
    },
    [allPlays],
  );

  const pickedKind = useCallback(
    (card: CardId) => (kindPick && kindPick.card === card && kindPick.turn === turnId ? kindPick.as : null),
    [kindPick, turnId],
  );

  /** 이 카드로 낼 수 있는 수. 낼 종류를 골라 두었으면 그 종류만 */
  const plays = useCallback(
    (card: CardId, as: CardKind | null = pickedKind(card)) =>
      allPlays(card).filter((a) => as === null || playedKind(a) === as),
    [allPlays, pickedKind],
  );

  // 대상 없이도, 지목해서도 낼 수 있는 카드(결전의 맥주·역마차 등)는 내 자리를 '대상 없이 내기'로 쓴다.
  // 지목 수만 있으면 고르기 모드로 들어가, 맥주를 그냥 마실 길이 막힌다.
  const targetsOf = useCallback(
    (list: Extract<Action, { type: 'playCard' }>[]) => {
      const out = new Set<PlayerId>();
      for (const a of list) if (a.target) out.add(a.target);
      if (out.size > 0 && viewer && list.some((a) => !a.target)) out.add(viewer);
      return [...out];
    },
    [viewer],
  );
  const targetsFor = useCallback((card: CardId) => targetsOf(plays(card)), [targetsOf, plays]);
  const canPlayUntargeted = useCallback((card: CardId) => plays(card).some((a) => !a.target), [plays]);

  const playWith = useCallback(
    (card: CardId, target: PlayerId | undefined, as: CardKind | null) => {
      let matches = plays(card, as).filter((a) => a.target === target);
      if (matches.length === 0 && target && target === viewer) {
        matches = plays(card, as).filter((a) => !a.target);
      }
      if (matches.length === 0) return;
      // 리코체로 노릴 카드가 여럿이면 고르게 한다
      if (armedMode === 'ricochet' && target && matches.length > 1) {
        setRicochetAt({ card, target, turn: turnId });
        setSelected(null);
        return;
      }
      if (matches.length > 1) {
        setVariantAt({ card, keys: matches.map(actionKey), turn: turnId });
        setSelected(null);
        return;
      }
      submit(matches[0]);
      setSelected(null);
      setArmedFor(null);
      setRicochetAt(null);
      setKindPick(null);
    },
    [plays, submit, armedMode, turnId, viewer],
  );
  const playCard = useCallback(
    (card: CardId, target?: PlayerId) => playWith(card, target, pickedKind(card)),
    [playWith, pickedKind],
  );

  const askKind = useCallback(
    (card: CardId) => {
      setSelected(null);
      setVariantAt(null);
      setAbilityPick(null);
      setKindPick(null);
      setKindAsk({ card, kinds: kindsFor(card), turn: turnId });
    },
    [kindsFor, turnId],
  );

  const arm = useCallback(
    (key: string | null) => {
      setArmedFor(key ? { key, turn: turnId } : null);
      setSelected(null);
      setRicochetAt(null);
      setVariantAt(null);
      setAbilityPick(null);
      setKindAsk(null);
      setKindPick(null);
    },
    [turnId],
  );

  const select = useCallback((card: CardId | null) => {
    setSelected(card);
    setVariantAt(null);
    setAbilityPick(null);
    setKindAsk(null);
    // 같은 카드를 다시 고르는 게 아니면 골라 둔 종류는 버린다
    setKindPick((k) => (card !== null && k?.card === card ? k : null));
  }, []);

  // 종류 고르기. 그새 판이 바뀌어 한 종류만 남았으면 닫는다
  const kindChoice = useMemo(() => {
    if (!kindAsk || kindAsk.turn !== turnId) return null;
    const live = kindsFor(kindAsk.card);
    const kinds = kindAsk.kinds.filter((k) => live.includes(k));
    return kinds.length > 1 ? { card: kindAsk.card, kinds } : null;
  }, [kindAsk, turnId, kindsFor]);

  // 리코체 대상 카드 고르기. 엔진의 입력 대기가 아니라 이 화면에만 있는 단계다
  const ricochet = useMemo(() => {
    if (!ricochetAt || ricochetAt.turn !== turnId || armedMode !== 'ricochet') return null;
    const options = plays(ricochetAt.card).filter(
      (a) => a.target === ricochetAt.target && a.pick?.zone === 'equipment',
    );
    return options.length > 0 ? { ...ricochetAt, options } : null;
  }, [ricochetAt, turnId, armedMode, plays]);

  // 고를 방법들. 그새 판이 바뀌어 더 낼 수 없는 수는 뺀다
  const variant = useMemo(() => {
    if (!variantAt || variantAt.turn !== turnId) return null;
    const options = variantAt.keys
      .map((k) => allLegal.find((a) => actionKey(a) === k))
      .filter((a): a is Extract<Action, { type: 'playCard' }> => a?.type === 'playCard');
    return options.length > 1 ? { card: variantAt.card, options } : null;
  }, [variantAt, turnId, allLegal]);

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

  // 시드 케첨 고르기 중이면 아직 맞출 수 있는 조합들
  const pickCombos = useMemo(() => {
    if (!abilityPick || abilityPick.turn !== turnId || !viewer) return null;
    const combos = legal.flatMap((a) =>
      a.type === 'useAbility' && a.ability === abilityPick.key && a.cards ? [a.cards] : [],
    );
    const live = combos.filter((cards) => containsCards(cards, abilityPick.picked));
    return live.length > 0 ? { ...abilityPick, combos: live } : null;
  }, [abilityPick, turnId, viewer, legal]);

  const respond = useCallback(
    (choice: UiChoice) => {
      if (!viewer) return;
      if (kindChoice) {
        setKindAsk(null);
        const as = choice.c === 'variant' ? kindChoice.kinds[choice.index] : undefined;
        if (!as) return;
        const { card } = kindChoice;
        if (targetsOf(plays(card, as)).length === 0) {
          playWith(card, undefined, as);
        } else {
          setKindPick({ card, as, turn: turnId });
          setSelected(card);
        }
        return;
      }
      if (variant) {
        const match = choice.c === 'variant' ? variant.options[choice.index] : undefined;
        if (match) {
          submit(match);
          setArmedFor(null);
        }
        setVariantAt(null);
        return;
      }
      if (pickCombos) {
        if (choice.c !== 'card') {
          setAbilityPick(null);
          return;
        }
        const picked = [...pickCombos.picked, choice.card];
        const done = pickCombos.combos.find((cards) => sameCards(cards, picked));
        if (done) {
          submit({ type: 'useAbility', pid: viewer, ability: pickCombos.key, cards: done });
          setAbilityPick(null);
        } else if (pickCombos.combos.some((cards) => containsCards(cards, picked))) {
          setAbilityPick({ key: pickCombos.key, picked, turn: turnId });
        }
        return;
      }
      if (choice.c === 'variant') return;
      if (ricochet) {
        const match =
          choice.c === 'card'
            ? ricochet.options.find((a) => a.pick?.zone === 'equipment' && a.pick.card === choice.card)
            : undefined;
        if (match) {
          submit(match);
          setArmedFor(null);
        }
        setRicochetAt(null);
        return;
      }
      const wanted = actionKey({ type: 'respond', pid: viewer, choice });
      const match = legal.find((a) => actionKey(a) === wanted);
      if (match) submit(match);
    },
    [legal, submit, viewer, ricochet, variant, pickCombos, turnId, kindChoice, targetsOf, plays, playWith],
  );

  const abilities = useMemo(() => {
    const out: { key: string; label: string; cards: CardId[] }[] = [];
    for (const a of legal) {
      if (a.type !== 'useAbility') continue;
      out.push({ key: a.ability, label: '카드 2장 → 목숨 1', cards: a.cards ?? [] });
    }
    return out;
  }, [legal]);

  // 능력 버튼이 말없이 사라지면 고장처럼 보이므로, 지금 못 쓰는 이유를 흐린 칩으로 띄운다
  const abilityBlocked = useMemo(() => {
    if (!view || !viewer || abilities.length > 0) return null;
    const me = view.players.find((p) => p.id === viewer);
    if (!me || me.ghost) return null;
    // 시드 케첨: 목숨이 가득 차면 엔진이 회복을 막는다
    const hasSid = anytimeAbilitiesOf(view, viewer).some((ab) => ab.key === SID_KETCHUM_ABILITY);
    if (hasSid && me.hp >= me.maxHp) return '능력 · 목숨이 가득 차서 쓸 수 없음';
    // 리 반 클리프: 내 차례에 '한 번 더' 버튼이 없을 때
    const repeat = repeatAbilitiesOf(view, viewer)[0];
    if (repeat && canEndTurn && !turnModes.some((m) => m.key === repeat.key)) {
      const last = view.turn.lastBrown;
      if (!last || !isRepeatableBrown(last)) return '능력 · 갈색 카드를 낸 뒤 뱅!을 버려 한 번 더';
      const name = CARD_DEFS[last].nameKo;
      const hasFrom = me.hand.some((c) => kindOf(c) === repeat.from);
      return hasFrom ? `능력 · ${eul(name)} 다시 낼 수 없음` : `능력 · 뱅!이 없어 ${name} 한 번 더 못 냄`;
    }
    return null;
  }, [view, viewer, abilities, canEndTurn, turnModes]);

  const useAbility = useCallback(
    (key: string, cards: CardId[]) => {
      if (!viewer) return;
      // 버릴 카드 조합이 여럿이면 직접 고르게 한다. 아니면 첫 조합이 말없이 나가 버린다
      const combos = legal.filter((a) => a.type === 'useAbility' && a.ability === key && a.cards);
      if (combos.length > 1) {
        setSelected(null);
        setAbilityPick({ key, picked: [], turn: turnId });
        return;
      }
      const wanted = actionKey({ type: 'useAbility', pid: viewer, ability: key, cards });
      const match = legal.find((a) => actionKey(a) === wanted);
      if (match) submit(match);
    },
    [legal, submit, viewer, turnId],
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

  const prompt = useMemo((): Prompt | null => {
    if (view && ricochet) {
      const cards = ricochet.options.flatMap((a) => (a.pick?.zone === 'equipment' ? [a.pick.card] : []));
      return {
        ...empty(),
        title: `리코체 — ${nameOf(view, ricochet.target)}`,
        hint: '노릴 카드를 고른다',
        canPass: true,
        passLabel: '취소 (W)',
        center: { cards, zone: 'option', handCount: 0 },
      };
    }
    if (view && kindChoice) {
      const own = kindOf(kindChoice.card);
      return {
        ...empty(),
        title: CARD_DEFS[own].nameKo,
        hint: '어떻게 낼지 고른다',
        canPass: true,
        passLabel: '취소 (W)',
        variants: kindChoice.kinds.map((k) => `${ro(CARD_DEFS[k].nameKo)} 낸다`),
      };
    }
    if (view && variant) {
      const first = variant.options[0];
      const name = CARD_DEFS[kindOf(first.card)].nameKo;
      return {
        ...empty(),
        title: first.target ? `${name} — ${nameOf(view, first.target)}` : name,
        hint: '어떻게 낼지 고른다',
        canPass: true,
        passLabel: '취소 (W)',
        variants: variant.options.map((a) => variantLabel(view, a, variant.options, variant.card)),
      };
    }
    if (view && pickCombos) {
      const need = pickCombos.combos[0].length - pickCombos.picked.length;
      return {
        ...empty(),
        title: '능력 · 카드 2장 → 목숨 1',
        hint: `버릴 카드 ${need}장을 고른다`,
        cardOptions: uniqueCards(pickCombos.combos.flatMap((cards) => without(cards, pickCombos.picked))),
        canPass: true,
        passLabel: '취소 (W)',
      };
    }
    return view && waitingOnMe ? buildPrompt(view) : null;
  }, [view, waitingOnMe, ricochet, variant, pickCombos, kindChoice]);

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

  const eventActions = useMemo(
    () => allLegal.filter((a): a is Extract<Action, { type: 'eventAbility' }> => a.type === 'eventAbility'),
    [allLegal],
  );

  return {
    view,
    viewer,
    actor,
    myTurn,
    waitingOnMe,
    playable,
    discardable,
    selected,
    select,
    targetsFor,
    canPlayUntargeted,
    kindsFor,
    askKind,
    selectedAs: selected ? pickedKind(selected) : null,
    playCard,
    canEndTurn,
    endTurn,
    discard,
    prompt,
    respond,
    abilities,
    useAbility,
    abilityBlocked,
    playAsAbilities,
    armed,
    arm,
    draft,
    pickCharacter,
    goldActions,
    sendGold,
    eventActions,
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

export function buildPrompt(view: GameState): Prompt | null {
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
        title: a.reason === 'poker' ? '포커 판돈' : '잡화점',
        hint: a.canPass ? '가져갈 카드를 고르거나 그만 가져간다' : '가져갈 카드를 고른다',
        canPass: Boolean(a.canPass),
        ...(a.canPass ? { passLabel: '그만 가져감 (W)' } : {}),
        // 숫자키로 고를 수 있게 cardOptions 도 둔다. 카드는 가운데 창에만 그린다
        cardOptions: a.options,
        center: { cards: a.options, zone: 'option', handCount: 0 },
      };
    case 'kitCarlson':
      return {
        ...base,
        title: '카드 가져오기',
        hint: `${a.remaining}장을 더 고른다. 남은 카드는 뽑은 순서대로 덱 위로 돌아간다`,
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
        // 손패 뒷면은 어느 장을 눌러도 무작위 1장이다 (엔진이 뽑는다)
        hint:
          a.mode === 'panic'
            ? '가져올 카드를 고른다. 손패는 무작위 1장'
            : '버리게 할 카드를 고른다. 손패는 무작위 1장',
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
      return {
        ...base,
        title: '피요테',
        hint: a.canStop
          ? '맞혔다. 다시 색을 부르거나 여기서 그만둔다 (틀려도 잃는 카드는 없다)'
          : '덱 맨 위 카드의 색을 맞힌다',
        colors: true,
        ...(a.canStop ? { canPass: true, passLabel: '그만둔다 (W)' } : {}),
      };
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
    case 'borrowCharacters':
      return {
        ...base,
        title: '그레고리 덱',
        hint: `지금 빌린 능력: ${a.current.map((c) => CHARACTERS[c].nameKo).join(', ')} · 새로 2명을 뽑을까`,
        yesNo: true,
        canPass: true,
        passLabel: '그대로 둔다 (W)',
      };
    case 'giveCard':
      return {
        ...base,
        title: `율 그리너 — ${nameOf(view, a.to)}`,
        hint: '손패가 더 많아 카드 1장을 줘야 한다. 줄 카드를 고른다',
        cardOptions: a.options,
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

// ---------------------------------------------------------------------------
// 낼 방법 고르기 · 카드 조합
// ---------------------------------------------------------------------------

function cardShort(id: CardId): string {
  const c = cardOf(id);
  return `${CARD_DEFS[c.kind].nameKo} ${SUIT_GLYPH[c.suit]}${c.rank}`;
}

/** 같은 카드·같은 대상의 여러 수를, 서로 다른 점만 적어 구분한다 */
/** 낸 수가 어떤 종류로 나가는가 */
function playedKind(a: Extract<Action, { type: 'playCard' }>): CardKind {
  return a.as ?? kindOf(a.card);
}

function variantLabel(
  view: GameState,
  a: Extract<Action, { type: 'playCard' }>,
  all: Extract<Action, { type: 'playCard' }>[],
  picked: CardId,
): string {
  const kind = a.as ?? kindOf(a.card);
  const name = CARD_DEFS[kind].nameKo;
  const parts: string[] = [];
  if (all.some((x) => (x.as ?? kindOf(x.card)) !== kind)) parts.push(`${ro(name)} 낸다`);
  if (a.extra) parts.push(`${eul(cardShort(a.extra))} 함께`);
  else if (all.some((x) => x.extra)) parts.push(`${name}만`);
  if (a.target2) parts.push(`${nameOf(view, a.target2)}에게도`);
  else if (all.some((x) => x.target2)) parts.push('한 명만');
  // 저격수: 고른 카드가 아닌 쪽이 함께 버릴 카드다
  if (a.also) parts.push(`${eul(cardShort(a.card === picked ? a.also : a.card))} 함께 버린다`);
  return parts.length > 0 ? parts.join(' · ') : name;
}

function without(cards: CardId[], used: CardId[]): CardId[] {
  const rest = [...cards];
  for (const u of used) {
    const i = rest.indexOf(u);
    if (i >= 0) rest.splice(i, 1);
  }
  return rest;
}

function containsCards(cards: CardId[], picked: CardId[]): boolean {
  return without(cards, picked).length === cards.length - picked.length;
}

function sameCards(cards: CardId[], picked: CardId[]): boolean {
  return cards.length === picked.length && containsCards(cards, picked);
}

function uniqueCards(cards: CardId[]): CardId[] {
  return [...new Set(cards)];
}
