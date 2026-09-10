/**
 * 테이블 한가운데 — 덱, 버린 더미, 지금 걸린 이벤트.
 */

import { Image, StyleSheet, Text, View } from 'react-native';

import { HIGHNOON_EVENTS } from '../data/cards.highnoon';
import type { GameState } from '../engine';
import { eventArt } from './card-art';
import { CardBack, CardView } from './CardView';
import { Colors, Radius, Spacing } from '@/constants/theme';

export function TableCenter({ view, message }: { view: GameState; message: string }) {
  const top = view.discard[view.discard.length - 1];
  const event = view.event?.current ? HIGHNOON_EVENTS[view.event.current] : null;
  const eventImage = view.event?.current ? eventArt(view.event.current) : null;

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
            {eventImage ? (
              <View style={styles.eventArtCard}>
                <Image source={eventImage} style={styles.eventArt} resizeMode="cover" />
                <View style={styles.eventStrip}>
                  <Text style={styles.eventStripText} numberOfLines={1}>
                    {event.nameKo}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.eventCard}>
                <Text style={styles.eventName}>{event.nameKo}</Text>
                <Text style={styles.eventText} numberOfLines={4}>
                  {event.text}
                </Text>
              </View>
            )}
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
  pileLabel: {
    color: Colors.paperEdge,
    fontSize: 10,
    backgroundColor: 'rgba(24, 16, 9, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
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
  eventArtCard: {
    width: 104,
    height: 112,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.renegade,
    overflow: 'hidden',
  },
  eventArt: { width: '100%', height: '100%' },
  eventStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(24, 16, 8, 0.78)',
    paddingVertical: 1,
  },
  eventStripText: { color: Colors.paper, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  eventName: { color: Colors.textOnPaper, fontWeight: '900', fontSize: 12, textAlign: 'center' },
  eventText: { color: '#5C4A33', fontSize: 8, lineHeight: 11 },
  message: {
    color: Colors.text,
    backgroundColor: 'rgba(24, 16, 9, 0.82)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    overflow: 'hidden',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 420,
  },
});
