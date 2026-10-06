/**
 * 저장한 판 목록. 판 설정 화면 맨 위에 뜬다 (저장본이 없으면 아무것도 그리지 않는다).
 *
 * 화면에 돌아올 때마다 다시 읽는다. 게임에서 저장하고 뒤로 오면 곧장 보인다.
 * 지우기는 되돌릴 수 없으므로 한 번 더 눌러야 지운다.
 */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { getSaveBackend, saveSummary, savedAtLabel, SAVE_FORMAT, type SaveMeta } from '@/game/save';
import { formatElapsed } from '@/game/ui/GameClock';
import { themedStyles } from '@/game/ui/theme/use-theme';
import { PaperSection } from '@/game/ui/menu/PaperUi';
import { useT } from '../../i18n/use-t';
import { Spacing } from '@/constants/theme';

export function SavedGames() {
  const router = useRouter();
  const styles = useStyles();
  const t = useT();
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getSaveBackend()
      .list()
      .then(setSaves)
      .catch(() => setError(t.ui.saved.listError));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      return () => setConfirming(null);
    }, [refresh]),
  );

  const remove = (id: string) => {
    if (confirming !== id) {
      setConfirming(id);
      return;
    }
    setConfirming(null);
    getSaveBackend()
      .remove(id)
      .then(refresh)
      .catch(() => setError(t.ui.saved.removeError));
  };

  if (saves.length === 0 && !error) return null;

  return (
    <PaperSection title={t.ui.saved.title}>
      {error && <Text style={styles.error}>{error}</Text>}
      {saves.map((m) => {
        const usable = m.format === SAVE_FORMAT;
        return (
          <View key={m.id} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.summary}>{saveSummary(m)}</Text>
              <Text style={styles.sub}>
                {t.ui.saved.meta(savedAtLabel(m.savedAt), formatElapsed(m.elapsedMs))}
                {usable ? '' : t.ui.saved.legacy}
              </Text>
            </View>
            <Pressable
              style={[styles.button, styles.resume, !usable && styles.disabled]}
              disabled={!usable}
              accessibilityRole="button"
              accessibilityLabel={t.ui.saved.resume}
              onPress={() =>
                router.push({ pathname: '/game/[id]', params: { id: 'local', save: m.id } })
              }>
              <Text style={[styles.buttonText, styles.resumeText]}>{t.ui.saved.resume}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, confirming === m.id && styles.danger]}
              accessibilityRole="button"
              accessibilityLabel={confirming === m.id ? t.ui.saved.confirmRemove : t.ui.saved.remove}
              onPress={() => remove(m.id)}>
              <Text style={styles.buttonText}>{confirming === m.id ? t.ui.saved.confirmRemove : t.ui.saved.remove}</Text>
            </Pressable>
          </View>
        );
      })}
    </PaperSection>
  );
}

const useStyles = themedStyles((c) => ({
  error: { color: c.accent, fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: c.rule,
    backgroundColor: c.hover,
    padding: Spacing.two,
  },
  info: { flex: 1, gap: 2 },
  summary: { color: c.text, fontSize: 13, fontWeight: '800' },
  sub: { color: c.textMuted, fontSize: 11 },
  button: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: c.chipBorder,
  },
  resume: { backgroundColor: c.selected, borderColor: c.selectedBorder },
  danger: { borderColor: c.accent, backgroundColor: 'rgba(168,38,27,0.1)' },
  disabled: { opacity: 0.4 },
  buttonText: { color: c.text, fontSize: 12, fontWeight: '800' },
  resumeText: { color: c.onSelected },
}));
