/**
 * 원형 테이블.
 *
 * 원본 맵의 강점으로 캡션에 적혀 있던 것이 "실제 테이블에서 둘러앉아서 하는
 * 느낌을 강하게 받을 수 있는 레이아웃"이다. 본인은 언제나 화면 하단에 두고,
 * 나머지를 타원 위에 좌석 순서대로 앉힌다.
 */

import { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { CHARACTERS } from '../data/characters';
import { ROLE_GOAL, ROLE_LABEL } from '../data/roles';
import type { CardId } from '../data/types';
import type { GameState, PlayerId } from '../engine';
import { ActionBar } from './ActionBar';
import { Hand } from './Hand';
import { LogPanel } from './LogPanel';
import { PlayerSeat } from './PlayerSeat';
import { TableCenter } from './TableCenter';
import { TableMobile } from './TableMobile';
import type { TableApi } from './use-table';
import { Colors, MinTableHeight, MobileBreakpoint, Radius, Spacing } from '@/constants/theme';
import { ga } from '../engine/josa';

const BOTTOM_HEIGHT = 232;
const LOG_WIDTH = 268;
const SEAT_W = 172;
const SEAT_H = 118;

export type TableProps = {
  view: GameState;
  viewer: PlayerId;
  api: TableApi;
};

export function Table({ view, viewer, api }: TableProps) {
  const { width, height } = useWindowDimensions();
  // 폭도 높이도 넉넉해야 원형 배치를 쓴다. 하나라도 모자라면 좌석이 겹친다.
  const wide = width >= MobileBreakpoint && height >= MinTableHeight;

  const tableWidth = wide ? width - LOG_WIDTH - Spacing.four : width;
  const tableHeight = Math.max(280, height - BOTTOM_HEIGHT);

  const me = view.players.find((p) => p.id === viewer)!;
  const ring = view.players;
  const myIndex = ring.findIndex((p) => p.id === viewer);

  const seats = useMemo(() => {
    const n = ring.length;
    const cx = tableWidth / 2;
    const cy = tableHeight / 2;
    // 좌석이 테이블 밖으로 잘리지 않도록 반지름을 좌석 크기만큼 줄여 둔다.
    const rx = Math.max(120, tableWidth / 2 - SEAT_W / 2 - Spacing.two);
    const ry = Math.max(52, tableHeight / 2 - SEAT_H / 2 - Spacing.two);

    const clamp = (v: number, max: number) => Math.max(0, Math.min(v, max));

    return ring
      .map((player, i) => {
        const offset = (i - myIndex + n) % n;
        if (offset === 0) return null;
        const angle = ((90 + offset * (360 / n)) * Math.PI) / 180;
        return {
          player,
          left: clamp(cx + rx * Math.cos(angle) - SEAT_W / 2, tableWidth - SEAT_W),
          top: clamp(cy + ry * Math.sin(angle) - SEAT_H / 2, tableHeight - SEAT_H),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [ring, myIndex, tableWidth, tableHeight]);

  const steal = api.prompt?.steal ?? null;
  const targets = api.selected ? api.targetsFor(api.selected) : [];

  const onSeatPress = (pid: PlayerId) => {
    if (api.selected && targets.includes(pid)) api.playCard(api.selected, pid);
  };

  if (!wide) {
    return (
      <TableMobile
        view={view}
        viewer={viewer}
        api={api}
        status={bottomStatus(view, viewer, api)}
        headline={statusMessage(view, viewer)}
        onSeatPress={onSeatPress}
        targets={targets}
        onCardPress={(card) => onCardPress(api, card)}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.main}>
        <View style={[styles.table, { width: tableWidth, height: tableHeight }]}>
          <View style={styles.felt} />

          {seats.map(({ player, left, top }) => (
            <View key={player.id} style={[styles.seatSlot, { left, top }]}>
              <PlayerSeat
                view={view}
                player={player}
                viewer={viewer}
                active={view.turn.active === player.id}
                targetable={targets.includes(player.id)}
                onPress={() => onSeatPress(player.id)}
                picking={steal && steal.target === player.id ? steal : null}
                onPickHand={(index) => api.respond({ c: 'pick', pick: { zone: 'hand', index } })}
                onPickEquipment={(card: CardId) =>
                  api.respond({ c: 'pick', pick: { zone: 'equipment', card } })
                }
                compact={!wide}
              />
            </View>
          ))}

          <View style={styles.centerSlot}>
            <TableCenter view={view} message={statusMessage(view, viewer)} />
          </View>
        </View>

        {wide && <LogPanel log={view.log} style={styles.log} />}
      </View>

      <View style={styles.bottom}>
        <ActionBar
          prompt={api.prompt}
          onRespond={api.respond}
          status={bottomStatus(view, viewer, api)}
          canEndTurn={api.canEndTurn}
          onEndTurn={api.endTurn}
          playerNameOf={(pid) => view.players.find((p) => p.id === pid)?.name ?? pid}
          abilities={api.abilities}
          onUseAbility={api.useAbility}
        />

        <View style={styles.myRow}>
          <View style={styles.mySeat}>
            <PlayerSeat
              view={view}
              player={me}
              viewer={viewer}
              active={view.turn.active === viewer}
              targetable={targets.includes(viewer)}
              onPress={() => onSeatPress(viewer)}
              picking={steal && steal.target === viewer ? steal : null}
              onPickHand={(index) => api.respond({ c: 'pick', pick: { zone: 'hand', index } })}
              onPickEquipment={(card: CardId) =>
                api.respond({ c: 'pick', pick: { zone: 'equipment', card } })
              }
            />
            <Text style={styles.goal} numberOfLines={2}>
              {ROLE_LABEL[me.role]} · {ROLE_GOAL[me.role]}
            </Text>
            <Text style={styles.ability} numberOfLines={3}>
              {CHARACTERS[me.character].ability}
            </Text>
          </View>

          <View style={styles.handArea}>
            <Hand
              cards={me.hand}
              playable={api.playable}
              discardable={api.discardable}
              selected={api.selected}
              onSelect={(card) => onCardPress(api, card)}
              showIndex
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function onCardPress(api: TableApi, card: CardId) {
  // 버리기 단계에서는 누르는 즉시 버린다.
  if (api.discardable.has(card)) {
    api.discard(card);
    return;
  }
  if (!api.playable.has(card)) return;

  const targets = api.targetsFor(card);
  if (targets.length === 0) {
    api.playCard(card);
    return;
  }
  // 지목이 필요한 카드는 한 번 더 눌러 대상을 고르게 한다.
  api.select(api.selected === card ? null : card);
}

function statusMessage(view: GameState, viewer: PlayerId): string {
  if (view.result) {
    return `${view.result.reason} — ${view.result.winners.map((r) => ROLE_LABEL[r]).join('·')} 승리`;
  }
  const active = view.players.find((p) => p.id === view.turn.active);
  const who = active?.id === viewer ? '내' : `${active?.name}의`;
  const phase = view.turn.phase === 'discard' ? '버리기' : view.turn.phase === 'draw' ? '카드 가져오기' : '카드 사용';
  return `${who} 차례 · ${phase} 단계 · ${view.turn.round}라운드`;
}

function bottomStatus(view: GameState, viewer: PlayerId, api: TableApi): string {
  if (view.result) return '게임이 끝났다.';
  if (api.waitingOnMe) return '';
  if (view.awaiting) {
    const who = view.players.find((p) => p.id === view.awaiting!.pid)?.name;
    return `${who}의 반응을 기다리는 중`;
  }
  if (view.turn.active !== viewer) {
    const name = view.players.find((p) => p.id === view.turn.active)?.name ?? '';
    return `${ga(name)} 생각하는 중`;
  }
  if (view.turn.phase === 'discard') {
    const me = view.players.find((p) => p.id === viewer)!;
    return `손패를 목숨 수(${me.hp}장)까지 줄여야 한다`;
  }
  if (api.selected) return '지목할 상대를 고른다 (Esc 취소)';
  return '낼 카드를 고른다';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  main: { flex: 1, flexDirection: 'row', gap: Spacing.three, padding: Spacing.two },
  table: { position: 'relative' },
  felt: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.table,
    borderRadius: 400,
    margin: Spacing.four,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  seatSlot: { position: 'absolute', width: SEAT_W, alignItems: 'center' },
  centerSlot: {
    // 가운데 표시는 좌석 클릭을 가로막으면 안 된다
    pointerEvents: 'box-none',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  log: { width: LOG_WIDTH, marginVertical: Spacing.two },
  bottom: { backgroundColor: Colors.surface },
  myRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  mySeat: { gap: 4, maxWidth: 220 },
  goal: { color: Colors.textMuted, fontSize: 10 },
  ability: { color: Colors.textMuted, fontSize: 10, lineHeight: 14 },
  handArea: { flex: 1, minHeight: 130, justifyContent: 'center' },
});
