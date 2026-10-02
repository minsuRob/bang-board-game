/**
 * 인라인 프롬프트.
 *
 * 뱅!은 반응이 매우 잦다. 모달을 띄우면 게임이 계속 끊기므로
 * 요구 사항은 언제나 화면 안쪽에 한 줄로 붙인다.
 */

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CARD_DEFS } from '../data/cards.base';
import { SUIT_GLYPH, type Suit } from '../data/types';
import { kindOf, type Choice } from '../engine';
import { waitClock } from '../store/wait-clock';
import { CardView } from './CardView';
import type { Prompt } from './use-table';
import { Colors, Radius, Spacing } from '@/constants/theme';

export type ActionBarProps = {
  prompt: Prompt | null;
  onRespond: (choice: Choice) => void;
  /** 프롬프트가 없을 때 보여 줄 안내 */
  status: string;
  canEndTurn: boolean;
  onEndTurn: () => void;
  playerNameOf: (pid: string) => string;
  abilities: { key: string; label: string; cards: string[] }[];
  onUseAbility: (key: string, cards: string[]) => void;
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
  playAs = [],
  armed = null,
  onArm,
  aside,
  stacked,
}: ActionBarProps) {
  const content = !prompt ? (
    <>
      <View style={styles.statusRow}>
        <Text style={styles.status}>{status}</Text>
        {!!status && <WaitSeconds />}
      </View>
      <View style={styles.buttons}>
        {abilities.length > 0 && (
          <Button
            label={`능력 · ${abilities[0].label}`}
            onPress={() => onUseAbility(abilities[0].key, abilities[0].cards)}
          />
        )}
        {onArm &&
          (armed ? (
            <Button label="취소 (Esc)" onPress={() => onArm(null)} />
          ) : (
            playAs.map((ab) => (
              <Button key={ab.key} label={ab.label} onPress={() => onArm(ab.key)} />
            ))
          ))}
        {canEndTurn && <Button label="차례 마치기 (Q)" onPress={onEndTurn} primary />}
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
              <Text style={styles.cardLabel}>{CARD_DEFS[kindOf(card)].nameKo}</Text>
            </View>
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

          {prompt.yesNo && <Button label="그렇게 한다" onPress={() => onRespond({ c: 'yes' })} primary />}

          {prompt.colors && (
            <>
              <Button label="♥♦ 빨강" onPress={() => onRespond({ c: 'color', color: 'red' })} />
              <Button label="♣♠ 검정" onPress={() => onRespond({ c: 'color', color: 'black' })} />
            </>
          )}

          {prompt.canPass && (
            <Button label={prompt.passLabel ?? '반응하지 않음 (W)'} onPress={() => onRespond({ c: 'pass' })} />
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
  return <Text style={[styles.seconds, left <= 5 && styles.secondsUrgent]}>{left}초</Text>;
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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.button, primary && styles.buttonPrimary]}>
      <Text style={[styles.buttonText, primary && styles.buttonTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    minHeight: 62,
  },
  barActive: { backgroundColor: Colors.surfaceRaised, borderColor: Colors.highlight },
  // 왼쪽 절반 내 정보 | 오른쪽 절반 안내·프롬프트
  split: { justifyContent: 'flex-start', alignItems: 'stretch' },
  aside: { flex: 1, minWidth: 0, justifyContent: 'center' },
  divider: { width: 1, backgroundColor: Colors.border },
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
  hDivider: { height: 1, backgroundColor: Colors.border },
  full: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 36,
    paddingHorizontal: Spacing.one,
  },
  textBlock: { gap: 2, flexShrink: 1 },
  title: { color: Colors.text, fontWeight: '800', fontSize: 14 },
  hint: { color: Colors.textMuted, fontSize: 11 },
  status: { color: Colors.textMuted, fontSize: 13, flexShrink: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two, flexShrink: 1 },
  seconds: { color: Colors.highlight, fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
  secondsUrgent: { color: Colors.danger },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardOption: { alignItems: 'center', gap: 2 },
  cardLabel: { color: Colors.textMuted, fontSize: 9 },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  buttonPrimary: { backgroundColor: Colors.cardBrown, borderColor: Colors.highlight },
  buttonText: { color: Colors.text, fontSize: 12, fontWeight: '700' },
  buttonTextPrimary: { color: Colors.paper },
});
