/**
 * 카드 도감에서 항목 하나를 눌렀을 때 뜨는 상세 창.
 *
 * 큰 앞면, 이름, 효과 글, 종류별 사실(매수·무늬, 목숨, 값, 인원별 수), 심벌 풀이, 규칙 메모.
 * 연출이 붙은 카드면 "연출 보기"로 게임 속 연출을 한 번 돌린다 (onPlayFx).
 * 바깥이나 닫기를 누르면 닫힌다. 모양은 CharacterDetailModal 을 따랐다.
 */

import { Pressable, ScrollView, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { CARD_DEFS } from '../../data/cards.base';
import { GOLD_CARD_DEFS } from '../../data/cards.goldrush';
import { CHARACTERS } from '../../data/characters';
import { EVENTS } from '../../data/events';
import { SUIT_GLYPH, type CardDef, type CardKind, type Suit } from '../../data/types';
import { useT } from '../../../i18n/use-t';
import type { Messages } from '../../../i18n/types-messages';
import { chipFor } from '../card-symbols';
import { CARD_FX } from '../fx/card-fx';
import { fxQuality } from '../fx/quality';
import { WesternFonts } from '../menu/western-fonts';
import { PaperPlaque, plaque } from '../PaperPlaque';
import { themedStyles, useColors } from '../theme/use-theme';
import { CodexFace } from './CodexFaces';
import { deckSpread, roleCounts, setLabel, type CodexItem } from './codex-model';
import { ruleNotes } from './rule-notes';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useNames } from '../../../i18n/use-names';
import type { Names } from '../../../i18n/names';

const FACE_W = 140;

type Fact = { label: string; value: string; color?: string };

function suitColor(suit: Suit, ink: string): string {
  return suit === 'hearts' || suit === 'diamonds' ? Colors.suitRed : ink;
}

function cardKindLabel(def: CardDef, t: Messages): string {
  const d = t.codex.detail;
  if (def.equip === 'weapon') return d.weapon(def.weaponRange ?? 0);
  if (def.equip) return (d.equip as Record<string, string>)[def.equip] ?? d.equip.generic;
  return d.instant;
}

function bodyText(item: CodexItem, names: Names): string {
  switch (item.tab) {
    case 'cards':
      return names.cardText(item.id);
    case 'characters':
      return names.charAbility(item.id);
    case 'events':
      return names.eventText(item.id);
    case 'gold':
      return names.goldText(item.id);
    case 'roles':
      return names.roleGoal(item.id);
  }
}

function factsOf(item: CodexItem, ink: string, t: Messages, names: Names): Fact[] {
  const d = t.codex.detail;
  switch (item.tab) {
    case 'cards': {
      const def = CARD_DEFS[item.id];
      const spread = deckSpread(item.id);
      const facts: Fact[] = [
        { label: d.kind, value: cardKindLabel(def, t) },
        { label: d.count, value: d.sheets(spread.total) },
        ...spread.bySuit.map((s) => ({
          label: SUIT_GLYPH[s.suit],
          value: d.spread(s.ranks, s.count),
          color: suitColor(s.suit, ink),
        })),
      ];
      if (def.countsAs) facts.push({ label: d.countsAs, value: d.countsAsValue(names.cardName(def.countsAs)) });
      if (def.outOfTurn) facts.push({ label: d.when, value: d.outOfTurn });
      const fx = CARD_FX[item.id];
      if (fx) facts.push({ label: d.fx, value: `${fx.doc.title} · ${fx.doc.durationMs}ms · ${fx.doc.quality}` });
      return facts;
    }
    case 'characters': {
      const hp = CHARACTERS[item.id].maxHp;
      return [{ label: d.hp, value: d.hpValue(hp) }];
    }
    case 'events':
      return EVENTS[item.id].isFinal ? [{ label: d.order, value: d.finalCard }] : [];
    case 'gold': {
      const def = GOLD_CARD_DEFS[item.id];
      return [
        { label: d.cost, value: t.codex.goldCost(def.cost) },
        { label: d.count, value: d.sheets(def.count) },
        { label: d.kind, value: def.category === 'black' ? t.codex.sections.goldBlack : t.codex.sections.goldBrown },
      ];
    }
    case 'roles':
      return [{ label: d.players, value: roleCounts(item.id).map((r) => d.playersCount(r.players, r.count)).join(' · ') }];
  }
}

export function CodexDetail({
  item,
  hidden,
  onPlayFx,
  onClose,
}: {
  item: CodexItem;
  /** 연출을 돌리는 동안 창을 감춘다 (가운데 카드가 창에 가리지 않게). 어두운 바탕은 남긴다 */
  hidden?: boolean;
  onPlayFx: () => void;
  onClose: () => void;
}) {
  const styles = useStyles();
  const c = useColors();
  const t = useT();
  const names = useNames();
  const d = t.codex.detail;
  const quality = useStore(fxQuality, (s) => s.quality);
  const fx = item.tab === 'cards' ? CARD_FX[item.id as CardKind] : undefined;
  // 빗나감!은 고화질 연출만 있다
  const fxBlocked = fx?.visual === 'missed' && quality !== 'high';
  const symbols = item.tab === 'cards' ? CARD_DEFS[item.id].symbols : [];
  const notes = ruleNotes(item.tab, item.id, t);

  return (
    <View style={styles.layer}>
      <Pressable accessibilityRole="button" accessibilityLabel={d.closeDetail} onPress={onClose} style={styles.backdrop} />
      <View style={[styles.sheet, hidden && styles.hidden]}>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.head}>
            <CodexFace item={item} width={FACE_W} />
            <View style={styles.titles}>
              <Text style={styles.set}>{setLabel(item.set, t)}</Text>
              <Text style={styles.nameKo}>{item.local}</Text>
              <Text style={styles.name}>{item.name}</Text>
            </View>
          </View>

          <PaperPlaque>
            <Text style={plaque.text}>{bodyText(item, names)}</Text>
          </PaperPlaque>

          {factsOf(item, c.text, t, names).map((f, i) => (
            <View key={i} style={styles.fact}>
              <Text style={[styles.factLabel, f.color ? { color: f.color } : null]}>{f.label}</Text>
              <Text style={styles.factValue}>{f.value}</Text>
            </View>
          ))}

          {symbols.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.heading}>{d.symbols}</Text>
              <View style={styles.chips}>
                {symbols.map((s, i) => {
                  const chip = chipFor(s);
                  return (
                    <View key={i} style={styles.symbol}>
                      <Text style={[styles.symbolGlyph, { color: chip.color }]}>{chip.glyph}</Text>
                      <Text style={styles.symbolLabel}>{chip.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {notes.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.heading}>{d.ruleNotes}</Text>
              {notes.map((n, i) => (
                <Text key={i} style={styles.note}>
                  · {n}
                </Text>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.actions}>
          {fx && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={d.playFx}
              disabled={fxBlocked}
              onPress={onPlayFx}
              style={[styles.button, styles.fxButton, fxBlocked && styles.disabled]}>
              <Text style={styles.fxText}>{fxBlocked ? d.fxHighOnly : d.playFx}</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel={t.common.close} onPress={onClose} style={styles.button}>
            <Text style={styles.closeText}>{t.common.close}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
    zIndex: 50,
  },
  hidden: { opacity: 0, pointerEvents: 'none' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '100%',
    backgroundColor: c.surface,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: c.rule,
    padding: Spacing.three,
    gap: Spacing.two,
    boxShadow: `0 14px 40px ${c.shadow}`,
  },
  body: { gap: Spacing.three },
  head: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-end', flexWrap: 'wrap' },
  titles: { flex: 1, minWidth: 140, gap: 2 },
  set: { color: c.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  nameKo: { color: c.text, fontSize: 26, fontWeight: '900', fontFamily: WesternFonts.label },
  name: { color: c.textMuted, fontSize: 13, fontStyle: 'italic', fontFamily: WesternFonts.body },
  fact: { flexDirection: 'row', gap: Spacing.three, marginTop: -Spacing.two },
  factLabel: { color: c.textMuted, fontSize: 13, fontWeight: '800', width: 40 },
  factValue: { color: c.text, fontSize: 13, flex: 1, fontVariant: ['tabular-nums'] },
  block: { gap: Spacing.one },
  heading: { color: c.text, fontSize: 14, fontWeight: '900', fontFamily: WesternFonts.label },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  symbol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: c.rule,
    backgroundColor: c.hover,
  },
  symbolGlyph: { fontSize: 14, fontWeight: '900' },
  symbolLabel: { color: c.text, fontSize: 12, fontWeight: '700' },
  note: { color: c.text, fontSize: 13, lineHeight: 19, fontFamily: WesternFonts.body },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: c.chipBorder,
  },
  fxButton: { backgroundColor: c.selected, borderColor: c.selectedBorder },
  fxText: { color: c.onSelected, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  closeText: { color: c.text, fontSize: 13, fontWeight: '700' },
}));
