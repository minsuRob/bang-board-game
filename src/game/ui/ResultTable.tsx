/**
 * 판이 끝났을 때 결과 팝업 안의 표. 사람마다 캐릭터 카드·닉네임·역할·생존·처치·피해를 보여 준다.
 * 폰 폭에서는 피해 두 칸을 접는다.
 */

import { Image, ScrollView, Text, View } from 'react-native';

import { CHARACTERS } from '../data/characters';
import type { GameState, PlayerId } from '../engine/types';
import { characterArt } from './card-art';
import { resultRows } from './result-stats';
import { WesternFonts } from './menu/western-fonts';
import { themedStyles, useColors } from './theme/use-theme';
import { useT } from '../../i18n/use-t';
import { Radius, Spacing } from '@/constants/theme';
import { useNames } from '../../i18n/use-names';

const CARD_W = 28;
const CARD_H = Math.round((CARD_W * 389) / 250);

export function ResultTable({
  state,
  viewer,
  compact,
}: {
  state: Pick<GameState, 'players' | 'log' | 'result'>;
  viewer: PlayerId | null;
  compact: boolean;
}) {
  const styles = useStyles();
  const c = useColors();
  const t = useT();
  const names = useNames();
  const rows = resultRows(state);

  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.head, compact && styles.rowCompact]}>
        <Text style={[styles.headText, styles.colWho]}>{t.ui.result.player}</Text>
        <Text style={[styles.headText, styles.colRole, compact && styles.colRoleCompact]}>{t.ui.result.role}</Text>
        <Text style={[styles.headText, styles.colState, compact && styles.colStateCompact]}>{t.ui.result.state}</Text>
        <Text style={[styles.headText, styles.colNum, compact && styles.colNumCompact]}>{t.ui.result.kills}</Text>
        {!compact && <Text style={[styles.headText, styles.colNum]}>{t.ui.result.dealt}</Text>}
        {!compact && <Text style={[styles.headText, styles.colNum]}>{t.ui.result.taken}</Text>}
        <Text style={[styles.headText, styles.colResult, compact && styles.colResultCompact]}>{t.ui.result.result}</Text>
      </View>
      <ScrollView style={styles.body}>
        {rows.map((r) => {
          const art = characterArt(r.character);
          const ch = CHARACTERS[r.character];
          const me = r.id === viewer;
          return (
            <View
              key={r.id}
              style={[styles.row, compact && styles.rowCompact, me && styles.mine, !r.alive && styles.out]}
            >
              <View style={[styles.colWho, styles.who]}>
                <View style={styles.card}>
                  {art ? (
                    <Image source={art} style={styles.cardImg} resizeMode="cover" />
                  ) : (
                    <Text style={styles.cardFallback}>{ch ? names.charName(r.character).slice(0, 1) : '?'}</Text>
                  )}
                </View>
                <View style={styles.names}>
                  <Text style={styles.name} numberOfLines={1}>
                    {r.name}
                    {me && r.name !== t.ui.result.me ? t.ui.result.meSuffix : ''}
                  </Text>
                  <Text style={styles.character} numberOfLines={1}>
                    {ch ? names.charName(r.character) : r.character}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.cell,
                  styles.colRole,
                  compact && styles.colRoleCompact,
                  styles.role,
                  { color: c[r.role] },
                ]}
              >
                {names.roleName(r.role)}
              </Text>
              <Text style={[styles.cell, styles.colState, compact && styles.colStateCompact, !r.alive && styles.muted]}>
                {r.alive
                  ? `♥ ${r.hp}/${r.maxHp}`
                  : r.outOrder
                    ? compact
                      ? t.ui.result.outShort(r.outOrder)
                      : t.ui.result.outNth(r.outOrder)
                    : t.ui.result.out}
              </Text>
              <Text style={[styles.cell, styles.colNum, compact && styles.colNumCompact]}>{r.kills}</Text>
              {!compact && <Text style={[styles.cell, styles.colNum]}>{r.dealt}</Text>}
              {!compact && <Text style={[styles.cell, styles.colNum]}>{r.taken}</Text>}
              <View style={[styles.colResult, compact && styles.colResultCompact]}>
                <Text style={[styles.badge, r.won ? styles.win : styles.lose]}>{r.won ? t.ui.result.win : t.ui.result.lose}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  table: {
    borderWidth: 1,
    borderColor: c.rule,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  body: { maxHeight: 420 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: c.rule,
  },
  head: {
    borderTopWidth: 0,
    backgroundColor: c.chip,
    paddingVertical: Spacing.one + 2,
  },
  headText: {
    color: c.textMuted,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: WesternFonts.label,
  },
  mine: { backgroundColor: c.hover },
  out: { opacity: 0.72 },
  // 폰 폭: 칸을 좁히고 줄바꿈을 막는다
  rowCompact: { gap: Spacing.one + 2, paddingHorizontal: Spacing.one + 2 },
  colWho: { flex: 1, minWidth: 0 },
  colRole: { width: 52, flexShrink: 0, textAlign: 'center' },
  colState: { width: 78, flexShrink: 0, textAlign: 'center' },
  colNum: { width: 46, flexShrink: 0, textAlign: 'center' },
  colResult: { width: 46, flexShrink: 0, alignItems: 'center' },
  colRoleCompact: { width: 44 },
  colStateCompact: { width: 50, fontSize: 12 },
  colNumCompact: { width: 28 },
  colResultCompact: { width: 42 },
  who: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: c.surfaceRaised,
    borderWidth: 1,
    borderColor: c.chipBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImg: { width: CARD_W, height: CARD_H },
  cardFallback: {
    color: c.text,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: WesternFonts.label,
  },
  names: { flex: 1, minWidth: 0 },
  name: {
    color: c.text,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: WesternFonts.label,
  },
  character: {
    color: c.textMuted,
    fontSize: 12,
    fontFamily: WesternFonts.body,
  },
  cell: { color: c.text, fontSize: 13, fontFamily: WesternFonts.body },
  role: { fontWeight: '800', fontFamily: WesternFonts.label },
  muted: { color: c.textMuted },
  badge: {
    fontSize: 11.5,
    fontWeight: '800',
    fontFamily: WesternFonts.label,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  win: { color: c.onAccent, backgroundColor: c.success },
  lose: { color: c.textMuted, backgroundColor: c.chip },
}));
