/**
 * 메뉴 화면(첫 화면·판 설정·카드 도감)이 같이 쓰는 종이 장식.
 *
 * 정오의 큰길 수채 바탕(MenuBackdrop) 위에 인쇄한 종이 한 장을 얹고, 잉크로 제목과 괘선을 찍는다.
 * 고른 칩은 잉크 도장처럼 까맣게 찍힌다. 자세한 것은 docs/menu-design.md.
 */

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { WesternFonts } from './western-fonts';

export const PaperInk = {
  /** 바탕 종이 (수채 그림 가장자리와 같은 색) */
  paper: '#f3ead6',
  /** 위에 얹는 인쇄 종이 */
  sheet: '#fbf6ea',
  ink: '#2b1d10',
  inkSoft: '#5a4128',
  inkMuted: '#8a7458',
  red: '#a8261b',
  /** 카드 테두리 금빛 / 나무 */
  frame: '#c9a25a',
  wood: '#8b5a2b',
  rule: 'rgba(43,29,16,0.3)',
} as const;

/** 종이 한 장. 화면 내용을 이 안에 담는다 */
export function PaperSheet({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.sheet, style]}>{children}</View>;
}

/** 위에 작은 영문 활자, 아래 굵은 한글 제목, 그 밑에 두 줄 괘선 */
export function PaperHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.doubleRule} />
    </View>
  );
}

/** 소제목 옆으로 가는 괘선이 이어진다 */
export function PaperSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionRule} />
      </View>
      {children}
    </View>
  );
}

/** 빨간 도장 같은 큰 버튼 */
export function StampButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.stamp, pressed && styles.stampPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}>
      <View style={styles.stampInner}>
        <Text style={styles.stampText}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** 잉크색 글자 링크 (돌아가기 같은) */
export function InkLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

export const paperText = StyleSheet.create({
  hint: { color: PaperInk.inkSoft, fontSize: 12.5, lineHeight: 19, fontFamily: WesternFonts.body },
  value: { color: PaperInk.ink, fontSize: 22, fontWeight: '900', fontFamily: WesternFonts.type, fontVariant: ['tabular-nums'] },
});

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: 'rgba(251,246,234,0.94)',
    borderWidth: 1.5,
    borderColor: PaperInk.rule,
    borderRadius: 4,
    padding: 24,
    gap: 24,
    boxShadow: '0 10px 30px rgba(60,40,20,0.22)',
  },
  heading: { alignItems: 'center', gap: 2 },
  eyebrow: { color: PaperInk.inkMuted, fontSize: 13, letterSpacing: 5, fontFamily: WesternFonts.title },
  title: { color: PaperInk.ink, fontSize: 32, fontWeight: '900', fontFamily: WesternFonts.label },
  doubleRule: {
    alignSelf: 'stretch',
    marginTop: 8,
    height: 5,
    borderTopWidth: 1.5,
    borderBottomWidth: 1,
    borderColor: PaperInk.rule,
  },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { color: PaperInk.ink, fontSize: 16, fontWeight: '900', fontFamily: WesternFonts.label },
  sectionRule: { flex: 1, height: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: PaperInk.rule },
  stamp: {
    backgroundColor: PaperInk.red,
    borderRadius: 6,
    padding: 4,
    boxShadow: '0 6px 0 #5e140f, 0 12px 20px rgba(60,20,10,0.3)',
  },
  stampPressed: { transform: [{ translateY: 3 }], boxShadow: '0 3px 0 #5e140f, 0 6px 12px rgba(60,20,10,0.3)' },
  stampInner: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(251,246,234,0.6)',
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  stampText: { color: PaperInk.sheet, fontSize: 24, fontWeight: '900', letterSpacing: 6, fontFamily: WesternFonts.label },
  link: { color: PaperInk.inkSoft, fontSize: 14, textAlign: 'center', fontFamily: WesternFonts.body },
});
