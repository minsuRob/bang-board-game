/**
 * 게임 화면 위쪽 버튼 줄(속도·계속·저장·소리·전체 화면·설정)이 같이 쓰는 알약 모양.
 * 라이트는 종이 알약에 잉크 글자, 다크는 밤 나무 알약. 켜진 버튼은 고른 칩처럼 찬다.
 */

import { themedStyles } from './use-theme';
import { WesternFonts } from '../menu/western-fonts';

export const useToolbarStyles = themedStyles((c) => ({
  pill: {
    backgroundColor: c.panel,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: c.panelBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    boxShadow: `0 2px 6px ${c.shadow}`,
  },
  pillActive: { backgroundColor: c.selected, borderColor: c.selectedBorder },
  pillHover: { backgroundColor: c.hover },
  text: { color: c.text, fontSize: 12, fontWeight: '800', fontFamily: WesternFonts.label },
  textMuted: { color: c.textMuted, fontSize: 12, fontWeight: '800', fontFamily: WesternFonts.label },
  textActive: { color: c.onSelected },
}));
