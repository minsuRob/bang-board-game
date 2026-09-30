/**
 * 판 안 채팅 상태.
 *
 * 게임 스토어와 따로 둔다. 채팅은 판의 상태가 아니고, 락스텝 로그와도 섞이지 않는다.
 * 채우는 쪽은 use-chat.ts 하나다. 화면은 읽기만 한다.
 */

import { create } from 'zustand';

import type { ChatMessage } from '../../firebase/chat-model';
import type { ChatMode } from '../ui/chat-text';

type ChatStore = {
  mode: ChatMode;
  messages: ChatMessage[];
  /** 첫 스냅숏을 받았는가 */
  loaded: boolean;
  myUid: string | null;
  /** 온라인에서 내가 앉은 자리. 없으면 null */
  mySeat: number | null;
  /** 방 설정: 탈락한 사람도 말할 수 있는가 */
  deadChat: boolean;
  /** 구독이 끊겼을 때. 다음 스냅숏이 오면 지운다 */
  error: string | null;
  /** 보내기 실패처럼 잠깐 띄우고 마는 알림 */
  notice: string | null;
  /** 보내기. 성공하면 true. 말할 수 없는 자리면 null */
  send: ((text: string) => Promise<boolean>) | null;
};

export const INITIAL_CHAT: ChatStore = {
  mode: 'local',
  messages: [],
  loaded: false,
  myUid: null,
  mySeat: null,
  deadChat: true,
  error: null,
  notice: null,
  send: null,
};

export const useChatStore = create<ChatStore>(() => INITIAL_CHAT);

/** 남이 쓴 마지막 글의 id. 안 읽은 글 표시에 쓴다 */
export function lastOtherId(messages: ChatMessage[], myUid: string | null): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].uid !== myUid) return messages[i].id;
  }
  return null;
}
