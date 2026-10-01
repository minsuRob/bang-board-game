/**
 * 테이블 가운데 이벤트 카드 위에 마우스를 올리면 그 이벤트의 설명을 띄운다.
 *
 * 캐릭터 카드 hover(CharacterHover)와 같은 자리(slot)를 쓴다. 지금 이벤트의 그림·이름·효과에
 * 더해 지나간 이벤트와 남은 장수를 보여 준다. 남은 이벤트의 순서는 숨긴다.
 * 자리가 없는 좁은 화면이면 카드 아래에 작은 말풍선으로 띄운다.
 *
 * 3D 카드는 포인터를 받지 않으므로 앵커가 준 카드의 화면 사각형에 투명한 RN 칸을 얹는다.
 * 폰에는 hover 가 없으니 웹에서만 그린다.
 */

import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { EVENTS } from '../../data/events';
import type { EventCardId } from '../../data/types';
import type { GameState } from '../../engine';
import { eventArt } from '../../ui/card-art';
import { eventProgress } from '../../ui/event-progress';
import { ANCHOR_EVENT, anchorsStore } from '../core/anchors-store';
import { previewStyles, type PreviewSlot } from './CharacterHover';
import { Colors, Radius, Spacing } from '@/constants/theme';

const TIP_W = 240;
/** 이벤트 스캔 비율 (260×389) */
const ART_RATIO = 260 / 389;
const ART_W = 92;

export function EventHover({
  view,
  hovered,
  onHoverChange,
  slot,
}: {
  view: GameState;
  hovered: boolean;
  onHoverChange: (on: boolean) => void;
  slot: PreviewSlot | null;
}) {
  const anchors = useStore(anchorsStore);
  const current = view.event?.current ?? null;
  if (Platform.OS !== 'web' || view.draft || !current || !view.event) return null;

  const r = anchors.points[ANCHOR_EVENT];
  if (!r || !r.visible || r.left === undefined || r.right === undefined) return null;
  const top = r.top ?? r.y;
  const bottom = r.bottom ?? r.y;
  const def = EVENTS[current];

  return (
    <>
      <Pressable
        onHoverIn={() => onHoverChange(true)}
        onHoverOut={() => onHoverChange(false)}
        accessibilityLabel={`${def.nameKo} 이벤트 보기`}
        style={[styles.hit, { left: r.left, top, width: r.right - r.left, height: bottom - top }]}
      />
      {hovered && slot && <EventPanel view={view} id={current} slot={slot} />}
      {hovered && !slot && (
        <View
          style={[
            previewStyles.tip,
            {
              left: Math.max(4, Math.min(anchors.width - TIP_W - 4, (r.left + r.right) / 2 - TIP_W / 2)),
              top: bottom + 6,
              width: TIP_W,
            },
          ]}
        >
          <Text style={previewStyles.tipName}>{def.nameKo}</Text>
          <Text style={previewStyles.tipAbility}>{def.text}</Text>
        </View>
      )}
    </>
  );
}

function EventPanel({ view, id, slot }: { view: GameState; id: EventCardId; slot: PreviewSlot }) {
  const def = EVENTS[id];
  const art = eventArt(id);
  const { past, remaining } = eventProgress(view.event!, view.config.expansions);
  return (
    <View
      style={[previewStyles.tip, previewStyles.panel, { left: slot.left, bottom: slot.bottom, width: slot.width }]}
    >
      <View style={previewStyles.panelTop}>
        {art ? (
          <Image source={art} style={styles.art} resizeMode="cover" />
        ) : (
          <View style={[styles.art, styles.artFallback]}>
            <Text style={styles.artFallbackText} numberOfLines={3}>
              {def.nameKo}
            </Text>
          </View>
        )}
        <View style={previewStyles.panelInfo}>
          <Text style={styles.kicker}>{def.isFinal ? '이벤트 · 마지막 카드' : '이벤트'}</Text>
          <Text style={previewStyles.panelName} numberOfLines={1}>
            {def.nameKo}
          </Text>
          <Text style={previewStyles.panelMeta}>{def.name}</Text>
          <Text style={[previewStyles.panelAbility, styles.effect]}>{def.text}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>지나간 이벤트 {past.length}</Text>
        {past.length === 0 ? (
          <Text style={previewStyles.panelMeta}>아직 없다</Text>
        ) : (
          <View style={styles.chips}>
            {past.map((p) => (
              <Text key={p} style={styles.chip}>
                {EVENTS[p].nameKo}
              </Text>
            ))}
          </View>
        )}
        <Text style={previewStyles.panelMeta}>
          {remaining > 0 ? `남은 이벤트 ${remaining}장 · 마지막은 하이 눈` : '남은 이벤트 없음 · 게임 끝까지 이어진다'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { position: 'absolute' },
  art: { width: ART_W, height: ART_W / ART_RATIO, borderRadius: Radius.sm },
  artFallback: {
    backgroundColor: Colors.paper,
    borderWidth: 2,
    borderColor: Colors.renegade,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  artFallbackText: { color: Colors.textOnPaper, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  kicker: { color: Colors.renegade, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  effect: { marginTop: 2 },
  section: {
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.one,
  },
  sectionTitle: { color: Colors.text, fontSize: 11, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: {
    color: Colors.paperEdge,
    fontSize: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
});
