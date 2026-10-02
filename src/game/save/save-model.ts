/**
 * 판 저장본의 모양과 순수 규칙.
 *
 * React·Firebase·AsyncStorage 를 import 하지 않는다. 테스트에서 그대로 돌고,
 * 어느 저장소(이 기기 / Firestore)에 넣든 같은 레코드를 쓴다.
 *
 * 저장은 사람 자리가 모두 탈락해 AI 끼리 남았을 때만 연다 (관전 모드는 드래프트가 끝나면 언제나).
 * 그 뒤로는 누구의 입력도 기다리지 않으므로 어느 순간을 떠도 이어 가는 데 모자람이 없다.
 *
 * 액션 로그를 다시 접지 않고 GameState 스냅숏을 그대로 담는다. GameState 는 JSON 으로
 * 완전히 왕복된다는 것이 엔진 규칙이다. 스냅숏이라 엔진이 바뀌어 예전 액션이 다르게 풀려도
 * 저장한 순간의 판은 그대로 돌아온다.
 *
 * 본문은 JSON 문자열 한 덩어리다. Firestore 는 undefined 와 '배열 안의 배열' 을 못 담지만
 * 문자열은 그대로 들어간다. 저장소 쪽에서 모양을 신경 쓸 일이 없다.
 */

import type { AiTier } from '../ai/types';
import { EXPANSION_LABEL, type Expansion } from '../data/types';
import type { GameState, PlayerId } from '../engine';

/** 레코드 형식 번호. 본문 모양이 바뀌면 올리고, 예전 저장본은 불러오기에서 거절한다 */
export const SAVE_FORMAT = 1;

/**
 * 본문 크기 한도 (UTF-8 바이트).
 * Firestore 문서 한도가 1 MiB 라 여유를 두었다. 기기 저장소(웹 localStorage 약 5MB)는 이보다 넉넉하다.
 */
export const MAX_SAVE_BYTES = 900_000;

/** 저장해 둘 수 있는 판 수. 기기·클라우드 모두 같은 값을 쓴다 */
export const MAX_SAVES = 10;

/** 목록에 보일 요약. 본문을 풀지 않고도 그릴 수 있다 */
export type SaveMeta = {
  id: string;
  format: number;
  /** 저장한 시각 (ms) */
  savedAt: number;
  playerCount: number;
  expansions: Expansion[];
  round: number;
  /** 살아 있는 사람 수 */
  alive: number;
  /** 처음부터 AI 끼리 두던 관전 판인가 */
  spectate: boolean;
  /** 판이 흐른 시간 (ms). 이어 볼 때 시계가 여기서부터 간다 */
  elapsedMs: number;
  /** 본문 크기 (UTF-8 바이트) */
  bytes: number;
};

export type SavedSeat = {
  id: PlayerId;
  name: string;
  human: boolean;
  tier: AiTier;
};

/** 풀어 놓은 저장본. 게임 화면이 이것으로 판을 다시 연다 */
export type SavedGame = {
  meta: SaveMeta;
  /** AI 결정 난수의 바탕 (ai-driver 가 seed * 7919 + seq 로 쓴다) */
  seed: number;
  seats: SavedSeat[];
  /** 이 기기가 두던 자리. 관전 판이면 비어 있다 */
  controlled: PlayerId[];
  state: GameState;
};

/** 저장소가 실제로 들고 있는 것. 요약과 본문(JSON 문자열)을 따로 둔다 */
export type SaveRecord = {
  meta: SaveMeta;
  body: string;
};

type SaveBody = {
  seed: number;
  seats: SavedSeat[];
  controlled: PlayerId[];
  state: GameState;
};

// ---------------------------------------------------------------------------
// 저장할 수 있는가
// ---------------------------------------------------------------------------

/**
 * 지금 판을 저장할 수 있는가.
 *
 * humanSeats = 사람이 두는 자리. 이 자리가 전부 탈락했으면(유령도시로 잠깐 돌아온 유령도 아니면)
 * AI 끼리 남은 것이다. 비어 있으면 관전 판이라 드래프트만 끝나면 언제든 된다.
 */
export function canSaveGame(state: GameState | null, humanSeats: readonly PlayerId[]): boolean {
  if (!state || state.result || state.draft) return false;
  return humanSeats.every((pid) => {
    const p = state.players.find((x) => x.id === pid);
    return !p || (!p.alive && !p.ghost);
  });
}

// ---------------------------------------------------------------------------
// 레코드 만들기 · 풀기
// ---------------------------------------------------------------------------

export type SaveInput = {
  id: string;
  savedAt: number;
  seed: number;
  seats: readonly SavedSeat[];
  controlled: readonly PlayerId[];
  state: GameState;
  elapsedMs: number;
};

export class SaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveError';
  }
}

export function makeSaveRecord(input: SaveInput): SaveRecord {
  const body: SaveBody = {
    seed: input.seed,
    seats: input.seats.map((s) => ({ id: s.id, name: s.name, human: s.human, tier: s.tier })),
    controlled: [...input.controlled],
    state: input.state,
  };
  const text = JSON.stringify(body);
  const bytes = utf8Length(text);
  if (bytes > MAX_SAVE_BYTES) {
    throw new SaveError(
      `판이 너무 길어 저장할 수 없다 (${Math.ceil(bytes / 1024)}KB, 한도 ${Math.floor(MAX_SAVE_BYTES / 1024)}KB).`,
    );
  }
  const { state } = input;
  return {
    meta: {
      id: input.id,
      format: SAVE_FORMAT,
      savedAt: input.savedAt,
      playerCount: state.config.playerCount,
      expansions: [...state.config.expansions],
      round: state.turn.round,
      alive: state.players.filter((p) => p.alive).length,
      spectate: input.controlled.length === 0,
      elapsedMs: Math.max(0, Math.round(input.elapsedMs)),
      bytes,
    },
    body: text,
  };
}

/** 저장소에서 꺼낸 레코드를 푼다. 모양이 어긋나면 SaveError 를 던진다 */
export function readSaveRecord(record: SaveRecord): SavedGame {
  const { meta } = record;
  if (meta.format !== SAVE_FORMAT) {
    throw new SaveError('예전 형식의 저장본이라 불러올 수 없다.');
  }
  let body: SaveBody;
  try {
    body = JSON.parse(record.body) as SaveBody;
  } catch {
    throw new SaveError('저장본이 깨져 불러올 수 없다.');
  }
  const s = body?.state;
  const shapeOk =
    typeof body?.seed === 'number' &&
    Array.isArray(body.seats) &&
    Array.isArray(body.controlled) &&
    s != null &&
    Array.isArray(s.players) &&
    s.players.length === body.seats.length &&
    Array.isArray(s.deck) &&
    Array.isArray(s.stack) &&
    typeof s.seq === 'number' &&
    s.turn != null;
  if (!shapeOk) throw new SaveError('저장본이 깨져 불러올 수 없다.');
  return { meta, seed: body.seed, seats: body.seats, controlled: body.controlled, state: s };
}

/** 목록 한 줄. 저장소가 돌려준 값이라 모양을 한 번 확인한다 */
export function isSaveMeta(x: unknown): x is SaveMeta {
  if (!x || typeof x !== 'object') return false;
  const m = x as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    typeof m.format === 'number' &&
    typeof m.savedAt === 'number' &&
    typeof m.playerCount === 'number' &&
    Array.isArray(m.expansions) &&
    typeof m.round === 'number' &&
    typeof m.alive === 'number' &&
    typeof m.spectate === 'boolean' &&
    typeof m.elapsedMs === 'number' &&
    typeof m.bytes === 'number'
  );
}

/** 최근에 저장한 것이 앞에 오게 */
export function sortSaves(list: SaveMeta[]): SaveMeta[] {
  return [...list].sort((a, b) => b.savedAt - a.savedAt);
}

/** 저장 칸 id. 시각 + 무작위 꼬리라 기기 사이에서도 겹치지 않는다 */
export function newSaveId(now: number, random: () => number): string {
  const tail = Math.floor(random() * 36 ** 6)
    .toString(36)
    .padStart(6, '0');
  return `${now.toString(36)}-${tail}`;
}

// ---------------------------------------------------------------------------
// 화면 문구
// ---------------------------------------------------------------------------

/** 예: "5인 · 하이 눈 · 4라운드 · 3명 생존" */
export function saveSummary(meta: SaveMeta): string {
  const parts = [`${meta.playerCount}인`];
  for (const e of meta.expansions) parts.push(EXPANSION_LABEL[e] ?? e);
  parts.push(`${Math.max(1, meta.round)}라운드`, `${meta.alive}명 생존`);
  if (meta.spectate) parts.push('관전');
  return parts.join(' · ');
}

/** 예: "9월 30일 15:22". 기기 시간대를 따른다 */
export function savedAtLabel(savedAt: number): string {
  const d = new Date(savedAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 문자열을 UTF-8 로 적었을 때의 바이트 수. Firestore 는 이 값으로 한도를 잰다 */
export function utf8Length(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      // 서로게이트 쌍 = 4바이트 한 글자
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}
