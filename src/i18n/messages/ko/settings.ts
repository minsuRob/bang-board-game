import type { Lang } from '../../types';

export const settings = {
  title: '설정',
  closeLabel: '설정 닫기',
  thisGame: '이 판',
  profile: '프로필',
  wallet: '지갑',
  quality: { title: '연출 화질' },
  theme: {
    title: '화면 테마',
    system: '시스템',
    light: '라이트',
    dark: '다크',
    hint: {
      system: '기기의 밝은·어두운 화면 설정을 따른다.',
      light: '크림색 종이에 잉크로 찍은 낮의 화면.',
      dark: '램프를 켠 밤 살롱 같은 어두운 화면.',
    },
  },
  lang: {
    title: '언어',
    system: '시스템',
    hint: {
      system: '기기의 언어 설정을 따른다. 한국어·이탈리아어가 아니면 English 로 보인다.',
      ko: '한국어로 보인다.',
      en: '영어로 보인다.',
      it: '이탈리아어로 보인다.',
    } satisfies Record<'system' | Lang, string>,
  },
  summary: (quality: string, theme: string, lang: string) => `연출 ${quality} · 테마 ${theme} · 언어 ${lang}`,
};
