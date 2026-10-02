/**
 * 연출 화질 고르기. 고화질이면 여기서부터 Skia 를 미리 불러 둔다.
 * 설정 팝업(settings/SettingsSheet.tsx)이 InkSegmented 로 보여 준다.
 */

import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { fxQuality, type FxQuality } from './fx/quality';
import { loadSkiaFx } from './fx/skia/load';
import { WesternFonts } from './menu/western-fonts';
import { themedStyles } from './theme/use-theme';

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

/** 화질별 설명 */
export function qualityHint(quality: FxQuality): string {
  return quality === 'high'
    ? '총격을 Skia 로 세밀하게 그린다. 웹은 처음 한 번 약 3MB 를 받는다.'
    : '가벼운 연출. 느린 기기에서 권한다.';
}

/** 잉크 테두리 안에 칸을 붙여 놓은 고르기. 고른 칸만 도장처럼 찬다. 설정 팝업이 쓴다 */
export function InkSegmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  /** 읽어 주기용 앞말 (예: '연출 화질') */
  label: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.segment} accessibilityRole="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={[styles.cell, active && styles.cellActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${label} ${o.label}`}
            onPress={() => onChange(o.value)}>
            <Text style={[styles.cellText, active && styles.cellTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const QUALITY_OPTIONS = OPTIONS;

const useStyles = themedStyles((c) => ({
  segment: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: c.selectedBorder,
    borderRadius: 6,
    overflow: 'hidden',
  },
  cell: { paddingHorizontal: 16, paddingVertical: 8 },
  cellActive: { backgroundColor: c.selected },
  cellText: { color: c.text, fontSize: 15, fontWeight: '900', fontFamily: WesternFonts.label },
  cellTextActive: { color: c.onSelected },
}));
