/**
 * 윈체스터 조준경의 눈금 숫자 1~5 와 "사정거리 5".
 *
 * 조준경은 렌즈 밖을 어둡게 덮으므로, 글자를 카드 쪽(RN)에 두면 캔버스 덮개 아래로 가라앉는다.
 * 그래서 연출 캔버스 바로 위에 따로 띄운다. 캔버스와 같은 좌표계(테이블 레이어)라 렌즈 자리를
 * 같은 함수(winchesterLens)로 계산해 따라 움직인다. 쉬는 동안은 투명하다.
 *
 * 야간 렌즈 위 연두 발광 글씨. 작게, 그러나 빛 번짐(그림자)으로 또렷하게.
 */

import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { FX_WINCHESTER, WINCHESTER_TICKS, winchesterFrame, winchesterLens, type ShotGeom } from './skia/timeline';

type Props = { progress: SharedValue<number>; geom: SharedValue<ShotGeom> };

const NUM_W = 18;
const NUM_H = 14;
const LABEL_W = 90;
const LABEL_H = 18;

export function WinchesterLabels({ progress, geom }: Props) {
  const label = useAnimatedStyle(() => {
    const g = geom.value;
    if (g.kind !== FX_WINCHESTER) return { opacity: 0 };
    const f = winchesterFrame(progress.value);
    const l = winchesterLens(g, progress.value);
    return {
      opacity: f.active && f.lock > 0 ? 1 - f.open : 0,
      left: l.x - LABEL_W / 2,
      top: l.y - l.R * 0.55 - LABEL_H / 2,
    };
  });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: WINCHESTER_TICKS }, (_, i) => (
        <TickNumber key={i} n={i + 1} progress={progress} geom={geom} />
      ))}
      <Animated.Text style={[styles.label, label]}>사정거리 5</Animated.Text>
    </View>
  );
}

function TickNumber({ n, progress, geom }: Props & { n: number }) {
  const style = useAnimatedStyle(() => {
    const g = geom.value;
    if (g.kind !== FX_WINCHESTER) return { opacity: 0 };
    const f = winchesterFrame(progress.value);
    const l = winchesterLens(g, progress.value);
    const k = f.tick[n - 1];
    const w = (6 - n * 0.6) * l.u;
    const y = l.y + (n * l.R) / 6.2;
    // 5 는 붉은 점과 고정 고리를 피해 오른쪽으로 더 비킨다
    const x = n === 5 ? l.x + 12 * l.u : l.x + w + 4 * l.u;
    return { opacity: f.active ? k * (1 - f.open) : 0, left: x, top: y - NUM_H / 2 };
  });
  return <Animated.Text style={[styles.num, style]}>{n}</Animated.Text>;
}

// 연출 글자라 테마와 무관한 고정 색이다 (야간 렌즈의 연두 발광)
const styles = StyleSheet.create({
  num: {
    position: 'absolute',
    width: NUM_W,
    height: NUM_H,
    color: '#C8FFD2',
    fontSize: 11,
    lineHeight: NUM_H,
    fontWeight: '700',
    textShadowColor: 'rgba(120,255,150,0.9)',
    textShadowRadius: 4,
  },
  label: {
    position: 'absolute',
    width: LABEL_W,
    height: LABEL_H,
    textAlign: 'center',
    color: '#C8FFD2',
    fontSize: 13,
    lineHeight: LABEL_H,
    fontWeight: '700',
    textShadowColor: 'rgba(120,255,150,0.9)',
    textShadowRadius: 5,
  },
});
