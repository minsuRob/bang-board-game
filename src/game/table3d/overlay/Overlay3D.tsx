/**
 * 3D 위의 RN 층. 앵커 스토어를 구독해 좌석 라벨·더미 수·상태 문구를 얹는다.
 * 카메라가 움직일 때만 리렌더된다.
 */

import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { HIGHNOON_EVENTS } from '../../data/cards.highnoon';
import type { CardId } from '../../data/types';
import type { GameState, PlayerId } from '../../engine';
import { PlayedCardSpotlight } from '../../ui/PlayedCardSpotlight';
import type { TableApi } from '../../ui/use-table';
import { ANCHOR_DECK, ANCHOR_DISCARD, ANCHOR_EVENT, anchorsStore, seatKey } from '../core/anchors-store';
import { Caption } from './Caption';
import { CharacterHover } from './CharacterHover';
import { FloatingNumbers } from './FloatingNumbers';
import { LABEL_W, LABEL_W_COMPACT, LABEL_W_SELF, LABEL_W_SELF_COMPACT, SeatLabel } from './SeatLabel';
import { Colors, Spacing } from '@/constants/theme';

export type Overlay3DProps = {
  view: GameState;
  viewer: PlayerId;
  api: TableApi;
  targets: PlayerId[];
  onSeatPress: (pid: PlayerId) => void;
  headline: string;
  wide: boolean;
};

export function Overlay3D({ view, viewer, api, targets, onSeatPress, headline, wide }: Overlay3DProps) {
  const anchors = useStore(anchorsStore);
  const steal = api.prompt?.steal ?? null;
  const event = view.event?.current ? HIGHNOON_EVENTS[view.event.current] : null;
  const deck = anchors.points[ANCHOR_DECK];
  const discard = anchors.points[ANCHOR_DISCARD];
  const ev = anchors.points[ANCHOR_EVENT];

  const compact = anchors.width < 520;
  const selfBox = selfLabelBox(anchors, view, viewer, compact);

  return (
    <View style={styles.layer}>
      {view.players.map((player, i) => {
        const p = anchors.points[seatKey(i)];
        if (!p || !p.visible) return null;
        const self = player.id === viewer;
        const w = self ? (compact ? LABEL_W_SELF_COMPACT : LABEL_W_SELF) : compact ? LABEL_W_COMPACT : LABEL_W;
        const half = w / 2 + 4;
        let x = Math.max(half, Math.min(anchors.width - half, p.x));
        // 위쪽 좌석은 보드 위로, 아래쪽 좌석은 보드 아래로.
        // 내 자리는 보드를 가리지 않게 왼쪽 옆에. 자리가 없으면 보드 아랫변 안쪽에 얹는다
        let mode: 'above' | 'below' | 'side' | 'inside' = p.y < anchors.height * 0.5 ? 'above' : 'below';
        if (self && selfBox) {
          mode = selfBox.mode;
          x = selfBox.x;
        } else if (mode === 'below' && selfBox) {
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

      <CharacterHover view={view} viewer={viewer} onSeatPress={onSeatPress} />
      <FloatingNumbers view={view} />
      <PlayedCardSpotlight view={view} viewer={viewer} api={api} compact={!wide} />
      <Caption />

      {wide && (
        <View style={styles.headlineWrap}>
          <Text style={styles.headline} numberOfLines={2}>
            {headline}
          </Text>
        </View>
      )}
    </View>
  );
}

/** 남의 라벨 대략 높이. 겹침 판정에만 쓴다 */
const OTHER_LABEL_H = 72;
/** 내 정보창 대략 높이 */
const SELF_LABEL_H = 150;
/** 좁은 화면 내 정보창 대략 높이 (능력 한 줄) */
const SELF_LABEL_H_COMPACT = 96;

type SelfBox = { mode: 'side' | 'below' | 'inside'; x: number; x0: number; x1: number; y0: number; y1: number };

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
    return { mode: 'side', x: sideX, x0: sideX - w / 2, x1: sideX + w / 2, y0: bottom - SELF_LABEL_H, y1: bottom };
  }
  // 옆에 자리가 없으면 보드 아래 (세로 화면은 layout 이 그 자리를 비워 둔다). 그래도 모자라면 보드 아랫변 안쪽
  const x = Math.max(w / 2 + 4, Math.min(anchors.width - w / 2 - 4, p.x));
  if (anchors.height - bottom >= SELF_LABEL_H_COMPACT) {
    return { mode: 'below', x, x0: x - w / 2, x1: x + w / 2, y0: bottom, y1: bottom + SELF_LABEL_H_COMPACT };
  }
  return { mode: 'inside', x, x0: x - w / 2, x1: x + w / 2, y0: bottom - SELF_LABEL_H, y1: bottom };
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
  headlineWrap: { position: 'absolute', top: Spacing.two, left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' },
  headline: {
    color: Colors.text,
    backgroundColor: 'rgba(24, 16, 9, 0.82)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    overflow: 'hidden',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 420,
  },
});
