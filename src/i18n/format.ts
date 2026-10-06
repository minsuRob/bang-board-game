import type { Lang } from './types';

const MONTHS: Record<Lang, readonly string[]> = {
  ko: [],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  it: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
};

const pad = (n: number) => String(n).padStart(2, '0');

/** 예: ko "9월 30일 15:22" · en "Sep 30, 15:22" · it "30 set 15:22". 기기 시간대를 따른다 */
export function formatMonthDayTime(ts: number, lang: Lang): string {
  const d = new Date(ts);
  const month = d.getMonth();
  const day = d.getDate();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (lang === 'ko') return `${month + 1}월 ${day}일 ${time}`;
  if (lang === 'it') return `${day} ${MONTHS.it[month]} ${time}`;
  return `${MONTHS.en[month]} ${day}, ${time}`;
}
