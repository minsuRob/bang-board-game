/**
 * 내 손패.
 *
 * 낼 수 있는 카드만 밝게 보인다. 숫자키 1~0 으로도 고를 수 있다
 * (원본 맵 v0.12 단축키 계승).
 * 새로 들어온 카드는 칸이 벌어지고 덱에서 날아와 꽂히며 뒤집힌다 (HandArrival).
 */

import { ScrollView, Text, View } from 'react-native';

import type { CardId } from '../data/types';
import { clearPeek, setPeek } from './card-peek';
import { CardView } from './CardView';
import { HandArrival } from './HandArrival';
import { useHandArrivals } from './hand-arrival';
import { themedStyles } from './theme/use-theme';
import { Spacing } from '@/constants/theme';

export type HandProps = {
  cards: CardId[];
  playable: Set<CardId>;
  selected: CardId | null;
  onSelect: (card: CardId) => void;
  /** 버리기 단계에서 버릴 수 있는 카드 */
  discardable?: Set<CardId>;
  showIndex?: boolean;
  /** 손패 주인. 바뀌면 새 카드 등장을 건너뛴다 */
  owner?: string | null;
  /** 바뀌면 새 카드 표시를 지운다 (차례가 넘어갈 때) */
  resetKey?: string;
};

export function Hand({ cards, playable, selected, onSelect, discardable, showIndex, owner, resetKey }: HandProps) {
  const styles = useStyles();
  const arrivals = useHandArrivals(cards, { waitFor3d: false, owner, resetKey });
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
            <HandArrival
              card={card}
              phase={arrivals.phase(card)}
              order={arrivals.order(card)}
              fromDeck={arrivals.fromDeck(card)}
              fresh={arrivals.fresh(card)}
              gap={Spacing.two}
              onSettled={() => arrivals.settled(card)}>
              <CardView
                card={card}
                size="md"
                highlighted={usable}
                disabled={!usable}
                selected={selected === card}
                onPress={() => {
                  arrivals.clearFresh(card);
                  onSelect(card);
                }}
                onHoverIn={() => {
                  arrivals.clearFresh(card);
                  setPeek(card);
                }}
                onHoverOut={() => clearPeek(card)}
              />
            </HandArrival>
            {showIndex && i < 10 && (
              <Text style={styles.index}>{i === 9 ? 0 : i + 1}</Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const useStyles = themedStyles((c) => ({
  row: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.two, paddingTop: 10 },
  slot: { alignItems: 'center', gap: 2 },
  index: { color: c.textMuted, fontSize: 10, fontVariant: ['tabular-nums'] },
  empty: { paddingVertical: Spacing.four, paddingHorizontal: Spacing.three },
  emptyText: { color: c.textMuted, fontSize: 13 },
}));
