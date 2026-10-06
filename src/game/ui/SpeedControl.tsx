/**
 * AI 빠르기 선택기.
 *
 * 방장만 바꿀 수 있다. 나머지는 지금 배속만 본다.
 * 혼자 하는 판은 speeds 로 더 빠른 배속(최대 100배)을 넘겨받는다.
 */

import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AI_SPEEDS, type LocalAiSpeed } from '../ai/types';
import { useT } from '../../i18n/use-t';
import { useToolbarStyles } from './theme/toolbar';
import { Radius, Spacing } from '@/constants/theme';

type Props = {
  speed: LocalAiSpeed;
  /** null 이면 읽기 전용 */
  onChange: ((speed: LocalAiSpeed) => void) | null;
  /** 고를 수 있는 배속. 없으면 온라인과 같은 1~4배 */
  speeds?: readonly LocalAiSpeed[];
  style?: StyleProp<ViewStyle>;
  /** 알약 안의 "AI 속도" 글자를 뺀다. 바깥에 이름이 따로 있을 때 (설정 팝업) */
  hideLabel?: boolean;
};

export function SpeedControl({ speed, onChange, speeds = AI_SPEEDS, style, hideLabel }: Props) {
  const toolbar = useToolbarStyles();
  const t = useT();
  const speedLabel = (s: number) => (s >= 100 ? t.ui.speed.maxWord : `${s}×`);
  if (!onChange) {
    return (
      <View style={[toolbar.pill, styles.root, style]} accessibilityLabel={t.ui.speed.readonly(speed)}>
        <Text style={[toolbar.textMuted, styles.label]}>{t.ui.speed.label}</Text>
        <Text style={[toolbar.text, styles.readonly]}>{speedLabel(speed)}</Text>
      </View>
    );
  }

  return (
    <View style={[toolbar.pill, styles.root, hideLabel && styles.rootBare, style]}>
      {!hideLabel && <Text style={[toolbar.textMuted, styles.label]}>{t.ui.speed.label}</Text>}
      {speeds.map((s) => {
        const active = s === speed;
        return (
          <Pressable
            key={s}
            style={({ hovered }: { hovered?: boolean }) => [
              styles.chip,
              hovered && !active && toolbar.pillHover,
              active && toolbar.pillActive,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={s >= 100 ? t.ui.speed.max : t.ui.speed.set(s)}
            onPress={() => onChange(s)}>
            <Text style={[toolbar.textMuted, active && toolbar.textActive]}>{speedLabel(s)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// 알약 모양·글자색은 위쪽 버튼 줄과 같이 쓰는 useToolbarStyles 에서 온다. 여기는 간격만.
const styles = StyleSheet.create({
  root: {
    gap: Spacing.one,
    paddingLeft: Spacing.two,
    paddingRight: 3,
    paddingVertical: 3,
  },
  rootBare: { paddingLeft: 3 },
  label: { fontSize: 11, marginRight: 2 },
  readonly: { paddingHorizontal: Spacing.one },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
