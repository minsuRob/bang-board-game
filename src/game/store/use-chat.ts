/**
 * 채팅 스토어를 채운다. 게임 화면이 한 번 부른다.
 *
 * 온라인이면 rooms/{CODE}/chat 을 구독하고 보내기를 연결한다.
 * 혼자 하는 판이면 비워 두고, 화면은 안내 문구를 띄운다.
 */

import { useEffect, useRef } from 'react';

import {
  CHAT_MIN_INTERVAL_MS,
  cleanChatText,
  sendChat,
  watchChat,
} from '../../firebase/chat';
import { INITIAL_CHAT, useChatStore } from './chat-store';
import type { OnlineGame } from './use-online-game';

export function useChat(code: string | null, conn: OnlineGame) {
  const uid = conn.identity?.uid ?? null;
  const { mySeat } = conn;
  const deadChat = conn.room?.deadChat ?? true;

  // 화면을 떠나면 다음 판에 이전 글이 남지 않게 비운다
  useEffect(() => () => useChatStore.setState(INITIAL_CHAT), []);

  useEffect(() => {
    useChatStore.setState({ mode: code ? 'online' : 'local', myUid: uid, mySeat, deadChat });
  }, [code, uid, mySeat, deadChat]);

  // 구독. 규칙이 로그인한 사람만 읽게 하므로 uid 가 생긴 뒤에 건다.
  useEffect(() => {
    if (!code || !uid) return;
    const stop = watchChat(
      code,
      (messages) => useChatStore.setState({ messages, loaded: true, error: null }),
      (err) => useChatStore.setState({ error: `채팅을 받지 못했다. ${err.message}` }),
    );
    return () => {
      stop();
      useChatStore.setState({ messages: [], loaded: false, error: null });
    };
  }, [code, uid]);

  // 보내기
  const lastSent = useRef(0);
  useEffect(() => {
    if (!code || !uid || mySeat === null) {
      useChatStore.setState({ send: null });
      return;
    }
    const send = async (raw: string): Promise<boolean> => {
      const text = cleanChatText(raw);
      if (!text) return false;
      const now = Date.now();
      if (now - lastSent.current < CHAT_MIN_INTERVAL_MS) {
        useChatStore.setState({ notice: '너무 빠르다. 잠깐 뒤에 보내라' });
        return false;
      }
      lastSent.current = now;
      try {
        await sendChat(code, { uid, seat: mySeat, text });
        useChatStore.setState({ notice: null });
        return true;
      } catch (err) {
        useChatStore.setState({ notice: `보내지 못했다. ${(err as Error).message}` });
        return false;
      }
    };
    useChatStore.setState({ send });
    return () => useChatStore.setState({ send: null });
  }, [code, uid, mySeat]);
}
