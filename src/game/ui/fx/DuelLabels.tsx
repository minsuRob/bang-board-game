/**
 * 결투 말풍선 속 "BANG!".
 *
 * 노란 별 말풍선은 캔버스(DuelSkia)가 그리고, 글자만 RN 으로 캔버스 바로 위에 띄운다.
 * 결투 연출은 화면을 어둡게 덮으므로 카드 쪽에 두면 덮개 아래로 가라앉는다.
 * 캔버스와 같은 좌표계(테이블 레이어)라 말풍선 크기·기울기를 같은 함수(duelBalloon)로 따라간다.
 * 쉬는 동안은 투명하다.
 *
 * 만화 글씨: 굵은 붉은 글자에 검은 외곽선 (외곽선은 검은 글자를 여덟 방향으로 비켜 깐다).
 */

import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { DUEL_BALLOON_TILT, duelBalloon, duelFrame, duelLayout, FX_DUEL, type ShotGeom } from './skia/timeline';

type Props = { progress: SharedValue<number>; geom: SharedValue<ShotGeom> };

const BOX_W = 120;
const BOX_H = 36;
/** 외곽선 두께 (시안 stroke 5 의 절반) */
const EDGE = 2.2;
const OUTLINE = [
  [EDGE, 0],
  [-EDGE, 0],
  [0, EDGE],
  [0, -EDGE],
  [EDGE * 0.7, EDGE * 0.7],
  [-EDGE * 0.7, EDGE * 0.7],
  [EDGE * 0.7, -EDGE * 0.7],
  [-EDGE * 0.7, -EDGE * 0.7],
] as const;

export function DuelLabels({ progress, geom }: Props) {
  // 캔버스와 같은 부모를 꽉 채우므로 크기도 같다. 컷 묶음 자리(duelLayout)를 캔버스와 맞춘다
  const size = useSharedValue({ width: 0, height: 0 });
  const style = useAnimatedStyle(() => {
    const g = geom.value;
    const { width, height } = size.value;
    if (g.kind !== FX_DUEL) return { opacity: 0 };
    const f = duelFrame(progress.value);
    const b = duelBalloon(f.cut);
    if (!f.active || b.alpha <= 0) return { opacity: 0 };
    const L = duelLayout(g, width, height);
    return {
      opacity: b.alpha,
      left: L.x - BOX_W / 2,
      top: L.y - BOX_H / 2,
      transform: [{ scale: b.scale * L.u }, { rotate: `${DUEL_BALLOON_TILT}rad` }, { translateY: 2 }],
    };
  });
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => {
        size.set({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
      }}
    >
      <Animated.View style={[styles.box, style]}>
        {OUTLINE.map(([dx, dy], i) => (
          <Text key={i} style={[styles.text, styles.edge, { transform: [{ translateX: dx }, { translateY: dy }] }]}>
            BANG!
          </Text>
        ))}
        <Text style={styles.text}>BANG!</Text>
      </Animated.View>
    </View>
  );
}

// 연출 글자라 테마와 무관한 고정 색이다 (만화 말풍선의 붉은 글씨)
const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    width: BOX_W,
    height: BOX_H,
    opacity: 0,
  },
  text: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: BOX_W,
    height: BOX_H,
    textAlign: 'center',
    color: '#c0261c',
    fontSize: 26,
    lineHeight: BOX_H,
    fontWeight: '900',
  },
  edge: {
    color: '#0d0906',
  },
});
