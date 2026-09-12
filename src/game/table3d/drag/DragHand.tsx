/**
 * 드래그로 내는 손패.
 *
 * 위로 8px 끌면 드래그가 시작되고 카드는 3D 로 넘어간다. 옆으로 먼저 끌면 스크롤이다.
 * 탭은 예전 흐름(Pressable) 그대로다.
 */

import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { CardId } from '../../data/types';
import { CardView } from '../../ui/CardView';
import { beginDrag, dragStore, endDrag, moveDrag } from '../core/drag-store';
import { Colors, Spacing } from '@/constants/theme';

export type DragHandProps = {
  cards: CardId[];
  playable: Set<CardId>;
  discardable: Set<CardId>;
  selected: CardId | null;
  onSelect: (card: CardId) => void;
  /** 드래그 시작. 대상이 필요한 카드면 여기서 select 해 매트를 밝힌다 */
  onDragStart: (card: CardId) => void;
  /** 캔버스 좌표로 놓았다. true 면 냈다 */
  onDrop: (card: CardId, x: number, y: number) => boolean;
  showIndex?: boolean;
};

export function DragHand({ cards, playable, discardable, selected, onSelect, onDragStart, onDrop, showIndex }: DragHandProps) {
  const [dragging, setDragging] = useState<CardId | null>(null);

  if (cards.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>손패가 없다</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {cards.map((card, i) => {
        const usable = playable.has(card) || discardable.has(card);
        return (
          <DraggableCard
            key={card}
            card={card}
            usable={usable}
            hidden={dragging === card}
            onDragStart={() => {
              setDragging(card);
              onDragStart(card);
            }}
            onDrop={(x, y) => {
              setDragging(null);
              return onDrop(card, x, y);
            }}>
            <View style={styles.slot}>
              <CardView
                card={card}
                size="md"
                highlighted={usable}
                disabled={!usable}
                selected={selected === card}
                onPress={() => onSelect(card)}
              />
              {showIndex && <Text style={styles.index}>{(i + 1) % 10}</Text>}
            </View>
          </DraggableCard>
        );
      })}
    </ScrollView>
  );
}

function DraggableCard({
  card,
  usable,
  hidden,
  onDragStart,
  onDrop,
  children,
}: {
  card: CardId;
  usable: boolean;
  hidden: boolean;
  onDragStart: () => void;
  onDrop: (x: number, y: number) => boolean;
  children: React.ReactNode;
}) {
  const toCanvas = useCallback((ax: number, ay: number) => {
    const o = dragStore.getState().origin;
    return { x: ax - o.x, y: ay - o.y };
  }, []);

  const pan = Gesture.Pan()
    .enabled(usable)
    // 위로 8px 끌면 시작. 옆으로 먼저 끌면 스크롤이 먼저 잡는다
    .activeOffsetY(-8)
    .runOnJS(true)
    .onStart((e) => {
      const { x, y } = toCanvas(e.absoluteX, e.absoluteY);
      onDragStart();
      beginDrag(card, x, y);
    })
    .onUpdate((e) => {
      const { x, y } = toCanvas(e.absoluteX, e.absoluteY);
      moveDrag(x, y, e.velocityX, e.velocityY);
    })
    .onEnd((e) => {
      const { x, y } = toCanvas(e.absoluteX, e.absoluteY);
      endDrag(onDrop(x, y));
    })
    .onFinalize((_e, success) => {
      if (!success && dragStore.getState().active) endDrag(false);
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={hidden ? styles.hidden : null}>{children}</View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: 10, alignItems: 'flex-end' },
  slot: { alignItems: 'center', gap: 2 },
  index: { color: Colors.textMuted, fontSize: 10 },
  hidden: { opacity: 0 },
  empty: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.four },
  emptyText: { color: Colors.textMuted, fontSize: 12 },
});
