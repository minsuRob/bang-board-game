/**
 * 능력 훅 디스패처.
 *
 * "지금 이 플레이어에게 걸려 있는 훅이 무엇인가"를 매번 새로 조회한다.
 * 정적으로 등록해 두면 능력 무효화(숙취)나 캐릭터 교체(새로운 신분)를 못 버틴다.
 */

import { CHARACTER_MODIFIERS, equipmentModifier, EVENT_MODIFIERS } from '../modifiers';
import { CARD_DEFS } from '../data/cards.base';
import { GOLD_MODIFIERS } from '../modifiers/goldrush';
import { goldKindOf } from '../data/cards.goldrush';
import type { CardId, CardKind } from '../data/types';
import { kindOf, playerOf } from './cards';
import { goldEquipOf } from './gold';
import type {
  AnytimeAbility,
  GoldAbility,
  GoldDiscount,
  ModCtx,
  Modifier,
  PlayAsAbility,
} from './modifier';
import type { DamageCause, Frame, GameState, PlayerId } from './types';

const DEFAULT_ORDER = 50;

/** 지금 활성인 이벤트의 훅 (확장을 안 쓰면 null) */
export function eventModifier(state: GameState): Modifier | null {
  const id = state.event?.current;
  return id ? EVENT_MODIFIERS[id] : null;
}

/** 올가미처럼 앞에 놓인 카드의 효과를 통째로 죽이는 효과가 걸려 있는가 */
export function equipmentDisabled(state: GameState): boolean {
  return eventModifier(state)?.disablesEquipment === true;
}

/** 자리 거리 대신 쓰는 고정 거리 (매복). 없으면 null */
export function fixedDistanceOf(state: GameState): number | null {
  return eventModifier(state)?.fixedDistance ?? null;
}

/** 카드 가져오기 단계가 버린 더미에서 가져오는가 (폐광) */
export function drawsFromDiscard(state: GameState): boolean {
  return eventModifier(state)?.drawsFromDiscard === true;
}

/** 버리기 단계의 카드가 덱 위로 가는가 (폐광) */
export function discardsToDeck(state: GameState): boolean {
  return eventModifier(state)?.discardsToDeck === true;
}

/** 숙취처럼 캐릭터 능력을 통째로 죽이는 효과가 걸려 있는가 */
export function characterAbilitiesDisabled(state: GameState): boolean {
  return eventModifier(state)?.disablesCharacterAbilities === true;
}

/**
 * 이 플레이어에게 걸린 모든 훅. 발동 순서(order)대로 정렬해서 돌려준다.
 * 캐릭터 → 장비 → 이벤트 순이 기본이다.
 */
export function getModifiers(state: GameState, pid: PlayerId): Modifier[] {
  const p = playerOf(state, pid);
  const mods: Modifier[] = [];

  if (!characterAbilitiesDisabled(state)) {
    mods.push(CHARACTER_MODIFIERS[p.character]);
  }
  if (!equipmentDisabled(state)) {
    for (const card of p.equipment) {
      const m = equipmentModifier(kindOf(card), card);
      if (m) mods.push(m);
    }
    for (const card of goldEquipOf(p)) {
      const make = GOLD_MODIFIERS[goldKindOf(card)];
      if (make) mods.push(make(card));
    }
  }
  const ev = eventModifier(state);
  if (ev) mods.push(ev);

  return mods.sort((a, b) => (a.order ?? DEFAULT_ORDER) - (b.order ?? DEFAULT_ORDER));
}

function ctxOf(state: GameState, pid: PlayerId): ModCtx {
  return { state, pid };
}

// ---------------------------------------------------------------------------
// 수치를 바꾸는 훅
// ---------------------------------------------------------------------------

/** 이번 차례에 쓸 수 있는 뱅! 최대 횟수 (기본 1) */
export function bangLimitOf(state: GameState, pid: PlayerId): number {
  let limit = 1;
  for (const m of getModifiers(state, pid)) {
    if (m.bangLimit) limit = Math.max(limit, m.bangLimit(limit));
  }
  return limit;
}

/** 이 사람이 쏜 뱅!을 막는 데 필요한 빗나감 장수 (기본 1) */
export function outgoingBangMissesOf(state: GameState, pid: PlayerId): number {
  let n = 1;
  for (const m of getModifiers(state, pid)) {
    if (m.outgoingBangMisses) n = m.outgoingBangMisses(n);
  }
  return n;
}

/** 판정에서 들여다보는 장수 (기본 1, 러키 듀크 2, 편자 +1) */
export function judgementPeekOf(state: GameState, pid: PlayerId): number {
  let n = 1;
  let bonus = 0;
  for (const m of getModifiers(state, pid)) {
    if (m.judgementPeek) n = Math.max(n, m.judgementPeek);
    bonus += m.judgementPeekBonus ?? 0;
  }
  return n + bonus;
}

/** 카드 가져오기 단계에서 가져올 장수 (기본 2) */
export function drawCountOf(state: GameState, pid: PlayerId): number {
  let n = 2;
  const ctx = ctxOf(state, pid);
  for (const m of getModifiers(state, pid)) {
    if (m.drawCount) n = m.drawCount(n, ctx);
  }
  return Math.max(0, n);
}

/** 차례 진행 방향 (골드러시면 -1) */
export function turnDirectionOf(state: GameState): 1 | -1 {
  return eventModifier(state)?.turnDirection ?? 1;
}

/** 제거된 플레이어도 차례를 받는가 (유령도시) */
export function resurrectsEliminated(state: GameState): boolean {
  return eventModifier(state)?.resurrectsEliminated === true;
}

// ---------------------------------------------------------------------------
// 사용 가능 여부
// ---------------------------------------------------------------------------

/** 지금 이 카드를 이 종류로 쓸 수 있는가 (설교·목사·수갑) */
export function canPlayCard(
  state: GameState,
  pid: PlayerId,
  kind: CardKind,
  card: CardId,
  reactive = false,
): boolean {
  const ctx = ctxOf(state, pid);
  return getModifiers(state, pid).every((m) => m.canPlay?.(ctx, kind, card, reactive) ?? true);
}

/**
 * 손에 든 카드를 다른 종류로 취급해 쓸 수 있는가.
 * 같은 종류면 언제나 참. 칼라미티 자넷만 뱅!↔빗나감! 을 바꾼다.
 */
export function canUseCardAs(
  state: GameState,
  pid: PlayerId,
  from: CardKind,
  as: CardKind,
): boolean {
  if (from === as) return true;
  // 카드 자체가 다른 종류로도 치는 경우 (역화 = 빗나감!)
  if (CARD_DEFS[from].countsAs === as) return true;
  const ctx = ctxOf(state, pid);
  return getModifiers(state, pid).some((m) => m.canUseAs?.(from, as, ctx) ?? false);
}

/** 이번 차례에 아직 쓸 수 있는 '아무 카드나 ~로' 능력 (엉클 윌) */
export function playAnyAsAbilitiesOf(
  state: GameState,
  pid: PlayerId,
  includeUsed = false,
): PlayAsAbility[] {
  const used = playerOf(state, pid).usedThisTurn;
  return getModifiers(state, pid)
    .flatMap((m) => (m.playAnyAs ? [m.playAnyAs] : []))
    .filter((ab) => includeUsed || !used.includes(ab.key));
}

/** 언제든 쓸 수 있는 능력 목록 */
export function anytimeAbilitiesOf(state: GameState, pid: PlayerId): AnytimeAbility[] {
  return getModifiers(state, pid).flatMap((m) => m.anytime ?? []);
}

// ---------------------------------------------------------------------------
// 프레임을 만드는 훅
// ---------------------------------------------------------------------------

export function onTargetedByBangFrames(
  state: GameState,
  target: PlayerId,
  /** 쏜 사람. 한줌의 카드처럼 쏜 사람이 없으면 null */
  source: PlayerId | null,
): Frame[] {
  const ctx = ctxOf(state, target);
  return getModifiers(state, target).flatMap((m) => m.onTargetedByBang?.(ctx, source) ?? []);
}

export function onDamagedFrames(
  state: GameState,
  target: PlayerId,
  amount: number,
  source: PlayerId | null,
  cause?: DamageCause,
): Frame[] {
  const ctx = ctxOf(state, target);
  return getModifiers(state, target).flatMap((m) => m.onDamaged?.(ctx, amount, source, cause) ?? []);
}

/** 가해자 쪽 훅 (샷건). 가해자가 자리에 없으면 울리지 않는다 */
export function onDealtDamageFrames(
  state: GameState,
  source: PlayerId,
  target: PlayerId,
  amount: number,
  cause: DamageCause,
): Frame[] {
  const p = state.players.find((x) => x.id === source);
  if (!p || !(p.alive || p.ghost)) return [];
  const ctx = ctxOf(state, source);
  return getModifiers(state, source).flatMap((m) => m.onDealtDamage?.(ctx, target, amount, cause) ?? []);
}

export function onHandEmptyFrames(state: GameState, pid: PlayerId): Frame[] {
  const ctx = ctxOf(state, pid);
  return getModifiers(state, pid).flatMap((m) => m.onHandEmpty?.(ctx) ?? []);
}

/** 누군가 제거될 때, 살아 있는 모든 사람의 훅을 좌석 순으로 훑는다 (벌쳐 샘) */
export function onEliminatedFrames(state: GameState, victim: PlayerId): Frame[] {
  const frames: Frame[] = [];
  for (const p of state.players) {
    if (!p.alive || p.id === victim) continue;
    const ctx = ctxOf(state, p.id);
    for (const m of getModifiers(state, p.id)) {
      frames.push(...(m.onEliminated?.(ctx, victim) ?? []));
    }
  }
  return frames;
}

export function onTurnStartFrames(state: GameState, pid: PlayerId): Frame[] {
  const ctx = ctxOf(state, pid);
  return getModifiers(state, pid).flatMap((m) => m.onTurnStart?.(ctx) ?? []);
}

/** 파랑 카드를 앞에 내려놓은 직후. pid 는 카드를 낸 사람이다 (조니 키시) */
export function onPutInPlayFrames(
  state: GameState,
  pid: PlayerId,
  card: CardId,
  holder: PlayerId,
): Frame[] {
  const ctx = ctxOf(state, pid);
  return getModifiers(state, pid).flatMap((m) => m.onPutInPlay?.(ctx, card, holder) ?? []);
}

export function onEventEnterFrames(state: GameState): Frame[] {
  return eventModifier(state)?.onEventEnter?.(state) ?? [];
}

export function onDrawPhaseEndFrames(state: GameState, pid: PlayerId): Frame[] {
  const ctx = ctxOf(state, pid);
  return getModifiers(state, pid).flatMap((m) => m.onDrawPhaseEnd?.(ctx) ?? []);
}

/** 카드 가져오기 단계를 대신하는 훅. 없으면 null */
export function drawPhaseOverride(
  state: GameState,
  pid: PlayerId,
  count: number,
  /** 이벤트가 가로챈 가져오기를 거절한 뒤(독한 술)라 이벤트 훅은 건너뛴다 */
  skipEvent = false,
): Frame[] | null {
  const ctx = ctxOf(state, pid);
  for (const m of getModifiers(state, pid)) {
    if (skipEvent && m.from === 'event') continue;
    const frames = m.drawPhase?.(ctx, count);
    if (frames) return frames;
  }
  return null;
}

export function afterDrawFrames(
  state: GameState,
  pid: PlayerId,
  drawn: CardId[],
): Frame[] {
  const ctx = ctxOf(state, pid);
  return getModifiers(state, pid).flatMap((m) => m.afterDraw?.(ctx, drawn) ?? []);
}

/**
 * 손에서 지금 'as' 종류로 낼 수 있는 카드들.
 *
 * 칼라미티 자넷의 치환은 여기 한 곳을 지나간다. 사용 시점마다 따로 처리하면
 * 결투나 인디언 경로에서 반드시 샌다. (원본 맵 v0.128 / v0.229 패치노트)
 *
 * reactive 는 '사용'이 아니라 '버림'인 경우다 (결투 응수·인디언 대응·빗나감 제출).
 */
export function playableAs(
  state: GameState,
  pid: PlayerId,
  as: CardKind,
  reactive: boolean,
): CardId[] {
  const p = playerOf(state, pid);
  return p.hand.filter(
    (c) => canUseCardAs(state, pid, kindOf(c), as) && canPlayCard(state, pid, as, c, reactive),
  );
}

/**
 * 뱅!이 아닌 갈색 카드(kind)의 대상이 된 pid 가 그 효과를 피하려고 낼 수 있는 카드.
 * 탈출 카드는 누구나, 믹 디펜더는 빗나감!(으로 칠 수 있는 카드)도 낸다. 남의 차례에 내는
 * 반응이라 reactive 로 판정한다.
 */
export function evadeOptions(state: GameState, pid: PlayerId, kind: CardKind): CardId[] {
  // 패닝은 뱅!으로 친다
  if (kind === 'bang' || kind === 'fanning' || CARD_DEFS[kind].category !== 'brown') return [];
  const p = playerOf(state, pid);
  const out = new Set<CardId>(
    p.hand.filter((c) => kindOf(c) === 'escape' && canPlayCard(state, pid, 'escape', c, true)),
  );
  for (const m of getModifiers(state, pid)) {
    if (!m.evadeBrownWith) continue;
    for (const c of playableAs(state, pid, m.evadeBrownWith, true)) out.add(c);
  }
  return [...out];
}

/** 피할 카드가 있으면 evade 로 감싸고, 없으면 그대로 */
export function withEvade(
  state: GameState,
  pid: PlayerId,
  source: PlayerId,
  kind: CardKind,
  then: Frame,
): Frame {
  if (pid === source) return then;
  return evadeOptions(state, pid, kind).length > 0 ? { k: 'evade', pid, source, kind, then } : then;
}

export function onPlayBangFrames(state: GameState, pid: PlayerId, target: PlayerId): Frame[] {
  const ctx = ctxOf(state, pid);
  return getModifiers(state, pid).flatMap((m) => m.onPlayBang?.(ctx, target) ?? []);
}

/** 조건(종류·무늬·추가 뱅!)이 붙은 능력은 액션에 ability 로 명시해서 낸다 */
export function isExplicitAbility(ab: PlayAsAbility): boolean {
  return Boolean(ab.from || ab.suit || ab.extra);
}

/** 헨리 블록: victim 의 카드를 taker 가 가져가거나 버리게 했다 */
export function onCardTakenFrames(state: GameState, victim: PlayerId, taker: PlayerId): Frame[] {
  if (victim === taker) return [];
  const ctx = ctxOf(state, victim);
  return getModifiers(state, victim).flatMap((m) => m.onCardTaken?.(ctx, taker) ?? []);
}

/** 레모네이드 짐: player 가 kind 카드를 냈다. 자리에 있는 다른 사람들의 훅을 좌석 순으로 */
export function onOtherPlaysCardFrames(state: GameState, player: PlayerId, kind: CardKind): Frame[] {
  const frames: Frame[] = [];
  for (const p of state.players) {
    if (p.id === player || !(p.alive || p.ghost)) continue;
    const ctx = ctxOf(state, p.id);
    for (const m of getModifiers(state, p.id)) frames.push(...(m.onOtherPlaysCard?.(ctx, player, kind) ?? []));
  }
  return frames;
}

// ---------------------------------------------------------------------------
// 골드 러시
// ---------------------------------------------------------------------------

/** 차례를 마칠 때 들 수 있는 손패 한도 (기본 = 목숨, 탄띠 8) */
export function handLimitOf(state: GameState, pid: PlayerId): number {
  const base = Math.max(0, playerOf(state, pid).hp);
  let limit = base;
  for (const m of getModifiers(state, pid)) {
    if (m.handLimit) limit = Math.max(limit, m.handLimit(base));
  }
  return limit;
}

export function onTurnEndFrames(state: GameState, pid: PlayerId): Frame[] {
  const ctx = ctxOf(state, pid);
  return getModifiers(state, pid).flatMap((m) => m.onTurnEnd?.(ctx) ?? []);
}

/** 누군가 맥주를 냈을 때, 자리에 있는 모든 사람의 훅을 좌석 순으로 훑는다 (마담 이토) */
export function onBeerPlayedFrames(state: GameState, by: PlayerId): Frame[] {
  const frames: Frame[] = [];
  for (const p of state.players) {
    if (!p.alive && !p.ghost) continue;
    const ctx = ctxOf(state, p.id);
    for (const m of getModifiers(state, p.id)) {
      frames.push(...(m.onBeerPlayed?.(ctx, by) ?? []));
    }
  }
  return frames;
}

/** 이번 차례에 아직 쓸 수 있는 구매 할인 (프리티 루제나) */
export function goldDiscountOf(state: GameState, pid: PlayerId): GoldDiscount | null {
  const used = playerOf(state, pid).usedThisTurn;
  for (const m of getModifiers(state, pid)) {
    if (m.goldDiscount && !used.includes(m.goldDiscount.key)) return m.goldDiscount;
  }
  return null;
}

/** 금덩이를 내고 쓰는 능력. 같은 key 가 둘이면 하나만 남긴다 */
export function goldAbilitiesOf(state: GameState, pid: PlayerId): GoldAbility[] {
  const seen = new Set<string>();
  const out: GoldAbility[] = [];
  for (const m of getModifiers(state, pid)) {
    for (const ab of m.goldAbilities ?? []) {
      if (seen.has(ab.key)) continue;
      seen.add(ab.key);
      out.push(ab);
    }
  }
  return out;
}

/** 이 카드가 target 에게 효과가 없는가 (칼루멧) */
export function immuneToCard(
  state: GameState,
  target: PlayerId,
  card: CardId,
  source: PlayerId,
): boolean {
  if (target === source) return false;
  const ctx = ctxOf(state, target);
  return getModifiers(state, target).some((m) => m.immuneToCard?.(ctx, card, source) ?? false);
}
