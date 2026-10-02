/**
 * 그림이 없는 골드 장비·직업 카드 앞면, 그리고 도감 항목 하나를 알맞은 앞면으로 그리는 CodexFace.
 *
 * 플레잉 카드·캐릭터·이벤트는 게임에서 쓰는 컴포넌트를 그대로 쓴다.
 * 골드 장비와 직업은 그림 폴더가 없어서 종이 카드에 글자로 그린다 (직업은 그림이 있으면 그림).
 */

import { Image, StyleSheet, Text, View } from 'react-native';

import { GOLD_CARD_DEFS } from '../../data/cards.goldrush';
import { EVENTS } from '../../data/events';
import { ROLE_LABEL } from '../../data/roles';
import type { CardKind, GoldCardKind, Role } from '../../data/types';
import { roleArt } from '../card-art';
import { CARD_DIMENSIONS, CardView } from '../CardView';
import { CharacterCard } from '../CharacterCard';
import { EventCardFace } from '../EventCardFace';
import { sampleCardId, type CodexItem } from './codex-model';
import { Colors, Radius, Spacing } from '@/constants/theme';

/** 플레잉 카드 비율로 높이를 맞춘다 */
const CARD_RATIO = CARD_DIMENSIONS.xl.height / CARD_DIMENSIONS.xl.width;

const ROLE_COLOR: Record<Role, string> = {
  sheriff: Colors.sheriff,
  deputy: Colors.deputy,
  outlaw: Colors.outlaw,
  renegade: Colors.renegade,
};

const GOLD_BLACK = '#1E1814';

export function GoldCardFace({ kind, width }: { kind: GoldCardKind; width: number }) {
  const def = GOLD_CARD_DEFS[kind];
  const small = width < 110;
  return (
    <View
      style={[
        styles.paper,
        { width, height: Math.round(width * CARD_RATIO), borderColor: def.category === 'black' ? GOLD_BLACK : Colors.cardBrown },
      ]}>
      <Text style={[styles.name, small && styles.nameSmall]} numberOfLines={2}>
        {def.nameKo}
      </Text>
      <Text style={styles.en} numberOfLines={1}>
        {def.nameEn}
      </Text>
      <View style={styles.cost} accessibilityLabel={`금덩이 ${def.cost}`}>
        {Array.from({ length: def.cost }, (_, i) => (
          <View key={i} style={[styles.nugget, small && styles.nuggetSmall]} />
        ))}
      </View>
    </View>
  );
}

export function RoleCardFace({ role, width }: { role: Role; width: number }) {
  const art = roleArt(role);
  const height = Math.round(width * CARD_RATIO);
  if (art) {
    return <Image source={art} style={[styles.art, { width, height }]} resizeMode="cover" accessibilityLabel={ROLE_LABEL[role]} />;
  }
  const color = ROLE_COLOR[role];
  const star = role === 'sheriff' || role === 'deputy';
  return (
    <View style={[styles.paper, { width, height, borderColor: color }]}>
      <Text style={[styles.roleGlyph, { color, fontSize: width * 0.36 }]}>{star ? '★' : role === 'outlaw' ? '✕' : '◆'}</Text>
      <Text style={[styles.name, width < 110 && styles.nameSmall]}>{ROLE_LABEL[role]}</Text>
    </View>
  );
}

/** 도감 항목 하나의 앞면. 폭만 주면 종류에 맞는 비율로 그린다 */
export function CodexFace({ item, width }: { item: CodexItem; width: number }) {
  switch (item.tab) {
    case 'cards':
      return <CardView card={sampleCardId(item.id as CardKind)} size={width >= CARD_DIMENSIONS.xl.width ? 'xl' : width >= CARD_DIMENSIONS.lg.width ? 'lg' : 'md'} showSuit={false} />;
    case 'characters':
      return <CharacterCard id={item.id} width={width} />;
    case 'events':
      return <EventCardFace def={EVENTS[item.id]} width={width} />;
    case 'gold':
      return <GoldCardFace kind={item.id} width={width} />;
    case 'roles':
      return <RoleCardFace role={item.id} width={width} />;
  }
}

const styles = StyleSheet.create({
  art: { borderRadius: Radius.md },
  paper: {
    borderRadius: Radius.md,
    borderWidth: 3,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: Spacing.two,
  },
  name: { color: Colors.textOnPaper, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  nameSmall: { fontSize: 13 },
  en: { color: Colors.cardBrown, fontSize: 10, fontStyle: 'italic' },
  cost: { flexDirection: 'row', gap: 3, marginTop: Spacing.one },
  nugget: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.hp, borderWidth: 1, borderColor: Colors.cardBrown },
  nuggetSmall: { width: 8, height: 8, borderRadius: 4 },
  roleGlyph: { fontWeight: '900' },
});
