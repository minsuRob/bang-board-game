import { useRouter } from 'expo-router';
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
import { CardFxPreview } from '@/game/ui/PlayedCardSpotlight';
import { Colors, Radius, Spacing } from '@/constants/theme';

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
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="돌아가기" onPress={back} hitSlop={8}>
            <Text style={styles.back}>← 돌아가기</Text>
          </Pressable>
          <Text style={styles.heading}>카드 도감</Text>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="이름으로 찾기 (한글·원어)"
          placeholderTextColor={Colors.textMuted}
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

        {sections.length === 0 && <Text style={styles.empty}>찾는 카드가 없다.</Text>}

        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {section.title} <Text style={styles.count}>{section.items.length}</Text>
            </Text>
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
          </View>
        ))}
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
  root: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: Spacing.two },
  back: { color: Colors.textMuted, fontSize: 13 },
  heading: { color: Colors.text, fontSize: 24, fontWeight: '900' },
  search: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    color: Colors.text,
    fontSize: 15,
  },
  segment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 4,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    alignSelf: 'flex-start',
  },
  tab: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.md },
  tabActive: { backgroundColor: Colors.cardBrown, boxShadow: `inset 0 0 0 1px ${Colors.highlight}` },
  tabText: { color: Colors.textMuted, fontSize: 14, fontWeight: '800' },
  tabTextActive: { color: Colors.paper },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  empty: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: Spacing.five },
  section: { gap: Spacing.two },
  sectionTitle: { color: Colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  count: { color: Colors.highlight },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { borderRadius: Radius.md },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  fxLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, pointerEvents: 'box-none' },
});
