/**
 * 손패 칸 하나를 감싸 새로 들어온 카드를 등장시킨다 (hand-arrival.ts).
 *
 * waiting  : 칸 폭 0. 옆 카드가 아직 밀리지 않는다 (3D 카드가 날아오는 중)
 * entering : 칸이 벌어지며 옆 카드가 밀리고, 카드가 아래에서 솟아 뒷면→앞면으로 뒤집힌다.
 *            앞면이 드러나는 순간 '사락' 소리. 금빛 테두리가 번쩍였다 잦아든다
 * idle     : 그대로 그린다 (모든 값이 1 이라 애니메이션 층은 아무것도 바꾸지 않는다)
 *
 * 뒤집기는 scaleX 로 흉내 낸다. rotateY·backface 는 웹과 네이티브가 다르게 그린다.
 * 레이아웃 애니메이션(entering, LinearTransition)도 웹 지원이 고르지 않아 쓰지 않는다.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CARD_DIMENSIONS, CardBack, type CardSize } from './CardView';
import { ARRIVAL_STAGGER_MS, type ArrivalPhase } from './hand-arrival';
import { playSfx } from './sfx';
import { Colors } from '@/constants/theme';

const WIDEN_MS = 220;
const RISE_MS = 360;
const FLIP_MS = 130;

export type HandArrivalProps = {
  phase: ArrivalPhase;
  /** 2D 에서 몇 번째로 들어오는가. 이만큼 늦게 시작한다 */
  order?: number;
  /** 새 카드 표시 (금빛 점) */
  fresh?: boolean;
  size?: CardSize;
  /** 손패 줄의 gap. 칸이 0 일 때 gap 까지 접어야 옆 카드가 제자리다 */
  gap: number;
  onSettled: () => void;
  children: ReactNode;
};

export function HandArrival({ phase, order = 0, fresh, size = 'md', gap, onSettled, children }: HandArrivalProps) {
  const dim = CARD_DIMENSIONS[size];
  const hidden = phase !== 'idle';
  // 0: 칸 접힘, 1: 칸 펼침
  const widen = useSharedValue(hidden ? 0 : 1);
  // 0: 아래, 1: 제자리
  const rise = useSharedValue(hidden ? 0 : 1);
  // 0: 뒷면, 1: 앞면 (0.5 에서 갈아입는다)
  const flip = useSharedValue(hidden ? 0 : 1);
  const glow = useSharedValue(0);
  const started = useRef(false);

  useEffect(() => {
    if (phase !== 'entering' || started.current) return;
    started.current = true;
    const delay = order * ARRIVAL_STAGGER_MS;
    const done = () => onSettled();
    widen.value = withDelay(delay, withTiming(1, { duration: WIDEN_MS, easing: Easing.out(Easing.cubic) }));
    rise.value = withDelay(delay, withTiming(1, { duration: RISE_MS, easing: Easing.out(Easing.back(1.6)) }));
    flip.value = withDelay(
      delay + RISE_MS * 0.35,
      withTiming(1, { duration: FLIP_MS * 2, easing: Easing.inOut(Easing.quad) }, (finished) => {
        if (finished) runOnJS(done)();
      }),
    );
    glow.value = withDelay(
      delay + RISE_MS * 0.35 + FLIP_MS,
      withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 520 })),
    );
    const sound = setTimeout(() => playSfx('card_draw'), delay + RISE_MS * 0.35 + FLIP_MS);
    return () => clearTimeout(sound);
    // 한 번만 시작한다. 콜백이 바뀌어도 다시 돌리지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const slot = useAnimatedStyle(() => ({
    width: dim.width * widen.value,
    marginRight: -gap * (1 - widen.value),
    opacity: widen.value > 0.01 ? 1 : 0,
  }));
  const body = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - rise.value) * 48 }, { scale: 0.9 + 0.1 * rise.value }],
  }));
  const front = useAnimatedStyle(() => ({
    opacity: flip.value >= 0.5 ? 1 : 0,
    transform: [{ scaleX: flip.value >= 0.5 ? (flip.value - 0.5) * 2 : 0 }],
  }));
  const back = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 1 : 0,
    transform: [{ scaleX: flip.value < 0.5 ? 1 - flip.value * 2 : 0 }],
  }));
  const ring = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <Animated.View style={[styles.slot, slot]}>
      <Animated.View style={body}>
        <Animated.View style={front}>{children}</Animated.View>
        <Animated.View pointerEvents="none" style={[styles.back, back]}>
          <CardBack size={size} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { width: dim.width, height: dim.height }, ring]}
        />
      </Animated.View>
      {fresh && <View pointerEvents="none" style={styles.dot} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 칸이 벌어지는 동안 카드는 가운데를 기준으로 양옆에 걸친다
  slot: { overflow: 'visible', alignItems: 'center' },
  back: { position: 'absolute', left: 0, top: 0 },
  ring: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.highlight,
    boxShadow: `0 0 18px ${Colors.highlight}`,
  },
  dot: {
    position: 'absolute',
    top: -4,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.highlight,
    borderWidth: 1.5,
    borderColor: '#2a1a0c',
    boxShadow: `0 0 6px ${Colors.highlight}`,
  },
});
