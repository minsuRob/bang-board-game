/**
 * 진행 기록.
 *
 * 뱅!은 반응 체인이 길어서 "방금 무슨 일이 있었나"를 놓치기 쉽다.
 * PC 에서는 오른쪽에 계속 띄워 두고, 좁은 화면에서는 접는다.
 */

import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { GameEvent } from '../engine';
import { Colors, Radius, Spacing } from '@/constants/theme';

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
      <ScrollView ref={ref} showsVerticalScrollIndicator={false}>
        {recent.map((e, i) => (
          <Text key={`${e.seq}-${i}`} style={[styles.line, { color: TONE[e.t] ?? Colors.text }]}>
            {e.text}
          </Text>
        ))}
      </ScrollView>
    </View>
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
  line: { fontSize: 11, lineHeight: 17, marginBottom: 2 },
});
