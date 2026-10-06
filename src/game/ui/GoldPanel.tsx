/**
 * 골드 러시 패널 — 금덩이 · 상점 · 앞에 놓인 장비 · 골드 행동 버튼.
 *
 * 무엇을 누를 수 있는지는 legalActions() 에서 걸러 온 actions 가 전부 정한다.
 * 여기서는 그 액션을 현재 언어 라벨로 보여 주고 누르면 그대로 보낸다.
 */

import { Pressable, Text, View } from 'react-native';

import { CARD_DEFS } from '../data/cards.base';
import { goldDefOf } from '../data/cards.goldrush';
import { CHARACTERS } from '../data/characters';
import type { Action, Choice, GameState, PlayerId } from '../engine';
import { buyPriceOf } from '../engine/gold-actions';
import type { GoldUse } from '../engine/types';
import { useT } from '../../i18n/use-t';
import type { Messages } from '../../i18n/types-messages';
import { WesternFonts } from './menu/western-fonts';
import { themedStyles } from './theme/use-theme';
import type { Prompt } from './use-table';
import { Radius } from '@/constants/theme';
import { useNames } from '../../i18n/use-names';
import { namesFor, type Names } from '../../i18n/names';

type Props = {
  view: GameState;
  viewer: PlayerId | null;
  actions: Action[];
  send: (a: Action) => void;
  prompt?: Prompt | null;
  respond?: (choice: Choice) => void;
};

function who(view: GameState, pid: PlayerId, names: Names): string {
  const p = view.players.find((x) => x.id === pid);
  return p ? CHARACTERS[p.character] ? names.charName(p.character) : p.name : pid;
}

function useLabel(view: GameState, use: GoldUse | undefined, names: Names): string {
  if (!use) return '';
  const as = use.as ? ` · ${names.cardName(use.as)}` : '';
  const target = use.target ? ` → ${who(view, use.target, names)}` : '';
  return as + target;
}

export function labelOf(view: GameState, a: Action, t: Messages, names: Names = namesFor('ko')): string {
  switch (a.type) {
    case 'buyGold': {
      const def = goldDefOf(a.card);
      return t.table.gold.buy(names.goldName(def.kind), buyPriceOf(view, a.pid, a.card)) + useLabel(view, a.use, names);
    }
    case 'removeGold': {
      const def = goldDefOf(a.card);
      return t.table.gold.remove(who(view, a.target, names), names.goldName(def.kind), def.cost + 1);
    }
    case 'beerForGold':
      return t.table.gold.beer;
    case 'goldAbility':
      return (t.table.gold.ability[a.ability] ?? a.ability) + (a.target ? ` → ${who(view, a.target, names)}` : '');
    default:
      return '';
  }
}

export function GoldPanel({ view, viewer, actions, send, prompt, respond }: Props) {
  const styles = useStyles();
  const t = useT();
  const names = useNames();
  if (!view.gold) return null;
  const me = viewer ? view.players.find((p) => p.id === viewer) : null;

  // 맥주 팔기는 카드가 달라도 효과가 같다. 버튼은 하나만 보인다.
  let beerShown = false;
  const buttons = actions.filter((a) => {
    if (a.type !== 'beerForGold') return true;
    if (beerShown) return false;
    beerShown = true;
    return true;
  });

  const uses = prompt?.goldUses ?? [];

  return (
    <View style={styles.panel} accessibilityLabel={t.table.gold.panel}>
      <Text style={styles.title}>
        {t.table.gold.title(me?.nuggets ?? 0)}
      </Text>

      <Text style={styles.label}>{t.table.gold.shop}</Text>
      <View style={styles.row}>
        {view.gold.shop.map((card) => {
          const def = goldDefOf(card);
          return (
            <View key={card} style={[styles.card, def.category === 'black' ? styles.black : styles.brown]}>
              <Text style={styles.cardName}>
                {t.table.gold.shopCard(names.goldName(def.kind), def.cost)}
              </Text>
              <Text style={styles.cardText}>{names.goldText(def.kind)}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.label}>{t.table.gold.equipment}</Text>
      {view.players
        .filter((p) => (p.goldEquipment?.length ?? 0) > 0 || (p.nuggets ?? 0) > 0)
        .map((p) => (
          <Text key={p.id} style={styles.cardText}>
            {t.table.gold.player(who(view, p.id, names), p.nuggets ?? 0)}
            {(p.goldEquipment ?? []).length > 0
              ? ` · ${(p.goldEquipment ?? []).map((c) => names.goldName(goldDefOf(c).kind)).join(', ')}`
              : ''}
          </Text>
        ))}

      {uses.length > 0 && respond ? (
        <>
          <Text style={styles.label}>{prompt?.hint}</Text>
          <View style={styles.row}>
            {uses.map((use, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                style={styles.button}
                onPress={() => respond({ c: 'goldUse', use })}
              >
                <Text style={styles.buttonText}>{useLabel(view, use, names).replace(/^ · /, '') || t.table.gold.use}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {buttons.length > 0 ? (
        <View style={styles.row}>
          {buttons.map((a, i) => (
            <Pressable key={i} accessibilityRole="button" style={styles.button} onPress={() => send(a)}>
              <Text style={styles.buttonText}>{labelOf(view, a, t, names)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  panel: {
    padding: 8,
    gap: 4,
    borderRadius: Radius.md,
    backgroundColor: c.panel,
    borderWidth: 1.5,
    borderColor: c.panelBorder,
    boxShadow: `0 4px 14px ${c.shadow}`,
  },
  title: { color: c.heading, fontWeight: '700', fontSize: 14, fontFamily: WesternFonts.label },
  label: { color: c.textMuted, fontSize: 12, marginTop: 4, fontFamily: WesternFonts.label },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  // 상점 카드: 테두리 색이 갈색(즉시) / 검정(장착) 구분이다
  card: { width: 150, padding: 6, borderRadius: 6, borderWidth: 2, backgroundColor: c.chip },
  brown: { borderColor: c.cardBrown },
  black: { borderColor: c.suitBlack },
  cardName: { color: c.text, fontWeight: '700', fontSize: 12 },
  cardText: { color: c.textMuted, fontSize: 11 },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: c.chipBorder,
    backgroundColor: c.chip,
  },
  buttonText: { color: c.text, fontWeight: '700', fontSize: 12, fontFamily: WesternFonts.label },
}));
