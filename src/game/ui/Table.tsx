/**
 * 원형 테이블.
 *
 * 원본 맵의 강점으로 캡션에 적혀 있던 것이 "실제 테이블에서 둘러앉아서 하는
 * 느낌을 강하게 받을 수 있는 레이아웃"이다. 본인은 언제나 화면 하단에 두고,
 * 나머지를 타원 위에 좌석 순서대로 앉힌다.
 */

import { useMemo, type ReactNode } from 'react';
import { ImageBackground, Text, View, useWindowDimensions } from 'react-native';

import { CHARACTERS } from '../data/characters';
import type { CardId } from '../data/types';
import type { GameState, PlayerId } from '../engine';
import { Table3D, useTableMode } from '../table3d';
import { ActionBar } from './ActionBar';
import { EventAbilityPanel } from './EventAbilityPanel';
import { GoldPanel } from './GoldPanel';
import { DraftPanel } from './DraftPanel';
import { feltArt, woodArt } from './card-art';
import { Hand } from './Hand';
import { HandFlights } from './HandFlights';
import { PlayerSeat } from './PlayerSeat';
import { PlayedCardSpotlight } from './PlayedCardSpotlight';
import { SidePanel } from './SidePanel';
import { TableCenter } from './TableCenter';
import { TableMobile } from './TableMobile';
import { bottomStatus, handleHandTap, statusMessage } from './table-text';
import { glowingSeat } from './glowing-seat';
import { themedStyles } from './theme/use-theme';
import { useT } from '../../i18n/use-t';
import type { TableApi } from './use-table';
import { Colors, MinTableHeight, MobileBreakpoint, Spacing } from '@/constants/theme';
import { useNames } from '../../i18n/use-names';

const BOTTOM_HEIGHT = 232;
const LOG_WIDTH = 268;
const SEAT_W = 172;
const SEAT_H = 118;

export type TableProps = {
  view: GameState;
  viewer: PlayerId;
  api: TableApi;
  /** 오른쪽 위, 진행 기록 왼쪽에 붙는 시계 */
  clock?: ReactNode;
};

export function Table({ view, viewer, api, clock }: TableProps) {
  const names = useNames();
  const styles = useStyles();
  const t = useT();
  const mode = useTableMode();
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
  // 나무 판자와 가죽. 설치돼 있지 않으면 단색으로 간다.
  const wood = woodArt();
  const felt = feltArt();

  const onSeatPress = (pid: PlayerId) => {
    if (api.selected && targets.includes(pid)) api.playCard(api.selected, pid);
  };

  // 3D 테이블. `?flat=1` 이거나 GL 이 없으면 아래 2D 로 간다.
  if (mode === '3d') return <Table3D view={view} viewer={viewer} api={api} clock={clock} />;

  if (!wide) {
    return (
      <TableMobile
        view={view}
        viewer={viewer}
        api={api}
        status={bottomStatus(view, viewer, api, t, names)}
        headline={statusMessage(view, viewer, t, names)}
        onSeatPress={onSeatPress}
        targets={targets}
        onCardPress={(card) => handleHandTap(api, card)}
        clock={clock}
      />
    );
  }

  const table = (
    <View style={[styles.table, { width: tableWidth, height: tableHeight }]}>
      {felt ? (
        <ImageBackground source={felt} style={styles.felt} imageStyle={styles.feltImage} />
      ) : (
        <View style={styles.felt} />
      )}

      {seats.map(({ player, left, top }) => (
        <View key={player.id} style={[styles.seatSlot, { left, top }]}>
          <PlayerSeat
            view={view}
            player={player}
            viewer={viewer}
            active={glowingSeat(view) === player.id}
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
        <TableCenter view={view} message={statusMessage(view, viewer, t, names)} />
      </View>

      <PlayedCardSpotlight view={view} viewer={viewer} api={api} />

      {clock && <View style={styles.clockSlot}>{clock}</View>}
    </View>
  );

  return (
    <View style={styles.root}>
      {/* 나무 판자는 배경일 뿐이라 흐름에서 빼고 뒤에 깐다 */}
      {wood && (
        <ImageBackground
          source={wood}
          style={styles.woodBackdrop}
          imageStyle={styles.woodImage}
        />
      )}

      <View style={styles.main}>
        {table}
        {wide && <SidePanel log={view.log} style={styles.side} panelStyle={styles.sidePanel} />}
      </View>

      <View style={styles.bottom}>
        {api.draft ? (
          <DraftPanel draft={api.draft} viewer={viewer} onPick={api.pickCharacter} />
        ) : (
          <>
            {view.gold ? (
              <GoldPanel
                view={view}
                viewer={viewer}
                actions={api.goldActions}
                send={api.sendGold}
                prompt={api.prompt}
                respond={api.respond}
              />
            ) : null}
            <EventAbilityPanel view={view} viewer={viewer} actions={api.eventActions} send={api.sendGold} />
            <ActionBar
              prompt={api.prompt}
              onRespond={api.respond}
              status={bottomStatus(view, viewer, api, t, names)}
              canEndTurn={api.canEndTurn}
              onEndTurn={api.endTurn}
              playerNameOf={(pid) => view.players.find((p) => p.id === pid)?.name ?? pid}
              abilities={api.abilities}
              onUseAbility={api.useAbility}
              abilityBlocked={api.abilityBlocked}
              playAs={api.playAsAbilities}
              armed={api.armed}
              onArm={api.arm}
            />

            <View style={styles.myRow}>
              <View style={styles.mySeat}>
                <PlayerSeat
                  view={view}
                  player={me}
                  viewer={viewer}
                  active={glowingSeat(view) === viewer}
                  targetable={targets.includes(viewer)}
                  onPress={() => onSeatPress(viewer)}
                  picking={steal && steal.target === viewer ? steal : null}
                  onPickHand={(index) => api.respond({ c: 'pick', pick: { zone: 'hand', index } })}
                  onPickEquipment={(card: CardId) =>
                    api.respond({ c: 'pick', pick: { zone: 'equipment', card } })
                  }
                />
                <Text style={styles.goal} numberOfLines={2}>
                  {names.roleName(me.role)} · {names.roleGoal(me.role)}
                </Text>
                <Text style={styles.ability} numberOfLines={3}>
                  {names.charAbility(me.character)}
                  {me.borrowed?.length
                    ? t.ui.seat.borrowed(me.borrowed.map((c) => names.charName(c)).join(', '))
                    : ''}
                </Text>
              </View>

              <View style={styles.handArea}>
                <Hand
                  cards={me.hand}
                  playable={api.playable}
                  discardable={api.discardable}
                  selected={api.selected}
                  onSelect={(card) => handleHandTap(api, card)}
                  showIndex
                  owner={viewer}
                  resetKey={`${view.turn.round}:${view.turn.active}`}
                />
              </View>
            </View>
          </>
        )}
      </View>
      <HandFlights />
    </View>
  );
}

// 판(나무·펠트·좌석)은 고정 Colors, 아래 막대와 기록 칸 같은 UI 는 테마 팔레트를 따른다
const useStyles = themedStyles((c) => ({
  root: { flex: 1, backgroundColor: Colors.background },
  main: { flex: 1, flexDirection: 'row', gap: Spacing.three, padding: Spacing.two },
  woodBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  woodImage: { resizeMode: 'repeat', opacity: 0.3 },
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
    overflow: 'hidden',
  },
  feltImage: { borderRadius: 400, opacity: 0.22 },
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
  // 테이블 오른쪽 위 = 옆 칸(진행 기록) 바로 왼쪽
  clockSlot: { position: 'absolute', top: Spacing.two, right: 0, pointerEvents: 'none' },
  side: { width: LOG_WIDTH, marginVertical: Spacing.two },
  sidePanel: { backgroundColor: c.panel },
  bottom: {
    backgroundColor: c.surface,
    borderTopWidth: 1.5,
    borderTopColor: c.panelBorder,
    boxShadow: `0 -4px 14px ${c.shadow}`,
  },
  myRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  mySeat: { gap: 4, maxWidth: 220 },
  goal: { color: c.textMuted, fontSize: 10 },
  ability: { color: c.textMuted, fontSize: 10, lineHeight: 14 },
  handArea: { flex: 1, minHeight: 130, justifyContent: 'center' },
}));
