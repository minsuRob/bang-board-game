import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import type { CardKind } from '@/game/data/types';
import { Chip } from '@/game/ui/Chip';
import { CARD_DIMENSIONS } from '@/game/ui/CardView';
import { CodexDetail } from '@/game/ui/codex/CodexDetail';
import { CodexFace } from '@/game/ui/codex/CodexFaces';
import {
  CODEX_TABS,
  codexSections,
  sampleCardId,
  setLabel,
  setsIn,
  type CodexItem,
  type CodexSet,
  type CodexTab,
} from '@/game/ui/codex/codex-model';
import { CARD_FX } from '@/game/ui/fx/card-fx';
import { MenuBackdrop } from '@/game/ui/menu/MenuBackdrop';
import { InkLink, PaperHeading, PaperInk, PaperSection, PaperSheet, paperText } from '@/game/ui/menu/PaperUi';
import { WesternFonts } from '@/game/ui/menu/western-fonts';
import { CardFxPreview } from '@/game/ui/PlayedCardSpotlight';
import { Spacing } from '@/constants/theme';

/** 이 폭보다 좁으면 격자 카드를 한 단계 작게 */
const NARROW = 520;

export default function CardCodexScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const tileW = width < NARROW ? CARD_DIMENSIONS.md.width : CARD_DIMENSIONS.lg.width;

  const [tab, setTab] = useState<CodexTab>('cards');
  const [set, setSet] = useState<CodexSet | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CodexItem | null>(null);
  // 연출 미리보기: 누를 때마다 1씩 올려 다시 터뜨린다. 0 이면 쉰다
  const [fxRun, setFxRun] = useState(0);
  const [playing, setPlaying] = useState(false);

  const sets = useMemo(() => setsIn(tab), [tab]);
  const sections = useMemo(() => codexSections(tab, { set, query }), [tab, set, query]);

  const fxCard =
    selected?.tab === 'cards' && CARD_FX[selected.id as CardKind] ? sampleCardId(selected.id as CardKind) : null;

  const pickTab = (t: CodexTab) => {
    setTab(t);
    setSet('all');
  };
  const open = (item: CodexItem) => {
    setSelected(item);
    setFxRun(0);
    setPlaying(false);
  };
  const close = () => {
    setSelected(null);
    setPlaying(false);
  };
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <MenuBackdrop veil={0.6} />
      <ScrollView contentContainerStyle={styles.container}>
        <PaperSheet>
          <View style={styles.header}>
            <View style={styles.backLink}>
              <InkLink label="← 돌아가기" onPress={back} />
            </View>
            <PaperHeading eyebrow="CARD CATALOG" title="카드 도감" />
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="이름으로 찾기 (한글·원어)"
            placeholderTextColor={PaperInk.inkMuted}
            style={styles.search}
            accessibilityLabel="이름으로 찾기"
            autoCorrect={false}
          />

          <View style={styles.segment} accessibilityRole="tablist">
            {CODEX_TABS.map((t) => (
              <Pressable
                key={t.tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t.tab }}
                onPress={() => pickTab(t.tab)}
                style={[styles.tab, tab === t.tab && styles.tabActive]}>
                <Text style={[styles.tabText, tab === t.tab && styles.tabTextActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          {sets.length > 1 && (
            <View style={styles.row}>
              <Chip label="전체" active={set === 'all'} onPress={() => setSet('all')} />
              {sets.map((s) => (
                <Chip key={s} label={setLabel(s)} active={set === s} onPress={() => setSet(s)} />
              ))}
            </View>
          )}

          {sections.length === 0 && <Text style={[paperText.hint, styles.empty]}>찾는 카드가 없다.</Text>}

          {sections.map((section) => (
            <PaperSection key={section.key} title={`${section.title} · ${section.items.length}`}>
              <View style={styles.grid}>
                {section.items.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={item.nameKo}
                    onPress={() => open(item)}
                    style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
                    <CodexFace item={item} width={tileW} />
                  </Pressable>
                ))}
              </View>
            </PaperSection>
          ))}
        </PaperSheet>
      </ScrollView>

      {selected && (
        <CodexDetail
          key={`${selected.tab}:${selected.id}`}
          item={selected}
          hidden={playing}
          onPlayFx={() => {
            setFxRun((r) => r + 1);
            setPlaying(true);
          }}
          onClose={close}
        />
      )}

      {/* 연출은 상세 창보다 앞에 뜬다. 캔버스는 이 화면에 하나뿐이다 */}
      {fxCard && (
        <View style={styles.fxLayer}>
          <CardFxPreview key={fxCard} card={fxCard} run={fxRun} onDone={() => setPlaying(false)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PaperInk.paper },
  container: {
    flexGrow: 1,
    padding: Spacing.three,
    paddingVertical: Spacing.four,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: Spacing.two },
  backLink: { alignSelf: 'flex-start' },
  search: {
    backgroundColor: 'rgba(251,246,234,0.8)',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(43,29,16,0.45)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    color: PaperInk.ink,
    fontSize: 15,
    fontFamily: WesternFonts.body,
  },
  // 잉크로 테두리를 두른 한 줄 칸. 고른 칸만 잉크로 찬다
  segment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: PaperInk.ink,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tab: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  tabActive: { backgroundColor: PaperInk.ink },
  tabText: { color: PaperInk.ink, fontSize: 15, fontWeight: '900', fontFamily: WesternFonts.label },
  tabTextActive: { color: PaperInk.sheet },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  empty: { textAlign: 'center', paddingVertical: Spacing.five },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { borderRadius: 8, boxShadow: '0 4px 10px rgba(60,40,20,0.18)' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  fxLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, pointerEvents: 'box-none' },
});
