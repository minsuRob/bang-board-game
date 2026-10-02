/**
 * 알약 모양 선택 칩. 종이 위에 잉크 테두리로 찍혀 있고, 고르면 잉크 도장처럼 까맣게 찬다.
 * 판 설정(app/local.tsx)과 카드 도감(app/cards.tsx)이 같이 쓴다.
 */

import { Pressable, StyleSheet, Text } from 'react-native';

import { PaperInk } from './menu/PaperUi';
import { WesternFonts } from './menu/western-fonts';

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ hovered }: { hovered?: boolean }) => [styles.chip, hovered && !active && styles.hover, active && styles.chipActive]}>
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(43,29,16,0.55)',
    backgroundColor: 'rgba(251,246,234,0.6)',
  },
  hover: { backgroundColor: 'rgba(201,162,90,0.22)' },
  chipActive: { backgroundColor: PaperInk.ink, borderColor: PaperInk.ink },
  text: { color: PaperInk.ink, fontSize: 14, fontWeight: '800', fontFamily: WesternFonts.label },
  textActive: { color: PaperInk.sheet },
});
