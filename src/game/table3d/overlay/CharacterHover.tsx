/**
 * 상대 보드의 캐릭터 카드 위에 마우스를 올리면 그 캐릭터의 능력 설명을 띄운다.
 *
 * 3D 카드 자체는 포인터를 받지 않으므로, 앵커가 준 카드의 화면 사각형에
 * 투명한 RN 칸을 얹어 hover 를 받는다. 폰에는 hover 가 없고 투명 칸이
 * 탭을 가로채면 안 되므로 웹에서만 그린다.
 */

import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { CHARACTERS } from '../../data/characters';
import type { GameState, PlayerId } from '../../engine';
import { anchorsStore, characterKey } from '../core/anchors-store';
import { Colors, Radius, Spacing } from '@/constants/theme';

const TIP_W = 240;

export function CharacterHover({
  view,
  viewer,
  onSeatPress,
}: {
  view: GameState;
  viewer: PlayerId;
  onSeatPress: (pid: PlayerId) => void;
}) {
  const anchors = useStore(anchorsStore);
  const [hovered, setHovered] = useState<PlayerId | null>(null);

  // 드래프트 중에는 캐릭터가 아직 정해지지 않았다
  if (Platform.OS !== 'web' || view.draft) return null;

  const tipFor = view.players.find((p) => p.id === hovered) ?? null;
  const tipIndex = tipFor ? view.players.indexOf(tipFor) : -1;
  const tipRect = tipIndex >= 0 ? anchors.points[characterKey(tipIndex)] : null;

  return (
    <>
      {view.players.map((player, i) => {
        if (player.id === viewer) return null;
        const r = anchors.points[characterKey(i)];
        if (!r || !r.visible || r.left === undefined || r.right === undefined) return null;
        const top = r.top ?? r.y;
        const bottom = r.bottom ?? r.y;
        return (
          <Pressable
            key={player.id}
            onHoverIn={() => setHovered(player.id)}
            onHoverOut={() => setHovered((h) => (h === player.id ? null : h))}
            // 보드를 눌러 대상을 고르던 동작을 막지 않는다
            onPress={() => onSeatPress(player.id)}
            accessibilityLabel={`${CHARACTERS[player.character].nameKo} 능력 보기`}
            style={[styles.hit, { left: r.left, top, width: r.right - r.left, height: bottom - top }]}
          />
        );
      })}

      {tipFor && tipRect && tipRect.left !== undefined && tipRect.right !== undefined && (
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
    <View style={[styles.tip, { left, width: TIP_W }, place]}>
      <View style={styles.tipHead}>
        <Text style={styles.tipName}>{name}</Text>
        <Text style={styles.tipHp}>{'●'.repeat(hp)}</Text>
      </View>
      <Text style={styles.tipAbility}>{ability}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
