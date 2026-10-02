/**
 * 첫 메뉴의 연출 화질 선택. 고화질이면 여기서부터 Skia 를 미리 불러 둔다.
 * 메뉴 카드 한 장 안에 들어가는 작은 두 칸 고르기다.
 */

import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { fxQuality, setFxQuality, type FxQuality } from './fx/quality';
import { loadSkiaFx } from './fx/skia/load';

const OPTIONS: { value: FxQuality; label: string }[] = [
  { value: 'high', label: '고화질' },
  { value: 'normal', label: '일반' },
];

/** 지금 고른 화질. 고화질이면 Skia 를 미리 불러 둔다 */
export function useFxQuality(): FxQuality {
  const quality = useStore(fxQuality, (s) => s.quality);
  useEffect(() => {
    if (quality === 'high') void loadSkiaFx();
  }, [quality]);
  return quality;
}

/** 메뉴 카드 아래 칸에 들어가는 두 줄 설명 */
export function qualityHint(quality: FxQuality): string {
  return quality === 'high'
    ? '총격을 Skia 로 세밀하게\n웹은 처음 한 번 3MB'
    : '가벼운 연출\n느린 기기에 권한다';
}

/** 종이 위에 찍는 두 칸짜리 고르기. 첫 화면 메뉴 카드 안에 들어간다 */
export function QualityToggle({ scale = 1, fontFamily }: { scale?: number; fontFamily?: string }) {
  const quality = useFxQuality();
  return (
    <View style={[styles.segment, { borderRadius: 6 * scale }]}>
      {OPTIONS.map((o) => {
        const active = o.value === quality;
        return (
          <Pressable
            key={o.value}
            style={[styles.chip, { paddingHorizontal: 10 * scale, paddingVertical: 5 * scale }, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`연출 화질 ${o.label}`}
            onPress={() => setFxQuality(o.value)}>
            <Text
              style={[styles.chipText, { fontSize: 14 * scale, fontFamily }, active && styles.chipTextActive]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const INK = '#2b1d10';
const PAPER = '#f1e3c3';

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', borderWidth: 2, borderColor: INK, overflow: 'hidden' },
  chip: {},
  chipActive: { backgroundColor: INK },
  chipText: { color: INK, fontWeight: '900' },
  chipTextActive: { color: PAPER },
});
