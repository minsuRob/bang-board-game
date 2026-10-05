/**
 * 설정 팝업: 프로필·지갑, 연출 화질, 화면 테마.
 *
 * 첫 화면의 "설정" 카드와 게임 중 ⚙ 버튼이 연다. 폰 폭의 판에서는 위쪽 버튼 줄(AI 속도·일시정지 등)을
 * 접어서 children 으로 넘기고, 맨 위 "이 판" 칸에 보여 준다. 고르는 즉시 저장되고 화면도 바로 바뀐다.
 * 모양은 도감 상세 창(codex/CodexDetail.tsx)처럼 막 위에 종이 한 장을 띄운다. 바깥이나 Esc 로 닫힌다.
 */

import { useEffect, type ReactNode } from 'react';

import { startAccountSync, useAccount } from '../../../firebase/account-store';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { setFxQuality } from '../fx/quality';
import { PaperHeading, PaperSection, PaperSheet, usePaperText } from '../menu/PaperUi';
import { WesternFonts } from '../menu/western-fonts';
import { InkSegmented, QUALITY_OPTIONS, qualityHint, useFxQuality } from '../QualityPicker';
import { setThemePref, themePref, type ThemePref } from '../theme/theme-store';
import { themedStyles } from '../theme/use-theme';
import { ProfileSection } from './ProfileSection';
import { WalletSection } from './WalletSection';

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

const THEME_HINT: Record<ThemePref, string> = {
  system: '기기의 밝은·어두운 화면 설정을 따른다.',
  light: '크림색 종이에 잉크로 찍은 낮의 화면.',
  dark: '램프를 켠 밤 살롱 같은 어두운 화면.',
};

/** 설정 요약 한 줄 (첫 화면 카드 설명) */
export function useSettingsSummary(): string {
  const quality = useFxQuality();
  const pref = useStore(themePref, (s) => s.pref);
  const q = QUALITY_OPTIONS.find((o) => o.value === quality)?.label ?? '';
  const t = THEME_OPTIONS.find((o) => o.value === pref)?.label ?? '';
  return `연출 ${q} · 테마 ${t}`;
}

export function SettingsSheet({ onClose, children }: { onClose: () => void; children?: ReactNode }) {
  const styles = useStyles();
  const text = usePaperText();
  const quality = useFxQuality();
  const pref = useStore(themePref, (s) => s.pref);
  const account = useAccount();

  // 로그인돼 있으면(= Firebase 구성이 있으면) 프로필·지갑을 보인다
  useEffect(() => {
    startAccountSync();
  }, []);

  // 웹에서는 Esc 로도 닫는다
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <View style={styles.layer}>
      <Pressable accessibilityRole="button" accessibilityLabel="설정 닫기" onPress={onClose} style={styles.scrim} />
      <PaperSheet style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.body}>
          <PaperHeading eyebrow="SETTINGS" title="설정" />

          {children && <PaperSection title="이 판">{children}</PaperSection>}

          {account.status !== 'offline' && (
            <>
              <PaperSection title="프로필">
                <ProfileSection />
              </PaperSection>
              <PaperSection title="지갑">
                <WalletSection />
              </PaperSection>
            </>
          )}

          <PaperSection title="연출 화질">
            <InkSegmented label="연출 화질" options={QUALITY_OPTIONS} value={quality} onChange={setFxQuality} />
            <Text style={text.hint}>{qualityHint(quality)}</Text>
          </PaperSection>

          <PaperSection title="화면 테마">
            <InkSegmented label="화면 테마" options={THEME_OPTIONS} value={pref} onChange={setThemePref} />
            <Text style={text.hint}>{THEME_HINT[pref]}</Text>
          </PaperSection>
        </ScrollView>

        <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>닫기</Text>
        </Pressable>
      </PaperSheet>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 80,
  },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim },
  sheet: { width: '100%', maxWidth: 440, maxHeight: '100%', gap: 16, backgroundColor: c.surface },
  body: { gap: 22 },
  close: {
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: c.chipBorder,
  },
  closeText: { color: c.text, fontSize: 15, fontWeight: '800', fontFamily: WesternFonts.label },
}));
