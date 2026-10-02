/**
 * 와일드 웨스트 쇼 이벤트 패널.
 *
 * - 사카가웨이: 펼쳐 놓은 남의 손패를 보여 준다
 * - 레이디 로즈 오브 텍사스: 오른쪽 사람과 자리 바꾸기 버튼
 * - 도로시 레이지: 누구에게 · 무슨 카드를 · 누구에게 낼지 차례로 골라 시킨다
 *
 * 무엇을 누를 수 있는지는 legalActions() 에서 걸러 온 actions 가 전부 정한다.
 * 이벤트가 없거나 보여 줄 것이 없으면 아무것도 그리지 않는다.
 */

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CARD_DEFS } from '../data/cards.base';
import { CHARACTERS } from '../data/characters';
import type { CardKind } from '../data/types';
import { isHidden, type Action, type GameState, type PlayerId } from '../engine';
import { rightNeighborOf } from '../engine/distance';
import { handsRevealed, turnDirectionOf } from '../engine/hooks';
import { wa } from '../engine/josa';
import { CardView } from './CardView';

type EventAction = Extract<Action, { type: 'eventAbility' }>;

type Props = {
  view: GameState;
  viewer: PlayerId | null;
  actions: EventAction[];
  send: (a: Action) => void;
};

function who(view: GameState, pid: PlayerId): string {
  const p = view.players.find((x) => x.id === pid);
  return p ? (CHARACTERS[p.character]?.nameKo ?? p.name) : pid;
}

export function EventAbilityPanel({ view, viewer, actions, send }: Props) {
  const open = handsRevealed(view);
  const rose = actions.find((a) => a.ability === 'ladyRose');
  const orders = actions.filter((a) => a.ability === 'dorothyRage');
  if (!open && !rose && orders.length === 0) return null;

  return (
    <View style={styles.panel} accessibilityLabel="이벤트 행동">
      {open && <OpenHands view={view} viewer={viewer} />}
      {rose && viewer && (
        <View style={styles.row}>
          <Text style={styles.label}>레이디 로즈 오브 텍사스</Text>
          <Button
            label={`${wa(who(view, rightNeighborOf(view, viewer, turnDirectionOf(view)) ?? viewer))} 자리 바꾸기`}
            onPress={() => send(rose)}
          />
        </View>
      )}
      {orders.length > 0 && <DorothyPicker view={view} orders={orders} send={send} />}
    </View>
  );
}

/** 사카가웨이: 남의 손패. 내 손은 아래 손패 줄에 이미 있다 */
function OpenHands({ view, viewer }: { view: GameState; viewer: PlayerId | null }) {
  const others = view.players.filter((p) => p.id !== viewer && (p.alive || p.ghost));
  return (
    <>
      <Text style={styles.title}>사카가웨이 — 모두 손패를 펼쳐 놓는다</Text>
      {/* 사람이 많으면 테이블을 가리지 않게 높이를 묶고 안에서 내린다 */}
      <ScrollView style={styles.hands} nestedScrollEnabled>
        {others.map((p) => (
          <View key={p.id} style={styles.handRow}>
            <Text style={styles.handName} numberOfLines={1}>
              {who(view, p.id)} {p.hand.length}장
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.row}>
                {p.hand.filter((c) => !isHidden(c)).map((c) => (
                  <CardView key={c} card={c} size="sm" />
                ))}
              </View>
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

/** 도로시 레이지: 시킬 사람 → 카드 → 대상 순으로 고르고 시킨다 */
function DorothyPicker({ view, orders, send }: { view: GameState; orders: EventAction[]; send: (a: Action) => void }) {
  const [forced, setForced] = useState<PlayerId | null>(null);
  const [kind, setKind] = useState<CardKind | null>(null);

  const people = useMemo(() => [...new Set(orders.map((a) => a.forced!))], [orders]);
  const kinds = useMemo(
    () => [...new Set(orders.filter((a) => a.forced === forced).map((a) => a.kind!))],
    [orders, forced],
  );
  const finals = orders.filter((a) => a.forced === forced && a.kind === kind);

  return (
    <>
      <Text style={styles.title}>도로시 레이지 — 다른 사람에게 카드를 내게 한다 (차례에 한 번)</Text>
      <Text style={styles.hint}>그 카드가 손에 없으면 아무 일도 없다.</Text>
      <View style={styles.row}>
        {people.map((pid) => (
          <Chip
            key={pid}
            label={who(view, pid)}
            active={forced === pid}
            onPress={() => {
              setForced(pid);
              setKind(null);
            }}
          />
        ))}
      </View>
      {forced && (
        <View style={styles.row}>
          {kinds.map((k) => (
            <Chip key={k} label={CARD_DEFS[k].nameKo} active={kind === k} onPress={() => setKind(k)} />
          ))}
        </View>
      )}
      {forced && kind && (
        <View style={styles.row}>
          {finals.map((a, i) => (
            <Button
              key={a.target ?? i}
              label={a.target ? `${who(view, a.target)}에게 내게 하기` : '내게 하기'}
              onPress={() => {
                send(a);
                setForced(null);
                setKind(null);
              }}
            />
          ))}
        </View>
      )}
    </>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: 8,
    gap: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(40, 28, 10, 0.85)',
  },
  title: { color: '#f5d77a', fontWeight: '700', fontSize: 13 },
  label: { color: '#e8dcc0', fontSize: 12 },
  hint: { color: '#e8dcc0', fontSize: 11, opacity: 0.8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  hands: { maxHeight: 150 },
  handRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  handName: { color: '#e8dcc0', fontSize: 12, width: 110 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#9a6a3a',
  },
  chipActive: { backgroundColor: '#9a6a3a', borderColor: '#f5d77a' },
  chipText: { color: '#e8dcc0', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff4d6' },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#c9962e',
  },
  buttonText: { color: '#1b1204', fontWeight: '700', fontSize: 12 },
});
