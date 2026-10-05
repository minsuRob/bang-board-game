/**
 * 결과 창의 보상 한 줄. "+$10 · +20 XP" 처럼 보인다.
 */

import { Text, View } from 'react-native';

import { REJECT_LABEL } from '../economy/model';
import type { SettlementView } from '../store/use-settlement';
import { WesternFonts } from './menu/western-fonts';
import { themedStyles } from './theme/use-theme';

export function rewardText(view: SettlementView): string | null {
  switch (view.status) {
    case 'none':
      return null;
    case 'pending':
      return '보상 확인 중…';
    case 'settled': {
      const { credit } = view;
      const parts = [`+$${credit.cash}`, `+${credit.xp} XP`];
      if (credit.capped) return `오늘 보상 한도에 닿았다 · ${parts.join(' · ')}`;
      return parts.join(' · ');
    }
    case 'rejected':
      return `보상 없음 · ${view.message ?? (view.reason ? REJECT_LABEL[view.reason] : '정산하지 못했다')}`;
  }
}

export function RewardLine({ view }: { view: SettlementView }) {
  const styles = useStyles();
  const text = rewardText(view);
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
