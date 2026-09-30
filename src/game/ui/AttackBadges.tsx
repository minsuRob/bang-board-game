/**
 * 상대 이름 옆에 붙는 "이 사람이 나를 겨눈 카드" 배지. 카드 종류마다 작은 카드 그림과 횟수.
 *
 * 카드 그림이 없으면 카드 이름 첫 글자를 갈색·파랑 테두리 칸에 넣어 대신한다.
 */

import { memo, useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { CARD_DEFS } from '../data/cards.base';
import type { GameState, PlayerId } from '../engine';
import { ATTACK_KINDS, attacksBy } from './attacks';
import { playingCardArt } from './card-art';
import { Colors } from '@/constants/theme';

const SIZES = {
  xs: { w: 13, h: 19, font: 10 },
  sm: { w: 15, h: 22, font: 11 },
} as const;

type Props = {
  view: GameState;
  /** 카드를 낸 사람 */
  from: PlayerId;
  /** 겨눔을 당한 사람. 보통 나 */
  viewer: PlayerId;
  size?: keyof typeof SIZES;
};

export const AttackBadges = memo(function AttackBadges({ view, from, viewer, size = 'xs' }: Props) {
  const counts = useMemo(() => attacksBy(view.log, from, viewer), [view.log, from, viewer]);
  const kinds = ATTACK_KINDS.filter((k) => counts[k]);
  if (kinds.length === 0) return null;
  const s = SIZES[size];

  return (
    <View
      style={styles.wrap}
      accessibilityLabel={`나에게 ${kinds.map((k) => `${CARD_DEFS[k].nameKo} ${counts[k]}번`).join(', ')}`}>
      {kinds.map((kind) => {
        const def = CARD_DEFS[kind];
        const art = playingCardArt(kind);
        const border = def.category === 'blue' ? Colors.cardBlue : Colors.cardBrown;
        return (
          <View key={kind} style={styles.badge}>
            <View style={[styles.card, { width: s.w, height: s.h, borderColor: border }]}>
              {art ? (
                <Image source={art} style={styles.art} resizeMode="cover" />
              ) : (
                <Text style={[styles.glyph, { fontSize: s.font - 1 }]}>{def.nameKo.charAt(0)}</Text>
              )}
            </View>
            <Text style={[styles.count, { fontSize: s.font }]}>×{counts[kind]}</Text>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 4,
    rowGap: 2,
    flexShrink: 1,
    // 이름 바로 옆에 붙고, 남는 칸은 오른쪽 역할 표시 쪽으로 민다
    marginRight: 'auto',
  },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  card: {
    borderWidth: 1,
    borderRadius: 2,
    backgroundColor: Colors.paper,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  art: { width: '100%', height: '100%' },
  glyph: { color: Colors.textOnPaper, fontWeight: '900' },
  count: { color: Colors.text, fontWeight: '900' },
});
