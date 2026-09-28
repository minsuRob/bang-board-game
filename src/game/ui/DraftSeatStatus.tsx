/**
 * 2D 좌석의 드래프트 표시.
 *
 * 3D 테이블의 뒷면 후보 카드를 작은 타일로 흉내낸다. 그 사람이 마우스를 올린 타일은
 * 들리고, 고르면 초록 체크가 붙는다. 캐릭터·목숨 자리를 대신한다.
 */

import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { draftOfferCount, type GameState, type PlayerId } from '../engine';
import { draftUi } from '../store/draft-ui';
import { Colors, Spacing } from '@/constants/theme';

export function DraftSeatStatus({ view, pid, isSelf }: { view: GameState; pid: PlayerId; isSelf: boolean }) {
  const hover = useSyncExternalStore(
    draftUi.subscribe,
    () => draftUi.getState().hover[pid] ?? null,
    () => null,
  );
  const draft = view.draft;
  if (!draft) return null;
  const done = draft.picked[pid] !== null;
  const per = draftOfferCount(view.players.length);

  return (
    <View style={styles.row}>
      {!isSelf && (
        <View style={styles.tiles}>
          {Array.from({ length: per }, (_, i) => (
            <View key={i} style={[styles.tile, !done && hover === i && styles.tileLifted, done && styles.tileDone]} />
          ))}
        </View>
      )}
      {done ? (
        <View style={styles.doneRow}>
          <View style={styles.check}>
            <Text style={styles.checkText}>✓</Text>
          </View>
          <Text style={styles.done}>선택 완료</Text>
        </View>
      ) : (
        <Text style={styles.picking}>고르는 중…</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 26 },
  tiles: { flexDirection: 'row', gap: 3, alignItems: 'flex-end', height: 24 },
  tile: {
    width: 13,
    height: 18,
    borderRadius: 2,
    backgroundColor: Colors.cardBrown,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
  },
  tileLifted: { transform: [{ translateY: -6 }, { rotate: '-6deg' }], borderColor: Colors.highlight },
  tileDone: { opacity: 0.5 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  check: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 11, fontWeight: '900', lineHeight: 13 },
  done: { color: Colors.success, fontSize: 11, fontWeight: '800' },
  picking: { color: Colors.textMuted, fontSize: 11 },
});
