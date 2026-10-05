/**
 * 설정창의 "지갑" 칸: 돈, 레벨과 경험치 바, 전적.
 */

import { Text, View } from 'react-native';

import { useAccount } from '../../../firebase/account-store';
import { CASH_PLAY, CASH_WIN, XP_PLAY, XP_WIN } from '../../economy/constants';
import { levelFromXp } from '../../economy/level';
import { usePaperText } from '../menu/PaperUi';
import { WesternFonts } from '../menu/western-fonts';
import { themedStyles } from '../theme/use-theme';

export function WalletSection() {
  const styles = useStyles();
  const text = usePaperText();
  const account = useAccount();

  if (account.status === 'offline') return null;

  const wallet = account.wallet;
  const xp = wallet?.xp ?? 0;
  const { level, into, span } = levelFromXp(xp);
  const pct = span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.cell}>
          <Text style={styles.label}>돈</Text>
          <Text style={text.value}>${wallet?.cash ?? 0}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.label}>레벨</Text>
          <Text style={text.value}>Lv {level}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.label}>전적</Text>
          <Text style={text.value}>
            {wallet?.games ?? 0}판 {wallet?.wins ?? 0}승
          </Text>
        </View>
      </View>
      <View style={styles.bar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: span, now: into }}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={text.hint}>
        다음 레벨까지 {span - into} XP · 한 판 ${CASH_PLAY}·{XP_PLAY} XP, 이기면 ${CASH_WIN}·{XP_WIN} XP 더
      </Text>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, gap: 2 },
  label: { color: c.textMuted, fontSize: 11.5, letterSpacing: 2, fontFamily: WesternFonts.title },
  bar: { height: 8, borderRadius: 999, backgroundColor: c.rule, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: c.accent, borderRadius: 999 },
}));
