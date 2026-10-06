/**
 * 결과 창의 보상 한 줄. "+$10 · +20 XP" 처럼 보인다.
 */

import { Text, View } from 'react-native';

import type { Messages } from '../../i18n/types-messages';
import type { SettlementView } from '../store/use-settlement';
import { WesternFonts } from './menu/western-fonts';
import { themedStyles } from './theme/use-theme';
import { useT } from '../../i18n/use-t';
import { namesFor, type Names } from '../../i18n/names';
import { useNames } from '../../i18n/use-names';

export function rewardText(view: SettlementView, t: Messages, names: Names = namesFor('ko')): string | null {
  switch (view.status) {
    case 'none':
      return null;
    case 'pending':
      return t.ui.reward.pending;
    case 'settled': {
      const { credit } = view;
      const parts = [`+$${credit.cash}`, `+${credit.xp} XP`];
      if (credit.capped) return t.ui.reward.capped(parts.join(' · '));
      return parts.join(' · ');
    }
    case 'rejected':
      return t.ui.reward.rejected(view.message ?? (view.reason ? names.rejectReason(view.reason) : t.ui.reward.failed));
  }
}

export function RewardLine({ view }: { view: SettlementView }) {
  const styles = useStyles();
  const t = useT();
  const names = useNames();
  const text = rewardText(view, t, names);
  if (!text) return null;
  const tone =
    view.status === 'settled' && !view.credit.capped
      ? styles.good
      : view.status === 'rejected'
        ? styles.bad
        : styles.muted;
  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <Text style={[styles.text, tone]}>{text}</Text>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  row: { alignItems: 'center' },
  text: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    fontFamily: WesternFonts.label,
    fontVariant: ['tabular-nums'],
  },
  good: { color: c.accent },
  bad: { color: c.textMuted },
  muted: { color: c.textMuted },
}));
