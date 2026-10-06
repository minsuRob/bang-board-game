/**
 * 총 장착 연출에 붙는 글자. Skia 캔버스는 글꼴을 따로 불러야 해서 글자는 RN 으로 그린다.
 *
 * - 볼캐닉: 카드 옆 "뱅! ×1 … ×7" 카운터가 ∞ 로 바뀐다
 * - 레밍턴: 과녁 아래 번호 1~5 (4·5 는 흐리게)
 * - 카빈: 레인 띠 번호 1~4. 카드에 가리지 않게 카드 양옆 바깥에 작은 알약으로 띄운다
 *
 * 카드 자리(anchor) 안에 겹쳐 두므로 좌표는 카드 왼쪽 위 기준이다. 캔버스와 같은 진행도·시간표를 읽는다.
 * 번호는 작게, 어두운 알약 위 밝은 글씨로 둬서 어떤 바탕에서도 읽힌다.
 */

import { StyleSheet, Text, View } from 'react-native';

import { useT } from '../../../i18n/use-t';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import {
  laneFrame,
  laneX,
  laneY,
  laneZ,
  LANE_STEPS_MS,
  rangeFrame,
  RANGE_TARGETS,
  volleyFrame,
  VOLLEY_SHOTS_MS,
} from './skia/timeline';

type Visual = 'volley' | 'range' | 'lane';
type Props = { visual: Visual; progress: SharedValue<number>; cw: number; ch: number };

export function GunFxLabels({ visual, progress, cw, ch }: Props) {
  if (visual === 'volley') return <VolleyCounter progress={progress} cw={cw} ch={ch} />;
  if (visual === 'range') return <RangeNumbers progress={progress} cw={cw} ch={ch} />;
  return <LaneNumbers progress={progress} cw={cw} ch={ch} />;
}

type Part = { progress: SharedValue<number>; cw: number; ch: number };

function easeBack(t: number) {
  'worklet';
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

// ── 볼캐닉 ─────────────────────────────────────────────

function VolleyCounter({ progress, cw, ch }: Part) {
  const t = useT();
  const box = useAnimatedStyle(() => ({ opacity: volleyFrame(progress.value).counter }));
  const inf = useAnimatedStyle(() => {
    const k = volleyFrame(progress.value).inf;
    return { opacity: k > 0 ? 1 : 0, transform: [{ scale: k > 0 ? easeBack(k) : 0.01 }] };
  });
  const width = 96;
  return (
    <Animated.View pointerEvents="none" style={[styles.volley, { left: cw * 1.54 - width / 2, top: ch * 0.2, width }, box]}>
      <Text style={styles.volleyLabel}>{t.ui.fx.bang}</Text>
      <View style={styles.volleyCount}>
        {VOLLEY_SHOTS_MS.map((_, i) => (
          <VolleyDigit key={i} n={i + 1} progress={progress} />
        ))}
        <Animated.Text style={[styles.volleyNum, styles.volleyInf, inf]}>∞</Animated.Text>
      </View>
    </Animated.View>
  );
}

function VolleyDigit({ n, progress }: { n: number; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const f = volleyFrame(progress.value);
    return { opacity: f.count === n ? 1 - f.inf : 0, transform: [{ scale: 1 + f.rec * 0.35 }] };
  });
  return <Animated.Text style={[styles.volleyNum, style]}>×{n}</Animated.Text>;
}

// ── 레밍턴 ─────────────────────────────────────────────

function RangeNumbers({ progress, cw, ch }: Part) {
  return (
    <>
      {RANGE_TARGETS.map((t, i) => (
        <RangeNumber key={i} i={i} progress={progress} x={cw + t.x * cw} y={t.y * ch + 6 + 11 * t.s * (cw / 92)} />
      ))}
    </>
  );
}

function RangeNumber({ i, progress, x, y }: { i: number; progress: SharedValue<number>; x: number; y: number }) {
  const style = useAnimatedStyle(() => {
    const f = rangeFrame(progress.value);
    return { opacity: f.fade * Math.min(1, f.up[i] * 4) };
  });
  return <Pill x={x} y={y} text={String(i + 1)} dim={i >= 3} style={style} />;
}

// ── 카빈 ───────────────────────────────────────────────

function LaneNumbers({ progress, cw, ch }: Part) {
  return (
    <>
      {LANE_STEPS_MS.map((_, i) => {
        const [z0, z1] = laneZ(i);
        const y = ch / 2 + (laneY(z0, ch) + laneY(z1, ch)) / 2;
        // 띠 가운데쯤, 그러나 카드 모서리보다는 바깥
        const dx = Math.max(laneX(z0, 0.82, cw), cw / 2 + 14);
        return (
          <View key={i} pointerEvents="none" style={StyleSheet.absoluteFill}>
            <LaneNumber i={i} progress={progress} x={cw / 2 - dx} y={y} />
            <LaneNumber i={i} progress={progress} x={cw / 2 + dx} y={y} />
          </View>
        );
      })}
    </>
  );
}

function LaneNumber({ i, progress, x, y }: { i: number; progress: SharedValue<number>; x: number; y: number }) {
  const style = useAnimatedStyle(() => {
    const f = laneFrame(progress.value);
    return { opacity: f.floor * f.band[i] };
  });
  return <Pill x={x} y={y} text={String(i + 1)} style={style} />;
}

// ── 공용 ───────────────────────────────────────────────

const PILL_W = 20;
const PILL_H = 16;

function Pill({ x, y, text, dim, style }: { x: number; y: number; text: string; dim?: boolean; style: object }) {
  return (
    <Animated.View pointerEvents="none" style={[styles.pill, dim && styles.pillDim, { left: x - PILL_W / 2, top: y - PILL_H / 2 }, style]}>
      <Text style={[styles.pillText, dim && styles.pillTextDim]}>{text}</Text>
    </Animated.View>
  );
}

// 판 위에 뜨는 연출 글자라 테마와 무관한 고정 색이다 (카드 그림·총구 섬광과 같은 팔레트)
const styles = StyleSheet.create({
  volley: { position: 'absolute', alignItems: 'center' },
  volleyLabel: {
    color: '#EFE2C6',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
  },
  volleyCount: { width: '100%', height: 44, alignItems: 'center', justifyContent: 'center' },
  volleyNum: {
    position: 'absolute',
    color: '#F2C14E',
    fontSize: 24,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowRadius: 5,
  },
  volleyInf: { fontSize: 36 },
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
  pillDim: { borderColor: 'rgba(179,155,116,0.45)', backgroundColor: 'rgba(20,14,8,0.55)' },
  pillText: { color: '#FFF3D6', fontSize: 11, fontWeight: '700', lineHeight: 13 },
  pillTextDim: { color: 'rgba(239,226,198,0.6)' },
});
