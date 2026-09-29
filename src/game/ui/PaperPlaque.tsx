/**
 * 캐릭터 카드와 같은 낡은 종이 명판. 드래프트 능력 설명·낸 카드 설명이 함께 쓴다.
 */

import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

export function PaperPlaque({
  children,
  compact,
  style,
}: {
  children: ReactNode;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[plaque.box, compact && plaque.boxCompact, style]}>{children}</View>;
}

export const plaque = StyleSheet.create({
  box: {
    maxWidth: 560,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.paperEdge,
    backgroundColor: Colors.paper,
    boxShadow: `inset 0 0 0 1px ${Colors.cardBrown}55, 0 4px 12px rgba(0,0,0,0.45)`,
  },
  boxCompact: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  text: { color: Colors.textOnPaper, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  textCompact: { fontSize: 11, lineHeight: 15 },
  name: { fontSize: 13, fontWeight: '900' },
  hint: { color: Colors.cardBrown, fontStyle: 'italic' },
  meta: { color: Colors.cardBrown, fontSize: 11, fontWeight: '700', textAlign: 'center' },
});
