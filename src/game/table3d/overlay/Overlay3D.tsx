/**
 * 3D 위의 RN 층. 앵커 스토어를 구독해 좌석 라벨·더미 수·상태 문구를 얹는다.
 * 카메라가 움직일 때만 리렌더된다.
 */

import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { HIGHNOON_EVENTS } from '../../data/cards.highnoon';
import type { CardId } from '../../data/types';
import type { GameState, PlayerId } from '../../engine';
import { PlayedCardSpotlight } from '../../ui/PlayedCardSpotlight';
import type { TableApi } from '../../ui/use-table';
import { ANCHOR_DECK, ANCHOR_DISCARD, ANCHOR_EVENT, anchorsStore, seatKey } from '../core/anchors-store';
import { Caption } from './Caption';
import { CharacterHover, type PreviewSlot } from './CharacterHover';
import { EventHover } from './EventHover';
import { FloatingNumbers } from './FloatingNumbers';
import { LABEL_W, LABEL_W_COMPACT, LABEL_W_SELF, LABEL_W_SELF_COMPACT, SeatLabel } from './SeatLabel';
import { Colors, Spacing } from '@/constants/theme';

export type Overlay3DProps = {
  view: GameState;
  viewer: PlayerId;
  api: TableApi;
  targets: PlayerId[];
  onSeatPress: (pid: PlayerId) => void;
  wide: boolean;
};

/** 왼쪽 미리보기 자리를 차지한 것. 캐릭터 카드와 이벤트 카드가 나눠 쓴다 */
type HoverTarget = { k: 'player'; pid: PlayerId } | { k: 'event' } | null;

export function Overlay3D({ view, viewer, api, targets, onSeatPress, wide }: Overlay3DProps) {
  const anchors = useStore(anchorsStore);
  const [hover, setHover] = useState<HoverTarget>(null);
  // 떠날 때는 지금 가리키는 것이 자기일 때만 비운다 (옆 카드로 바로 옮겨 가면 새 것이 이긴다)
  const onPlayerHover = useCallback((pid: PlayerId, on: boolean) => {
    setHover((h) => (on ? { k: 'player', pid } : h?.k === 'player' && h.pid === pid ? null : h));
  }, []);
  const onEventHover = useCallback((on: boolean) => {
    setHover((h) => (on ? { k: 'event' } : h?.k === 'event' ? null : h));
  }, []);
  const steal = api.prompt?.steal ?? null;
  const event = view.event?.current ? HIGHNOON_EVENTS[view.event.current] : null;
  const deck = anchors.points[ANCHOR_DECK];
  const discard = anchors.points[ANCHOR_DISCARD];
  const ev = anchors.points[ANCHOR_EVENT];

  const compact = anchors.width < 520;
  const selfBox = selfLabelBox(anchors, view, viewer, compact);
  // 드래프트가 끝나면 내 정보는 하단 바로 간다 (좁은 화면도). 넓은 화면의 보드 옆 자리는 캐릭터 카드 미리보기가 쓴다
  const selfInBar = !view.draft;
  const slot: PreviewSlot | null =
    selfInBar && selfBox?.mode === 'side'
      ? {
          left: Math.max(4, selfBox.x1 - Math.min(PREVIEW_W, selfBox.room)),
          bottom: Math.max(4, anchors.height - selfBox.y1),
          width: Math.min(PREVIEW_W, selfBox.room),
        }
      : null;
  // 내 정보창이나 미리보기가 그 자리를 쓸 때만 남의 라벨이 비켜 간다
  const selfBoxUsed = !selfInBar || slot !== null;

  return (
    <View style={styles.layer}>
      {view.players.map((player, i) => {
        const p = anchors.points[seatKey(i)];
        if (!p || !p.visible) return null;
        const self = player.id === viewer;
        // 강탈 대상이 나일 때는 좌석 칸이 필요하니 그대로 둔다
        if (self && selfInBar && !(steal && steal.target === player.id)) return null;
        const w = self ? (compact ? LABEL_W_SELF_COMPACT : LABEL_W_SELF) : compact ? LABEL_W_COMPACT : LABEL_W;
        const half = w / 2 + 4;
        let x = Math.max(half, Math.min(anchors.width - half, p.x));
        // 위쪽 좌석은 보드 위로, 아래쪽 좌석은 보드 아래로.
        // 내 자리는 보드를 가리지 않게 왼쪽 옆에. 자리가 없으면 보드 아랫변 안쪽에 얹는다
        let mode: 'above' | 'below' | 'side' | 'inside' = p.y < anchors.height * 0.5 ? 'above' : 'below';
        if (self && selfBox) {
          mode = selfBox.mode;
          x = selfBox.x;
        } else if (mode === 'below' && selfBox && selfBoxUsed) {
          // 내 정보창과 겹치면 보드 위로 올린다
          const top = (p.bottom ?? p.y) + 2;
          const hit = x + w / 2 > selfBox.x0 && x - w / 2 < selfBox.x1 && top < selfBox.y1 && top + OTHER_LABEL_H > selfBox.y0;
          if (hit) mode = 'above';
        }
        return (
          <SeatLabel
            key={player.id}
            view={view}
            player={player}
            viewer={viewer}
            x={x}
            y={p.y}
            top={p.top ?? p.y}
            bottom={p.bottom ?? p.y}
            mode={mode}
            compact={compact}
            canvasHeight={anchors.height}
            active={view.turn.active === player.id}
            targetable={targets.includes(player.id)}
            onPress={() => onSeatPress(player.id)}
            picking={steal && steal.target === player.id ? steal : null}
            onPickHand={(index) => api.respond({ c: 'pick', pick: { zone: 'hand', index } })}
            onPickEquipment={(card: CardId) => api.respond({ c: 'pick', pick: { zone: 'equipment', card } })}
            detail={wide}
          />
        );
      })}

      {deck?.visible && <Pill x={deck.x} y={deck.y} text={`덱 ${view.deck.length}`} />}
      {discard?.visible && <Pill x={discard.x} y={discard.y} text={`버린 더미 ${view.discard.length}`} />}
      {event && ev?.visible && <Pill x={ev.x} y={ev.y} text={event.nameKo} tone={Colors.renegade} />}

      <CharacterHover
        view={view}
        viewer={viewer}
        onSeatPress={onSeatPress}
        slot={slot}
        hovered={hover?.k === 'player' ? hover.pid : null}
        onHoverChange={onPlayerHover}
      />
      <EventHover view={view} hovered={hover?.k === 'event'} onHoverChange={onEventHover} slot={slot} />
      <FloatingNumbers view={view} />
      <PlayedCardSpotlight view={view} viewer={viewer} api={api} compact={!wide} />
      <Caption />
    </View>
  );
}

/** 남의 라벨 대략 높이. 겹침 판정에만 쓴다 */
const OTHER_LABEL_H = 72;
/** 내 정보창 대략 높이 */
const SELF_LABEL_H = 150;
/** 좁은 화면 내 정보창 대략 높이 (능력 한 줄) */
const SELF_LABEL_H_COMPACT = 96;
/** 캐릭터 카드 미리보기 패널 폭. 보드 옆 자리가 좁으면 줄인다 */
const PREVIEW_W = 300;

type SelfBox = {
  mode: 'side' | 'below' | 'inside';
  x: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** side 일 때 화면 왼쪽 끝부터 보드 앞까지 쓸 수 있는 폭 */
  room: number;
};

/** 내 정보창이 놓일 자리와 대략의 사각형 */
function selfLabelBox(
  anchors: ReturnType<typeof anchorsStore.getState>,
  view: GameState,
  viewer: PlayerId,
  compact: boolean,
): SelfBox | null {
  const i = view.players.findIndex((p) => p.id === viewer);
  const p = i >= 0 ? anchors.points[seatKey(i)] : null;
  if (!p || !p.visible) return null;
  const w = compact ? LABEL_W_SELF_COMPACT : LABEL_W_SELF;
  const gap = 10;
  const bottom = Math.min(anchors.height, p.bottom ?? p.y);
  const sideX = (p.left ?? p.x) - gap - w / 2;
  if (sideX - w / 2 >= 4) {
    const x1 = sideX + w / 2;
    return { mode: 'side', x: sideX, x0: sideX - w / 2, x1, y0: bottom - SELF_LABEL_H, y1: bottom, room: x1 - 4 };
  }
  // 옆에 자리가 없으면 보드 아래 (세로 화면은 layout 이 그 자리를 비워 둔다). 그래도 모자라면 보드 아랫변 안쪽
  const x = Math.max(w / 2 + 4, Math.min(anchors.width - w / 2 - 4, p.x));
  if (anchors.height - bottom >= SELF_LABEL_H_COMPACT) {
    return { mode: 'below', x, x0: x - w / 2, x1: x + w / 2, y0: bottom, y1: bottom + SELF_LABEL_H_COMPACT, room: w };
  }
  return { mode: 'inside', x, x0: x - w / 2, x1: x + w / 2, y0: bottom - SELF_LABEL_H, y1: bottom, room: w };
}

function Pill({ x, y, text, tone }: { x: number; y: number; text: string; tone?: string }) {
  return (
    <View style={[styles.pillWrap, { left: x - 60, top: y + 28 }]}>
      <Text style={[styles.pill, tone ? { color: tone } : null]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' },
  pillWrap: { position: 'absolute', width: 120, alignItems: 'center', pointerEvents: 'none' },
  pill: {
    color: Colors.paperEdge,
    fontSize: 10,
    backgroundColor: 'rgba(24, 16, 9, 0.75)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
});
