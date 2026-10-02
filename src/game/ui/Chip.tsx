/**
 * 알약 모양 선택 칩. 잉크 테두리로 찍혀 있고, 고르면 도장처럼 찬다 (라이트는 잉크, 다크는 갈색에 금 테두리).
 * 판 설정(app/local.tsx)과 카드 도감(app/cards.tsx)이 같이 쓴다.
 */

import { Pressable, Text } from 'react-native';

import { WesternFonts } from './menu/western-fonts';
import { themedStyles } from './theme/use-theme';

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ hovered }: { hovered?: boolean }) => [
        styles.chip,
        hovered && !active && styles.hover,
        active && styles.chipActive,
      ]}>
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = themedStyles((c) => ({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: c.chipBorder,
    backgroundColor: c.chip,
  },
  hover: { backgroundColor: c.hover },
  chipActive: { backgroundColor: c.selected, borderColor: c.selectedBorder },
  text: { color: c.text, fontSize: 14, fontWeight: '800', fontFamily: WesternFonts.label },
  textActive: { color: c.onSelected },
}));
