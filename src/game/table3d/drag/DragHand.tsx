/**
 * 드래그로 내는 손패.
 *
 * 위로 8px 끌면 드래그가 시작되고 카드는 3D 로 넘어간다. 옆으로 먼저 끌면 스크롤이다.
 * 탭은 예전 흐름(Pressable) 그대로다.
 *
 * 덱에서 뽑은 카드는 덱 자리에서 이 줄로 날아와 꽂힌다. 다른 곳에서 온 카드는 3D 카드가 화면 아래로 빠진 뒤 솟아오른다 (HandArrival).
 */

import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { CardId } from '../../data/types';
import { clearPeek, setPeek } from '../../ui/card-peek';
import { CardView } from '../../ui/CardView';
import { HandArrival } from '../../ui/HandArrival';
import { useHandArrivals } from '../../ui/hand-arrival';
import { beginDrag, dragStore, endDrag, moveDrag } from '../core/drag-store';
import { themedStyles } from '../../ui/theme/use-theme';
import { Spacing } from '@/constants/theme';

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
  /** 손패 주인. 바뀌면 새 카드 등장을 건너뛴다 */
  owner?: string | null;
  /** 바뀌면 새 카드 표시를 지운다 (차례가 넘어갈 때) */
  resetKey?: string;
};

export function DragHand({
  cards,
  playable,
  discardable,
  selected,
  onSelect,
  onDragStart,
  onDrop,
  showIndex,
  owner,
  resetKey,
}: DragHandProps) {
  const styles = useStyles();
  const [dragging, setDragging] = useState<CardId | null>(null);
  const arrivals = useHandArrivals(cards, { waitFor3d: true, owner, resetKey });

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
        const phase = arrivals.phase(card);
        const usable = playable.has(card) || discardable.has(card);
        return (
          <DraggableCard
            key={card}
            card={card}
            usable={usable && phase !== 'waiting'}
            hidden={dragging === card}
            onDragStart={() => {
              setPeek(null);
              setDragging(card);
              onDragStart(card);
            }}
            onDrop={(x, y) => {
              setDragging(null);
              return onDrop(card, x, y);
            }}>
            <View style={styles.slot}>
              <HandArrival
                card={card}
                phase={phase}
                order={arrivals.order(card)}
                fromDeck={arrivals.fromDeck(card)}
                fresh={arrivals.fresh(card)}
                gap={Spacing.two}
                onSettled={() => arrivals.settled(card)}>
                <CardView
                  card={card}
                  size="md"
                  highlighted={usable}
                  disabled={!usable}
                  selected={selected === card}
                  onPress={() => {
                    arrivals.clearFresh(card);
                    onSelect(card);
                  }}
                  onHoverIn={() => {
                    arrivals.clearFresh(card);
                    setPeek(card);
                  }}
                  onHoverOut={() => clearPeek(card)}
                />
              </HandArrival>
              {showIndex && phase !== 'waiting' && <Text style={styles.index}>{(i + 1) % 10}</Text>}
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
  const styles = useStyles();
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

const useStyles = themedStyles((c) => ({
  row: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: 10, alignItems: 'flex-end' },
  slot: { alignItems: 'center', gap: 2 },
  index: { color: c.textMuted, fontSize: 10 },
  hidden: { opacity: 0 },
  empty: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.four },
  emptyText: { color: c.textMuted, fontSize: 12 },
}));
