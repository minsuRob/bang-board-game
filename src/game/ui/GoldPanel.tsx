/**
 * 골드 러시 패널 — 금덩이 · 상점 · 앞에 놓인 장비 · 골드 행동 버튼.
 *
 * 무엇을 누를 수 있는지는 legalActions() 에서 걸러 온 actions 가 전부 정한다.
 * 여기서는 그 액션을 한국어 라벨로 보여 주고 누르면 그대로 보낸다.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CARD_DEFS } from '../data/cards.base';
import { goldDefOf } from '../data/cards.goldrush';
import { CHARACTERS } from '../data/characters';
import type { Action, Choice, GameState, PlayerId } from '../engine';
import { buyPriceOf } from '../engine/gold-actions';
import type { GoldUse } from '../engine/types';
import type { Prompt } from './use-table';

type Props = {
  view: GameState;
  viewer: PlayerId | null;
  actions: Action[];
  send: (a: Action) => void;
  prompt?: Prompt | null;
  respond?: (choice: Choice) => void;
};

const ABILITY_LABEL: Record<string, string> = {
  jackyMurieta: '뱅! (금 2)',
  joshMcCloud: '장비 덱 뽑기 (금 2)',
  raddieSnake: '카드 1장 (금 1)',
  goldPan: '사금채취판 카드 1장 (금 1)',
  rucksack: '배낭 목숨 1 (금 2)',
};

function who(view: GameState, pid: PlayerId): string {
  const p = view.players.find((x) => x.id === pid);
  return p ? CHARACTERS[p.character]?.nameKo ?? p.name : pid;
}

function useLabel(view: GameState, use: GoldUse | undefined): string {
  if (!use) return '';
  const as = use.as ? ` · ${CARD_DEFS[use.as].nameKo}` : '';
  const target = use.target ? ` → ${who(view, use.target)}` : '';
  return as + target;
}

export function labelOf(view: GameState, a: Action): string {
  switch (a.type) {
    case 'buyGold': {
      const def = goldDefOf(a.card);
      return `${def.nameKo} 사기 (금 ${buyPriceOf(view, a.pid, a.card)})${useLabel(view, a.use)}`;
    }
    case 'removeGold': {
      const def = goldDefOf(a.card);
      return `${who(view, a.target)}의 ${def.nameKo} 치우기 (금 ${def.cost + 1})`;
    }
    case 'beerForGold':
      return '맥주 → 금덩이 1';
    case 'goldAbility':
      return (ABILITY_LABEL[a.ability] ?? a.ability) + (a.target ? ` → ${who(view, a.target)}` : '');
    default:
      return '';
  }
}

export function GoldPanel({ view, viewer, actions, send, prompt, respond }: Props) {
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
    <View style={styles.panel} accessibilityLabel="골드 러시">
      <Text style={styles.title}>
        골드 러시 · 내 금덩이 {me?.nuggets ?? 0}개
      </Text>

      <Text style={styles.label}>상점</Text>
      <View style={styles.row}>
        {view.gold.shop.map((card) => {
          const def = goldDefOf(card);
          return (
            <View key={card} style={[styles.card, def.category === 'black' ? styles.black : styles.brown]}>
              <Text style={styles.cardName}>
                {def.nameKo} · 금 {def.cost}
              </Text>
              <Text style={styles.cardText}>{def.text}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.label}>앞에 놓인 장비</Text>
      {view.players
        .filter((p) => (p.goldEquipment?.length ?? 0) > 0 || (p.nuggets ?? 0) > 0)
        .map((p) => (
          <Text key={p.id} style={styles.cardText}>
            {who(view, p.id)} — 금 {p.nuggets ?? 0}
            {(p.goldEquipment ?? []).length > 0
              ? ` · ${(p.goldEquipment ?? []).map((c) => goldDefOf(c).nameKo).join(', ')}`
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
                <Text style={styles.buttonText}>{useLabel(view, use).replace(/^ · /, '') || '사용'}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {buttons.length > 0 ? (
        <View style={styles.row}>
          {buttons.map((a, i) => (
            <Pressable key={i} accessibilityRole="button" style={styles.button} onPress={() => send(a)}>
              <Text style={styles.buttonText}>{labelOf(view, a)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: 8,
    gap: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(40, 28, 10, 0.85)',
  },
  title: { color: '#f5d77a', fontWeight: '700', fontSize: 14 },
  label: { color: '#e8dcc0', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  card: { width: 150, padding: 6, borderRadius: 6, borderWidth: 2 },
  brown: { borderColor: '#9a6a3a', backgroundColor: 'rgba(90, 60, 30, 0.6)' },
  black: { borderColor: '#222', backgroundColor: 'rgba(20, 20, 20, 0.6)' },
  cardName: { color: '#fff4d6', fontWeight: '700', fontSize: 12 },
  cardText: { color: '#e8dcc0', fontSize: 11 },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#c9962e',
  },
  buttonText: { color: '#1b1204', fontWeight: '700', fontSize: 12 },
});
