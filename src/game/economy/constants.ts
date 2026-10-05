/**
 * 보상($)·경험치 숫자.
 *
 * 클라이언트와 Cloud Functions 가 같은 파일을 읽는다. 여기 숫자를 바꾸면 양쪽이 함께 바뀐다.
 * 지갑은 서버만 쓴다 (docs/economy.md).
 */

/** 판을 끝까지 마치면 받는 돈 */
export const CASH_PLAY = 10;
/** 이긴 사람이 더 받는 돈 */
export const CASH_WIN = 10;

/** 판을 끝까지 마치면 받는 경험치 */
export const XP_PLAY = 20;
/** 이긴 사람이 더 받는 경험치 */
export const XP_WIN = 30;

/** 하루에 받을 수 있는 돈. 넘으면 경험치만 쌓인다 */
export const DAILY_CASH_CAP = 200;

/** 이보다 짧게 끝난 판은 보상이 없다 (보안관 차례 수) */
export const MIN_ROUNDS = 2;
/** 이보다 짧게 끝난 판은 보상이 없다 (액션 수) */
export const MIN_ACTIONS = 30;

/** 올리는 액션 로그(JSON 문자열) 한도. Firestore 문서 1 MiB 안에서 여유를 둔다 */
export const MAX_MATCH_LOG_BYTES = 900_000;

/** 닉네임 최대 글자 수. firestore.rules 와 같은 값이어야 한다 */
export const NICK_MAX = 12;
