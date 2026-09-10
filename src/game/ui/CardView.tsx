/**
 * 카드 한 장.
 *
 * 두 가지 방식으로 그린다.
 *
 * 1. 원본 그림이 설치되어 있으면 그 그림을 쓴다 (`node scripts/install-art.mjs`).
 *    다만 그림에 인쇄된 무늬·숫자는 대표값 하나로 고정이라, 이 판에서 실제로 쓰이는
 *    무늬·숫자를 왼쪽 아래에 덮어 그린다. 판정(술통·감옥·다이너마이트)이 그 값을 보기 때문이다.
 *    그림 속 글자는 이탈리아어라 한국어 이름을 띠로 얹는다.
 *
 * 2. 그림이 없으면 테두리 색(갈색=즉시, 파랑=장착), 무늬와 숫자, 심벌 줄만으로 그린다.
 *    카드 일러스트는 dV Giochi 의 저작물이라 저장소에 넣지 않으므로, 이쪽이 기본 모습이다.
 */

import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { CARD_DEFS } from '../data/cards.base';
import { SUIT_GLYPH, type CardId } from '../data/types';
import { cardOf, kindOf } from '../engine';
import { cardBackArt, playingCardArt } from './card-art';
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
  const kind = kindOf(card);
  const def = CARD_DEFS[kind];
  const suitColor =
    inst.suit === 'hearts' || inst.suit === 'diamonds' ? Colors.suitRed : Colors.suitBlack;
  const accent = def.category === 'blue' ? Colors.cardBlue : Colors.cardBrown;
  const art = playingCardArt(kind);

  const frame = [
    styles.card,
    { width: dim.width, height: dim.height, borderColor: accent },
    highlighted && styles.highlighted,
    selected && styles.selected,
    disabled && styles.disabled,
  ];

  const body = art ? (
    <View style={[...frame, styles.artCard]}>
      <Image source={art} style={styles.art} resizeMode="cover" />

      {size !== 'sm' && (
        <View style={styles.nameStrip}>
          <Text style={[styles.stripText, { fontSize: dim.title - 1 }]} numberOfLines={1}>
            {def.nameKo}
          </Text>
        </View>
      )}

      {/* 그림에 인쇄된 무늬·숫자를 덮는다 */}
      <View style={styles.suitBadge}>
        <Text style={[styles.badgeRank, { color: suitColor }]}>{inst.rank}</Text>
        <Text style={[styles.badgeSuit, { color: suitColor }]}>{SUIT_GLYPH[inst.suit]}</Text>
      </View>
    </View>
  ) : (
    <View style={frame}>
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
  const art = cardBackArt();

  if (art) {
    return (
      <Image
        source={art}
        style={[styles.backArt, { width: dim.width, height: dim.height }]}
        resizeMode="cover"
      />
    );
  }
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
  artCard: { padding: 0, overflow: 'hidden', justifyContent: 'flex-start' },
  art: { width: '100%', height: '100%' },
  nameStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    // 그림에 인쇄된 이탈리아어 제목을 완전히 덮는다. 반투명이면 두 글자가 겹쳐 읽힌다.
    backgroundColor: 'rgb(30, 20, 11)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 160, 23, 0.55)',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  stripText: { color: Colors.paper, fontWeight: '800', textAlign: 'center' },
  suitBadge: {
    position: 'absolute',
    left: 1,
    bottom: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    backgroundColor: 'rgba(252, 250, 244, 0.94)',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  badgeRank: { fontSize: 9, fontWeight: '900' },
  badgeSuit: { fontSize: 10 },

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
  backArt: { borderRadius: Radius.md },
  backMark: { color: Colors.cardBrown, fontSize: 20 },
});
