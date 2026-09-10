import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AI_TIERS, AI_TIER_LABEL } from '@/game/ai';
import type { AiTier } from '@/game/ai/types';
import { Colors, Radius, Spacing } from '@/constants/theme';

const COUNTS = [4, 5, 6, 7];

export default function LocalSetupScreen() {
  const router = useRouter();
  const [players, setPlayers] = useState(5);
  const [tier, setTier] = useState<AiTier>('medium');
  const [highnoon, setHighnoon] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Date.now() % 100000));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>판 설정</Text>

      <Section title="인원">
        <Row>
          {COUNTS.map((n) => (
            <Chip key={n} label={`${n}인`} active={players === n} onPress={() => setPlayers(n)} />
          ))}
        </Row>
        <Text style={styles.hint}>
          {players === 4 && '보안관 1 · 무법자 2 · 배신자 1'}
          {players === 5 && '보안관 1 · 부관 1 · 무법자 2 · 배신자 1'}
          {players === 6 && '보안관 1 · 부관 1 · 무법자 3 · 배신자 1'}
          {players === 7 && '보안관 1 · 부관 2 · 무법자 3 · 배신자 1'}
        </Text>
      </Section>

      <Section title="AI 난이도">
        <Row>
          {AI_TIERS.map((t) => (
            <Chip key={t} label={AI_TIER_LABEL[t]} active={tier === t} onPress={() => setTier(t)} />
          ))}
        </Row>
        <Text style={styles.hint}>
          {tier === 'easy' && '거의 아무렇게나 두지만 죽는 것만은 피한다.'}
          {tier === 'medium' && '공개된 역할만 보고 정석대로 둔다.'}
          {tier === 'hard' && '지금까지의 행동에서 감춰진 역할을 추론하고 앞을 내다본다.'}
        </Text>
      </Section>

      <Section title="확장판">
        <Row>
          <Chip label="기본" active={!highnoon} onPress={() => setHighnoon(false)} />
          <Chip label="하이 눈" active={highnoon} onPress={() => setHighnoon(true)} />
        </Row>
        <Text style={styles.hint}>
          하이 눈은 보안관의 두 번째 차례부터 매 라운드 상황 카드가 하나씩 열린다.
        </Text>
      </Section>

      <Section title="시드">
        <Row>
          <Text style={styles.seed}>{seed}</Text>
          <Chip label="다시 뽑기" active={false} onPress={() => setSeed(Math.floor(Math.random() * 100000))} />
        </Row>
        <Text style={styles.hint}>같은 시드는 언제나 같은 판을 만든다.</Text>
      </Section>

      <Pressable
        style={styles.start}
        accessibilityRole="button"
        accessibilityLabel="시작"
        onPress={() =>
          router.push({
            pathname: '/game/[id]',
            params: {
              id: 'local',
              players: String(players),
              tier,
              highnoon: highnoon ? '1' : '0',
              seed: String(seed),
            },
          })
        }>
        <Text style={styles.startText}>시작</Text>
      </Pressable>

      <Pressable accessibilityRole="button" accessibilityLabel="돌아가기" onPress={() => router.back()}>
        <Text style={styles.back}>돌아가기</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing.four,
    gap: Spacing.four,
    backgroundColor: Colors.background,
    alignItems: 'stretch',
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  heading: { color: Colors.text, fontSize: 24, fontWeight: '900' },
  section: { gap: Spacing.two },
  sectionTitle: { color: Colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center', flexWrap: 'wrap' },
  hint: { color: Colors.textMuted, fontSize: 12, lineHeight: 18 },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.cardBrown, borderColor: Colors.highlight },
  chipText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: Colors.paper },
  seed: { color: Colors.text, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  start: {
    backgroundColor: Colors.cardBrown,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.highlight,
  },
  startText: { color: Colors.paper, fontSize: 18, fontWeight: '900' },
  back: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
});
