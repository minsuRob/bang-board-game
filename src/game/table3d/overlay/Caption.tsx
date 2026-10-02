/**
 * 판정·이벤트 캡션. 가운데 위에 잠깐 떴다 사라진다.
 */

import { useEffect, useState } from 'react';
import { Animated, Text } from 'react-native';
import { useStore } from 'zustand';

import { WesternFonts } from '../../ui/menu/western-fonts';
import { themedStyles } from '../../ui/theme/use-theme';
import { clearCaption, fxStore, type Caption as CaptionData } from '../core/fx-store';
import { Radius, Spacing } from '@/constants/theme';

export function Caption() {
  const caption = useStore(fxStore, (s) => s.caption);
  if (!caption) return null;
  return <CaptionCard key={caption.id} caption={caption} />;
}

function CaptionCard({ caption }: { caption: CaptionData }) {
  const styles = useStyles();
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

// 어두운 판 위에 뜨니 글자를 패널 안에 담는다
const useStyles = themedStyles((c) => ({
  wrap: {
    position: 'absolute',
    top: '9%',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  text: {
    color: c.heading,
    backgroundColor: c.panel,
    borderWidth: 1.5,
    borderColor: c.panelBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    overflow: 'hidden',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: WesternFonts.label,
    textAlign: 'center',
    maxWidth: 460,
    boxShadow: `0 4px 14px ${c.shadow}`,
  },
}));
