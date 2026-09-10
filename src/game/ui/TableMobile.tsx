/**
 * 좁은 화면용 테이블.
 *
 * 원형 배치는 손가락으로 쓰기에 너무 촘촘하고, 세로 화면에서는 좌석이 겹친다.
 * 그래서 모바일에서는 원을 버리고 위에서 아래로 쌓는다.
 * 착석 순서는 그대로 유지해서 거리 감각은 잃지 않게 한다.
 */

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { CARD_DEFS } from '../data/cards.base';
import { HIGHNOON_EVENTS } from '../data/cards.highnoon';
import { CHARACTERS } from '../data/characters';
import { ROLE_LABEL } from '../data/roles';
import type { DimensionValue } from 'react-native';

import type { CardId, Role } from '../data/types';
import { distance, kindOf, type GameState, type Player, type PlayerId } from '../engine';
import { ActionBar } from './ActionBar';
import { CardView } from './CardView';
import { Hand } from './Hand';
import { LogPanel } from './LogPanel';
import type { TableApi } from './use-table';
import { Colors, Radius, Spacing } from '@/constants/theme';

const ROLE_COLOR: Record<Role, string> = {
  sheriff: Colors.sheriff,
  deputy: Colors.deputy,
  outlaw: Colors.outlaw,
  renegade: Colors.renegade,
};

export type TableMobileProps = {
  view: GameState;
  viewer: PlayerId;
  api: TableApi;
  status: string;
  headline: string;
  onSeatPress: (pid: PlayerId) => void;
  targets: PlayerId[];
  onCardPress: (card: CardId) => void;
};

export function TableMobile({
  view,
  viewer,
  api,
  status,
  headline,
  onSeatPress,
  targets,
  onCardPress,
}: TableMobileProps) {
  const [logOpen, setLogOpen] = useState(false);
  const { width, height } = useWindowDimensions();
  // 폭이 넓으면 좌석을 여러 열로 늘어놓는다. 폰을 눕혔을 때가 이 경우다.
  const columns = width >= 900 ? 4 : width >= 520 ? 3 : 2;
  const seatBasis: DimensionValue = `${Math.floor(100 / columns) - 2}%`;
  // 높이가 아주 낮으면(가로로 누운 폰) 내 자리와 손패를 나란히 둔다.
  const squat = height < 480;

  const me = view.players.find((p) => p.id === viewer)!;
  const others = orderedOthers(view, viewer);
  const steal = api.prompt?.steal ?? null;
  const top = view.discard[view.discard.length - 1];
  const event = view.event?.current ? HIGHNOON_EVENTS[view.event.current] : null;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.headline} numberOfLines={1}>
          {headline}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="진행 기록"
          onPress={() => setLogOpen((v) => !v)}
          style={styles.logButton}>
          <Text style={styles.logButtonText}>{logOpen ? '닫기' : '기록'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.seatGrid}>
          {others.map((player) => (
            <CompactSeat
              key={player.id}
              basis={seatBasis}
              view={view}
              viewer={viewer}
              player={player}
              active={view.turn.active === player.id}
              targetable={targets.includes(player.id)}
              onPress={() => onSeatPress(player.id)}
              picking={steal && steal.target === player.id ? steal : null}
              onPickHand={(index) => api.respond({ c: 'pick', pick: { zone: 'hand', index } })}
              onPickEquipment={(card) => api.respond({ c: 'pick', pick: { zone: 'equipment', card } })}
            />
          ))}
        </View>

        <View style={styles.center}>
          <Pile label={`덱 ${view.deck.length}`}>
            <View style={styles.cardBack}>
              <Text style={styles.cardBackMark}>✷</Text>
            </View>
          </Pile>
          <Pile label={`버린 더미 ${view.discard.length}`}>
            {top ? <CardView card={top} size="sm" /> : <View style={styles.emptyPile} />}
          </Pile>
          {event && (
            <Pile label="이벤트">
              <View style={styles.eventCard}>
                <Text style={styles.eventName} numberOfLines={2}>
                  {event.nameKo}
                </Text>
              </View>
            </Pile>
          )}
        </View>
      </ScrollView>

      <ActionBar
        prompt={api.prompt}
        onRespond={api.respond}
        status={status}
        canEndTurn={api.canEndTurn}
        onEndTurn={api.endTurn}
        playerNameOf={(pid) => view.players.find((p) => p.id === pid)?.name ?? pid}
        abilities={api.abilities}
        onUseAbility={api.useAbility}
      />

      <View style={[styles.mine, squat && styles.mineRow]}>
        <CompactSeat
          view={view}
          viewer={viewer}
          player={me}
          active={view.turn.active === viewer}
          targetable={targets.includes(viewer)}
          onPress={() => onSeatPress(viewer)}
          picking={steal && steal.target === viewer ? steal : null}
          onPickHand={(index) => api.respond({ c: 'pick', pick: { zone: 'hand', index } })}
          onPickEquipment={(card) => api.respond({ c: 'pick', pick: { zone: 'equipment', card } })}
          wide={!squat}
          basis={squat ? 220 : undefined}
        />
        <View style={[styles.handArea, squat && styles.handAreaSquat]}>
          <Hand
            cards={me.hand}
            playable={api.playable}
            discardable={api.discardable}
            selected={api.selected}
            onSelect={onCardPress}
          />
        </View>
      </View>

      {logOpen && (
        <View style={styles.logOverlay}>
          <LogPanel log={view.log} style={styles.logPanel} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="기록 닫기"
            style={styles.logClose}
            onPress={() => setLogOpen(false)}>
            <Text style={styles.logCloseText}>닫기</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** 나를 뺀 나머지를, 내 왼쪽부터 착석 순서대로 */
function orderedOthers(view: GameState, viewer: PlayerId): Player[] {
  const n = view.players.length;
  const start = view.players.findIndex((p) => p.id === viewer);
  const out: Player[] = [];
  for (let i = 1; i < n; i++) out.push(view.players[(start + i) % n]);
  return out;
}

type CompactSeatProps = {
  view: GameState;
  viewer: PlayerId;
  player: Player;
  active: boolean;
  targetable: boolean;
  onPress: () => void;
  picking: { handCount: number; equipment: CardId[] } | null;
  onPickHand: (index: number) => void;
  onPickEquipment: (card: CardId) => void;
  wide?: boolean;
  /** 한 줄에 몇 칸을 차지할지 (flexBasis) */
  basis?: DimensionValue;
};

function CompactSeat({
  view,
  viewer,
  player,
  active,
  targetable,
  onPress,
  picking,
  onPickHand,
  onPickEquipment,
  wide,
  basis,
}: CompactSeatProps) {
  const isSelf = player.id === viewer;
  const dead = !player.alive && !player.ghost;
  const dist = !isSelf && !dead ? safeDistance(view, viewer, player.id) : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={!targetable}
      accessibilityRole={targetable ? 'button' : undefined}
      accessibilityLabel={`${player.name} · ${CHARACTERS[player.character].nameKo}`}
      style={[
        styles.compact,
        basis ? { flexBasis: basis } : null,
        wide && styles.compactWide,
        active && styles.compactActive,
        targetable && styles.compactTargetable,
        dead && styles.compactDead,
        player.ghost && styles.compactGhost,
      ]}>
      <View style={styles.compactRow}>
        <Text style={styles.compactName} numberOfLines={1}>
          {player.name}
        </Text>
        {(player.roleRevealed || isSelf) && (
          <Text style={[styles.compactRole, { color: ROLE_COLOR[player.role] }]}>
            {ROLE_LABEL[player.role]}
          </Text>
        )}
      </View>

      <Text style={styles.compactCharacter} numberOfLines={1}>
        {CHARACTERS[player.character].nameKo}
        {player.ghost ? ' · 유령' : ''}
        {dead ? ' · 제거됨' : ''}
      </Text>

      <View style={styles.compactRow}>
        <Text style={styles.compactHp}>
          {'●'.repeat(Math.max(0, player.hp))}
          <Text style={styles.compactHpEmpty}>
            {'○'.repeat(Math.max(0, player.maxHp - Math.max(0, player.hp)))}
          </Text>
        </Text>
        {dist !== null && <Text style={styles.compactMeta}>거리 {dist}</Text>}
      </View>

      <View style={styles.compactRow}>
        <View style={styles.compactHand}>
          {Array.from({ length: Math.min(player.hand.length, 6) }, (_, i) => (
            <Pressable
              key={i}
              disabled={!picking}
              onPress={() => onPickHand(i)}
              style={[styles.compactCard, picking && styles.compactCardPickable]}
            />
          ))}
          <Text style={styles.compactMeta}>{player.hand.length}</Text>
        </View>

        {player.equipment.map((card) => (
          <Pressable
            key={card}
            disabled={!picking}
            onPress={() => onPickEquipment(card)}
            style={[styles.equipChip, picking && styles.equipChipPickable]}>
            <Text style={styles.equipText} numberOfLines={1}>
              {CARD_DEFS[kindOf(card)].nameKo}
            </Text>
          </Pressable>
        ))}
      </View>
    </Pressable>
  );
}

function safeDistance(view: GameState, from: PlayerId, to: PlayerId): number | null {
  try {
    return distance(view, from, to);
  } catch {
    return null;
  }
}

function Pile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.pile}>
      {children}
      <Text style={styles.pileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Colors.surface,
    gap: Spacing.two,
  },
  headline: { color: Colors.text, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  logButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logButtonText: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },

  body: { padding: Spacing.two, gap: Spacing.two },
  seatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  center: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pile: { alignItems: 'center', gap: 2 },
  pileLabel: { color: Colors.textMuted, fontSize: 9 },
  cardBack: {
    width: 46,
    height: 66,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackMark: { color: Colors.cardBrown, fontSize: 16 },
  emptyPile: {
    width: 46,
    height: 66,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  eventCard: {
    width: 46,
    height: 66,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.renegade,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  eventName: { color: Colors.textOnPaper, fontSize: 9, fontWeight: '800', textAlign: 'center' },

  compact: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.two,
    gap: 2,
  },
  // 내 자리는 한 줄을 다 쓰되 세로로 늘어나지는 않는다 (손패 자리를 먹는다)
  compactWide: { flexBasis: 'auto', flexGrow: 0, width: '100%' },
  compactActive: { borderColor: Colors.sheriff, backgroundColor: Colors.surfaceRaised },
  compactTargetable: { borderColor: Colors.highlight, borderWidth: 2 },
  compactDead: { opacity: 0.45 },
  compactGhost: { borderColor: Colors.renegade, borderStyle: 'dashed' },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  compactName: { color: Colors.text, fontSize: 12, fontWeight: '800', flexShrink: 1 },
  compactRole: { fontSize: 9, fontWeight: '800' },
  compactCharacter: { color: Colors.textMuted, fontSize: 10 },
  compactHp: { color: Colors.hp, fontSize: 10, letterSpacing: 1 },
  compactHpEmpty: { color: Colors.border },
  compactMeta: { color: Colors.textMuted, fontSize: 9 },
  compactHand: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  compactCard: {
    width: 9,
    height: 14,
    borderRadius: 2,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.cardBrown,
  },
  compactCardPickable: { borderColor: Colors.highlight, backgroundColor: Colors.cardBrown },
  equipChip: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.cardBlue,
  },
  equipChipPickable: { borderColor: Colors.highlight, backgroundColor: Colors.surfaceRaised },
  equipText: { color: Colors.deputy, fontSize: 9 },

  mineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  mine: {
    backgroundColor: Colors.surface,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.two,
    gap: Spacing.one,
  },
  // 가로 스크롤은 높이를 스스로 정하지 못한다. 카드 한 장 높이만큼 잡아 준다.
  handArea: { height: 128, justifyContent: 'center' },
  handAreaSquat: { flex: 1, height: 124 },

  logOverlay: {
    position: 'absolute',
    top: 44,
    left: Spacing.two,
    right: Spacing.two,
    bottom: 120,
    gap: Spacing.two,
  },
  logPanel: { flex: 1, backgroundColor: Colors.background, borderColor: Colors.highlight },
  logClose: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Colors.cardBrown,
  },
  logCloseText: { color: Colors.paper, fontSize: 12, fontWeight: '800' },
});
