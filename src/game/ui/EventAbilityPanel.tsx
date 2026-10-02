/**
 * 와일드 웨스트 쇼 이벤트 패널.
 *
 * - 사카가웨이: 펼쳐 놓은 남의 손패를 한 사람씩 보여 준다. 기본은 차례인 사람,
 *   이름에 마우스를 올리면(폰은 탭) 그 사람 손패로 바뀐다
 * - 레이디 로즈 오브 텍사스: 오른쪽 사람과 자리 바꾸기 버튼
 * - 도로시 레이지: 누구에게 · 무슨 카드를 · 누구에게 낼지 차례로 골라 시킨다
 *
 * 무엇을 누를 수 있는지는 legalActions() 에서 걸러 온 actions 가 전부 정한다.
 * 이벤트가 없거나 보여 줄 것이 없으면 아무것도 그리지 않는다.
 */

import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CARD_DEFS } from '../data/cards.base';
import { CHARACTERS } from '../data/characters';
import type { CardKind } from '../data/types';
import { isHidden, type Action, type GameState, type PlayerId } from '../engine';
import { rightNeighborOf } from '../engine/distance';
import { handsRevealed, turnDirectionOf } from '../engine/hooks';
import { wa } from '../engine/josa';
import { CAN_HOVER } from './card-peek';
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

/**
 * 사카가웨이: 남의 손패를 한 번에 한 사람만. 내 손은 아래 손패 줄에 이미 있다.
 * 기본은 차례인 사람(내 차례면 다음 사람). 웹은 이름에 올리는 동안, 폰은 탭해서 바꾼다
 */
function OpenHands({ view, viewer }: { view: GameState; viewer: PlayerId | null }) {
  const others = view.players.filter((p) => p.id !== viewer && (p.alive || p.ghost));
  const active = view.turn.active;
  const [picked, setPicked] = useState<PlayerId | null>(null);
  // 차례가 넘어가면 다시 차례인 사람으로
  useEffect(() => setPicked(null), [active]);

  const fallback =
    active !== viewer
      ? active
      : viewer
        ? (rightNeighborOf(view, viewer, turnDirectionOf(view)) ?? others[0]?.id)
        : others[0]?.id;
  const shownId = others.some((p) => p.id === picked) ? picked : fallback;
  const shown = others.find((p) => p.id === shownId) ?? others[0];
  if (!shown) return null;

  return (
    <>
      <Text style={styles.title}>사카가웨이 — 모두 손패를 펼쳐 놓는다</Text>
      <View style={styles.row}>
        {others.map((p) => (
          <Chip
            key={p.id}
            label={`${who(view, p.id)} ${p.hand.length}장`}
            active={p.id === shown.id}
            marked={p.id === active}
            {...(CAN_HOVER
              ? { onHoverIn: () => setPicked(p.id), onHoverOut: () => setPicked((c) => (c === p.id ? null : c)) }
              : { onPress: () => setPicked((c) => (c === p.id ? null : p.id)) })}
          />
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {shown.hand.filter((c) => !isHidden(c)).map((c) => (
            <CardView key={c} card={c} size="sm" />
          ))}
          {shown.hand.length === 0 && <Text style={styles.hint}>손패가 없다</Text>}
        </View>
      </ScrollView>
      <Text style={styles.hint}>
        {CAN_HOVER ? '이름에 마우스를 올리면 그 사람 손패를 본다' : '이름을 누르면 그 사람 손패를 본다'}
      </Text>
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

function Chip({
  label,
  active,
  marked,
  onPress,
  onHoverIn,
  onHoverOut,
}: {
  label: string;
  active: boolean;
  /** 차례인 사람 표시 */
  marked?: boolean;
  onPress?: () => void;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[styles.chip, marked && styles.chipMarked, active && styles.chipActive]}
      onPress={onPress}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}>
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
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#9a6a3a',
  },
  chipMarked: { borderColor: '#f5d77a', borderStyle: 'dashed' },
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
