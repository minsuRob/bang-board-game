import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { isFirebaseConfigured } from '@/firebase/config';
import { characterArt, playingCardArt, type ArtCrop } from '@/game/ui/card-art';
import { CharacterPortraitImage } from '@/game/ui/CharacterPortraitImage';
import { codexCounts } from '@/game/ui/codex/codex-model';
import { FullscreenButton } from '@/game/ui/FullscreenButton';
import { AccountBadge } from '@/game/ui/menu/AccountBadge';
import { MenuBackdrop } from '@/game/ui/menu/MenuBackdrop';
import { CroppedArt, MenuCard, type MenuCardProps } from '@/game/ui/menu/MenuCard';
import { WesternFonts } from '@/game/ui/menu/western-fonts';
import { SettingsSheet, useSettingsSummary } from '@/game/ui/settings/SettingsSheet';
import { themedStyles, useColors } from '@/game/ui/theme/use-theme';
import { Spacing } from '@/constants/theme';

const CODEX = codexCounts();

/** 플레잉 카드 스캔(250×389)에서 그림만 있는 칸. 위 제목과 아래 기호 줄을 뺀다 */
const PLAYING_ART: ArtCrop = { x: 36 / 250, y: 92 / 389, w: 178 / 250, h: 180 / 389 };

/** 이 폭부터 카드를 손패처럼 부채꼴로 편다. 좁으면 2×2 로 놓는다 */
const FAN_MIN_WIDTH = 640;
const FAN_TILT = [-13, -4, 6, 14];
const FAN_DROP = [18, -6, 2, 22];
const GRID_TILT = [-3, 2, -2, 3];

/** 카드 앞면은 늘 종이라 테마와 상관없이 잉크로 그린다 */
const CARD_INK = '#2b1d10';

// 설정 카드 그림: 톱니바퀴
const GEAR_TEETH = Array.from({ length: 10 }, (_, i) => {
  const t = (i / 10) * Math.PI * 2;
  const p = (r: number) => `${(50 + Math.cos(t) * r).toFixed(1)} ${(50 + Math.sin(t) * r).toFixed(1)}`;
  return `M${p(27)}L${p(40)}`;
}).join(' ');

function GearArt() {
  return (
    <Svg width="62%" height="62%" viewBox="0 0 100 100">
      <Path d={GEAR_TEETH} stroke={CARD_INK} strokeWidth={11} strokeLinecap="round" opacity={0.85} />
      <Circle cx={50} cy={50} r={26} stroke={CARD_INK} strokeWidth={9} fill="none" opacity={0.85} />
      <Circle cx={50} cy={50} r={8} fill="#b3261e" />
    </Svg>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const online = isFirebaseConfigured();
  const [code, setCode] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const summary = useSettingsSummary();
  const styles = useStyles();
  const c = useColors();
  const { width } = useWindowDimensions();

  const fan = width >= FAN_MIN_WIDTH;
  const cardW = fan
    ? Math.round(Math.min(190, Math.max(130, (width - 48) / 3.5)))
    : Math.round(Math.min(170, (width - Spacing.three * 2 - Spacing.three) / 2));
  const k = cardW / 190;

  const bang = playingCardArt('bang');
  const saloon = playingCardArt('saloon');
  const bart = characterArt('bartCassidy');

  const ai: MenuCardProps = {
    width: cardW,
    title: 'AI와 대전',
    desc: '4~7인 · 난이도 상중하\n하이 눈 확장',
    corner: 'A♠',
    primary: true,
    art: bang ? <CroppedArt source={bang} crop={PLAYING_ART} /> : undefined,
    onPress: () => router.push('/local'),
  };
  const room: MenuCardProps = online
    ? {
        width: cardW,
        title: '방 만들기',
        desc: '코드를 친구에게\n알려 주면 들어온다',
        corner: 'K♥',
        red: true,
        art: saloon ? <CroppedArt source={saloon} crop={PLAYING_ART} /> : undefined,
        onPress: () => router.push({ pathname: '/room/[id]', params: { id: 'new' } }),
      }
    : {
        width: cardW,
        title: '온라인 대전',
        desc: 'Firebase 설정을\n채우면 열린다',
        corner: 'K♥',
        red: true,
        disabled: true,
        art: saloon ? <CroppedArt source={saloon} crop={PLAYING_ART} /> : undefined,
      };
  const codex: MenuCardProps = {
    width: cardW,
    title: '카드 도감',
    desc: `카드 ${CODEX.cards} · 캐릭터 ${CODEX.characters}\n이벤트 ${CODEX.events} · 규칙 메모`,
    corner: 'Q♦',
    red: true,
    art: bart ? <CharacterPortraitImage id="bartCassidy" /> : undefined,
    onPress: () => router.push('/cards'),
  };
  const settings: MenuCardProps = {
    width: cardW,
    title: '설정',
    desc: `${summary}\n화질과 낮·밤 화면`,
    corner: 'J♣',
    art: <GearArt />,
    onPress: () => setSettingsOpen(true),
  };

  // 부채꼴은 가운데에 AI 카드가 오게, 2×2 는 AI 카드가 먼저 오게 놓는다
  const cards = fan ? [room, ai, codex, settings] : [ai, room, codex, settings];
  const titleSize = Math.min(96, width * 0.2);

  return (
    <View style={styles.screen}>
      <MenuBackdrop />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text
            style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.1 }]}
            accessibilityRole="header">
            BANG<Text style={styles.bang}>!</Text>
          </Text>
          <Text style={styles.subtitle}>보안관과 무법자, 그리고 숨어 있는 배신자</Text>
        </View>

        <View
          style={
            fan
              ? [styles.fan, { height: cardW * 1.52 + 60 * k }]
              : [styles.grid, { width: cardW * 2 + Spacing.three }]
          }>
          {cards.map((c, i) => (
            <View
              key={c.title}
              style={[fan ? { marginHorizontal: -cardW * 0.07, zIndex: c.primary ? 2 : 1 } : null]}>
              <MenuCard
                {...c}
                tilt={fan ? FAN_TILT[i] : GRID_TILT[i]}
                drop={fan ? FAN_DROP[i] * k : 0}
              />
            </View>
          ))}
        </View>

        {online && (
          <View style={styles.joinRow}>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase().slice(0, 6))}
              placeholder="방 코드로 참가"
              placeholderTextColor={c.textMuted}
              autoCapitalize="characters"
              style={styles.input}
              accessibilityLabel="방 코드"
            />
            <Pressable
              style={[styles.chip, code.length < 4 && styles.chipDisabled]}
              disabled={code.length < 4}
              accessibilityRole="button"
              accessibilityLabel="참가"
              onPress={() => router.push({ pathname: '/room/[id]', params: { id: code } })}>
              <View style={styles.chipInner}>
                <Text style={styles.chipText}>참가</Text>
              </View>
            </Pressable>
          </View>
        )}

        <View style={styles.notes}>
          <Text style={styles.note}>카드를 누르면 낸다. 지목이 필요한 카드는 한 번 더 눌러 상대를 고른다.</Text>
          <Text style={styles.note}>Q 차례 마치기 · W 반응하지 않음 · 1~0 손패 고르기 · Esc 취소</Text>
        </View>
      </ScrollView>

      {/* 흐름 밖에 띄운다. 첫 화면에서는 늘 오른쪽 위다. 계정 배지는 왼쪽 위. */}
      <AccountBadge style={styles.account} onPress={() => setSettingsOpen(true)} />
      <FullscreenButton style={styles.fullscreen} />
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.background },
  fullscreen: { position: 'absolute', top: Spacing.two, right: Spacing.two },
  account: { position: 'absolute', top: Spacing.two, left: Spacing.two },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    gap: Spacing.three,
  },
  hero: { alignItems: 'center', gap: Spacing.one },
  // 하늘 수채 위에 잉크로 찍는다. 바탕색 번짐을 둘러 구름 위에서도 읽히게 한다 (다크는 밤빛 위 밝은 글자)
  title: {
    color: c.heading,
    fontWeight: '900',
    letterSpacing: 3,
    fontFamily: WesternFonts.title,
    textShadowColor: c.veil,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  bang: { color: c.accent },
  subtitle: {
    color: c.textMuted,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: WesternFonts.body,
    textShadowColor: c.veil,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  fan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, justifyContent: 'center' },
  joinRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  input: {
    width: 240,
    backgroundColor: c.field,
    borderWidth: 1.5,
    borderColor: c.chipBorder,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
    color: c.text,
    fontSize: 18,
    letterSpacing: 6,
    fontFamily: WesternFonts.type,
  },
  chip: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#b3261e',
    borderWidth: 5,
    borderStyle: 'dashed',
    borderColor: '#f1e3c3',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 0 #5e140f, 0 8px 14px rgba(0,0,0,0.5)',
  },
  chipDisabled: { opacity: 0.45 },
  chipInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.6)',
  },
  chipText: { color: '#fff', fontSize: 14, fontWeight: '900', fontFamily: WesternFonts.label },
  notes: { gap: 4, maxWidth: 460, alignItems: 'center' },
  note: {
    color: c.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    textShadowColor: c.veil,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
}));
