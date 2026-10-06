/**
 * 판 저장 버튼. 사람 자리가 모두 탈락해 AI 끼리 남았을 때(관전 판은 드래프트 뒤 언제나)만 뜬다.
 *
 * 누르면 그 순간의 판을 저장소에 넣고, 아래에 결과를 잠깐 띄운다.
 * 저장이 되면 '나가기' 로 곧장 판 설정 화면으로 갈 수 있다 (거기서 이어 본다).
 */

import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { WesternFonts } from './menu/western-fonts';
import { useToolbarStyles } from './theme/toolbar';
import { themedStyles } from './theme/use-theme';
import { useT } from '../../i18n/use-t';
import { Radius, Spacing } from '@/constants/theme';

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
  const toolbar = useToolbarStyles();
  const styles = useStyles();
  const t = useT();
  return (
    <Pressable
      style={({ hovered }: { hovered?: boolean }) => [
        toolbar.pill,
        hovered && !saving && toolbar.pillHover,
        status.k === 'saved' && styles.saved,
        style,
      ]}
      disabled={saving}
      accessibilityRole="button"
      accessibilityLabel={t.ui.save.label}
      accessibilityState={{ busy: saving }}
      onPress={onSave}>
      <Text style={[toolbar.text, status.k === 'saved' && styles.textSaved]}>
        {saving ? t.ui.save.saving : t.ui.save.button}
      </Text>
    </Pressable>
  );
}

/** 저장 결과 알림. 저장됐으면 나가기 버튼을 붙인다 */
export function SaveNotice({ status, onLeave }: { status: SaveStatus; onLeave: () => void }) {
  const styles = useStyles();
  const t = useT();
  if (status.k !== 'saved' && status.k !== 'error') return null;
  const error = status.k === 'error';
  return (
    <View style={[styles.notice, error && styles.noticeError]} accessibilityLiveRegion="polite">
      <Text style={styles.noticeText}>
        {error ? status.message : t.ui.save.saved}
      </Text>
      {!error && (
        <Pressable
          style={({ pressed }) => [styles.leave, pressed && styles.leavePressed]}
          accessibilityRole="button"
          accessibilityLabel={t.ui.save.leave}
          onPress={onLeave}>
          <Text style={styles.leaveText}>{t.ui.save.leave}</Text>
        </Pressable>
      )}
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  saved: { borderColor: c.highlight },
  textSaved: { color: c.highlight },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: c.panel,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: c.highlight,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    boxShadow: `0 4px 14px ${c.shadow}`,
  },
  noticeError: { borderColor: c.danger },
  noticeText: { color: c.text, fontSize: 12.5, flexShrink: 1, fontFamily: WesternFonts.body },
  // 나가기는 작은 빨간 도장
  leave: {
    backgroundColor: c.accent,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    boxShadow: `0 2px 0 ${c.accentShadow}`,
  },
  leavePressed: { transform: [{ translateY: 1 }], boxShadow: `0 1px 0 ${c.accentShadow}` },
  leaveText: { color: c.onAccent, fontSize: 11.5, fontWeight: '800', fontFamily: WesternFonts.label },
}));
