/**
 * 첫 화면 왼쪽 위의 계정 배지: 닉네임 · $ · 레벨.
 *
 * Firebase 구성이 비어 있으면 그리지 않는다. 누르면 설정창(프로필·지갑)이 열린다.
 */

import { useEffect } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { startAccountSync, useAccount } from '../../../firebase/account-store';
import { levelFromXp } from '../../economy/level';
import { themedStyles } from '../theme/use-theme';
import { WesternFonts } from './western-fonts';

export function AccountBadge({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  const account = useAccount();

  useEffect(() => {
    startAccountSync();
  }, []);

  if (account.status === 'offline') return null;

  const wallet = account.wallet;
  const level = levelFromXp(wallet?.xp ?? 0).level;
  const syncing = account.status === 'syncing' || account.status === 'idle';
  const label = syncing ? '…' : `$${wallet?.cash ?? 0} · Lv ${level}`;

  return (
    <Pressable
      style={({ pressed }) => [styles.badge, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel={`프로필 ${account.nick} ${label}`}
      onPress={onPress}>
      <Text style={styles.nick} numberOfLines={1}>
        {account.status === 'error' ? '로그인 실패' : account.nick}
      </Text>
      <View style={styles.rule} />
      <Text style={styles.stats}>{label}</Text>
    </Pressable>
  );
}

const useStyles = themedStyles((c) => ({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 240,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: c.panel,
    borderWidth: 1.5,
    borderColor: c.panelBorder,
    boxShadow: `0 2px 8px ${c.shadow}`,
  },
  pressed: { opacity: 0.8 },
  nick: { color: c.text, fontSize: 13, fontWeight: '800', fontFamily: WesternFonts.body, flexShrink: 1 },
  rule: { width: 1, height: 14, backgroundColor: c.rule },
  stats: {
    color: c.accent,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: WesternFonts.label,
    fontVariant: ['tabular-nums'],
  },
}));
