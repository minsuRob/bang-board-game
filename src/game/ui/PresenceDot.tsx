/**
 * 온라인 접속 상태 점. 초록 = 보는 중, 노랑 = 자리 비움, 빨강 = 나감.
 * 상태가 없으면 (혼자 하는 판, AI 자리) 아무것도 그리지 않는다.
 */

import { StyleSheet, View } from 'react-native';

import type { Presence } from '../../firebase/room-model';
import { Colors } from '@/constants/theme';

export const PRESENCE_COLOR: Record<Presence, string> = {
  active: Colors.presenceActive,
  away: Colors.presenceAway,
  left: Colors.presenceLeft,
};

export const PRESENCE_LABEL: Record<Presence, string> = {
  active: '접속 중',
  away: '자리 비움',
  left: '나감',
};

export function PresenceDot({ presence, size = 8 }: { presence: Presence | null; size?: number }) {
  if (!presence) return null;
  return (
    <View
      testID={`presence-${presence}`}
      accessibilityLabel={PRESENCE_LABEL[presence]}
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: PRESENCE_COLOR[presence],
          boxShadow: presence === 'active' ? `0 0 4px ${PRESENCE_COLOR.active}` : undefined,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: { flexShrink: 0, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.55)' },
});
