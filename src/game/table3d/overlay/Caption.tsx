/**
 * 판정·이벤트 캡션. 가운데 위에 잠깐 떴다 사라진다.
 */

import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useStore } from 'zustand';

import { clearCaption, fxStore, type Caption as CaptionData } from '../core/fx-store';
import { Colors, Radius, Spacing } from '@/constants/theme';

export function Caption() {
  const caption = useStore(fxStore, (s) => s.caption);
  if (!caption) return null;
  return <CaptionCard key={caption.id} caption={caption} />;
}

function CaptionCard({ caption }: { caption: CaptionData }) {
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const remain = Math.max(300, caption.until - performance.now());
    const anim = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: false }),
      Animated.delay(Math.max(0, remain - 400)),
      Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: false }),
    ]);
    anim.start(({ finished }) => {
      if (finished) clearCaption(caption.id);
    });
    return () => anim.stop();
  }, [opacity, caption]);

  return (
    <Animated.View style={[styles.wrap, { opacity }]}>
      <Text style={styles.text} numberOfLines={2}>
        {caption.text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: '9%',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  text: {
    color: Colors.paper,
    backgroundColor: 'rgba(24, 16, 9, 0.9)',
    borderWidth: 1.5,
    borderColor: Colors.highlight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    overflow: 'hidden',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: 460,
  },
});
