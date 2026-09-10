import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>BANG!</Text>
      <Text style={styles.subtitle}>보드게임 뱅! 리메이크 · 엔진 구현 중</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: Spacing.three,
  },
  title: { color: Colors.highlight, fontSize: 56, fontWeight: '900', letterSpacing: 4 },
  subtitle: { color: Colors.textMuted, fontSize: 15 },
});
