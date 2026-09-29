/**
 * 테이블 한가운데에 카드 한 장을 크게 띄운다.
 *
 * 1. 누가 카드를 내면 잠깐 떴다 사라진다. 로그를 읽으므로 3D·2D·모바일 어디서나 같고,
 *    온라인에서도 남이 낸 카드가 똑같이 뜬다.
 * 2. 내 손패를 살펴보는 동안(웹 hover, 폰 첫 탭) 그 카드가 떠 있다. 이쪽이 우선이다.
 *
 * 카드 아래에는 드래프트와 같은 종이 명판으로 상황과 카드 효과를 적는다.
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { CardId } from '../data/types';
import { defOf, isHidden, type GameEvent, type GameState, type PlayerId } from '../engine';
import { fxPacing } from '../store/fx-pacing';
import { CAN_HOVER, cardPeek, setPeek } from './card-peek';
import { CardView } from './CardView';
import { PaperPlaque, plaque } from './PaperPlaque';
import type { TableApi } from './use-table';
import { Spacing } from '@/constants/theme';

const NATIVE_DRIVER = Platform.OS !== 'web';

/** 손에서 카드를 내는 로그 */
const PLAY_EVENTS = new Set(['playCard', 'playMissed', 'indiansBang', 'duelBang']);

/** 1배속에서 떠 있는 시간 */
const SHOW_MS = 2200;

export type PlayedCardSpotlightProps = {
  view: GameState;
  viewer: PlayerId;
  api: Pick<TableApi, 'playable' | 'discardable'>;
  compact?: boolean;
};

export function PlayedCardSpotlight({ view, viewer, api, compact }: PlayedCardSpotlightProps) {
  const [shown, setShown] = useState<GameEvent | null>(null);
  // 처음 그릴 때 이미 있던 로그는 띄우지 않는다
  const seen = useRef<number | null>(null);
  const peek = useStore(cardPeek, (s) => s.card);
  const hand = view.players.find((p) => p.id === viewer)?.hand ?? [];
  const peeking = peek !== null && hand.includes(peek) ? peek : null;

  useEffect(() => {
    const lastSeq = view.log[view.log.length - 1]?.seq ?? 0;
    const since = seen.current;
    seen.current = lastSeq;
    if (since === null || lastSeq <= since) return;
    const fresh = view.log.filter((e) => e.seq > since && PLAY_EVENTS.has(e.t) && e.card && !isHidden(e.card));
    const latest = fresh[fresh.length - 1];
    if (latest) setShown(latest);
  }, [view.log]);

  // 살펴보던 카드가 손을 떠났다 (냈거나 뺏겼다)
  useEffect(() => {
    if (peek !== null && peeking === null) setPeek(null);
  }, [peek, peeking]);

  // 살펴보기가 앞을 가리면 그동안 뜬 카드는 접는다. 닫은 뒤 옛 카드가 다시 튀지 않게
  useEffect(() => {
    if (peeking) setShown(null);
  }, [peeking]);

  if (peeking) {
    return (
      <View style={styles.layer}>
        <PeekSpot key={peeking} card={peeking} meta={peekHint(api, peeking)} compact={compact} />
      </View>
    );
  }
  if (!shown) return null;
  return (
    <View style={[styles.layer, styles.passThrough]}>
      <PlayedSpot
        key={`${shown.seq}:${shown.card}`}
        event={shown}
        compact={compact}
        onDone={() => setShown((cur) => (cur === shown ? null : cur))}
      />
    </View>
  );
}

function peekHint(api: PlayedCardSpotlightProps['api'], card: CardId): string {
  if (api.discardable.has(card)) return CAN_HOVER ? '눌러서 버린다' : '한 번 더 누르면 버린다';
  if (api.playable.has(card)) return CAN_HOVER ? '눌러서 낸다' : '한 번 더 누르면 낸다';
  return '지금은 낼 수 없다';
}

/** 누가 낸 카드. 튀어 올랐다가 잠시 뒤 사라진다 */
function PlayedSpot({ event, compact, onDone }: { event: GameEvent; compact?: boolean; onDone: () => void }) {
  const [t] = useState(() => new Animated.Value(0));
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const scale = Math.max(1, fxPacing.getState().timeScale);
    const hold = Math.max(600, SHOW_MS / scale - 400);
    const anim = Animated.sequence([
      Animated.spring(t, { toValue: 1, friction: 6, tension: 140, useNativeDriver: NATIVE_DRIVER }),
      Animated.delay(hold),
      Animated.timing(t, { toValue: 0, duration: 220, useNativeDriver: NATIVE_DRIVER }),
    ]);
    anim.start(({ finished }) => {
      if (finished) done.current();
    });
    return () => anim.stop();
  }, [t]);

  return (
    <Animated.View style={[styles.spot, popStyle(t)]}>
      <CardSpotlight card={event.card!} meta={event.text} compact={compact} />
    </Animated.View>
  );
}

/** 손패에서 살펴보는 카드. 손을 떼거나 다시 누를 때까지 떠 있다. 폰은 창을 누르면 닫힌다 */
function PeekSpot({ card, meta, compact }: { card: CardId; meta: string; compact?: boolean }) {
  const [t] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const anim = Animated.timing(t, { toValue: 1, duration: 140, useNativeDriver: NATIVE_DRIVER });
    anim.start();
    return () => anim.stop();
  }, [t]);

  const body = (
    <Animated.View style={[styles.spot, popStyle(t)]}>
      <CardSpotlight card={card} meta={meta} hint compact={compact} />
    </Animated.View>
  );
  // hover 로 열고 닫으므로 창이 마우스를 가로채면 안 된다
  if (CAN_HOVER) return <View style={styles.passThrough}>{body}</View>;
  return (
    <Pressable onPress={() => setPeek(null)} accessibilityRole="button" accessibilityLabel="카드 설명 닫기">
      {body}
    </Pressable>
  );
}

function CardSpotlight({ card, meta, hint, compact }: { card: CardId; meta: string; hint?: boolean; compact?: boolean }) {
  const def = defOf(card);
  return (
    <>
      <View style={styles.cardShadow}>
        <CardView card={card} size={compact ? 'lg' : 'xl'} />
      </View>
      <PaperPlaque compact={compact} style={compact ? styles.plaqueCompact : styles.plaque}>
        <Text style={[plaque.meta, hint && plaque.hint]} numberOfLines={1}>
          {meta}
        </Text>
        <Text style={[plaque.text, compact && plaque.textCompact]} numberOfLines={3}>
          <Text style={plaque.name}>{def.nameKo}</Text>
          {'  '}
          {def.text}
        </Text>
      </PaperPlaque>
    </>
  );
}

function popStyle(t: Animated.Value) {
  return {
    opacity: t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
    transform: [
      { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
      { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
    ],
  };
}

const styles = StyleSheet.create({
  // 좌석·손패 입력을 가로막지 않는다
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  passThrough: { pointerEvents: 'none' },
  spot: { alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  cardShadow: { borderRadius: 8, boxShadow: '0 12px 28px rgba(0,0,0,0.6)' },
  plaque: { width: 340, gap: 2 },
  plaqueCompact: { width: 260, gap: 1 },
});
