/**
 * 일시정지 버튼. 혼자 하는 판(상대가 전부 AI)에서만 쓴다.
 *
 * 멈춘 동안에는 AI 가 두지 않고 내 제한시간도 흐르지 않는다.
 */

import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useToolbarStyles } from './theme/toolbar';

type Props = {
  paused: boolean;
  onToggle: () => void;
  style?: StyleProp<ViewStyle>;
};

export function PauseButton({ paused, onToggle, style }: Props) {
  const toolbar = useToolbarStyles();
  return (
    <Pressable
      style={({ hovered }: { hovered?: boolean }) => [
        toolbar.pill,
        hovered && !paused && toolbar.pillHover,
        paused && toolbar.pillActive,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: paused }}
      accessibilityLabel={paused ? '계속하기' : '일시정지'}
      onPress={onToggle}>
      <Text style={[toolbar.text, paused && toolbar.textActive]}>{paused ? '▶ 계속' : '❚❚ 일시정지'}</Text>
    </Pressable>
  );
}
