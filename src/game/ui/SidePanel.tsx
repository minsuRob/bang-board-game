/**
 * 옆 칸: 위에 진행 기록(3), 아래에 채팅(7).
 *
 * 넓은 화면에서는 테이블 오른쪽에 붙고, 좁은 화면에서는 '기록·채팅' 오버레이 안에 들어간다.
 * 칸 비율은 flexBasis 0 으로 못박는다. 내용 길이에 따라 비율이 흔들리면 안 된다.
 */

import { StyleSheet, View } from 'react-native';

import type { GameEvent } from '../engine';
import { ChatPanel } from './ChatPanel';
import { LogPanel } from './LogPanel';
import { Spacing } from '@/constants/theme';

export function SidePanel({
  log,
  style,
  panelStyle,
}: {
  log: GameEvent[];
  /** 바깥 틀 (폭·여백) */
  style?: object;
  /** 두 칸 공통 (배경·테두리) */
  panelStyle?: object;
}) {
  return (
    <View style={[styles.column, style]}>
      {/* 비율은 패딩 없는 틀이 잡는다. 패널에 직접 걸면 양쪽 패딩이 비율 밖으로 더해진다 */}
      <View style={styles.logSlot}>
        <LogPanel log={log} style={[panelStyle, styles.fill]} />
      </View>
      <View style={styles.chatSlot}>
        <ChatPanel style={[panelStyle, styles.fill]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: Spacing.two },
  logSlot: { flexGrow: 3, flexShrink: 1, flexBasis: 0, minHeight: 0 },
  chatSlot: { flexGrow: 7, flexShrink: 1, flexBasis: 0, minHeight: 0 },
  fill: { flex: 1, minHeight: 0 },
});
