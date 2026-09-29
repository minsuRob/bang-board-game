/**
 * 총격 연출. 가운데 스포트라이트의 뱅! 카드 총구에서 불이 뿜어져 나온다.
 *
 * 시계는 `shot`(0→1) 하나뿐이고 모든 요소가 그 값을 interpolate 한다. 그래서 한 화면 안에서
 * 섬광·연기·불티가 어긋날 수 없고, 소리도 같은 틱에 시작하면 맞는다.
 * 입자 경로는 난수 대신 고정 표라 PC·모바일이 똑같이 그린다.
 *
 * 구간 (shot 비율, 1배속 1400ms 기준)
 *   0~3%   총구 섬광이 터진다, 화면 번쩍, 반동
 *   3~45%  불티가 튀고 처진다, 충격파가 퍼진다
 *   5~100% 화약 연기가 앞으로 밀려나며 부풀고 위로 흩어진다
 *   2~80%  BANG! 도장이 찍혔다가 사라진다
 */

import { Animated, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

/** 1배속에서 총격 한 번이 걸리는 시간 */
export const GUNSHOT_MS = 1400;

type Props = {
  shot: Animated.Value;
  /** 카드 크기 */
  width: number;
  height: number;
  /** 총구 자리 (카드 비율) */
  muzzle: { x: number; y: number };
  compact?: boolean;
};

/** 화약 연기. dx·dy 는 총구에서 흘러가는 거리(카드 폭 비율), size 는 최대 지름(px, xl 기준) */
const SMOKE = [
  { dx: 0.18, dy: -0.04, size: 26, start: 0.05, tone: 0 },
  { dx: 0.32, dy: -0.12, size: 34, start: 0.06, tone: 1 },
  { dx: 0.46, dy: -0.06, size: 30, start: 0.07, tone: 0 },
  { dx: 0.26, dy: -0.26, size: 40, start: 0.09, tone: 1 },
  { dx: 0.52, dy: -0.22, size: 44, start: 0.1, tone: 0 },
  { dx: 0.12, dy: -0.34, size: 36, start: 0.12, tone: 1 },
  { dx: 0.4, dy: -0.4, size: 50, start: 0.14, tone: 0 },
  { dx: 0.62, dy: -0.34, size: 46, start: 0.16, tone: 1 },
  { dx: 0.3, dy: -0.52, size: 56, start: 0.18, tone: 0 },
] as const;

/** 불티. angle 은 오른쪽(0°) 기준 도, dist 는 날아가는 거리(카드 폭 비율) */
const SPARKS = [
  { angle: -58, dist: 0.34, size: 4, hot: true },
  { angle: -44, dist: 0.5, size: 3, hot: false },
  { angle: -32, dist: 0.42, size: 5, hot: true },
  { angle: -22, dist: 0.62, size: 3, hot: false },
  { angle: -12, dist: 0.55, size: 4, hot: true },
  { angle: -4, dist: 0.7, size: 3, hot: true },
  { angle: 4, dist: 0.48, size: 5, hot: false },
  { angle: 10, dist: 0.66, size: 3, hot: true },
  { angle: 18, dist: 0.4, size: 4, hot: false },
  { angle: 26, dist: 0.58, size: 3, hot: true },
  { angle: 36, dist: 0.36, size: 4, hot: true },
  { angle: 46, dist: 0.46, size: 3, hot: false },
  { angle: 56, dist: 0.3, size: 4, hot: true },
  { angle: -70, dist: 0.26, size: 3, hot: false },
] as const;

/** 불꽃 줄기. 오른쪽으로 길게, 옆으로 짧게 */
const RAYS = [
  { angle: 0, len: 1 },
  { angle: -28, len: 0.62 },
  { angle: 28, len: 0.62 },
  { angle: -62, len: 0.38 },
  { angle: 62, len: 0.38 },
  { angle: 180, len: 0.25 },
] as const;

export function GunshotFx({ shot, width, height, muzzle, compact }: Props) {
  const mx = width * muzzle.x;
  const my = height * muzzle.y;
  // xl(140) 기준 크기를 카드 폭에 맞춘다
  const k = width / 140;

  const flashOpacity = shot.interpolate({ inputRange: [0, 0.012, 0.035, 0.1], outputRange: [0, 1, 0.9, 0], extrapolate: 'clamp' });
  const flashScale = shot.interpolate({ inputRange: [0, 0.03, 0.1], outputRange: [0.3, 1.25, 0.7], extrapolate: 'clamp' });

  return (
    <View style={[StyleSheet.absoluteFill, styles.none]}>
      {/* 화약 연기 — 섬광 뒤에 깔린다 */}
      {SMOKE.map((s, i) => {
        const d = s.size * k;
        const opacity = shot.interpolate({
          inputRange: [0, s.start, s.start + 0.1, 1],
          outputRange: [0, 0, 0.62, 0],
          extrapolate: 'clamp',
        });
        const move = { inputRange: [s.start, 1], extrapolate: 'clamp' as const };
        return (
          <Animated.View
            key={`smoke${i}`}
            style={[
              styles.smoke,
              s.tone ? styles.smokeLight : null,
              {
                left: mx - d / 2,
                top: my - d / 2,
                width: d,
                height: d,
                borderRadius: d / 2,
                opacity,
                transform: [
                  { translateX: shot.interpolate({ ...move, outputRange: [0, s.dx * width] }) },
                  { translateY: shot.interpolate({ ...move, outputRange: [0, s.dy * width] }) },
                  { scale: shot.interpolate({ ...move, outputRange: [0.35, 1.5] }) },
                ],
              },
            ]}
          />
        );
      })}

      {/* 충격파 두 겹 */}
      {[0.03, 0.09].map((start, i) => {
        const d = 30 * k;
        return (
          <Animated.View
            key={`ring${i}`}
            style={[
              styles.ring,
              {
                left: mx - d / 2,
                top: my - d / 2,
                width: d,
                height: d,
                borderRadius: d / 2,
                opacity: shot.interpolate({
                  inputRange: [0, start, start + 0.03, start + 0.28],
                  outputRange: [0, 0, 0.85, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    scale: shot.interpolate({
                      inputRange: [start, start + 0.28],
                      outputRange: [0.3, 3.2 - i * 0.6],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}

      {/* 총구 섬광: 불꽃 줄기 + 주황·노랑 원 + 흰 심 */}
      <Animated.View
        style={[styles.flash, { left: mx, top: my, opacity: flashOpacity, transform: [{ scale: flashScale }] }]}>
        {RAYS.map((r, i) => {
          const len = 78 * k * r.len;
          const thick = 7 * k;
          return (
            <View
              key={`ray${i}`}
              style={[
                styles.ray,
                {
                  width: len,
                  height: thick,
                  borderRadius: thick / 2,
                  // 한쪽 끝이 총구에 붙도록 길이의 절반만큼 밀고 돌린다
                  transform: [{ rotate: `${r.angle}deg` }, { translateX: len / 2 }],
                  left: -len / 2,
                  top: -thick / 2,
                },
              ]}
            />
          );
        })}
        <View style={[styles.glow, circle(72 * k), { backgroundColor: 'rgba(255, 120, 30, 0.55)' }]} />
        <View style={[styles.glow, circle(46 * k), { backgroundColor: 'rgba(255, 214, 90, 0.9)' }]} />
        <View style={[styles.glow, circle(22 * k), { backgroundColor: '#FFFFFF' }]} />
      </Animated.View>

      {/* 불티 — 부채꼴로 튀고 아래로 처진다 */}
      {SPARKS.map((s, i) => {
        const rad = (s.angle * Math.PI) / 180;
        const dist = s.dist * width;
        const x = Math.cos(rad) * dist;
        const y = Math.sin(rad) * dist;
        const d = s.size * Math.max(0.8, k);
        return (
          <Animated.View
            key={`spark${i}`}
            style={[
              styles.spark,
              {
                left: mx - d / 2,
                top: my - d / 2,
                width: d,
                height: d,
                borderRadius: d / 2,
                backgroundColor: s.hot ? '#FFE27A' : '#FF8A2A',
                opacity: shot.interpolate({
                  inputRange: [0, 0.02, 0.3, 0.45],
                  outputRange: [0, 1, 0.8, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  { translateX: shot.interpolate({ inputRange: [0.02, 0.45], outputRange: [0, x], extrapolate: 'clamp' }) },
                  {
                    translateY: shot.interpolate({
                      inputRange: [0.02, 0.2, 0.45],
                      outputRange: [0, y * 0.75, y + 22 * k],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}

      {/* BANG! 도장 */}
      <Animated.Text
        style={[
          styles.stamp,
          compact && styles.stampCompact,
          {
            left: mx - 6 * k,
            top: my - 70 * k,
            opacity: shot.interpolate({
              inputRange: [0, 0.02, 0.05, 0.6, 0.8],
              outputRange: [0, 0, 1, 1, 0],
              extrapolate: 'clamp',
            }),
            transform: [
              {
                scale: shot.interpolate({
                  inputRange: [0.02, 0.07, 0.11, 0.15],
                  outputRange: [1.9, 0.92, 1.06, 1],
                  extrapolate: 'clamp',
                }),
              },
              {
                rotate: shot.interpolate({
                  inputRange: [0.05, 0.1, 0.15, 0.2],
                  outputRange: ['-12deg', '-7deg', '-15deg', '-12deg'],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}>
        BANG!
      </Animated.Text>
    </View>
  );
}

/** 카드가 총을 쏜 반동으로 왼쪽 뒤로 튀었다 돌아온다 */
export function recoilStyle(shot: Animated.Value) {
  return {
    transform: [
      { translateX: shot.interpolate({ inputRange: [0, 0.035, 0.15], outputRange: [0, -10, 0], extrapolate: 'clamp' }) },
      {
        rotate: shot.interpolate({
          inputRange: [0, 0.035, 0.15],
          outputRange: ['0deg', '-4deg', '0deg'],
          extrapolate: 'clamp',
        }),
      },
    ],
  };
}

/** 테이블 전체가 한 번 번쩍인다 */
export function screenFlashStyle(shot: Animated.Value) {
  return {
    opacity: shot.interpolate({ inputRange: [0, 0.015, 0.1], outputRange: [0, 0.32, 0], extrapolate: 'clamp' }),
  };
}

function circle(d: number) {
  return { width: d, height: d, borderRadius: d / 2, left: -d / 2, top: -d / 2 };
}

const styles = StyleSheet.create({
  none: { pointerEvents: 'none', overflow: 'visible' },
  smoke: { position: 'absolute', backgroundColor: 'rgba(96, 86, 74, 0.85)' },
  smokeLight: { backgroundColor: 'rgba(168, 156, 138, 0.8)' },
  ring: { position: 'absolute', borderWidth: 2.5, borderColor: 'rgba(255, 236, 190, 0.95)' },
  flash: { position: 'absolute', width: 0, height: 0 },
  ray: { position: 'absolute', backgroundColor: 'rgba(255, 196, 70, 0.95)' },
  glow: { position: 'absolute' },
  spark: { position: 'absolute' },
  stamp: {
    position: 'absolute',
    color: Colors.suitRed,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: Colors.paper,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  stampCompact: { fontSize: 22 },
});
