/** 앱이 내는 언어. 사전은 이 셋뿐이다 */
export type Lang = 'ko' | 'en' | 'it';

/** 설정에서 고르는 값. 'system' 은 기기 언어를 따른다 */
export type LangPref = 'system' | Lang;

export const LANGS: readonly Lang[] = ['ko', 'en', 'it'];
