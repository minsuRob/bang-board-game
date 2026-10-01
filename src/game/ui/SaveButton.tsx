/**
 * 판 저장 버튼. 사람 자리가 모두 탈락해 AI 끼리 남았을 때(관전 판은 드래프트 뒤 언제나)만 뜬다.
 *
 * 누르면 그 순간의 판을 저장소에 넣고, 아래에 결과를 잠깐 띄운다.
 * 저장이 되면 '나가기' 로 곧장 판 설정 화면으로 갈 수 있다 (거기서 이어 본다).
 */

import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

export type SaveStatus =
  | { k: 'idle' }
  | { k: 'saving' }
  | { k: 'saved' }
  | { k: 'error'; message: string };

type Props = {
  status: SaveStatus;
  onSave: () => void;
  style?: StyleProp<ViewStyle>;
};

export function SaveButton({ status, onSave, style }: Props) {
  const saving = status.k === 'saving';
  return (
    <Pressable
      style={[styles.root, status.k === 'saved' && styles.saved, style]}
      disabled={saving}
      accessibilityRole="button"
      accessibilityLabel="판 저장"
      accessibilityState={{ busy: saving }}
      onPress={onSave}>
      <Text style={[styles.text, status.k === 'saved' && styles.textSaved]}>
        {saving ? '저장 중…' : '💾 저장'}
      </Text>
    </Pressable>
  );
}

/** 저장 결과 알림. 저장됐으면 나가기 버튼을 붙인다 */
export function SaveNotice({ status, onLeave }: { status: SaveStatus; onLeave: () => void }) {
  if (status.k !== 'saved' && status.k !== 'error') return null;
  const error = status.k === 'error';
  return (
    <View style={[styles.notice, error && styles.noticeError]} accessibilityLiveRegion="polite">
      <Text style={styles.noticeText}>
        {error ? status.message : '저장했다. 판 설정 화면에서 이어 볼 수 있다.'}
      </Text>
      {!error && (
        <Pressable
          style={styles.leave}
          accessibilityRole="button"
          accessibilityLabel="나가기"
          onPress={onLeave}>
          <Text style={styles.leaveText}>나가기</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
  },
  saved: { borderColor: Colors.highlight },
  text: { color: Colors.textMuted, fontSize: 11, fontWeight: '800' },
  textSaved: { color: Colors.highlight },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.highlight,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  noticeError: { borderColor: Colors.border },
  noticeText: { color: Colors.text, fontSize: 12, flexShrink: 1 },
  leave: {
    backgroundColor: Colors.cardBrown,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  leaveText: { color: Colors.paper, fontSize: 11, fontWeight: '800' },
});
