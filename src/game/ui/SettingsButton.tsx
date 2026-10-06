/**
 * 게임 중 위쪽 버튼 줄의 ⚙ 설정 버튼. 누르면 설정 팝업(settings/SettingsSheet.tsx)을 연다.
 */

import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useToolbarStyles } from './theme/toolbar';
import { useColors } from './theme/use-theme';
import { useT } from '../../i18n/use-t';

// 톱니 여덟 개를 바깥 고리에 붙인다
const TEETH = Array.from({ length: 8 }, (_, i) => {
  const t = (i / 8) * Math.PI * 2;
  const x0 = 10.5 + Math.cos(t) * 6.6;
  const y0 = 10.5 + Math.sin(t) * 6.6;
  const x1 = 10.5 + Math.cos(t) * 9;
  const y1 = 10.5 + Math.sin(t) * 9;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}L${x1.toFixed(2)} ${y1.toFixed(2)}`;
}).join(' ');

export function SettingsButton({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const toolbar = useToolbarStyles();
  const c = useColors();
  const t = useT();
  return (
    <Pressable
      style={({ hovered }: { hovered?: boolean }) => [toolbar.pill, hovered && toolbar.pillHover, style]}
      accessibilityRole="button"
      accessibilityLabel={t.ui.settingsButton.label}
      onPress={onPress}>
      <Svg width={15} height={15} viewBox="0 0 21 21">
        <Circle cx={10.5} cy={10.5} r={5.4} stroke={c.text} strokeWidth={2.2} fill="none" />
        <Circle cx={10.5} cy={10.5} r={2} fill={c.text} />
        <Path d={TEETH} stroke={c.text} strokeWidth={2.6} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
}
