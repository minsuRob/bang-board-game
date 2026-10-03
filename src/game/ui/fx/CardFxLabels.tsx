/**
 * 조준경·야생마·술통 연출에 붙는 글자. Skia 캔버스는 글꼴을 따로 불러야 해서 글자는 RN 으로 그린다.
 *
 * - 조준경: 시야 아래쪽 "거리 3" → "거리 2"
 * - 야생마: 카드 아래 "거리 +1"
 * - 술통: 카드 왼쪽 위 "쏙!", 오른쪽 위 "핑!" (만화 잉크 글씨)
 *
 * 조준경은 시야 밖을 어둡게 덮으므로 글자를 카드 쪽(RN)에 두면 캔버스 아래로 가라앉는다.
 * 그래서 연출 캔버스 바로 위에 띄운다. 캔버스와 같은 좌표계라 같은 시간표 함수로 자리를 계산한다.
 * 쉬는 동안은 투명하다.
 */

import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import {
  barrelFrame,
  FX_BARREL,
  FX_MUSTANG,
  FX_SCOPE,
  mustangFrame,
  scopeFrame,
  scopeView,
  type ShotGeom,
} from './skia/timeline';

type Props = { progress: SharedValue<number>; geom: SharedValue<ShotGeom> };

const PILL_W = 64;
const PILL_H = 20;
const BIG_W = 120;
const BIG_H = 34;

export function CardFxLabels({ progress, geom }: Props) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <ScopeDistance progress={progress} geom={geom} n={3} />
      <ScopeDistance progress={progress} geom={geom} n={2} />
      <MustangDistance progress={progress} geom={geom} />
      <BarrelWord progress={progress} geom={geom} word="sok" />
      <BarrelWord progress={progress} geom={geom} word="ping" />
    </View>
  );
}

/** 조준경 시야 아래쪽 거리 표시. 먼 사람이 반쯤 당겨지면 3 이 2 로 바뀐다 */
function ScopeDistance({ progress, geom, n }: Props & { n: 2 | 3 }) {
  const style = useAnimatedStyle(() => {
    const g = geom.value;
    if (g.kind !== FX_SCOPE) return { opacity: 0 };
    const f = scopeFrame(progress.value);
    const v = scopeView(g, f.open);
    const on = n === 3 ? f.zoom < 0.5 : f.zoom >= 0.5;
    const pop = n === 2 && on ? Math.min(1, (f.zoom - 0.5) * 8) : 1;
    return {
      opacity: on && f.open > 0.6 ? (f.open - 0.6) / 0.4 : 0,
      left: v.x - PILL_W / 2,
      top: v.y + v.r * 0.62 - PILL_H / 2,
      transform: [{ scale: 0.8 + 0.2 * pop }],
    };
  });
  return (
    <Animated.View style={[styles.pill, style]}>
      <Animated.Text style={styles.pillText}>거리 {n}</Animated.Text>
    </Animated.View>
  );
}

function MustangDistance({ progress, geom }: Props) {
  const style = useAnimatedStyle(() => {
    const g = geom.value;
    if (g.kind !== FX_MUSTANG) return { opacity: 0 };
    const d = mustangFrame(progress.value).away;
    const u = g.cw / 92;
    return {
      opacity: d > 0.4 ? Math.min(1, (d - 0.4) / 0.4) : 0,
      left: g.cx - BIG_W / 2,
      top: g.cy + g.ch / 2 + 20 * u - BIG_H / 2,
    };
  });
  return <Animated.Text style={[styles.gold, style]}>거리 +1</Animated.Text>;
}

/** 술통 만화 글씨. 쏙! 은 떠오르며 사라지고, 핑! 은 튕길 때 커졌다 사라진다 */
function BarrelWord({ progress, geom, word }: Props & { word: 'sok' | 'ping' }) {
  const style = useAnimatedStyle(() => {
    const g = geom.value;
    if (g.kind !== FX_BARREL) return { opacity: 0 };
    const f = barrelFrame(progress.value);
    const u = g.cw / 92;
    if (word === 'sok') {
      const k = f.sok;
      return {
        opacity: k < 0 ? 0 : 1 - k,
        left: g.cx - 80 * u - BIG_W / 2,
        top: g.cy - 35 * u - k * 8 * u - BIG_H / 2,
        transform: [{ rotate: '-0.1rad' }],
      };
    }
    const k = f.ping;
    return {
      opacity: k < 0 ? 0 : 1 - k,
      left: g.cx + 86 * u - BIG_W / 2,
      top: g.cy - 47 * u - BIG_H / 2,
      transform: [{ scale: k < 0 ? 1 : k < 0.2 ? 0.6 + k * 3 : 1.2 }, { rotate: '0.12rad' }],
    };
  });
  return <Animated.Text style={[styles.ink, word === 'ping' && styles.inkGold, style]}>{word === 'sok' ? '쏙!' : '핑!'}</Animated.Text>;
}

// 판 위에 뜨는 연출 글자라 테마와 무관한 고정 색이다 (카드 그림·잉크와 같은 팔레트)
const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    width: PILL_W,
    height: PILL_H,
    borderRadius: PILL_H / 2,
    backgroundColor: 'rgba(20,14,8,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(242,193,78,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { color: '#FFF3D6', fontSize: 12, fontWeight: '700', lineHeight: 14 },
  gold: {
    position: 'absolute',
    width: BIG_W,
    height: BIG_H,
    textAlign: 'center',
    color: '#F2C14E',
    fontSize: 20,
    lineHeight: BIG_H,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowRadius: 5,
  },
  ink: {
    position: 'absolute',
    width: BIG_W,
    height: BIG_H,
    textAlign: 'center',
    color: '#FFFAF0',
    fontSize: 24,
    lineHeight: BIG_H,
    fontWeight: '900',
    textShadowColor: '#1E140B',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  inkGold: { color: '#F2C14E', fontSize: 28 },
});
