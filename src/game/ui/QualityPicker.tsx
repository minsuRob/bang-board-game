/**
 * 첫 메뉴의 연출 화질 선택. 고화질이면 여기서부터 Skia 를 미리 불러 둔다.
 */

import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { fxQuality, setFxQuality, type FxQuality } from './fx/quality';
import { loadSkiaFx } from './fx/skia/load';
import { Colors, Radius, Spacing } from '@/constants/theme';

const OPTIONS: { value: FxQuality; label: string }[] = [
  { value: 'high', label: '고화질' },
  { value: 'normal', label: '일반' },
];

export function QualityPicker() {
  const quality = useStore(fxQuality, (s) => s.quality);

  useEffect(() => {
    if (quality === 'high') void loadSkiaFx();
  }, [quality]);

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <Text style={styles.label}>연출 화질</Text>
        <View style={styles.segment}>
          {OPTIONS.map((o) => {
            const active = o.value === quality;
            return (
              <Pressable
                key={o.value}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`연출 화질 ${o.label}`}
                onPress={() => setFxQuality(o.value)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={styles.hint}>
        {quality === 'high'
          ? '총격을 Skia 로 세밀하게 그린다. 웹은 처음 한 번 약 3MB 를 받는다'
          : '가벼운 연출. 느린 기기에서 권한다'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: Colors.text, fontSize: 15, fontWeight: '800' },
  segment: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: Colors.background,
    borderRadius: Radius.pill,
    padding: 3,
  },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: 5, borderRadius: Radius.pill },
  chipActive: { backgroundColor: Colors.cardBrown, borderWidth: 1, borderColor: Colors.highlight },
  chipText: { color: Colors.textMuted, fontSize: 13, fontWeight: '800' },
  chipTextActive: { color: Colors.paper },
  hint: { color: Colors.textMuted, fontSize: 12 },
});
