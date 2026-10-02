/**
 * 덱에서 손패 칸으로 날아가는 카드를 판 전체 위에 그린다 (hand-arrival.ts 의 handFlights).
 *
 * 손패 줄은 가로 스크롤이라 칸 밖을 잘라낸다. 그래서 날아오는 동안은 이 오버레이가 그리고,
 * 칸에 닿으면 onLand 로 칸 안의 진짜 카드에 넘긴다.
 *
 * 덱 자리에서 비스듬히 뒷면으로 떨어져 나와 살짝 떠오르는 호를 그리며 칸까지 오고,
 * 마지막 구간에 앞면으로 뒤집힌다. 판의 루트 맨 끝에 하나 둔다.
 */

import { useEffect, useRef, useState, type RefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useStore } from 'zustand';

import { CardBack, CardView, type CardSize } from './CardView';
import { FLIGHT_MS, handFlights, setDeckMeasure, type HandFlight, type ScreenBox } from './hand-arrival';

/** 날아오며 떠오르는 높이 (px) */
const ARC_PX = 56;
/** 덱에서 빠져나올 때의 기울기 (도) */
const TILT_DEG = -14;
/** 이 진행도부터 뒤집기 시작한다 */
const FLIP_FROM = 0.55;

/** 이 View 가 덱이다. 새 손패가 여기서부터 날아온다 */
export function useDeckAnchor(ref: RefObject<View | null>) {
  useEffect(() => setDeckMeasure(() => measureView(ref.current)), [ref]);
}

export function measureView(v: View | null): Promise<ScreenBox | null> {
  return new Promise((resolve) => {
    if (!v) return resolve(null);
    v.measureInWindow((x, y, w, h) => resolve(w > 0 ? { x, y, w, h } : null));
  });
}

export function HandFlights({ size = 'md' }: { size?: CardSize }) {
  const flights = useStore(handFlights, (s) => s.flights);
  const ref = useRef<View>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const list = Object.values(flights);

  // 오버레이의 창 위치. 날아갈 때마다 다시 잰다 (창 크기·스크롤이 바뀌었을 수 있다)
  const count = list.length;
  useEffect(() => {
    if (count === 0) return;
    ref.current?.measureInWindow((x, y) => setOrigin((o) => (o && o.x === x && o.y === y ? o : { x, y })));
  }, [count]);

  return (
    <View ref={ref} collapsable={false} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {origin && list.map((f) => <FlyingCard key={f.card} flight={f} origin={origin} size={size} />)}
    </View>
  );
}

function FlyingCard({ flight, origin, size }: { flight: HandFlight; origin: { x: number; y: number }; size: CardSize }) {
  const t = useSharedValue(0);
  const { from, to } = flight;

  useEffect(() => {
    const land = flight.onLand;
    t.value = withTiming(1, { duration: FLIGHT_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(land)();
    });
    // 한 번만 날린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 칸 자리에 놓고 덱 쪽으로 밀어 둔 만큼을 줄여 간다
  const dx = from.x + from.w / 2 - (to.x + to.w / 2);
  const dy = from.y + from.h / 2 - (to.y + to.h / 2);
  const s0 = Math.min(1.2, Math.max(0.4, from.w / to.w));

  const body = useAnimatedStyle(() => {
    const p = t.value;
    return {
      transform: [
        { translateX: dx * (1 - p) },
        { translateY: dy * (1 - p) - Math.sin(Math.PI * p) * ARC_PX },
        { rotate: `${TILT_DEG * (1 - p)}deg` },
        { scale: s0 + (1 - s0) * p + Math.sin(Math.PI * p) * 0.12 },
      ],
    };
  });
  const front = useAnimatedStyle(() => {
    const f = Math.min(1, Math.max(0, (t.value - FLIP_FROM) / (1 - FLIP_FROM)));
    return { opacity: f >= 0.5 ? 1 : 0, transform: [{ scaleX: f >= 0.5 ? (f - 0.5) * 2 : 0 }] };
  });
  const back = useAnimatedStyle(() => {
    const f = Math.min(1, Math.max(0, (t.value - FLIP_FROM) / (1 - FLIP_FROM)));
    return { opacity: f < 0.5 ? 1 : 0, transform: [{ scaleX: f < 0.5 ? 1 - f * 2 : 0 }] };
  });

  return (
    <Animated.View
      style={[styles.card, { left: to.x - origin.x, top: to.y - origin.y, width: to.w, height: to.h }, body]}>
      <Animated.View style={front}>
        <CardView card={flight.card} size={size} />
      </Animated.View>
      <Animated.View style={[styles.face, back]}>
        <CardBack size={size} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', boxShadow: '0 10px 22px rgba(0, 0, 0, 0.45)', borderRadius: 8 },
  face: { position: 'absolute', left: 0, top: 0 },
});
