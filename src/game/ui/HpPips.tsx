/**
 * 목숨 점(●○). 최대 체력이 5를 넘으면(빅 스펜서 보안관 10 등) 한 줄로 늘어지지 않게
 * 점을 작게 줄이고 5개씩 끊어 여러 줄로 놓는다.
 */

import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { hpRows } from './hp-rows';

/** 여러 줄일 때 점 크기 비율 */
const MULTI_ROW_SCALE = 0.72;

type Props = {
  hp: number;
  maxHp: number;
  /** 찬 점 글자 모양 (색·크기·자간) */
  style?: StyleProp<TextStyle>;
  /** 빈 점 색 */
  emptyStyle?: StyleProp<TextStyle>;
};

export function HpPips({ hp, maxHp, style, emptyStyle }: Props) {
  const full = Math.max(0, Math.min(hp, maxHp));
  const rows = hpRows(maxHp);

  if (rows.length <= 1) {
    return (
      <Text style={style}>
        {'●'.repeat(full)}
        <Text style={emptyStyle}>{'○'.repeat(Math.max(0, maxHp - full))}</Text>
      </Text>
    );
  }

  const base = StyleSheet.flatten(style) ?? {};
  const fontSize = Math.round((base.fontSize ?? 14) * MULTI_ROW_SCALE * 10) / 10;
  const letterSpacing = base.letterSpacing !== undefined ? base.letterSpacing * MULTI_ROW_SCALE : undefined;
  const small: TextStyle = { fontSize, lineHeight: Math.round(fontSize * 1.15), letterSpacing };

  let start = 0;
  return (
    <View style={styles.rows}>
      {rows.map((count, i) => {
        const filled = Math.max(0, Math.min(count, full - start));
        start += count;
        return (
          <Text key={i} style={[style, small]}>
            {'●'.repeat(filled)}
            <Text style={emptyStyle}>{'○'.repeat(count - filled)}</Text>
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { flexDirection: 'column', alignItems: 'flex-start' },
});
