/**
 * 카드 한 장.
 *
 * 원작의 일러스트는 쓰지 않는다. 테두리 색(갈색=즉시, 파랑=장착), 무늬와 숫자,
 * 그리고 심벌 줄만으로 카드를 읽을 수 있게 만든다.
 */

import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CARD_DEFS } from '../data/cards.base';
import { SUIT_GLYPH, type CardId } from '../data/types';
import { cardOf, kindOf } from '../engine';
import { chipFor } from './card-symbols';
import { Colors, Radius, Spacing } from '@/constants/theme';

export type CardSize = 'sm' | 'md' | 'lg';

const DIMENSIONS: Record<CardSize, { width: number; height: number; title: number }> = {
  sm: { width: 46, height: 66, title: 9 },
  md: { width: 78, height: 112, title: 12 },
  lg: { width: 104, height: 150, title: 14 },
};

export type CardViewProps = {
  card: CardId;
  size?: CardSize;
  selected?: boolean;
  disabled?: boolean;
  /** 눌렀을 때. 없으면 그냥 보여 주기만 한다 */
  onPress?: () => void;
  /** 지금 낼 수 있는 카드인가 (원본 맵 v0.4 "선택 가능한 것 강조") */
  highlighted?: boolean;
};

function CardViewBase({
  card,
  size = 'md',
  selected,
  disabled,
  onPress,
  highlighted,
}: CardViewProps) {
  const dim = DIMENSIONS[size];
  const inst = cardOf(card);
  const def = CARD_DEFS[kindOf(card)];
  const suitColor = inst.suit === 'hearts' || inst.suit === 'diamonds' ? Colors.suitRed : Colors.suitBlack;
  const accent = def.category === 'blue' ? Colors.cardBlue : Colors.cardBrown;

  const body = (
    <View
      style={[
        styles.card,
        { width: dim.width, height: dim.height, borderColor: accent },
        highlighted && styles.highlighted,
        selected && styles.selected,
        disabled && styles.disabled,
      ]}>
      <View style={styles.corner}>
        <Text style={[styles.rank, { color: suitColor }]}>{inst.rank}</Text>
        <Text style={[styles.suit, { color: suitColor }]}>{SUIT_GLYPH[inst.suit]}</Text>
      </View>

      <Text style={[styles.name, { fontSize: dim.title }]} numberOfLines={2}>
        {def.nameKo}
      </Text>
      {size !== 'sm' && (
        <Text style={styles.nameEn} numberOfLines={1}>
          {def.name}
        </Text>
      )}

      <View style={styles.symbols}>
        {def.symbols.slice(0, 3).map((symbol, i) => {
          const chip = chipFor(symbol);
          return (
            <Text key={i} style={[styles.symbol, { color: chip.color }]}>
              {chip.glyph}
            </Text>
          );
        })}
      </View>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityLabel={def.nameKo}>
      {body}
    </Pressable>
  );
}

export const CardView = memo(CardViewBase);

export function CardBack({ size = 'md' }: { size?: CardSize }) {
  const dim = DIMENSIONS[size];
  return (
    <View style={[styles.back, { width: dim.width, height: dim.height }]}>
      <Text style={styles.backMark}>✷</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.paper,
    borderRadius: Radius.md,
    borderWidth: 2,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
    justifyContent: 'space-between',
  },
  highlighted: {
    borderColor: Colors.highlight,
    boxShadow: `0 0 6px ${Colors.highlight}`,
  },
  selected: {
    borderColor: Colors.highlight,
    borderWidth: 3,
    transform: [{ translateY: -8 }],
  },
  disabled: { opacity: 0.45 },
  corner: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rank: { fontSize: 10, fontWeight: '800' },
  suit: { fontSize: 11 },
  name: {
    color: Colors.textOnPaper,
    fontWeight: '800',
    textAlign: 'center',
  },
  nameEn: {
    color: '#7A6448',
    fontSize: 8,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  symbols: { flexDirection: 'row', justifyContent: 'center', gap: 3 },
  symbol: { fontSize: 12, fontWeight: '700' },
  back: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backMark: { color: Colors.cardBrown, fontSize: 20 },
});
