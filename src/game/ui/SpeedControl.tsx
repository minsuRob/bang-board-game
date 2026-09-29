/**
 * AI 빠르기 선택기.
 *
 * 방장만 바꿀 수 있다. 나머지는 지금 배속만 본다.
 */

import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AI_SPEEDS, type AiSpeed } from '../ai/types';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = {
  speed: AiSpeed;
  /** null 이면 읽기 전용 */
  onChange: ((speed: AiSpeed) => void) | null;
  style?: StyleProp<ViewStyle>;
};

export function SpeedControl({ speed, onChange, style }: Props) {
  if (!onChange) {
    return (
      <View style={[styles.root, style]} accessibilityLabel={`AI 속도 ${speed}배`}>
        <Text style={styles.label}>AI 속도</Text>
        <Text style={styles.readonly}>{speed}×</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, style]}>
      <Text style={styles.label}>AI 속도</Text>
      {AI_SPEEDS.map((s) => {
        const active = s === speed;
        return (
          <Pressable
            key={s}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`AI 속도 ${s}배`}
            onPress={() => onChange(s)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}×</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.one,
    paddingVertical: 3,
  },
  label: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', marginRight: 2 },
  readonly: { color: Colors.paper, fontSize: 12, fontWeight: '800', paddingHorizontal: Spacing.one },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: { backgroundColor: Colors.cardBrown, borderColor: Colors.highlight },
  chipText: { color: Colors.textMuted, fontSize: 12, fontWeight: '800' },
  chipTextActive: { color: Colors.paper },
});
