/**
 * 떠오르는 숫자 (-1, +2). RN Animated 로 올라가며 사라진다. 글자라서 3D 에 넣지 않는다.
 */

import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useStore } from 'zustand';

import type { GameState } from '../../engine';
import { anchorsStore, seatKey } from '../core/anchors-store';
import { DUR } from '../core/durations';
import { dropNumber, fxStore, type FloatingNumber } from '../core/fx-store';
import { Colors } from '@/constants/theme';

const TONE = { damage: Colors.danger, heal: Colors.success, info: Colors.highlight } as const;

export function FloatingNumbers({ view }: { view: GameState }) {
  const numbers = useStore(fxStore, (s) => s.numbers);
  const points = useStore(anchorsStore, (s) => s.points);
  return (
    <>
      {numbers.map((n) => {
        const i = view.players.findIndex((p) => p.id === n.pid);
        const at = points[seatKey(i)];
        if (!at) return null;
        return <Rising key={n.id} n={n} x={at.x} y={at.y} />;
      })}
    </>
  );
}

function Rising({ n, x, y }: { n: FloatingNumber; x: number; y: number }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const anim = Animated.timing(progress, { toValue: 1, duration: DUR.number, useNativeDriver: false });
    anim.start(({ finished }) => {
      if (finished) dropNumber(n.id);
    });
    return () => anim.stop();
  }, [progress, n.id]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -56] });
  const opacity = progress.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] });
  const scale = progress.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0.6, 1.35, 1] });

  return (
    <Animated.View style={[styles.wrap, { left: x - 40, top: y - 48, opacity, transform: [{ translateY }, { scale }] }]}>
      <Text style={[styles.text, { color: TONE[n.tone] }]}>{n.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', width: 80, alignItems: 'center', pointerEvents: 'none' },
  text: {
    fontSize: 26,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
