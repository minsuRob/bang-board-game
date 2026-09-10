import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>BANG!</Text>
        <Text style={styles.subtitle}>보안관과 무법자, 그리고 숨어 있는 배신자</Text>
      </View>

      <View style={styles.menu}>
        <Pressable
          style={styles.primary}
          accessibilityRole="button"
          accessibilityLabel="AI와 대전"
          onPress={() => router.push('/local')}>
          <Text style={styles.primaryText}>AI와 대전</Text>
          <Text style={styles.primaryHint}>4~7인 · 난이도 상중하 · 하이 눈 확장</Text>
        </Pressable>

        <View style={styles.disabled}>
          <Text style={styles.disabledText}>온라인 대전</Text>
          <Text style={styles.disabledHint}>Firebase 설정을 채우면 열린다</Text>
        </View>
      </View>

      <View style={styles.notes}>
        <Text style={styles.noteHeading}>조작</Text>
        <Text style={styles.note}>카드를 누르면 낸다. 지목이 필요한 카드는 한 번 더 눌러 상대를 고른다.</Text>
        <Text style={styles.note}>Q 차례 마치기 · W 반응하지 않음 · 1~0 손패 고르기 · Esc 취소</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.five,
    backgroundColor: Colors.background,
  },
  hero: { alignItems: 'center', gap: Spacing.two },
  title: { color: Colors.highlight, fontSize: 64, fontWeight: '900', letterSpacing: 6 },
  subtitle: { color: Colors.textMuted, fontSize: 14 },
  menu: { gap: Spacing.three, width: '100%', maxWidth: 420 },
  primary: {
    backgroundColor: Colors.cardBrown,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: 4,
    borderWidth: 2,
    borderColor: Colors.highlight,
  },
  primaryText: { color: Colors.paper, fontSize: 20, fontWeight: '900' },
  primaryHint: { color: Colors.paperEdge, fontSize: 12 },
  disabled: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    opacity: 0.7,
  },
  disabledText: { color: Colors.textMuted, fontSize: 18, fontWeight: '800' },
  disabledHint: { color: Colors.textMuted, fontSize: 12 },
  notes: { gap: 4, maxWidth: 460 },
  noteHeading: { color: Colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  note: { color: Colors.textMuted, fontSize: 12, lineHeight: 18 },
});
