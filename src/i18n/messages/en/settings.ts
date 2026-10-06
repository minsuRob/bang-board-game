import type { Messages } from '../../types-messages';

export const settings: Messages['settings'] = {
  title: 'Settings',
  closeLabel: 'Close settings',
  thisGame: 'This game',
  profile: 'Profile',
  wallet: 'Wallet',
  quality: { title: 'Effects quality' },
  theme: {
    title: 'Theme',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    hint: {
      system: "Follows the device's light or dark setting.",
      light: 'A daytime screen, ink printed on cream paper.',
      dark: 'A dark screen like a saloon by lamplight.',
    },
  },
  lang: {
    title: 'Language',
    system: 'System',
    hint: {
      system: "Follows the device language. Anything other than Korean or Italian shows English.",
      ko: 'Shown in Korean.',
      en: 'Shown in English.',
      it: 'Shown in Italian.',
    },
  },
  summary: (quality, theme, lang) => `Effects ${quality} · Theme ${theme} · Language ${lang}`,
};
