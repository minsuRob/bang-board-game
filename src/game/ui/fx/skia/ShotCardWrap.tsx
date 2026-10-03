/**
 * 고화질 연출 동안 카드(RN)를 흔들고, 반동을 주고, 확대한다 (총격은 카드 가운데, 빗나감은 얼굴 쪽).
 * 카빈처럼 뒤로 기댈 때는 아래 모서리를 축으로 rotateX 한다 (LaneSkia 가 같은 계산으로 바닥을 도려낸다).
 * Skia 캔버스와 같은 공유값·같은 시간표를 읽으므로 둘이 함께 움직인다. Skia 는 쓰지 않는다.
 */

import type { ReactNode } from 'react';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { cardMotion, TILT_PERSPECTIVE, type ShotGeom } from './timeline';

type Props = { progress: SharedValue<number>; geom: SharedValue<ShotGeom>; children: ReactNode };

export function ShotCardWrap({ progress, geom, children }: Props) {
  const style = useAnimatedStyle(() => {
    const c = cardMotion(geom.value, progress.value);
    if (c.tilt === 0) {
      return {
        transform: [{ translateX: c.tx }, { translateY: c.ty }, { scaleX: c.zoom * c.sx }, { scaleY: c.zoom * c.sy }],
        transformOrigin: 'center',
      };
    }
    return {
      transform: [{ perspective: TILT_PERSPECTIVE }, { rotateX: `${c.tilt}rad` }],
      transformOrigin: 'bottom',
    };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}
