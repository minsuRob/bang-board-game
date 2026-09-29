/**
 * 일시정지 버튼. 혼자 하는 판(상대가 전부 AI)에서만 쓴다.
 *
 * 멈춘 동안에는 AI 가 두지 않고 내 제한시간도 흐르지 않는다.
 */

import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = {
  paused: boolean;
  onToggle: () => void;
  style?: StyleProp<ViewStyle>;
};

export function PauseButton({ paused, onToggle, style }: Props) {
  return (
    <Pressable
      style={[styles.root, paused && styles.paused, style]}
      accessibilityRole="button"
      accessibilityState={{ selected: paused }}
      accessibilityLabel={paused ? '계속하기' : '일시정지'}
      onPress={onToggle}>
      <Text style={[styles.text, paused && styles.textPaused]}>{paused ? '▶ 계속' : '❚❚ 일시정지'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
  },
  paused: { backgroundColor: Colors.cardBrown, borderColor: Colors.highlight },
  text: { color: Colors.textMuted, fontSize: 11, fontWeight: '800' },
  textPaused: { color: Colors.paper },
});
