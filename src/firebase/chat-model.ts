/**
 * 판 안 채팅의 데이터 모양과 순수 규칙.
 *
 * room-model 과 같은 이유로 Firebase 도 React Native 도 import 하지 않는다.
 *
 * 채팅은 액션 로그에 넣지 않는다. 리듀서가 액션마다 seq 를 올리므로
 * 말 한마디에 AI 의 시드와 제한시간이 흔들린다. 그래서 rooms/{CODE}/chat 에 따로 쌓는다.
 * 문서에는 좌석 번호만 남긴다. 캐릭터와 직업은 읽는 쪽이 자기 시점으로 붙인다.
 */

/** 한 번에 보낼 수 있는 글자 수. firestore.rules 와 같은 값이어야 한다 */
export const CHAT_MAX_LENGTH = 200;

/** 화면에 들고 있는 최근 글 수 */
export const CHAT_HISTORY = 100;

/** 연달아 보낼 때의 최소 간격 */
export const CHAT_MIN_INTERVAL_MS = 700;

export type ChatDoc = {
  uid: string;
  /** 방 문서 seats 의 인덱스. 엔진의 Player.seat 와 같다 */
  seat: number;
  text: string;
};

export type ChatMessage = ChatDoc & {
  id: string;
  /** 서버 시각 (ms). 막 보낸 내 글은 추정값이다 */
  ts: number;
};

/**
 * 보낼 글을 다듬는다. 보낼 것이 없으면 null.
 *
 * 줄바꿈·탭은 한 칸으로 접는다 (한 줄 채팅이다).
 * 길이는 UTF-16 단위로 센다. 보안 규칙의 size() 가 그렇게 센다 (이모지 하나가 2).
 * 다만 이모지 한가운데서 자르면 깨진 글자가 남으므로 코드 포인트 경계에서 멈춘다.
 */
export function cleanChatText(raw: string): string | null {
  const text = raw.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (text.length <= CHAT_MAX_LENGTH) return text;
  let out = '';
  for (const ch of text) {
    if (out.length + ch.length > CHAT_MAX_LENGTH) break;
    out += ch;
  }
  return out.trimEnd();
}
