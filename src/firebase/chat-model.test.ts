import { describe, expect, it } from 'vitest';

import { lastOtherId } from '../game/store/chat-store';
import { CHAT_MAX_LENGTH, cleanChatText, type ChatMessage } from './chat-model';

describe('채팅 글 다듬기', () => {
  it('앞뒤 공백을 걷고, 비었으면 보내지 않는다', () => {
    expect(cleanChatText('  뱅!  ')).toBe('뱅!');
    expect(cleanChatText('')).toBeNull();
    expect(cleanChatText('   \n\t ')).toBeNull();
  });

  it('줄바꿈·탭·제어 문자는 한 칸으로 접는다', () => {
    expect(cleanChatText('빗나감\n\n나가\t있어')).toBe('빗나감 나가 있어');
    expect(cleanChatText('a\u0000\u0007b')).toBe('a b');
  });

  it('길면 UTF-16 기준 최대 길이에서 자른다', () => {
    const text = cleanChatText('가'.repeat(CHAT_MAX_LENGTH + 10))!;
    expect(text).toHaveLength(CHAT_MAX_LENGTH);
  });

  it('이모지 한가운데서 자르지 않는다', () => {
    // 'a' 뒤로 2칸짜리 이모지가 이어지면 199칸에서 멈춰야 한다
    const text = cleanChatText('a' + '🔫'.repeat(CHAT_MAX_LENGTH))!;
    expect(text.length).toBe(CHAT_MAX_LENGTH - 1);
    expect(text.endsWith('🔫')).toBe(true);
    // 외톨이 서로게이트가 없다
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(text)).toBe(false);
  });

  it('잘린 끝의 공백은 걷는다', () => {
    const text = cleanChatText('가'.repeat(CHAT_MAX_LENGTH - 1) + ' 나다')!;
    expect(text).toBe('가'.repeat(CHAT_MAX_LENGTH - 1));
  });
});

describe('안 읽은 글', () => {
  const msg = (id: string, uid: string): ChatMessage => ({ id, uid, seat: 0, text: 'x', ts: 0 });

  it('내 글을 건너뛰고 남이 쓴 마지막 글을 찾는다', () => {
    expect(lastOtherId([msg('a', 'bob'), msg('b', 'me'), msg('c', 'me')], 'me')).toBe('a');
    expect(lastOtherId([msg('a', 'me')], 'me')).toBeNull();
    expect(lastOtherId([], 'me')).toBeNull();
  });
});
