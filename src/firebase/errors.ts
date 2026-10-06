/**
 * 서버·방 오류를 화면 문구로 바꾼다.
 *
 * Cloud Functions 는 HttpsError 의 details.reason 으로 사유를 보낸다 (본문은 개발자용 영어).
 * 클라이언트가 직접 던지는 방 오류는 AppError 로 같은 사유 이름을 쓴다. 모르는 사유는 unknown 이다.
 */

import { getT } from '../i18n/use-t';
import type { Messages } from '../i18n/types-messages';

export type ErrorReason =
  | 'not-signed-in'
  | 'bad-room-code'
  | 'no-room'
  | 'not-started'
  | 'not-seated'
  | 'action-gap'
  | 'action-count'
  | 'room-code-failed'
  | 'room-started'
  | 'room-full'
  | 'room-gone';

const KEY: Record<ErrorReason, keyof Messages['infra']['errors']> = {
  'not-signed-in': 'notSignedIn',
  'bad-room-code': 'badRoomCode',
  'no-room': 'noRoom',
  'not-started': 'notStarted',
  'not-seated': 'notSeated',
  'action-gap': 'actionGap',
  'action-count': 'actionCount',
  'room-code-failed': 'roomCodeFailed',
  'room-started': 'roomStarted',
  'room-full': 'roomFull',
  'room-gone': 'roomGone',
};

function reasonOf(err: unknown): string | null {
  if (typeof err !== 'object' || err === null) return null;
  const direct = (err as { reason?: unknown }).reason;
  if (typeof direct === 'string') return direct;
  const details = (err as { details?: unknown }).details;
  if (typeof details === 'object' && details !== null) {
    const r = (details as { reason?: unknown }).reason;
    if (typeof r === 'string') return r;
  }
  return null;
}

export function firebaseErrorText(err: unknown, t: Messages): string {
  const reason = reasonOf(err);
  const key = reason ? KEY[reason as ErrorReason] : undefined;
  return key ? t.infra.errors[key] : t.infra.errors.unknown;
}

/** 클라이언트가 던지는 방 오류. message 는 던지는 순간의 화면 언어로 이미 번역돼 있어 catch 쪽이 그대로 보여 줘도 된다 */
export class AppError extends Error {
  readonly reason: ErrorReason;
  constructor(reason: ErrorReason) {
    super(firebaseErrorText({ reason }, getT()));
    this.name = 'AppError';
    this.reason = reason;
  }
}
