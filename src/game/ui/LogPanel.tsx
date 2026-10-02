/**
 * 진행 기록.
 *
 * 뱅!은 반응 체인이 길어서 "방금 무슨 일이 있었나"를 놓치기 쉽다.
 * PC 에서는 오른쪽에 계속 띄워 두고, 좁은 화면에서는 접는다. 아래 칸은 채팅이다 (SidePanel).
 *
 * 문장 속 카드 이름은 따옴표로 감싸고 색을 입힌다 (파랑 카드는 파랑, 갈색 카드는 흰 굵은 글씨).
 * 이름에 마우스를 올리면(폰은 탭) 화면 왼쪽 아래에 그 카드의 상세가 뜬다.
 * 상세는 손패 HUD 위에 그려야 해서 패널 안이 아니라 게임 화면 맨 위(LogCardPeek)에 둔다. 스토어로 잇는다.
 */

import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type TextProps } from 'react-native';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { CardId } from '../data/types';
import { defOf, type GameEvent } from '../engine';
import { CAN_HOVER } from './card-peek';
import { CardView } from './CardView';
import { splitLogText, type LogSegment } from './log-text';
import { PaperPlaque, plaque } from './PaperPlaque';
import { Colors, Radius, Spacing } from '@/constants/theme';

/** 진행 기록에서 살펴보는 카드. 화면 전용이라 GameState 에 넣지 않는다 */
const logPeek = createStore<{ card: CardId | null }>(() => ({ card: null }));
const setPeek = (card: CardId | null) => logPeek.setState({ card });

/** 어두운 패널 위에서 읽히는 파랑 카드 이름 색 */
const BLUE_NAME = '#7FB6EC';

const TONE: Record<string, string> = {
  damage: Colors.danger,
  eliminate: Colors.danger,
  heal: Colors.success,
  beerSurvive: Colors.success,
  bounty: Colors.sheriff,
  penalty: Colors.sheriff,
  turnStart: Colors.textMuted,
  event: Colors.renegade,
  gameEnd: Colors.highlight,
  judgement: Colors.deputy,
  rejected: Colors.textMuted,
};

export function LogPanel({ log, style }: { log: GameEvent[]; style?: object }) {
  const ref = useRef<ScrollView>(null);
  const recent = log.slice(-120);

  useEffect(() => {
    ref.current?.scrollToEnd({ animated: true });
  }, [log.length]);

  return (
    <View style={[styles.panel, style]}>
      <Text style={styles.heading}>진행 기록</Text>
      <ScrollView ref={ref} style={styles.list} showsVerticalScrollIndicator={false}>
        {recent.map((e, i) => (
          <Text key={`${e.seq}-${i}`} style={[styles.line, { color: TONE[e.t] ?? Colors.text }]}>
            {splitLogText(e).map((seg, j) => (seg.card ? <CardName key={j} seg={seg} onPeek={setPeek} /> : seg.text))}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

/** 문장 속 카드 이름. 웹은 올리면, 폰은 탭하면 상세를 띄운다 */
function CardName({ seg, onPeek }: { seg: Extract<LogSegment, { card: string }>; onPeek: (c: CardId | null) => void }) {
  // react-native-web 에서만 있는 hover 이벤트. RN 네이티브 타입엔 없어 따로 얹는다.
  const hover = (CAN_HOVER
    ? { onMouseEnter: () => onPeek(seg.card), onMouseLeave: () => onPeek(null) }
    : { onPress: () => onPeek(seg.card) }) as unknown as TextProps;
  return (
    <Text style={seg.category === 'blue' ? styles.blueName : styles.brownName} {...hover}>
      "{seg.text}"
    </Text>
  );
}

/**
 * 진행 기록에서 살펴보는 카드의 상세. 게임 화면 맨 위에 하나 두면 화면 왼쪽 아래에 뜬다.
 * 폰은 눌러서 닫는다
 */
export function LogCardPeek() {
  const card = useStore(logPeek, (s) => s.card);
  // 판을 떠나면 닫는다
  useEffect(() => () => setPeek(null), []);
  if (!card) return null;
  const def = defOf(card);
  return (
    <Pressable
      onPress={() => setPeek(null)}
      disabled={CAN_HOVER}
      accessibilityLabel={`${def.nameKo} 카드 상세`}
      style={[styles.detail, CAN_HOVER && styles.passThrough]}>
      <View style={styles.detailShadow}>
        <CardView card={card} size="lg" />
      </View>
      <PaperPlaque style={styles.detailPlaque}>
        <Text style={plaque.text}>
          <Text style={plaque.name}>{def.nameKo}</Text>
          {'  '}
          {def.text}
        </Text>
      </PaperPlaque>
    </Pressable>
  );
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
  // 채팅과 칸을 나눠 쓰므로 주어진 높이 안에서만 스크롤한다
  list: { flex: 1 },
  line: { fontSize: 11, lineHeight: 17, marginBottom: 2 },
  blueName: { color: BLUE_NAME, fontWeight: '800' },
  brownName: { color: '#FFFFFF', fontWeight: '800' },
  detail: {
    position: 'absolute',
    left: Spacing.three,
    bottom: Spacing.three,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  passThrough: { pointerEvents: 'none' },
  detailShadow: { borderRadius: 8, boxShadow: '0 12px 28px rgba(0,0,0,0.6)' },
  detailPlaque: { width: 240 },
});
