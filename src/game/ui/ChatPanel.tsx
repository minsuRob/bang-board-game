/**
 * 판 안 채팅.
 *
 * 진행 기록 아래에 붙는다. 말한 사람은 `캐릭터명(직업)` 으로, 모르는 직업은 (???) 로 쓴다.
 * 보낸 사람의 직업은 저장하지 않는다. 지금 내 시점에서 보이는 만큼만 붙인다 (chat-text.ts).
 */

import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { CHAT_MAX_LENGTH } from '../../firebase/chat-model';
import type { Role } from '../data/types';
import { lastOtherId, useChatStore } from '../store/chat-store';
import { useGameStore } from '../store/game-store';
import { chatSilenced } from '../engine/hooks';
import { chatBlockReason, chatSpeaker } from './chat-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

const ROLE_COLOR: Record<Role, string> = {
  sheriff: Colors.sheriff,
  deputy: Colors.deputy,
  outlaw: Colors.outlaw,
  renegade: Colors.renegade,
};

/** 맨 아래에서 이만큼 안쪽이면 새 글이 올 때 따라 내려간다 */
const STICK_PX = 24;
const NOTICE_MS = 3_000;

export function ChatPanel({ style }: { style?: object }) {
  // 직업 공개 여부는 가리지 않은 상태로 직접 판단한다 (가린 상태는 모르는 직업을 무법자로 채운다)
  const state = useGameStore((s) => s.state);
  const viewer = useGameStore((s) => s.viewer);
  const { mode, messages, myUid, mySeat, deadChat, error, notice, send } = useChatStore();

  const me = mode === 'online' && mySeat !== null ? (state?.players.find((p) => p.seat === mySeat) ?? null) : null;
  const blocked = chatBlockReason({ mode, me, deadChat, gagged: state ? chatSilenced(state) : false });
  const canSend = !blocked && send !== null;

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const scrollRef = useRef<ScrollView>(null);
  const stick = useRef(true);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    stick.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - STICK_PX;
  };

  // 잠깐 띄우는 알림은 스스로 사라진다
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => useChatStore.setState({ notice: null }), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const submit = async () => {
    if (!canSend || !send || sending || !draft.trim()) return;
    setSending(true);
    const ok = await send(draft);
    setSending(false);
    if (ok) {
      setDraft('');
      // 내가 보낸 글은 위를 보고 있었더라도 따라 내려간다
      stick.current = true;
    }
    inputRef.current?.focus();
  };

  const inputWrap = useRef<View>(null);
  const lift = useKeyboardLift(inputWrap);

  return (
    <View style={[styles.panel, style]}>
      <Text style={styles.heading}>채팅</Text>

      <ScrollView
        ref={scrollRef}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={64}
        onContentSizeChange={() => {
          if (stick.current) scrollRef.current?.scrollToEnd({ animated: false });
        }}>
        {state &&
          messages.map((m) => {
            const who = chatSpeaker(state, viewer, m.seat);
            const mine = m.uid === myUid;
            return (
              <Text key={m.id} style={[styles.line, mine && styles.mine]}>
                <Text style={[styles.speaker, { color: who.role ? ROLE_COLOR[who.role] : Colors.textMuted }]}>
                  {who.label}
                </Text>
                <Text style={styles.colon}>: </Text>
                {m.text}
              </Text>
            );
          })}
        {messages.length === 0 && (
          <Text style={styles.empty}>{mode === 'local' ? blocked : '아직 아무 말도 없다'}</Text>
        )}
      </ScrollView>

      {(error || notice) && (
        <Text style={styles.error} numberOfLines={2}>
          {error ?? notice}
        </Text>
      )}

      <View ref={inputWrap} collapsable={false}>
        <View style={[styles.inputRow, lift > 0 && { transform: [{ translateY: -lift }] }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, !canSend && styles.inputLocked]}
            value={canSend ? draft : ''}
            onChangeText={setDraft}
            editable={canSend}
            placeholder={blocked ?? '할 말을 적는다'}
            placeholderTextColor={Colors.textMuted}
            maxLength={CHAT_MAX_LENGTH}
            onSubmitEditing={submit}
            // 보낸 뒤에도 입력창을 붙잡아 둔다 (네이티브는 submitBehavior, 웹은 blurOnSubmit)
            submitBehavior="submit"
            blurOnSubmit={false}
            returnKeyType="send"
            enterKeyHint="send"
            autoCorrect={false}
            accessibilityLabel="채팅 입력"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="채팅 보내기"
            accessibilityState={{ disabled: !canSend || !draft.trim() }}
            disabled={!canSend || !draft.trim()}
            onPress={submit}
            style={[styles.send, (!canSend || !draft.trim()) && styles.sendOff]}>
            <Text style={styles.sendText}>보내기</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/**
 * 접어 둔 패널에 새 글이 왔는가. 내 글은 치지 않는다.
 * 첫 스냅숏에 들어 있던 글은 읽은 것으로 본다 (새로고침하면 옛 글이 한꺼번에 다시 온다).
 */
export function useChatUnread(open: boolean): boolean {
  const latest = useChatStore((s) => lastOtherId(s.messages, s.myUid));
  const loaded = useChatStore((s) => s.loaded);
  // undefined: 아직 첫 스냅숏 전
  const [seen, setSeen] = useState<string | null | undefined>(undefined);
  // 렌더 중에 맞춰 둔다 (이펙트로 하면 한 박자 늦게 점이 깜빡인다)
  if ((open || (seen === undefined && loaded)) && seen !== latest) setSeen(latest);
  if (open || seen === undefined || latest === null) return false;
  return latest !== seen;
}

/**
 * 폰 키보드가 입력창을 덮으면 그만큼 입력줄을 올린다.
 *
 * 패널이 오버레이·옆 칸 어디에 있든 똑같이 동작하도록, 창 좌표로 겹친 만큼만 계산한다.
 * `anchor` 는 움직이지 않는 바깥 틀이다. 올라간 안쪽을 재면 겹침이 두 번 더해진다.
 */
function useKeyboardLift(anchor: RefObject<View | null>): number {
  const [lift, setLift] = useState(0);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      const keyboardTop = e.endCoordinates.screenY;
      anchor.current?.measureInWindow((_x, y, _w, h) => {
        setLift(Math.max(0, y + h + Spacing.two - keyboardTop));
      });
    });
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setLift(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [anchor]);
  return lift;
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  heading: { color: Colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  list: { flex: 1 },
  line: { color: Colors.text, fontSize: 12, lineHeight: 18, marginBottom: 2 },
  mine: { backgroundColor: 'rgba(242, 193, 78, 0.08)', borderRadius: Radius.sm },
  speaker: { fontWeight: '800' },
  colon: { color: Colors.textMuted },
  empty: { color: Colors.textMuted, fontSize: 11, fontStyle: 'italic' },
  error: { color: Colors.danger, fontSize: 10 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: Colors.text,
    fontSize: 12,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  inputLocked: { opacity: 0.6 },
  send: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardBrown,
  },
  sendOff: { opacity: 0.4 },
  sendText: { color: Colors.paper, fontSize: 11, fontWeight: '800' },
});
