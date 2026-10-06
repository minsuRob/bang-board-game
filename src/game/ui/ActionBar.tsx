/**
 * 인라인 프롬프트.
 *
 * 뱅!은 반응이 매우 잦다. 모달을 띄우면 게임이 계속 끊기므로
 * 요구 사항은 언제나 화면 안쪽에 한 줄로 붙인다.
 */

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CARD_DEFS } from '../data/cards.base';
import { SUIT_GLYPH, type Suit } from '../data/types';
import { kindOf } from '../engine';
import { useT } from '../../i18n/use-t';
import { waitClock } from '../store/wait-clock';
import { CardView } from './CardView';
import type { Prompt, UiChoice } from './use-table';
import { WesternFonts } from './menu/western-fonts';
import { themedStyles } from './theme/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import { useNames } from '../../i18n/use-names';

export type ActionBarProps = {
  prompt: Prompt | null;
  onRespond: (choice: UiChoice) => void;
  /** 프롬프트가 없을 때 보여 줄 안내 */
  status: string;
  canEndTurn: boolean;
  onEndTurn: () => void;
  playerNameOf: (pid: string) => string;
  abilities: { key: string; label: string; cards: string[] }[];
  onUseAbility: (key: string, cards: string[]) => void;
  /** 능력이 있지만 지금 못 쓸 때의 이유. 누를 수 없는 흐린 칩으로 보인다 */
  abilityBlocked?: string | null;
  /** 손의 카드를 다른 종류로 내는 능력 (엉클 윌). 누르면 켜지고, 켠 뒤 카드를 낸다 */
  playAs?: { key: string; label: string }[];
  armed?: string | null;
  onArm?: (key: string | null) => void;
  /** 넓은 3D 화면: 바 왼쪽 절반에 얹을 내 정보. 있으면 기존 내용은 오른쪽 절반으로 간다 */
  aside?: ReactNode;
  /** 좁은 화면: aside 를 옆이 아니라 바 위쪽에 얹고, 안내·프롬프트는 그 아래 전체 폭을 쓴다 */
  stacked?: boolean;
};

export function ActionBar({
  prompt,
  onRespond,
  status,
  canEndTurn,
  onEndTurn,
  playerNameOf,
  abilities,
  onUseAbility,
  abilityBlocked = null,
  playAs = [],
  armed = null,
  onArm,
  aside,
  stacked,
}: ActionBarProps) {
  const styles = useStyles();
  const t = useT();
  const names = useNames();
  const content = !prompt ? (
    <>
      <View style={styles.statusRow}>
        <Text style={styles.status}>{status}</Text>
        {!!status && <WaitSeconds />}
      </View>
      <View style={styles.buttons}>
        {abilities.length > 0 && (
          <Button
            label={t.table.ability(abilities[0].label)}
            onPress={() => onUseAbility(abilities[0].key, abilities[0].cards)}
          />
        )}
        {abilities.length === 0 && !!abilityBlocked && (
          <View style={[styles.button, styles.buttonDisabled]} accessibilityState={{ disabled: true }}>
            <Text style={[styles.buttonText, styles.buttonTextDisabled]}>{abilityBlocked}</Text>
          </View>
        )}
        {onArm &&
          (armed ? (
            <Button label={t.table.cancelEsc} onPress={() => onArm(null)} />
          ) : (
            playAs.map((ab) => (
              <Button key={ab.key} label={ab.label} onPress={() => onArm(ab.key)} />
            ))
          ))}
        {canEndTurn && <Button label={t.table.action.endTurn} onPress={onEndTurn} primary />}
      </View>
    </>
  ) : (
    <>
      <View style={styles.textBlock}>
        <View style={styles.statusRow}>
          <Text style={styles.title}>{prompt.title}</Text>
          <WaitSeconds />
        </View>
        {!!prompt.hint && <Text style={styles.hint}>{prompt.hint}</Text>}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.buttons}>
          {!prompt.center && prompt.cardOptions.map((card) => (
            <View key={card} style={styles.cardOption}>
              <CardView
                card={card}
                size="sm"
                highlighted
                onPress={() => onRespond({ c: 'card', card })}
              />
              <Text style={styles.cardLabel}>{names.cardName(kindOf(card))}</Text>
            </View>
          ))}

          {prompt.variants?.map((label, index) => (
            <Button key={label} label={`${index + 1}. ${label}`} onPress={() => onRespond({ c: 'variant', index })} />
          ))}

          {prompt.suits.map((suit) => (
            <Button
              key={suit}
              label={`${SUIT_GLYPH[suit as Suit]} ${suit}`}
              onPress={() => onRespond({ c: 'suit', suit: suit as Suit })}
            />
          ))}

          {prompt.players.map((pid) => (
            <Button
              key={pid}
              label={playerNameOf(pid)}
              onPress={() => onRespond({ c: 'player', pid })}
            />
          ))}

          {prompt.yesNo && <Button label={t.table.action.yes} onPress={() => onRespond({ c: 'yes' })} primary />}

          {prompt.colors && (
            <>
              <Button label={t.table.action.red} onPress={() => onRespond({ c: 'color', color: 'red' })} />
              <Button label={t.table.action.black} onPress={() => onRespond({ c: 'color', color: 'black' })} />
            </>
          )}

          {prompt.canPass && (
            <Button label={prompt.passLabel ?? t.table.action.pass} onPress={() => onRespond({ c: 'pass' })} />
          )}
        </View>
      </ScrollView>
    </>
  );

  const barStyle = [styles.bar, !!prompt && styles.barActive];
  if (!aside) return <View style={barStyle}>{content}</View>;
  if (stacked) {
    return (
      <View style={[barStyle, styles.stacked]}>
        {aside}
        <View style={styles.hDivider} />
        <View style={styles.full}>{content}</View>
      </View>
    );
  }
  return (
    <View style={[barStyle, styles.split]}>
      <View style={styles.aside}>{aside}</View>
      <View style={styles.divider} />
      <View style={styles.half}>{content}</View>
    </View>
  );
}

/** 지금 기다리는 차례의 남은 초. 기다리는 게 없으면 아무것도 그리지 않는다 */
function WaitSeconds() {
  const styles = useStyles();
  const tt = useT();
  const deadline = useSyncExternalStore(
    waitClock.subscribe,
    () => waitClock.getState().deadline,
    () => null,
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadline === null) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [deadline]);
  if (deadline === null) return null;
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  return <Text style={[styles.seconds, left <= 5 && styles.secondsUrgent]}>{tt.table.action.seconds(left)}</Text>;
}

function Button({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const styles = useStyles();
  // 주 행동은 빨간 도장, 나머지는 칩
  if (primary) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.stamp, pressed && styles.stampPressed]}>
        <View style={styles.stampInner}>
          <Text style={styles.stampText}>{label}</Text>
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ hovered }: { hovered?: boolean }) => [styles.button, hovered && styles.buttonHover]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const useStyles = themedStyles((c) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: c.surface,
    borderTopWidth: 1.5,
    borderBottomWidth: 1,
    borderColor: c.panelBorder,
    minHeight: 62,
  },
  // 반응을 기다릴 때는 바 위 테두리가 금(다크) / 잉크(라이트)로 선다
  barActive: { backgroundColor: c.surfaceRaised, borderColor: c.selectedBorder },
  // 왼쪽 절반 내 정보 | 오른쪽 절반 안내·프롬프트
  split: { justifyContent: 'flex-start', alignItems: 'stretch' },
  aside: { flex: 1, minWidth: 0, justifyContent: 'center' },
  divider: { width: 0, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: c.rule },
  half: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  // 위 내 정보 / 아래 안내·프롬프트 (좁은 화면)
  stacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  hDivider: { height: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: c.rule },
  full: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 36,
    paddingHorizontal: Spacing.one,
  },
  textBlock: { gap: 2, flexShrink: 1 },
  title: { color: c.heading, fontWeight: '800', fontSize: 14, fontFamily: WesternFonts.label },
  hint: { color: c.textMuted, fontSize: 11 },
  status: { color: c.textMuted, fontSize: 13, flexShrink: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two, flexShrink: 1 },
  seconds: {
    color: c.highlight,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: WesternFonts.type,
    fontVariant: ['tabular-nums'],
  },
  secondsUrgent: { color: c.danger },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardOption: { alignItems: 'center', gap: 2 },
  cardLabel: { color: c.textMuted, fontSize: 9 },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: c.chipBorder,
    backgroundColor: c.chip,
  },
  buttonHover: { backgroundColor: c.hover },
  buttonDisabled: { opacity: 0.5, borderStyle: 'dashed' },
  buttonTextDisabled: { color: c.textMuted },
  buttonText: { color: c.text, fontSize: 12, fontWeight: '700', fontFamily: WesternFonts.label },
  // 빨간 도장: 안쪽 점선 테두리, 아래로 떨어지는 짙은 그림자
  stamp: {
    backgroundColor: c.accent,
    borderRadius: Radius.sm + 2,
    padding: 3,
    boxShadow: `0 3px 0 ${c.accentShadow}, 0 6px 12px ${c.shadow}`,
  },
  stampPressed: { transform: [{ translateY: 2 }], boxShadow: `0 1px 0 ${c.accentShadow}, 0 3px 6px ${c.shadow}` },
  stampInner: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(251,246,234,0.6)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three - 3,
    paddingVertical: Spacing.two - 3,
    alignItems: 'center',
  },
  stampText: { color: c.onAccent, fontSize: 12, fontWeight: '900', letterSpacing: 1, fontFamily: WesternFonts.label },
}));
