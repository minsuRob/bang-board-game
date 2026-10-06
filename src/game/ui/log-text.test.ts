import { describe, expect, it } from 'vitest';

import { BASE_DECK } from '../data/cards.base';
import type { GameEvent } from '../engine';
import { HIDDEN_CARD } from '../engine/view';
import type { Lang } from '../../i18n/types';
import { splitLogText } from './log-text';

const idOf = (kind: string) => BASE_DECK.find((c) => c.kind === kind)!.id;
const ev = (extra: Partial<GameEvent> = {}): GameEvent => ({ t: 'playCard', msg: { k: 'timeout' }, seq: 1, ...extra });
const split = (text: string, extra: Partial<GameEvent> = {}, lang: Lang = 'ko') => splitLogText(ev(extra), text, lang);

describe('splitLogText', () => {
  it('로그 카드의 이름을 카드 조각으로 떼어 낸다', () => {
    const barrel = idOf('barrel');
    expect(split('블랙 플라워가 술통을 냈다.', { card: barrel })).toEqual([
      { text: '블랙 플라워가 ' },
      { text: '술통', card: barrel, category: 'blue' },
      { text: '을 냈다.' },
    ]);
  });

  it('갈색 카드는 갈색으로 표시한다', () => {
    const seg = split('시드 케첨이 빗나감!을 냈다.', { card: idOf('missed') });
    expect(seg[1]).toMatchObject({ text: '빗나감!', category: 'brown' });
  });

  it('카드가 없거나 가려졌거나 이벤트 카드면 그대로 둔다', () => {
    expect(split('콜로라도 빌의 차례.')).toEqual([{ text: '콜로라도 빌의 차례.' }]);
    expect(split('뱅!을 냈다.', { card: HIDDEN_CARD })).toEqual([{ text: '뱅!을 냈다.' }]);
    expect(split('이벤트 공개 — 축복', { t: 'event', card: 'blessing' })).toEqual([{ text: '이벤트 공개 — 축복' }]);
  });

  it('현재 언어의 카드 이름으로 찾는다', () => {
    const barrel = idOf('barrel');
    expect(split('Black Flower played Barrel.', { card: barrel }, 'en')).toEqual([
      { text: 'Black Flower played ' },
      { text: 'Barrel', card: barrel, category: 'blue' },
      { text: '.' },
    ]);
  });

  it('이름이 문장에 없으면 그대로 둔다', () => {
    expect(split('카드를 버렸다.', { card: idOf('beer') })).toEqual([{ text: '카드를 버렸다.' }]);
  });
});
