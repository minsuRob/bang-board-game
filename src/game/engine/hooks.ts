/**
 * 능력 훅 디스패처.
 *
 * "지금 이 플레이어에게 걸려 있는 훅이 무엇인가"를 매번 새로 조회한다.
 * 정적으로 등록해 두면 능력 무효화(숙취)나 캐릭터 교체(새로운 신분)를 못 버틴다.
 */

import { CHARACTER_MODIFIERS, equipmentModifier, EVENT_MODIFIERS } from '../modifiers';
import type { CardId, CardKind } from '../data/types';
import { kindOf, playerOf } from './cards';
import type { AnytimeAbility, ModCtx, Modifier } from './modifier';
import type { Frame, GameState, PlayerId } from './types';

const DEFAULT_ORDER = 50;

/** 지금 활성인 이벤트의 훅 (확장을 안 쓰면 null) */
export function eventModifier(state: GameState): Modifier | null {
  const id = state.event?.current;
  return id ? EVENT_MODIFIERS[id] : null;
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
  for (const card of p.equipment) {
    const m = equipmentModifier(kindOf(card), card);
    if (m) mods.push(m);
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

/** 판정에서 들여다보는 장수 (기본 1, 러키 듀크 2) */
export function judgementPeekOf(state: GameState, pid: PlayerId): number {
  let n = 1;
  for (const m of getModifiers(state, pid)) {
    if (m.judgementPeek) n = Math.max(n, m.judgementPeek);
  }
  return n;
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
  return getModifiers(state, pid).some((m) => m.canUseAs?.(from, as) ?? false);
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
  source: PlayerId,
): Frame[] {
  const ctx = ctxOf(state, target);
  return getModifiers(state, target).flatMap((m) => m.onTargetedByBang?.(ctx, source) ?? []);
}

export function onDamagedFrames(
  state: GameState,
  target: PlayerId,
  amount: number,
  source: PlayerId | null,
): Frame[] {
  const ctx = ctxOf(state, target);
  return getModifiers(state, target).flatMap((m) => m.onDamaged?.(ctx, amount, source) ?? []);
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
): Frame[] | null {
  const ctx = ctxOf(state, pid);
  for (const m of getModifiers(state, pid)) {
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
