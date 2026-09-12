/**
 * `?fx=demo` — 효과를 하나씩 눌러 본다. 개발 빌드에서만.
 */

import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import type { GameState, PlayerId } from '../../engine';
import { DUR, makeBatch } from '../core/durations';
import { enqueueFx } from '../core/fx-store';
import type { FxCommand } from '../core/types';
import { Colors, Radius, Spacing } from '@/constants/theme';

export function FxDemo({ state, viewer }: { state: GameState; viewer: PlayerId }) {
  const others = state.players.filter((p) => p.id !== viewer && (p.alive || p.ghost)).map((p) => p.id);
  const a = others[0] ?? viewer;
  const b = others[1] ?? a;
  const deckTop = state.deck[state.deck.length - 1];
  const discardTop = state.discard[state.discard.length - 1];
  const myCard = state.players.find((p) => p.id === viewer)?.hand[0];

  const fire = (...steps: FxCommand[][]) => enqueueFx(makeBatch(-1, steps));

  const items: { label: string; run: () => void }[] = [
    {
      label: '뱅!',
      run: () =>
        fire(
          [{ k: 'bang', from: a, to: b }],
          [
            { k: 'seatFlash', pid: b, tone: 'red' },
            { k: 'shockwave', pid: b, strength: 1 },
            { k: 'shake', strength: 0.12, ms: 260 },
            { k: 'number', pid: b, text: '-1', tone: 'damage' },
          ],
        ),
    },
    { label: '빗나감!', run: () => fire([{ k: 'shield', pid: b }]) },
    {
      label: '맥주',
      run: () =>
        fire([
          { k: 'seatFlash', pid: a, tone: 'green' },
          { k: 'particles', preset: 'sparkle', pid: a },
          { k: 'number', pid: a, text: '+1', tone: 'heal' },
        ]),
    },
    {
      label: '개틀링',
      run: () => fire([{ k: 'fanOut', from: viewer, to: others, staggerMs: DUR.fanStagger }]),
    },
    {
      label: '다이너마이트',
      run: () =>
        fire([
          { k: 'shockwave', pid: a, strength: 3 },
          { k: 'particles', preset: 'explosion', pid: a },
          { k: 'shake', strength: 0.5, ms: 520 },
          { k: 'caption', text: '다이너마이트가 터졌다!', ms: DUR.caption },
        ]),
    },
    {
      label: '카드 비행',
      run: () =>
        myCard &&
        fire([
          {
            k: 'moveCard',
            card: myCard,
            from: { z: 'hand', pid: viewer },
            to: { z: 'discard' },
            face: 'up',
            style: 'arc',
            slam: true,
            via: a,
            fromIndex: 0,
            fromCount: 1,
            toIndex: state.discard.length,
            toCount: state.discard.length + 1,
          },
        ]),
    },
    {
      label: '판정',
      run: () =>
        deckTop &&
        fire([
          {
            k: 'moveCard',
            card: deckTop,
            from: { z: 'deck' },
            to: { z: 'discard' },
            face: 'up',
            style: 'reveal',
            holdMs: DUR.revealHold,
            fromIndex: 0,
            fromCount: 1,
            toIndex: state.discard.length,
            toCount: state.discard.length + 1,
          },
          { k: 'caption', text: '판정 — ♥7', ms: DUR.caption },
        ]),
    },
    {
      label: '드로우',
      run: () =>
        fire(
          state.deck
            .slice(-2)
            .map((card, i) => ({
              k: 'moveCard' as const,
              card,
              from: { z: 'deck' as const },
              to: { z: 'hand' as const, pid: a },
              face: 'down' as const,
              style: 'deal' as const,
              delayMs: i * DUR.dealStagger,
              fromIndex: 0,
              fromCount: 1,
              toIndex: i,
              toCount: 2,
            })),
        ),
    },
    {
      label: '흩어짐',
      run: () =>
        discardTop &&
        fire([
          {
            k: 'moveCard',
            card: discardTop,
            from: { z: 'discard' },
            to: { z: 'discard' },
            face: 'up',
            style: 'scatter',
            fromIndex: 0,
            fromCount: 1,
            toIndex: state.discard.length - 1,
            toCount: state.discard.length,
          },
        ]),
    },
    { label: '포커스', run: () => fire([{ k: 'cameraFocus', pid: b, holdMs: 900 }]) },
    { label: '흔들기', run: () => fire([{ k: 'shake', strength: 0.3, ms: 400 }]) },
  ];

  return (
    <ScrollView horizontal style={styles.bar} contentContainerStyle={styles.row} showsHorizontalScrollIndicator={false}>
      {items.map((it) => (
        <Pressable key={it.label} onPress={it.run} style={styles.button} accessibilityRole="button">
          <Text style={styles.text}>{it.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: 40 },
  row: { gap: Spacing.one, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  button: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(24, 16, 9, 0.85)',
    borderWidth: 1,
    borderColor: Colors.highlight,
  },
  text: { color: Colors.highlight, fontSize: 11, fontWeight: '800' },
});
