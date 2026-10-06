/**
 * 온라인 접속 상태 점. 초록 = 보는 중, 노랑 = 자리 비움, 빨강 = 나감.
 * 상태가 없으면 (혼자 하는 판, AI 자리) 아무것도 그리지 않는다.
 */

import { View } from 'react-native';

import type { Presence } from '../../firebase/room-model';
import { getT, useT } from '../../i18n/use-t';
import type { Messages } from '../../i18n/types-messages';
import { themedStyles, useColors } from './theme/use-theme';
import { Colors, type ThemeColors } from '@/constants/theme';

/** 판(고정 팔레트) 위에 그릴 때의 색. 테마를 따르는 UI 는 presenceColor 를 쓴다 */
export const PRESENCE_COLOR: Record<Presence, string> = {
  active: Colors.presenceActive,
  away: Colors.presenceAway,
  left: Colors.presenceLeft,
};

/** 지금 테마의 접속 상태 색. 라이트는 종이 위에서 읽히게 조금 짙다 */
export function presenceColor(c: ThemeColors, presence: Presence): string {
  if (presence === 'active') return c.presenceActive;
  if (presence === 'away') return c.presenceAway;
  return c.presenceLeft;
}

export function presenceLabel(t: Messages, presence: Presence): string {
  return t.ui.presence[presence];
}

/** @deprecated 언어를 바꿔도 다시 그려지지 않는다. useT() 와 presenceLabel 을 쓴다 */
export const PRESENCE_LABEL: Record<Presence, string> = {
  get active() {
    return presenceLabel(getT(), 'active');
  },
  get away() {
    return presenceLabel(getT(), 'away');
  },
  get left() {
    return presenceLabel(getT(), 'left');
  },
};

export function PresenceDot({ presence, size = 8 }: { presence: Presence | null; size?: number }) {
  const c = useColors();
  const styles = useStyles();
  const t = useT();
  if (!presence) return null;
  const color = presenceColor(c, presence);
  return (
    <View
      testID={`presence-${presence}`}
      accessibilityLabel={presenceLabel(t, presence)}
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          boxShadow: presence === 'active' ? `0 0 4px ${color}` : undefined,
        },
      ]}
    />
  );
}

// 테두리는 팝업 막(scrim) 색을 빌린다. 다크는 검정, 라이트는 옅은 잉크라 점이 바탕에서 떨어져 보인다.
const useStyles = themedStyles((c) => ({
  dot: { flexShrink: 0, borderWidth: 1, borderColor: c.scrim },
}));
