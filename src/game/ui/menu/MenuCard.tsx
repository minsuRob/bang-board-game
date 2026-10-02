/**
 * 첫 화면 메뉴 한 칸을 플레잉 카드 한 장처럼 그린다.
 *
 * 손패처럼 부채꼴로 기울여 두고, 마우스를 올리거나 누르면 똑바로 서며 떠오른다.
 * 카드 그림이 없으면 그림 칸 대신 무늬 하나만 크게 찍는다.
 */

import { useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Animated from 'react-native-reanimated';

import type { ArtCrop } from '../card-art';
import { WesternFonts } from './western-fonts';

export const CARD_RATIO = 1.52;

const PAPER = '#f1e3c3';
const FRAME = '#c9a25a';
const FRAME_PRIMARY = '#8b5a2b';
const INK = '#2b1d10';
const INK_SOFT = '#5a4128';
const RED = '#b3261e';
const GOLD = '#f2c14e';

export type MenuCardProps = {
  width: number;
  title: string;
  desc: string;
  /** 왼쪽 아래 귀퉁이. 'A♠' 처럼 */
  corner: string;
  /** 하트·다이아처럼 붉게 찍는 무늬인가 */
  red?: boolean;
  primary?: boolean;
  /** 부채꼴 기울기 (도) */
  tilt?: number;
  /** 부채꼴에서 아래로 내려앉는 정도 (px) */
  drop?: number;
  disabled?: boolean;
  onPress?: () => void;
  /** 그림 칸. 없으면 무늬로 채운다 */
  art?: ReactNode;
  /** 그림 칸 대신 넣을 조작 (화질 고르기 같은) */
  children?: ReactNode;
};

export function MenuCard({
  width,
  title,
  desc,
  corner,
  red,
  primary,
  tilt = 0,
  drop = 0,
  disabled,
  onPress,
  art,
  children,
}: MenuCardProps) {
  const [lifted, setLifted] = useState(false);
  const height = Math.round(width * CARD_RATIO);
  const k = width / 190;
  const up = lifted && !disabled;

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          zIndex: up ? 10 : primary ? 2 : 1,
          transform: [
            { translateY: up ? -28 * k : drop },
            { rotate: `${up ? 0 : tilt}deg` },
            { scale: up ? 1.04 : 1 },
          ],
          transitionProperty: 'transform',
          transitionDuration: 220,
          transitionTimingFunction: 'ease-out',
        },
        styles.shadow,
        up && styles.shadowUp,
      ]}>
      <Pressable
        style={[
          styles.frame,
          { padding: 9 * k, borderRadius: 14 * k, backgroundColor: primary ? FRAME_PRIMARY : FRAME },
          up && { borderColor: GOLD },
          disabled && styles.frameDisabled,
        ]}
        disabled={disabled}
        // 누를 데가 안에 따로 있는 카드(화질 고르기)는 버튼으로 감싸지 않는다. 웹에서 button 안에 button 이 된다
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? title : undefined}
        accessibilityState={{ disabled: Boolean(disabled) }}
        onPress={onPress}
        onHoverIn={() => setLifted(true)}
        onHoverOut={() => setLifted(false)}
        onPressIn={() => setLifted(true)}
        onPressOut={() => setLifted(false)}>
        <View style={[styles.face, { borderRadius: 8 * k }]}>
          <Text
            style={[
              styles.title,
              { fontSize: (primary ? 27 : 23) * k, paddingTop: 9 * k, paddingBottom: 6 * k },
              primary && { color: RED },
            ]}
            numberOfLines={1}>
            {title}
          </Text>

          <View style={[styles.window, { marginHorizontal: 9 * k }, children ? styles.windowPlain : null]}>
            {children ?? art ?? (
              <Text style={[styles.suit, { fontSize: 64 * k }, red && { color: RED }]}>{corner.slice(-1)}</Text>
            )}
          </View>

          <Text style={[styles.desc, { fontSize: Math.max(10.5, 11.5 * k), padding: 8 * k, paddingBottom: 22 * k }]}>
            {desc}
          </Text>
          <Text style={[styles.corner, { fontSize: 15 * k, left: 8 * k, bottom: 6 * k }, red && { color: RED }]}>
            {corner}
          </Text>
          {disabled && <View style={styles.veil} />}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** 카드 스캔에서 그림 칸만 잘라 상자를 꽉 채운다 (resizeMode="cover" 처럼). 상자는 재서 쓴다 */
export function CroppedArt({
  source,
  crop,
  size = { width: 250, height: 389 },
}: {
  source: ImageSourcePropType;
  crop: ArtCrop;
  size?: { width: number; height: number };
}) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  let image = null;
  if (box) {
    const s = Math.max(box.w / (crop.w * size.width), box.h / (crop.h * size.height));
    const w = size.width * s;
    const h = size.height * s;
    const left = box.w / 2 - (crop.x + crop.w / 2) * w;
    const top = box.h / 2 - (crop.y + crop.h / 2) * h;
    image = (
      <Image source={source} style={{ position: 'absolute', left, top, width: w, height: h }} resizeMode="stretch" />
    );
  }
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.clip]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!box || box.w !== width || box.h !== height) setBox({ w: width, h: height });
      }}>
      {image}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    boxShadow: '0 12px 24px rgba(40,25,10,0.4)',
    borderRadius: 14,
  },
  shadowUp: {
    boxShadow: '0 28px 40px rgba(40,25,10,0.45)',
  },
  frame: {
    flex: 1,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  frameDisabled: { backgroundColor: '#8f826c' },
  veil: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(214,204,184,0.55)' },
  face: { flex: 1, backgroundColor: PAPER, overflow: 'hidden' },
  title: {
    color: INK,
    textAlign: 'center',
    fontWeight: '900',
    fontFamily: WesternFonts.label,
  },
  window: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(43,29,16,0.22)',
    backgroundColor: '#e6d3a8',
    overflow: 'hidden',
  },
  windowPlain: { backgroundColor: 'transparent', borderWidth: 0 },
  suit: { color: INK, opacity: 0.8 },
  desc: {
    color: INK_SOFT,
    textAlign: 'center',
    fontFamily: WesternFonts.body,
  },
  corner: {
    position: 'absolute',
    color: INK,
    fontWeight: '700',
    fontFamily: WesternFonts.type,
  },
  clip: { overflow: 'hidden' },
});
