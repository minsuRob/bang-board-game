/**
 * 지갑·프로필·올린 판(match) 문서의 모양과 순수 규칙.
 *
 * Firebase 도 React 도 import 하지 않는다. 클라이언트가 올리고 Cloud Functions 가 읽는 문서라
 * 양쪽이 같은 가드를 써야 한다 (docs/economy.md).
 *
 *   users/{uid}                { nick, createdAt, updatedAt }
 *   users/{uid}/wallet/main    Wallet            서버만 쓴다
 *   users/{uid}/ledger/{id}    LedgerEntry       서버만 쓴다
 *   matches/{uid}_{seed}       MatchDoc          본인이 한 번 만들고, 서버가 status 를 바꾼다
 */

import type { AiTier } from '../ai/types';
import { EXPANSIONS } from '../data/types';
import type { Action, PlayerId } from '../engine/types';
import { utf8Length } from '../save/save-model';
import { MAX_MATCH_LOG_BYTES, NICK_MAX } from './constants';
import type { Applied } from './wallet';

export type UserProfile = {
  nick: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type Wallet = {
  cash: number;
  xp: number;
  games: number;
  wins: number;
  /** 하루 한도를 세는 날짜 키 (YYYY-MM-DD, KST) */
  day: string;
  /** 그 날 받은 돈 */
  dayCash: number;
  updatedAt: number;
};

export type LedgerEntry = {
  kind: 'room' | 'local';
  /** 방 코드 또는 시드 */
  ref: string;
  cash: number;
  xp: number;
  won: boolean;
  capped: boolean;
  at: number;
};

export type MatchSeat = {
  id: PlayerId;
  name: string;
  human: boolean;
  tier: AiTier;
};

export type MatchStatus = 'pending' | 'settled' | 'rejected';

export type RejectReason =
  | 'shape'
  | 'seed'
  | 'seats'
  | 'controlled'
  | 'config'
  | 'illegal'
  | 'aiMismatch'
  | 'aiTimeout'
  | 'unfinished'
  | 'tooShort'
  | 'replay';

export type MatchDoc = {
  uid: string;
  seed: number;
  seats: MatchSeat[];
  controlled: PlayerId[];
  /** JSON 으로 적은 Action[] */
  log: string;
  /** 액션 수 (log 를 풀지 않고 보는 요약) */
  actions: number;
  status: MatchStatus;
  reason?: RejectReason;
  credit?: Applied;
  createdAt?: unknown;
  settledAt?: number;
};

export class EconomyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EconomyError';
  }
}

/** matches 문서 id. 같은 사람이 같은 시드로 두 번 받지 못하게 한다 */
export function matchId(uid: string, seed: number): string {
  return `${uid}_${seed}`;
}

export type MatchUploadInput = {
  uid: string;
  seed: number;
  seats: readonly MatchSeat[];
  controlled: readonly PlayerId[];
  actions: readonly Action[];
};

/** 올릴 문서를 만든다. 로그가 너무 크면 EconomyError */
export function makeMatchUpload(input: MatchUploadInput): {
  id: string;
  doc: Omit<MatchDoc, 'createdAt'>;
} {
  const log = JSON.stringify(input.actions);
  const bytes = utf8Length(log);
  if (bytes > MAX_MATCH_LOG_BYTES) {
    throw new EconomyError(
      `판 기록이 너무 길어 올릴 수 없다 (${Math.ceil(bytes / 1024)}KB, 한도 ${Math.floor(MAX_MATCH_LOG_BYTES / 1024)}KB).`,
    );
  }
  return {
    id: matchId(input.uid, input.seed),
    doc: {
      uid: input.uid,
      seed: input.seed,
      seats: input.seats.map((s) => ({ id: s.id, name: s.name, human: s.human, tier: s.tier })),
      controlled: [...input.controlled],
      log,
      actions: input.actions.length,
      status: 'pending',
    },
  };
}

/** 문서의 로그를 푼다. 깨졌으면 null */
export function parseMatchLog(doc: Pick<MatchDoc, 'log'>): Action[] | null {
  try {
    const parsed = JSON.parse(doc.log) as unknown;
    if (!Array.isArray(parsed)) return null;
    if (!parsed.every((a) => a && typeof a === 'object' && typeof (a as { type?: unknown }).type === 'string')) {
      return null;
    }
    return parsed as Action[];
  } catch {
    return null;
  }
}

/** JSON 왕복 전과 후를 같은 모양으로 맞춘다 (undefined 필드 제거) */
export function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clean) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = clean(v);
    }
    return out as T;
  }
  return value;
}

/** 닉네임을 다듬는다. 비면 null */
export function cleanNick(raw: string): string | null {
  const text = raw.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  let out = '';
  for (const ch of text) {
    if (out.length + ch.length > NICK_MAX) break;
    out += ch;
  }
  return out.trimEnd() || null;
}

const AI_TIERS: readonly string[] = ['easy', 'medium', 'hard'];

function isRecord(x: unknown): x is Record<string, unknown> {
  return Boolean(x) && typeof x === 'object' && !Array.isArray(x);
}

export function isProfile(x: unknown): x is UserProfile {
  return isRecord(x) && typeof x.nick === 'string';
}

export function isWallet(x: unknown): x is Wallet {
  return (
    isRecord(x) &&
    typeof x.cash === 'number' &&
    typeof x.xp === 'number' &&
    typeof x.games === 'number' &&
    typeof x.wins === 'number' &&
    typeof x.day === 'string' &&
    typeof x.dayCash === 'number'
  );
}

export function isApplied(x: unknown): x is Applied {
  return (
    isRecord(x) &&
    typeof x.cash === 'number' &&
    typeof x.xp === 'number' &&
    typeof x.won === 'boolean' &&
    typeof x.capped === 'boolean'
  );
}

export function isMatchSeat(x: unknown): x is MatchSeat {
  return (
    isRecord(x) &&
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    typeof x.human === 'boolean' &&
    typeof x.tier === 'string' &&
    AI_TIERS.includes(x.tier)
  );
}

export function isMatchDoc(x: unknown): x is MatchDoc {
  return (
    isRecord(x) &&
    typeof x.uid === 'string' &&
    typeof x.seed === 'number' &&
    Array.isArray(x.seats) &&
    x.seats.every(isMatchSeat) &&
    Array.isArray(x.controlled) &&
    x.controlled.every((c) => typeof c === 'string') &&
    typeof x.log === 'string' &&
    typeof x.actions === 'number' &&
    (x.status === 'pending' || x.status === 'settled' || x.status === 'rejected')
  );
}

export function isKnownExpansion(x: unknown): boolean {
  return typeof x === 'string' && (EXPANSIONS as readonly string[]).includes(x);
}

/** 온라인 방의 정산 기록. rooms/{code}.settlement 에 Functions 가 한 번 쓴다 */
export type RoomSettlement = {
  at: number;
  /** 정산한 액션 수 */
  seq: number;
  /** uid → 실제로 적은 보상 */
  credits: Record<string, Applied>;
  /** 다시 접어 봤더니 보상할 수 없었던 이유 */
  rejected?: RejectReason;
};
