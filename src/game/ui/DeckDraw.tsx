/**
 * 덱에서 한 장 뽑아 펼치는 카드. 판정·럼·잡화점·럭키 듀크처럼 "덱 맨 위를 뒤집는" 자리에 쓴다.
 *
 * 제자리에 놓일 카드를 감싼다. 자리를 잰 뒤 덱 자리에서 뒷면으로 비스듬히 빠져나와
 * 호를 그리며 제자리까지 날아오고, 한 박자 쉬었다가 앞면으로 뒤집힌다. 뒤집는 동안 살짝 들렸다 내려앉는다.
 * 덱 자리를 모르거나 from="place" 면(포커 판돈처럼 손에서 엎어 낸 카드) 제자리에 뒷면으로 내려앉은 뒤 뒤집힌다.
 *
 * 뒤집기는 HandFlights·HandArrival 처럼 scaleX 로 흉내 낸다. rotateY·backface 는 웹과 네이티브가 다르게 그린다.
 * 날아오는 동안의 변형은 안쪽 층에만 건다. 바깥 View 는 변형이 없어야 제자리를 잴 수 있다.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { fxPacing } from '../store/fx-pacing';
import { CardBack, type CardSize } from './CardView';
import { measureDeck } from './hand-arrival';
import { measureView } from './HandFlights';
import { playSfx } from './sfx';

/** 덱에서 제자리까지 날아오는 시간 (1배속) */
export const DRAW_FLY_MS = 420;
/** 내려앉은 뒤 뒤집기 전에 쉬는 박자 */
export const DRAW_BEAT_MS = 140;
/** 뒷면에서 앞면까지 */
export const DRAW_FLIP_MS = 300;
/** 여러 장을 펼칠 때 한 장씩 벌리는 간격 */
export const DRAW_STAGGER_MS = 180;
/** 출발부터 앞면이 다 보이기까지 (1배속). 3D 판의 DUR.revealDraw 와 맞춘다 */
export const DRAW_TOTAL_MS = DRAW_FLY_MS + DRAW_BEAT_MS + DRAW_FLIP_MS;

/** 날아오며 떠오르는 높이 (px) */
const ARC_PX = 70;
/** 덱에서 빠져나올 때의 기울기 (도) */
const TILT_DEG = -16;
/** 덱 자리를 못 잴 때 제자리 위 어디서 내려앉는가 (px) */
const PLACE_DROP_PX = 26;
/** 자리를 재는 데 이보다 오래 걸리면 제자리에서 펼친다 */
const MEASURE_GRACE_MS = 400;

export type DeckDrawProps = {
  size: CardSize;
  /** deck: 덱 자리에서 날아온다. place: 제자리에 뒷면으로 내려앉는다 */
  from?: 'deck' | 'place';
  /** 이만큼 늦게 출발한다 (1배속 기준, 배속으로 나눈다) */
  delayMs?: number;
  /** 처음부터 앞면으로 놓는다 (이미 펼친 카드). 처음 그릴 때의 값만 본다 */
  instant?: boolean;
  /** 움직이기 시작했다 */
  onStart?: () => void;
  /** 앞면이 다 보였다 */
  onFlip?: () => void;
  children: ReactNode;
};

export function DeckDraw({ size, from = 'deck', delayMs = 0, instant, onStart, onFlip, children }: DeckDrawProps) {
  const [still] = useState(() => Boolean(instant));
  // 0: 출발 자리, 1: 제자리
  const fly = useSharedValue(still ? 1 : 0);
  // 0: 뒷면, 1: 앞면 (0.5 에서 갈아입는다)
  const flip = useSharedValue(still ? 1 : 0);
  // 자리를 재기 전에는 감춘다
  const shown = useSharedValue(still ? 1 : 0);
  // 출발 자리: 제자리 기준 밀어 둔 거리, 배율, 기울기, 호 높이
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const s0 = useSharedValue(1);
  const tilt = useSharedValue(0);
  const arc = useSharedValue(0);
  const fade = useSharedValue(0);

  const box = useRef<View>(null);
  const started = useRef(still);
  const alive = useRef(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cb = useRef({ onStart, onFlip });
  useEffect(() => {
    cb.current = { onStart, onFlip };
  });

  useEffect(() => {
    alive.current = true;
    const pending = timers.current;
    return () => {
      alive.current = false;
      pending.forEach(clearTimeout);
    };
  }, []);

  const launch = (deck: { x: number; y: number; w: number; h: number } | null, self: { x: number; y: number; w: number; h: number } | null) => {
    const k = 1 / Math.max(1, fxPacing.getState().timeScale);
    const wait = delayMs * k;
    if (from === 'deck' && deck && self) {
      dx.value = deck.x + deck.w / 2 - (self.x + self.w / 2);
      dy.value = deck.y + deck.h / 2 - (self.y + self.h / 2);
      s0.value = Math.min(1.2, Math.max(0.3, deck.w / self.w));
      tilt.value = TILT_DEG;
      arc.value = ARC_PX;
      fade.value = 0;
    } else {
      dx.value = 0;
      dy.value = -PLACE_DROP_PX;
      s0.value = 1.08;
      tilt.value = 0;
      arc.value = 0;
      fade.value = 1;
    }
    const flyMs = (from === 'deck' && deck ? DRAW_FLY_MS : DRAW_FLY_MS * 0.6) * k;
    // 단계마다 JS 타이머로 건다. 웹에서 withDelay 가 1초 가까이 늦게 풀렸다
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(() => alive.current && fn(), ms));
    at(wait, () => {
      shown.value = 1;
      fly.value = withTiming(1, { duration: flyMs, easing: Easing.out(Easing.cubic) });
      cb.current.onStart?.();
    });
    const flipAt = wait + flyMs + DRAW_BEAT_MS * k;
    at(flipAt, () => {
      flip.value = withTiming(1, { duration: DRAW_FLIP_MS * k, easing: Easing.inOut(Easing.quad) });
    });
    // 끝남 알림도 타이머로. 웹에서는 withTiming 의 끝 콜백(runOnJS)이 반 초 넘게 늦었다
    at(flipAt + DRAW_FLIP_MS * k, () => cb.current.onFlip?.());
    // 앞면이 드러나는 순간 '사락'
    at(wait + flyMs + (DRAW_BEAT_MS + DRAW_FLIP_MS / 2) * k, () => playSfx('card_draw'));
  };

  // 자리가 잡히면 한 번만 잰다
  const onLayout = () => {
    if (started.current) return;
    started.current = true;
    let settled = false;
    const go = (deck: Parameters<typeof launch>[0], self: Parameters<typeof launch>[1]) => {
      if (settled || !alive.current) return;
      settled = true;
      launch(deck, self);
    };
    timers.current.push(setTimeout(() => go(null, null), MEASURE_GRACE_MS));
    if (from === 'place') return go(null, null);
    void Promise.all([measureDeck(), measureView(box.current)]).then(([deck, self]) => go(deck, self));
  };

  const body = useAnimatedStyle(() => {
    const p = fly.value;
    const f = flip.value;
    return {
      opacity: shown.value * (fade.value ? Math.min(1, p * 3) : 1),
      transform: [
        { translateX: dx.value * (1 - p) },
        { translateY: dy.value * (1 - p) - Math.sin(Math.PI * p) * arc.value },
        { rotate: `${tilt.value * (1 - p)}deg` },
        { scale: s0.value + (1 - s0.value) * p + Math.sin(Math.PI * f) * 0.08 },
      ],
    };
  });
  const front = useAnimatedStyle(() => ({
    opacity: flip.value >= 0.5 ? 1 : 0,
    transform: [{ scaleX: flip.value >= 0.5 ? (flip.value - 0.5) * 2 : 0 }],
  }));
  const back = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 1 : 0,
    transform: [{ scaleX: flip.value < 0.5 ? 1 - flip.value * 2 : 0 }],
  }));

  return (
    <View ref={box} collapsable={false} onLayout={onLayout}>
      <Animated.View style={body}>
        <Animated.View style={front}>{children}</Animated.View>
        <Animated.View pointerEvents="none" style={[styles.back, back]}>
          <CardBack size={size} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', left: 0, top: 0, borderRadius: 8, boxShadow: '0 12px 28px rgba(0,0,0,0.6)' },
});
