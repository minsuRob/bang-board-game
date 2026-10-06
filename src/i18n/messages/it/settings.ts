import type { Messages } from '../../types-messages';

export const settings: Messages['settings'] = {
  title: 'Impostazioni',
  closeLabel: 'Chiudi le impostazioni',
  thisGame: 'Questa partita',
  profile: 'Profilo',
  wallet: 'Portafoglio',
  quality: { title: 'Qualità degli effetti' },
  theme: {
    title: 'Tema',
    system: 'Sistema',
    light: 'Chiaro',
    dark: 'Scuro',
    hint: {
      system: 'Segue la modalità chiara o scura del dispositivo.',
      light: 'Una schermata diurna, inchiostro su carta color crema.',
      dark: 'Una schermata scura, come un saloon a lume di lampada.',
    },
  },
  lang: {
    title: 'Lingua',
    system: 'Sistema',
    hint: {
      system: 'Segue la lingua del dispositivo. Se non è coreano o italiano, viene mostrato l’inglese.',
      ko: 'Mostrato in coreano.',
      en: 'Mostrato in inglese.',
      it: 'Mostrato in italiano.',
    },
  },
  summary: (quality, theme, lang) => `Effetti ${quality} · Tema ${theme} · Lingua ${lang}`,
};
