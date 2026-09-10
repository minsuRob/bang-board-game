/**
 * 인라인 프롬프트.
 *
 * 뱅!은 반응이 매우 잦다. 모달을 띄우면 게임이 계속 끊기므로
 * 요구 사항은 언제나 화면 안쪽에 한 줄로 붙인다.
 */

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CARD_DEFS } from '../data/cards.base';
import { SUIT_GLYPH, type Suit } from '../data/types';
import { kindOf, type Choice } from '../engine';
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
}: ActionBarProps) {
  if (!prompt) {
    return (
      <View style={styles.bar}>
        <Text style={styles.status}>{status}</Text>
        <View style={styles.buttons}>
          {abilities.length > 0 && (
            <Button
              label={`능력 · ${abilities[0].label}`}
              onPress={() => onUseAbility(abilities[0].key, abilities[0].cards)}
            />
          )}
          {canEndTurn && <Button label="차례 마치기 (Q)" onPress={onEndTurn} primary />}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bar, styles.barActive]}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{prompt.title}</Text>
        {!!prompt.hint && <Text style={styles.hint}>{prompt.hint}</Text>}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.buttons}>
          {prompt.cardOptions.map((card) => (
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

          {prompt.canPass && (
            <Button label="반응하지 않음 (W)" onPress={() => onRespond({ c: 'pass' })} />
          )}
        </View>
      </ScrollView>
    </View>
  );
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
  textBlock: { gap: 2, flexShrink: 1 },
  title: { color: Colors.text, fontWeight: '800', fontSize: 14 },
  hint: { color: Colors.textMuted, fontSize: 11 },
  status: { color: Colors.textMuted, fontSize: 13, flexShrink: 1 },
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
