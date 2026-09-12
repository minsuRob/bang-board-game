/**
 * 3D 위의 RN 층. 앵커 스토어를 구독해 좌석 라벨·더미 수·상태 문구를 얹는다.
 * 카메라가 움직일 때만 리렌더된다.
 */

import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { HIGHNOON_EVENTS } from '../../data/cards.highnoon';
import type { CardId } from '../../data/types';
import type { GameState, PlayerId } from '../../engine';
import type { TableApi } from '../../ui/use-table';
import { ANCHOR_DECK, ANCHOR_DISCARD, ANCHOR_EVENT, anchorsStore, seatKey } from '../core/anchors-store';
import { Caption } from './Caption';
import { FloatingNumbers } from './FloatingNumbers';
import { LABEL_W, LABEL_W_COMPACT, SeatLabel } from './SeatLabel';
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

  return (
    <View style={styles.layer}>
      {view.players.map((player, i) => {
        const p = anchors.points[seatKey(i)];
        if (!p || !p.visible) return null;
        const compact = anchors.width < 520;
        const half = (compact ? LABEL_W_COMPACT : LABEL_W) / 2 + 4;
        const x = Math.max(half, Math.min(anchors.width - half, p.x));
        // 내 자리는 매트 위에 얹고, 위쪽 좌석은 매트 위로, 아래쪽 좌석은 매트 아래로
        const mode = player.id === viewer ? 'center' : p.y < anchors.height * 0.5 ? 'above' : 'below';
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

      <FloatingNumbers view={view} />
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
