/**
 * 2D 좌석의 드래프트 표시.
 *
 * 3D 테이블의 뒷면 후보 카드를 작은 타일로 흉내낸다. 그 사람이 마우스를 올린 타일은
 * 들리고, 고르면 초록 체크가 붙는다. 캐릭터·목숨 자리를 대신한다.
 */

import { useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';

import { draftOfferCount, type GameState, type PlayerId } from '../engine';
import { draftUi } from '../store/draft-ui';
import { themedStyles } from './theme/use-theme';
import { useT } from '../../i18n/use-t';
import { Colors, Spacing, type ThemeColors } from '@/constants/theme';

export function DraftSeatStatus({ view, pid, isSelf }: { view: GameState; pid: PlayerId; isSelf: boolean }) {
  const hover = useSyncExternalStore(
    draftUi.subscribe,
    () => draftUi.getState().hover[pid] ?? null,
    () => null,
  );
  const styles = useStyles();
  const t = useT();
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
          <Text style={styles.done}>{t.ui.draft.seatDone}</Text>
        </View>
      ) : (
        <Text style={styles.picking}>{t.ui.draft.seatPicking}</Text>
      )}
    </View>
  );
}

// 후보 타일은 카드 뒷면이라 판 팔레트 그대로. 글자는 작은 알약에 담아 어느 바탕에서도 읽히게 한다.
const useStyles = themedStyles((c) => ({
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
    backgroundColor: c.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: c.onAccent, fontSize: 11, fontWeight: '900', lineHeight: 13 },
  done: { color: c.success, fontSize: 11, fontWeight: '800', ...label(c) },
  picking: { color: c.textMuted, fontSize: 11, ...label(c) },
}));

function label(c: ThemeColors) {
  return { backgroundColor: c.chip, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' } as const;
}
