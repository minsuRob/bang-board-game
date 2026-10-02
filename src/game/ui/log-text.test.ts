import { describe, expect, it } from 'vitest';

import { BASE_DECK } from '../data/cards.base';
import type { GameEvent } from '../engine';
import { HIDDEN_CARD } from '../engine/view';
import { splitLogText } from './log-text';

const idOf = (kind: string) => BASE_DECK.find((c) => c.kind === kind)!.id;
const ev = (text: string, extra: Partial<GameEvent> = {}): GameEvent => ({ t: 'playCard', text, seq: 1, ...extra });

describe('splitLogText', () => {
  it('로그 카드의 이름을 카드 조각으로 떼어 낸다', () => {
    const barrel = idOf('barrel');
    expect(splitLogText(ev('블랙 플라워가 술통을 냈다.', { card: barrel }))).toEqual([
      { text: '블랙 플라워가 ' },
      { text: '술통', card: barrel, category: 'blue' },
      { text: '을 냈다.' },
    ]);
  });

  it('갈색 카드는 갈색으로 표시한다', () => {
    const seg = splitLogText(ev('시드 케첨이 빗나감!을 냈다.', { card: idOf('missed') }));
    expect(seg[1]).toMatchObject({ text: '빗나감!', category: 'brown' });
  });

  it('카드가 없거나 가려졌거나 이벤트 카드면 그대로 둔다', () => {
    expect(splitLogText(ev('콜로라도 빌의 차례.'))).toEqual([{ text: '콜로라도 빌의 차례.' }]);
    expect(splitLogText(ev('뱅!을 냈다.', { card: HIDDEN_CARD }))).toEqual([{ text: '뱅!을 냈다.' }]);
    expect(splitLogText(ev('이벤트 공개 — 축복', { t: 'event', card: 'blessing' }))).toEqual([{ text: '이벤트 공개 — 축복' }]);
  });

  it('이름이 문장에 없으면 그대로 둔다', () => {
    expect(splitLogText(ev('카드를 버렸다.', { card: idOf('beer') }))).toEqual([{ text: '카드를 버렸다.' }]);
  });
});
