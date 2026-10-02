/**
 * 저장한 판 목록. 판 설정 화면 맨 위에 뜬다 (저장본이 없으면 아무것도 그리지 않는다).
 *
 * 화면에 돌아올 때마다 다시 읽는다. 게임에서 저장하고 뒤로 오면 곧장 보인다.
 * 지우기는 되돌릴 수 없으므로 한 번 더 눌러야 지운다.
 */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getSaveBackend, saveSummary, savedAtLabel, SAVE_FORMAT, type SaveMeta } from '@/game/save';
import { formatElapsed } from '@/game/ui/GameClock';
import { PaperInk, PaperSection } from '@/game/ui/menu/PaperUi';
import { Spacing } from '@/constants/theme';

export function SavedGames() {
  const router = useRouter();
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getSaveBackend()
      .list()
      .then(setSaves)
      .catch(() => setError('저장한 판 목록을 읽지 못했다.'));
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
      .catch(() => setError('지우지 못했다.'));
  };

  if (saves.length === 0 && !error) return null;

  return (
    <PaperSection title="저장한 판">
      {error && <Text style={styles.error}>{error}</Text>}
      {saves.map((m) => {
        const usable = m.format === SAVE_FORMAT;
        return (
          <View key={m.id} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.summary}>{saveSummary(m)}</Text>
              <Text style={styles.sub}>
                {savedAtLabel(m.savedAt)} 저장 · ⏱ {formatElapsed(m.elapsedMs)}
                {usable ? '' : ' · 예전 형식이라 열 수 없다'}
              </Text>
            </View>
            <Pressable
              style={[styles.button, styles.resume, !usable && styles.disabled]}
              disabled={!usable}
              accessibilityRole="button"
              accessibilityLabel="이어 보기"
              onPress={() =>
                router.push({ pathname: '/game/[id]', params: { id: 'local', save: m.id } })
              }>
              <Text style={[styles.buttonText, styles.resumeText]}>이어 보기</Text>
            </Pressable>
            <Pressable
              style={[styles.button, confirming === m.id && styles.danger]}
              accessibilityRole="button"
              accessibilityLabel={confirming === m.id ? '정말 지우기' : '지우기'}
              onPress={() => remove(m.id)}>
              <Text style={styles.buttonText}>{confirming === m.id ? '정말 지우기' : '지우기'}</Text>
            </Pressable>
          </View>
        );
      })}
    </PaperSection>
  );
}

const styles = StyleSheet.create({
  error: { color: PaperInk.red, fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: PaperInk.rule,
    backgroundColor: 'rgba(201,162,90,0.12)',
    padding: Spacing.two,
  },
  info: { flex: 1, gap: 2 },
  summary: { color: PaperInk.ink, fontSize: 13, fontWeight: '800' },
  sub: { color: PaperInk.inkSoft, fontSize: 11 },
  button: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(43,29,16,0.55)',
  },
  resume: { backgroundColor: PaperInk.ink, borderColor: PaperInk.ink },
  danger: { borderColor: PaperInk.red, backgroundColor: 'rgba(168,38,27,0.1)' },
  disabled: { opacity: 0.4 },
  buttonText: { color: PaperInk.ink, fontSize: 12, fontWeight: '800' },
  resumeText: { color: PaperInk.sheet },
});
