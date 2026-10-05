/**
 * 설정창의 "프로필" 칸: 닉네임 고치기, 로그인 방식, Google 연결.
 */

import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  GOOGLE_LINK_HINT,
  GOOGLE_LINK_SUPPORTED,
  linkGoogle,
  PROVIDER_LABEL,
} from '../../../firebase/account';
import { changeNick, refreshProvider, useAccount } from '../../../firebase/account-store';
import { NICK_MAX } from '../../economy/constants';
import { eul } from '../../engine/josa';
import { usePaperText } from '../menu/PaperUi';
import { WesternFonts } from '../menu/western-fonts';
import { themedStyles, useColors } from '../theme/use-theme';

export function ProfileSection() {
  const styles = useStyles();
  const text = usePaperText();
  const c = useColors();
  const account = useAccount();
  // null 이면 아직 고치지 않은 것이라 서버의 닉네임을 그대로 보인다
  const [edited, setEdited] = useState<string | null>(null);
  const draft = edited ?? account.nick;
  const setDraft = (next: string | null) => setEdited(next === account.nick ? null : next);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const ready = account.status === 'ready';
  const changed = draft.trim() !== account.nick;

  const save = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const nick = await changeNick(draft);
      if (!nick) setNotice('닉네임이 비어 있다.');
      else {
        setEdited(null);
        setNotice(`${eul(nick)} 저장했다.`);
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : '저장하지 못했다.');
    } finally {
      setBusy(false);
    }
  };

  const link = async () => {
    if (busy) return;
    setBusy(true);
    const res = await linkGoogle();
    refreshProvider();
    setNotice(res.ok ? 'Google 계정을 연결했다. 다른 기기에서도 같은 지갑을 쓴다.' : res.message);
    setBusy(false);
  };

  if (account.status === 'offline') {
    return <Text style={text.hint}>Firebase 설정을 채우면 프로필과 지갑이 열린다.</Text>;
  }
  if (account.status === 'error') {
    return <Text style={text.hint}>로그인하지 못했다. {account.error}</Text>;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          maxLength={NICK_MAX}
          editable={ready && !busy}
          placeholder="닉네임"
          placeholderTextColor={c.textMuted}
          style={styles.input}
          accessibilityLabel="닉네임"
          onSubmitEditing={save}
          returnKeyType="done"
        />
        <Pressable
          style={({ pressed }) => [styles.save, (!changed || !ready || busy) && styles.saveDisabled, pressed && styles.savePressed]}
          disabled={!changed || !ready || busy}
          accessibilityRole="button"
          accessibilityLabel="닉네임 저장"
          onPress={save}>
          <Text style={styles.saveText}>저장</Text>
        </Pressable>
      </View>
      <Text style={text.hint}>
        {ready ? `로그인: ${PROVIDER_LABEL[account.provider]}` : '로그인하는 중…'}
        {account.uid ? ` · ${account.uid.slice(0, 6)}` : ''}
      </Text>
      {ready && account.provider === 'anonymous' && (
        GOOGLE_LINK_SUPPORTED ? (
          <Pressable
            style={({ pressed }) => [styles.link, pressed && styles.savePressed]}
            accessibilityRole="button"
            accessibilityLabel="Google 계정 연결"
            disabled={busy}
            onPress={link}>
            <Text style={styles.linkText}>Google 계정 연결</Text>
          </Pressable>
        ) : (
          <Text style={text.hint}>{GOOGLE_LINK_HINT}</Text>
        )
      )}
      {notice && <Text style={[text.hint, styles.notice]}>{notice}</Text>}
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: c.field,
    borderWidth: 1.5,
    borderColor: c.chipBorder,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    color: c.text,
    fontSize: 15,
    fontFamily: WesternFonts.body,
  },
  save: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: c.accent,
    boxShadow: `0 3px 0 ${c.accentShadow}`,
  },
  saveDisabled: { opacity: 0.4 },
  savePressed: { opacity: 0.8 },
  saveText: { color: c.onAccent, fontSize: 14, fontWeight: '900', fontFamily: WesternFonts.label },
  link: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: c.chipBorder,
  },
  linkText: { color: c.text, fontSize: 13, fontWeight: '800', fontFamily: WesternFonts.label },
  notice: { color: c.text },
}));
