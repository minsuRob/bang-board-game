/**
 * 설정 팝업: 프로필·지갑, 연출 화질, 화면 테마, 언어.
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
import { LANG_NAME } from '../../../i18n/lang-names';
import { langPref, setLangPref } from '../../../i18n/lang-store';
import { useT } from '../../../i18n/use-t';
import type { LangPref } from '../../../i18n/types';
import { setThemePref, themePref, type ThemePref } from '../theme/theme-store';
import { themedStyles } from '../theme/use-theme';
import { ProfileSection } from './ProfileSection';
import { WalletSection } from './WalletSection';

/** 설정 요약 한 줄 (첫 화면 카드 설명) */
export function useSettingsSummary(): string {
  const t = useT();
  const quality = useFxQuality();
  const pref = useStore(themePref, (s) => s.pref);
  const lang = useStore(langPref, (s) => s.pref);
  const q = QUALITY_OPTIONS.find((o) => o.value === quality)?.label ?? '';
  return t.settings.summary(q, t.settings.theme[pref], lang === 'system' ? t.settings.lang.system : LANG_NAME[lang]);
}

export function SettingsSheet({ onClose, children }: { onClose: () => void; children?: ReactNode }) {
  const styles = useStyles();
  const t = useT();
  const text = usePaperText();
  const quality = useFxQuality();
  const pref = useStore(themePref, (s) => s.pref);
  const lang = useStore(langPref, (s) => s.pref);
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

  const themeOptions: { value: ThemePref; label: string }[] = [
    { value: 'system', label: t.settings.theme.system },
    { value: 'light', label: t.settings.theme.light },
    { value: 'dark', label: t.settings.theme.dark },
  ];
  const langOptions: { value: LangPref; label: string }[] = [
    { value: 'system', label: t.settings.lang.system },
    { value: 'ko', label: LANG_NAME.ko },
    { value: 'en', label: LANG_NAME.en },
    { value: 'it', label: LANG_NAME.it },
  ];

  return (
    <View style={styles.layer}>
      <Pressable accessibilityRole="button" accessibilityLabel={t.settings.closeLabel} onPress={onClose} style={styles.scrim} />
      <PaperSheet style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.body}>
          <PaperHeading eyebrow="SETTINGS" title={t.settings.title} />

          {children && <PaperSection title={t.settings.thisGame}>{children}</PaperSection>}

          {account.status !== 'offline' && (
            <>
              <PaperSection title={t.settings.profile}>
                <ProfileSection />
              </PaperSection>
              <PaperSection title={t.settings.wallet}>
                <WalletSection />
              </PaperSection>
            </>
          )}

          <PaperSection title={t.settings.quality.title}>
            <InkSegmented label={t.settings.quality.title} options={QUALITY_OPTIONS} value={quality} onChange={setFxQuality} />
            <Text style={text.hint}>{qualityHint(quality)}</Text>
          </PaperSection>

          <PaperSection title={t.settings.theme.title}>
            <InkSegmented label={t.settings.theme.title} options={themeOptions} value={pref} onChange={setThemePref} />
            <Text style={text.hint}>{t.settings.theme.hint[pref]}</Text>
          </PaperSection>

          <PaperSection title={t.settings.lang.title}>
            <InkSegmented label={t.settings.lang.title} options={langOptions} value={lang} onChange={setLangPref} />
            <Text style={text.hint}>{t.settings.lang.hint[lang]}</Text>
          </PaperSection>
        </ScrollView>

        <Pressable accessibilityRole="button" accessibilityLabel={t.common.close} onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>{t.common.close}</Text>
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
