/**
 * 보드의 캐릭터 카드 위에 마우스를 올리면 그 캐릭터의 능력 설명을 띄운다.
 *
 * 넓은 화면이면 내 보드 왼쪽 옆 자리(slot)에 카드 그림과 설명을 크게 띄우고,
 * 그 자리가 없으면 카드 옆에 작은 말풍선으로 띄운다.
 *
 * 3D 카드 자체는 포인터를 받지 않으므로, 앵커가 준 카드의 화면 사각형에
 * 투명한 RN 칸을 얹어 hover 를 받는다.
 *
 * 폰에는 hover 가 없다. 그래서 칸을 탭하면 (카드로 겨눌 수 있는 상대가 아닐 때)
 * 카드 그림과 상세 설명을 가운데에 띄운다. 겨눌 수 있는 상대를 탭하면 그대로 카드가 나간다.
 */

import { Pressable, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { CHARACTERS } from '../../data/characters';
import type { GameState, Player, PlayerId } from '../../engine';
import { CharacterDetail } from '../../ui/CharacterDetail';
import { WesternFonts } from '../../ui/menu/western-fonts';
import { themedStyles } from '../../ui/theme/use-theme';
import { anchorsStore, characterKey } from '../core/anchors-store';
import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { HpPips } from '../../ui/HpPips';

const TIP_W = 240;

/** 미리보기 패널이 놓일 자리. 왼쪽·아랫변 기준 */
export type PreviewSlot = { left: number; bottom: number; width: number };

export function CharacterHover({
  view,
  viewer,
  targets,
  onSeatPress,
  onDetail,
  slot,
  hovered,
  onHoverChange,
}: {
  view: GameState;
  viewer: PlayerId;
  /** 지금 고른 카드로 겨눌 수 있는 상대 */
  targets: PlayerId[];
  onSeatPress: (pid: PlayerId) => void;
  /** 탭으로 상세 설명을 열어 달라는 요청 */
  onDetail: (pid: PlayerId) => void;
  slot: PreviewSlot | null;
  /** 이벤트 카드 hover 와 같은 자리를 나눠 쓰므로 hover 상태는 부모가 쥔다 */
  hovered: PlayerId | null;
  onHoverChange: (pid: PlayerId, on: boolean) => void;
}) {
  const previewStyles = usePreviewStyles();
  const anchors = useStore(anchorsStore);

  // 드래프트 중에는 캐릭터가 아직 정해지지 않았다
  if (view.draft) return null;

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
            onPress={() => {
              // 보드를 눌러 대상을 고르던 동작을 막지 않는다
              if (targets.includes(player.id)) {
                onSeatPress(player.id);
                return;
              }
              // 마우스로 이미 미리보기 자리에 떠 있으면 또 띄우지 않는다
              if (!(slot && hovered === player.id)) onDetail(player.id);
            }}
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
  const previewStyles = usePreviewStyles();
  return (
    <View style={[previewStyles.tip, previewStyles.panel, { left: slot.left, bottom: slot.bottom, width: slot.width }]}>
      <CharacterDetail view={view} viewer={viewer} player={player} />
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
  const previewStyles = usePreviewStyles();
  const left = Math.max(4, Math.min(width - TIP_W - 4, cx - TIP_W / 2));
  // 화면 위쪽 카드는 아래로, 아래쪽 카드는 위로 띄운다
  const place = (top + bottom) / 2 < height * 0.5 ? { top: bottom + 6 } : { bottom: height - top + 6 };
  return (
    <View style={[previewStyles.tip, { left, width: TIP_W }, place]}>
      <View style={previewStyles.tipHead}>
        <Text style={previewStyles.tipName}>{name}</Text>
        <HpPips hp={hp} maxHp={hp} style={previewStyles.tipHp} />
      </View>
      <Text style={previewStyles.tipAbility}>{ability}</Text>
    </View>
  );
}

/** hover 말풍선·패널 모양. 판 위에 얹는 패널이라 테마의 panel 색을 쓴다 */
function previewSheet(c: ThemeColors) {
  return {
    hit: { position: 'absolute' },
    tip: {
      position: 'absolute',
      pointerEvents: 'none',
      backgroundColor: c.panel,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: c.panelBorder,
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.one,
      gap: 2,
      boxShadow: `0 4px 14px ${c.shadow}`,
    },
    tipHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.one },
    tipName: { color: c.heading, fontSize: 13, fontWeight: '800', fontFamily: WesternFonts.label },
    tipHp: { color: c.hp, fontSize: 10, letterSpacing: 1 },
    tipAbility: { color: c.text, fontSize: 11, lineHeight: 15, fontFamily: WesternFonts.body },
    panel: { padding: Spacing.two, gap: Spacing.two },
    panelTop: { flexDirection: 'row', gap: Spacing.two },
    panelInfo: { flex: 1, minWidth: 0, gap: 3 },
    panelName: { color: c.heading, fontSize: 16, fontWeight: '900', flexShrink: 1, fontFamily: WesternFonts.label },
    panelMeta: { color: c.textMuted, fontSize: 11 },
    panelAbility: { color: c.text, fontSize: 12, lineHeight: 17, fontFamily: WesternFonts.body },
  } as const;
}

/** 이벤트·카드 hover 패널도 같은 모양을 쓴다 */
export const usePreviewStyles = themedStyles(previewSheet);
