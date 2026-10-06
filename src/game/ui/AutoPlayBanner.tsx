/**
 * "자동 플레이" 알림. 사람 자리의 제한시간이 지나 기본 행동이 대신 들어가면 판 가운데에 잠깐 뜬다.
 *
 * 접속해 있는데도 차례가 저절로 넘어갔다면 왜 그런지 바로 보이게 하려는 것이다.
 * 이 알림 없이 넘어간 사람 자리의 수는 그 사람이 직접 둔 것이다.
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';

import type { GameState, PlayerId } from '../engine';
import { useGameStore } from '../store/game-store';
import { onTransition } from '../store/transition-bus';
import { autoPlayOf, autoPlayText, type AutoPlayNotice } from './auto-play';
import { WesternFonts } from './menu/western-fonts';
import { themedStyles } from './theme/use-theme';
import { Radius, Spacing } from '@/constants/theme';

/** 떠 있는 시간 */
const SHOW_MS = 2600;
/** 이 안에 이어 들어온 자동 플레이는 한 알림에 묶는다 (드래프트 마감) */
const MERGE_MS = 600;

type Shown = AutoPlayNotice & { id: number; at: number };

export function AutoPlayBanner({ view, viewer }: { view: GameState; viewer: PlayerId | null }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const nextId = useRef(0);

  useEffect(
    () =>
      onTransition((t) => {
        const pid = autoPlayOf(t, useGameStore.getState().seats);
        if (!pid) return;
        const now = Date.now();
        setShown((cur) => {
          if (cur && now - cur.at < MERGE_MS) {
            return cur.pids.includes(pid) ? cur : { ...cur, pids: [...cur.pids, pid], at: now };
          }
          return { id: ++nextId.current, pids: [pid], at: now };
        });
      }),
    [],
  );

  if (!shown) return null;
  return (
    <Stamp
      key={shown.id}
      text={autoPlayText(shown, view, viewer)}
      onDone={() => setShown((cur) => (cur?.id === shown.id ? null : cur))}
    />
  );
}

function Stamp({ text, onDone }: { text: string; onDone: () => void }) {
  const styles = useStyles();
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(1.25));
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: false }),
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 140, useNativeDriver: false }),
      ]),
      Animated.delay(SHOW_MS - 160 - 300),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]);
    anim.start(({ finished }) => {
      if (finished) done.current();
    });
    return () => anim.stop();
  }, [opacity, scale]);

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View
        style={[styles.stamp, { opacity, transform: [{ scale }, { rotate: '-3deg' }] }]}
        accessibilityRole="alert"
        accessibilityLabel={`자동 플레이. ${text}`}
      >
        <Text style={styles.title}>자동 플레이</Text>
        <Text style={styles.detail} numberOfLines={2}>
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

// 가운데 카드 연출 위로 겹쳐도 읽히게 빨간 도장으로 찍는다
const useStyles = themedStyles((c) => ({
  wrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  stamp: {
    alignItems: 'center',
    backgroundColor: c.panel,
    borderWidth: 3,
    borderColor: c.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    maxWidth: 420,
    boxShadow: `0 6px 18px ${c.shadow}`,
  },
  title: {
    color: c.accent,
    fontSize: 26,
    fontWeight: '900',
    fontFamily: WesternFonts.label,
    letterSpacing: 2,
  },
  detail: {
    marginTop: 2,
    color: c.heading,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
}));
