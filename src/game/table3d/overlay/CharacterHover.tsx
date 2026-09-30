/**
 * 보드의 캐릭터 카드 위에 마우스를 올리면 그 캐릭터의 능력 설명을 띄운다.
 *
 * 넓은 화면이면 내 보드 왼쪽 옆 자리(slot)에 카드 그림과 설명을 크게 띄우고,
 * 그 자리가 없으면 카드 옆에 작은 말풍선으로 띄운다.
 *
 * 3D 카드 자체는 포인터를 받지 않으므로, 앵커가 준 카드의 화면 사각형에
 * 투명한 RN 칸을 얹어 hover 를 받는다. 폰에는 hover 가 없고 투명 칸이
 * 탭을 가로채면 안 되므로 웹에서만 그린다.
 */

import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { CARD_DEFS } from '../../data/cards.base';
import { CHARACTERS } from '../../data/characters';
import { ROLE_LABEL } from '../../data/roles';
import { kindOf, type GameState, type Player, type PlayerId } from '../../engine';
import { CharacterCard } from '../../ui/CharacterCard';
import { anchorsStore, characterKey } from '../core/anchors-store';
import { ROLE_COLOR, safeDistance } from './SeatLabel';
import { Colors, Radius, Spacing } from '@/constants/theme';

const TIP_W = 240;

/** 미리보기 패널이 놓일 자리. 왼쪽·아랫변 기준 */
export type PreviewSlot = { left: number; bottom: number; width: number };

export function CharacterHover({
  view,
  viewer,
  onSeatPress,
  slot,
  hovered,
  onHoverChange,
}: {
  view: GameState;
  viewer: PlayerId;
  onSeatPress: (pid: PlayerId) => void;
  slot: PreviewSlot | null;
  /** 이벤트 카드 hover 와 같은 자리를 나눠 쓰므로 hover 상태는 부모가 쥔다 */
  hovered: PlayerId | null;
  onHoverChange: (pid: PlayerId, on: boolean) => void;
}) {
  const anchors = useStore(anchorsStore);

  // 드래프트 중에는 캐릭터가 아직 정해지지 않았다
  if (Platform.OS !== 'web' || view.draft) return null;

  const tipFor = view.players.find((p) => p.id === hovered) ?? null;
  const tipIndex = tipFor ? view.players.indexOf(tipFor) : -1;
  const tipRect = tipIndex >= 0 ? anchors.points[characterKey(tipIndex)] : null;

  return (
    <>
      {view.players.map((player, i) => {
        // 내 카드는 옆 자리가 있을 때만 (내 정보창이 하단 바로 가서 능력을 볼 곳이 여기뿐이다)
        if (player.id === viewer && !slot) return null;
        const r = anchors.points[characterKey(i)];
        if (!r || !r.visible || r.left === undefined || r.right === undefined) return null;
        const top = r.top ?? r.y;
        const bottom = r.bottom ?? r.y;
        return (
          <Pressable
            key={player.id}
            onHoverIn={() => onHoverChange(player.id, true)}
            onHoverOut={() => onHoverChange(player.id, false)}
            // 보드를 눌러 대상을 고르던 동작을 막지 않는다
            onPress={() => onSeatPress(player.id)}
            accessibilityLabel={`${CHARACTERS[player.character].nameKo} 능력 보기`}
            style={[previewStyles.hit, { left: r.left, top, width: r.right - r.left, height: bottom - top }]}
          />
        );
      })}

      {tipFor && slot && <PreviewPanel view={view} viewer={viewer} player={tipFor} slot={slot} />}

      {tipFor && !slot && tipRect && tipRect.left !== undefined && tipRect.right !== undefined && (
        <Tooltip
          name={CHARACTERS[tipFor.character].nameKo}
          ability={CHARACTERS[tipFor.character].ability}
          hp={tipFor.maxHp}
          cx={(tipRect.left + tipRect.right) / 2}
          top={tipRect.top ?? tipRect.y}
          bottom={tipRect.bottom ?? tipRect.y}
          width={anchors.width}
          height={anchors.height}
        />
      )}
    </>
  );
}

function PreviewPanel({
  view,
  viewer,
  player,
  slot,
}: {
  view: GameState;
  viewer: PlayerId;
  player: Player;
  slot: PreviewSlot;
}) {
  const isSelf = player.id === viewer;
  const dead = !player.alive && !player.ghost;
  const character = CHARACTERS[player.character];
  const hp = Math.max(0, player.hp);
  const dist = !isSelf && !dead ? safeDistance(view, viewer, player.id) : null;
  return (
    <View style={[previewStyles.tip, previewStyles.panel, { left: slot.left, bottom: slot.bottom, width: slot.width }]}>
      <View style={previewStyles.panelTop}>
        <CharacterCard id={player.character} compact />
        <View style={previewStyles.panelInfo}>
          <View style={previewStyles.tipHead}>
            <Text style={previewStyles.panelName} numberOfLines={1}>
              {isSelf ? '나' : player.name}
            </Text>
            {(player.roleRevealed || isSelf) && (
              <Text style={[previewStyles.panelRole, { color: ROLE_COLOR[player.role] }]}>{ROLE_LABEL[player.role]}</Text>
            )}
          </View>
          <Text style={previewStyles.panelCharacter}>
            {character.nameKo}
            {player.ghost ? ' · 유령' : dead ? ' · 제거됨' : ''}
          </Text>
          <Text style={previewStyles.panelHp}>
            {'●'.repeat(hp)}
            <Text style={previewStyles.hpEmpty}>{'○'.repeat(Math.max(0, player.maxHp - hp))}</Text>
            <Text style={previewStyles.panelHpNumber}>
              {'  '}
              {hp}/{player.maxHp}
            </Text>
          </Text>
          {!isSelf && (
            <Text style={previewStyles.panelMeta}>
              손패 {player.hand.length}
              {dist !== null ? ` · 거리 ${dist}` : ''}
            </Text>
          )}
          {player.equipment.length > 0 && (
            <Text style={previewStyles.panelEquipment}>
              {player.equipment.map((c) => CARD_DEFS[kindOf(c)].nameKo).join(' · ')}
            </Text>
          )}
        </View>
      </View>
      <Text style={previewStyles.panelAbility}>{character.ability}</Text>
    </View>
  );
}

function Tooltip({
  name,
  ability,
  hp,
  cx,
  top,
  bottom,
  width,
  height,
}: {
  name: string;
  ability: string;
  hp: number;
  cx: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}) {
  const left = Math.max(4, Math.min(width - TIP_W - 4, cx - TIP_W / 2));
  // 화면 위쪽 카드는 아래로, 아래쪽 카드는 위로 띄운다
  const place = (top + bottom) / 2 < height * 0.5 ? { top: bottom + 6 } : { bottom: height - top + 6 };
  return (
    <View style={[previewStyles.tip, { left, width: TIP_W }, place]}>
      <View style={previewStyles.tipHead}>
        <Text style={previewStyles.tipName}>{name}</Text>
        <Text style={previewStyles.tipHp}>{'●'.repeat(hp)}</Text>
      </View>
      <Text style={previewStyles.tipAbility}>{ability}</Text>
    </View>
  );
}

/** 이벤트 hover 패널도 같은 모양을 쓴다 */
export const previewStyles = StyleSheet.create({
  hit: { position: 'absolute' },
  tip: {
    position: 'absolute',
    pointerEvents: 'none',
    backgroundColor: 'rgba(22, 14, 7, 0.95)',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.highlight,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    gap: 2,
    boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
  },
  tipHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.one },
  tipName: { color: Colors.text, fontSize: 13, fontWeight: '800' },
  tipHp: { color: Colors.hp, fontSize: 10, letterSpacing: 1 },
  tipAbility: { color: Colors.text, fontSize: 11, lineHeight: 15 },
  panel: { padding: Spacing.two, gap: Spacing.two, borderRadius: Radius.lg, borderWidth: 2 },
  panelTop: { flexDirection: 'row', gap: Spacing.two },
  panelInfo: { flex: 1, minWidth: 0, gap: 3 },
  panelName: { color: Colors.text, fontSize: 16, fontWeight: '900', flexShrink: 1 },
  panelRole: { fontSize: 11, fontWeight: '800' },
  panelCharacter: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  panelHp: { color: Colors.hp, fontSize: 13, letterSpacing: 1 },
  hpEmpty: { color: Colors.border },
  panelHpNumber: { color: Colors.text, fontSize: 12, fontWeight: '800', letterSpacing: 0 },
  panelMeta: { color: Colors.textMuted, fontSize: 11 },
  panelEquipment: { color: Colors.deputy, fontSize: 11 },
  panelAbility: { color: Colors.text, fontSize: 12, lineHeight: 17 },
});
