/**
 * 테이블 앞에 놓인 장착 카드(파랑 카드)를 살펴본다.
 *
 * 마우스를 올리면(폰은 탭) detailPeek 에 그 카드를 올린다. 진행 기록의 카드 이름도 같은 스토어를 쓴다.
 * 넓은 화면이면 캐릭터 설명과 같은 자리(slot, 내 보드 왼쪽 옆)에 CardPreviewPanel 로 띄우고,
 * 그 자리가 없으면 화면 왼쪽 아래(LogCardPeek)에 뜬다.
 *
 * 3D 카드는 포인터를 받지 않으므로 앵커가 준 카드의 화면 사각형에 투명한 RN 칸을 얹는다.
 * 지금 고른 카드로 겨눌 수 있는 사람의 장착 카드를 누르면 그 사람을 겨눈다 (보드를 누르던 동작을 막지 않는다).
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';
import { useT } from '@/i18n/use-t';

import { CHARACTERS } from '../../data/characters';
import type { CardId } from '../../data/types';
import { defOf, type GameState, type PlayerId } from '../../engine';
import { CAN_HOVER, clearDetailPeek, setDetailPeek } from '../../ui/card-peek';
import { CardView } from '../../ui/CardView';
import { anchorsStore, equipmentKey } from '../core/anchors-store';
import { themedStyles } from '../../ui/theme/use-theme';
import { usePreviewStyles, type PreviewSlot } from './CharacterHover';
import { useNames } from '@/i18n/use-names';

export function EquipmentHover({
  view,
  targets,
  onSeatPress,
}: {
  view: GameState;
  /** 지금 고른 카드로 겨눌 수 있는 상대 */
  targets: PlayerId[];
  onSeatPress: (pid: PlayerId) => void;
}) {
  const anchors = useStore(anchorsStore);
  const t = useT().infra.table3d;
  const names = useNames();
  if (view.draft) return null;

  return (
    <>
      {view.players.flatMap((player) =>
        player.equipment.map((card) => {
          const r = anchors.points[equipmentKey(card)];
          if (!r || !r.visible || r.left === undefined || r.right === undefined) return null;
          const top = r.top ?? r.y;
          const bottom = r.bottom ?? r.y;
          return (
            <Pressable
              key={card}
              {...(CAN_HOVER
                ? { onHoverIn: () => setDetailPeek(card), onHoverOut: () => clearDetailPeek(card) }
                : {})}
              onPress={() => {
                if (targets.includes(player.id)) {
                  onSeatPress(player.id);
                  return;
                }
                if (!CAN_HOVER) setDetailPeek(card);
              }}
              accessibilityLabel={t.cardViewA11y(names.cardName(defOf(card).kind))}
              style={[styles.hit, { left: r.left, top, width: r.right - r.left, height: bottom - top }]}
            />
          );
        }),
      )}
    </>
  );
}

/** 캐릭터 설명 자리에 띄우는 카드 상세. 누구 앞에 놓였는지도 적는다 */
export function CardPreviewPanel({ view, viewer, card, slot }: { view: GameState; viewer: PlayerId; card: CardId; slot: PreviewSlot }) {
  const previewStyles = usePreviewStyles();
  const t = useT().infra.table3d;
  const names = useNames();
  const themed = useThemed();
  const def = defOf(card);
  const owner = view.players.find((p) => p.equipment.includes(card)) ?? null;
  const kicker =
    def.category === 'blue'
      ? def.weaponRange !== undefined
        ? t.kickerBlueWeapon(def.weaponRange)
        : t.kickerBlueEquip
      : t.kickerBrown;
  return (
    <View style={[previewStyles.tip, previewStyles.panel, { left: slot.left, bottom: slot.bottom, width: slot.width }]}>
      <View style={previewStyles.panelTop}>
        <CardView card={card} size="md" />
        <View style={previewStyles.panelInfo}>
          <Text style={[themed.kicker, def.category === 'blue' && themed.kickerBlue]}>{kicker}</Text>
          <Text style={previewStyles.panelName} numberOfLines={1}>
            {names.cardName(def.kind)}
          </Text>
          <Text style={previewStyles.panelMeta}>{def.name}</Text>
          {owner && (
            <Text style={previewStyles.panelMeta}>
              {owner.id === viewer ? t.onMine : t.onOther(CHARACTERS[owner.character] ? names.charName(owner.character) : owner.name)}
            </Text>
          )}
        </View>
      </View>
      <Text style={previewStyles.panelAbility}>{names.cardText(def.kind)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { position: 'absolute' },
});

const useThemed = themedStyles((c) => ({
  kicker: { color: c.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  kickerBlue: { color: c.blueName },
}));
