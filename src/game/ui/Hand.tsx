/**
 * 내 손패.
 *
 * 낼 수 있는 카드만 밝게 보인다. 숫자키 1~0 으로도 고를 수 있다
 * (원본 맵 v0.12 단축키 계승).
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CardId } from '../data/types';
import { CardView } from './CardView';
import { Colors, Spacing } from '@/constants/theme';

export type HandProps = {
  cards: CardId[];
  playable: Set<CardId>;
  selected: CardId | null;
  onSelect: (card: CardId) => void;
  /** 버리기 단계에서 버릴 수 있는 카드 */
  discardable?: Set<CardId>;
  showIndex?: boolean;
};

export function Hand({ cards, playable, selected, onSelect, discardable, showIndex }: HandProps) {
  if (cards.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>손패가 없다</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {cards.map((card, i) => {
        const usable = playable.has(card) || Boolean(discardable?.has(card));
        return (
          <View key={card} style={styles.slot}>
            <CardView
              card={card}
              size="md"
              highlighted={usable}
              disabled={!usable}
              selected={selected === card}
              onPress={() => onSelect(card)}
            />
            {showIndex && i < 10 && (
              <Text style={styles.index}>{i === 9 ? 0 : i + 1}</Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.two, paddingTop: 10 },
  slot: { alignItems: 'center', gap: 2 },
  index: { color: Colors.textMuted, fontSize: 10, fontVariant: ['tabular-nums'] },
  empty: { paddingVertical: Spacing.four, paddingHorizontal: Spacing.three },
  emptyText: { color: Colors.textMuted, fontSize: 13 },
});
