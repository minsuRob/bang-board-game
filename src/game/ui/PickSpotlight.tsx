/**
 * 테이블 가운데에 띄우는 카드 고르기 창 (잡화점·강탈·캣 발루).
 *
 * 낸 카드가 뜨는 자리(PlayedCardSpotlight)에 같은 명판 모양으로 뜬다.
 * 앞면 카드는 웹이면 hover, 폰이면 첫 탭에 크게 보여 주고, 누르면(폰은 한 번 더) 고른다.
 * 남의 손패처럼 안 보이는 카드는 뒷면으로 깔고 바로 고른다.
 */

import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CardId } from '../data/types';
import { defOf, type Choice } from '../engine';
import { CAN_HOVER } from './card-peek';
import { CardBack, CardView, type CardSize } from './CardView';
import { PaperPlaque, plaque } from './PaperPlaque';
import type { Prompt } from './use-table';
import { Spacing } from '@/constants/theme';

export type PickSpotlightProps = {
  prompt: Prompt;
  onRespond: (choice: Choice) => void;
  compact?: boolean;
};

export function PickSpotlight({ prompt, onRespond, compact }: PickSpotlightProps) {
  const center = prompt.center!;
  const [focus, setFocus] = useState<CardId | null>(null);
  // 고를 카드가 바뀌면 (잡화점에서 한 장씩 빠진다) 살펴보던 카드를 놓는다
  useEffect(() => {
    if (focus && !center.cards.includes(focus)) setFocus(null);
  }, [center.cards, focus]);

  const size: CardSize = compact ? 'md' : 'lg';
  const pickCard = (card: CardId) =>
    onRespond(center.zone === 'option' ? { c: 'card', card } : { c: 'pick', pick: { zone: 'equipment', card } });
  const pressCard = (card: CardId) => {
    // 폰: 첫 탭은 살펴보기, 같은 카드를 한 번 더 누르면 고른다
    if (!CAN_HOVER && focus !== card) return setFocus(card);
    pickCard(card);
  };

  const def = focus ? defOf(focus) : null;
  const cards = (
    <>
      {Array.from({ length: center.handCount }, (_, index) => (
        <Pressable
          key={`hand:${index}`}
          onPress={() => onRespond({ c: 'pick', pick: { zone: 'hand', index } })}
          accessibilityRole="button"
          accessibilityLabel={`손패 ${index + 1}번째 카드`}
          style={({ hovered }: { hovered?: boolean }) => [styles.card, hovered && styles.lifted]}>
          <CardBack size={size} />
        </Pressable>
      ))}
      {center.cards.map((card) => (
        <View key={card} style={[styles.card, focus === card && styles.lifted]}>
          <CardView
            card={card}
            size={size}
            highlighted
            onPress={() => pressCard(card)}
            onHoverIn={() => setFocus(card)}
            onHoverOut={() => setFocus((cur) => (cur === card ? null : cur))}
          />
        </View>
      ))}
    </>
  );
  return (
    <View style={styles.spot}>
      {compact ? (
        // 폰: 카드가 많아도 줄바꿈하지 않고 좌우로 민다
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollRow}>
          {cards}
        </ScrollView>
      ) : (
        <View style={styles.row}>{cards}</View>
      )}
      <PaperPlaque compact={compact} style={compact ? styles.plaqueCompact : styles.plaque}>
        <Text style={[plaque.meta, plaque.hint]} numberOfLines={1}>
          {prompt.title} — {focus && !CAN_HOVER ? '한 번 더 누르면 고른다' : prompt.hint}
        </Text>
        <Text style={[plaque.text, compact && plaque.textCompact]} numberOfLines={3}>
          {def ? (
            <>
              <Text style={plaque.name}>{def.nameKo}</Text>
              {'  '}
              {def.text}
            </>
          ) : center.handCount > 0 ? (
            '뒷면 카드는 손패에서 무작위로 한 장을 고른다'
          ) : (
            CAN_HOVER ? '카드에 마우스를 올리면 설명을 본다' : '카드를 누르면 설명을 본다'
          )}
        </Text>
      </PaperPlaque>
    </View>
  );
}

const styles = StyleSheet.create({
  spot: { alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two, maxWidth: 620 },
  scroll: { flexGrow: 0, maxWidth: '100%' },
  // 카드가 적으면 가운데, 많으면 왼쪽부터 늘어서며 밀린다. 그림자가 잘리지 않게 위아래로 여유를 둔다
  scrollRow: { flexGrow: 1, justifyContent: 'center', gap: Spacing.two, paddingVertical: 16, paddingHorizontal: Spacing.two },
  card: { borderRadius: 8, boxShadow: '0 12px 28px rgba(0,0,0,0.6)' },
  lifted: { transform: [{ translateY: -10 }, { scale: 1.06 }] },
  plaque: { width: 340, gap: 2 },
  plaqueCompact: { width: 260, gap: 1 },
});
