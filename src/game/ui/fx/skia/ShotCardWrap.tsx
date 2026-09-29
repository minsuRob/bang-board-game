/**
 * 고화질 총격 동안 카드(RN)를 흔들고, 반동을 주고, 총구 쪽으로 확대한다.
 * Skia 캔버스와 같은 공유값·같은 시간표를 읽으므로 둘이 함께 움직인다. Skia 는 쓰지 않는다.
 */

import type { ReactNode } from 'react';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { shotFrame } from './timeline';

export function ShotCardWrap({ progress, children }: { progress: SharedValue<number>; children: ReactNode }) {
  const style = useAnimatedStyle(() => {
    const f = shotFrame(progress.value);
    return {
      transform: [{ translateX: f.shakeX - f.recoil }, { translateY: f.shakeY }, { scale: f.zoom }],
    };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}
