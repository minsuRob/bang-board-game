/**
 * 효과음 켜기/끄기. 기기마다 따로 정한다 (웹은 다음에 와도 기억한다).
 */

import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useStore } from 'zustand';

import { setMuted, sfxSettings } from './sfx';
import { Colors, Radius, Spacing } from '@/constants/theme';

export function SoundButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const muted = useStore(sfxSettings, (s) => s.muted);
  return (
    <Pressable
      style={[styles.root, muted && styles.muted, style]}
      accessibilityRole="button"
      accessibilityState={{ selected: !muted }}
      accessibilityLabel={muted ? '소리 켜기' : '소리 끄기'}
      onPress={() => setMuted(!muted)}>
      <Text style={styles.text}>{muted ? '🔇' : '🔊'}</Text>
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
    paddingVertical: 3,
  },
  muted: { opacity: 0.7 },
  text: { fontSize: 13 },
});
