/**
 * 메뉴 화면(첫 화면·판 설정·카드 도감·설정)이 같이 쓰는 종이 장식.
 *
 * 정오의 큰길 수채 바탕(MenuBackdrop) 위에 인쇄한 종이 한 장을 얹고, 잉크로 제목과 괘선을 찍는다.
 * 고른 칩은 잉크 도장처럼 찬다. 색은 테마 팔레트를 따른다 (다크면 밤 살롱 종이).
 * 자세한 것은 docs/menu-design.md.
 */

import type { ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { themedStyles } from '../theme/use-theme';
import { WesternFonts } from './western-fonts';

/** 종이 한 장. 화면 내용을 이 안에 담는다 */
export function PaperSheet({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return <View style={[styles.sheet, style]}>{children}</View>;
}

/** 위에 작은 영문 활자, 아래 굵은 한글 제목, 그 밑에 두 줄 괘선 */
export function PaperHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  const styles = useStyles();
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
  const styles = useStyles();
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
  const styles = useStyles();
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
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

/** 종이 위 본문 글자: 설명(hint), 큰 숫자(value) */
export const usePaperText = themedStyles((c) => ({
  hint: { color: c.textMuted, fontSize: 12.5, lineHeight: 19, fontFamily: WesternFonts.body },
  value: {
    color: c.text,
    fontSize: 22,
    fontWeight: '900',
    fontFamily: WesternFonts.type,
    fontVariant: ['tabular-nums'],
  },
}));

const useStyles = themedStyles((c) => ({
  sheet: {
    backgroundColor: c.panel,
    borderWidth: 1.5,
    borderColor: c.panelBorder,
    borderRadius: 4,
    padding: 24,
    gap: 24,
    boxShadow: `0 10px 30px ${c.shadow}`,
  },
  heading: { alignItems: 'center', gap: 2 },
  eyebrow: { color: c.textMuted, fontSize: 13, letterSpacing: 5, fontFamily: WesternFonts.title },
  title: { color: c.heading, fontSize: 32, fontWeight: '900', fontFamily: WesternFonts.label },
  doubleRule: {
    alignSelf: 'stretch',
    marginTop: 8,
    height: 5,
    borderTopWidth: 1.5,
    borderBottomWidth: 1,
    borderColor: c.rule,
  },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { color: c.heading, fontSize: 16, fontWeight: '900', fontFamily: WesternFonts.label },
  sectionRule: { flex: 1, height: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: c.rule },
  stamp: {
    backgroundColor: c.accent,
    borderRadius: 6,
    padding: 4,
    boxShadow: `0 6px 0 ${c.accentShadow}, 0 12px 20px ${c.shadow}`,
  },
  stampPressed: { transform: [{ translateY: 3 }], boxShadow: `0 3px 0 ${c.accentShadow}, 0 6px 12px ${c.shadow}` },
  stampInner: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(251,246,234,0.6)',
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  stampText: { color: c.onAccent, fontSize: 24, fontWeight: '900', letterSpacing: 6, fontFamily: WesternFonts.label },
  link: { color: c.textMuted, fontSize: 14, textAlign: 'center', fontFamily: WesternFonts.body },
}));
