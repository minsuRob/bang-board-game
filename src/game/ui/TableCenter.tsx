/**
 * 테이블 한가운데 — 덱, 버린 더미, 지금 걸린 이벤트.
 */

import { StyleSheet, Text, View } from 'react-native';

import { HIGHNOON_EVENTS } from '../data/cards.highnoon';
import type { GameState } from '../engine';
import { CardBack, CardView } from './CardView';
import { Colors, Radius, Spacing } from '@/constants/theme';

export function TableCenter({ view, message }: { view: GameState; message: string }) {
  const top = view.discard[view.discard.length - 1];
  const event = view.event?.current ? HIGHNOON_EVENTS[view.event.current] : null;

  return (
    <View style={styles.center}>
      <View style={styles.piles}>
        <View style={styles.pile}>
          <CardBack size="md" />
          <Text style={styles.pileLabel}>덱 {view.deck.length}</Text>
        </View>
        <View style={styles.pile}>
          {top ? <CardView card={top} size="md" /> : <View style={styles.emptyPile} />}
          <Text style={styles.pileLabel}>버린 더미 {view.discard.length}</Text>
        </View>
        {event && (
          <View style={styles.pile}>
            <View style={styles.eventCard}>
              <Text style={styles.eventName}>{event.nameKo}</Text>
              <Text style={styles.eventText} numberOfLines={4}>
                {event.text}
              </Text>
            </View>
            <Text style={styles.pileLabel}>이벤트</Text>
          </View>
        )}
      </View>
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: Spacing.two },
  piles: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  pile: { alignItems: 'center', gap: 4 },
  pileLabel: { color: Colors.textMuted, fontSize: 10 },
  emptyPile: {
    width: 78,
    height: 112,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  eventCard: {
    width: 104,
    height: 112,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.renegade,
    backgroundColor: Colors.paper,
    padding: Spacing.one,
    gap: 3,
  },
  eventName: { color: Colors.textOnPaper, fontWeight: '900', fontSize: 12, textAlign: 'center' },
  eventText: { color: '#5C4A33', fontSize: 8, lineHeight: 11 },
  message: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 420,
  },
});
