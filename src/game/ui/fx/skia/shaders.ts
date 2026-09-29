/**
 * 고화질 총격의 SkSL 셰이더. 웹(CanvasKit)과 네이티브 Skia 가 같은 코드를 돌린다.
 */

import { Skia } from '@shopify/react-native-skia';

/**
 * 화약 연기. fbm 노이즈 × 총구에서 앞·위로 흘러가는 늘어진 덩어리.
 *
 * uniforms
 *   u_origin 총구 (캔버스 px)
 *   u_scale  카드 폭 (px). 모양을 카드 크기에 맞춘다
 *   u_t      연기 시간 (초, 슬로모션 동안 느리게 흐른다)
 *   u_amt    짙기 0~1
 */
const SMOKE_SKSL = `
uniform float2 u_origin;
uniform float u_scale;
uniform float u_t;
uniform float u_amt;

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1.0, 0.0)), u.x),
             mix(hash(i + float2(0.0, 1.0)), hash(i + float2(1.0, 1.0)), u.x), u.y);
}

float fbm(float2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + float2(17.0, 9.0);
    a *= 0.5;
  }
  return v;
}

half4 main(float2 xy) {
  float2 d = (xy - u_origin) / u_scale;
  float t = u_t;
  // 덩어리 중심은 앞으로 밀려나며 위로 뜬다
  float2 c = float2(0.2 + t * 0.55, -0.08 - t * 0.42);
  float2 q = d - c;
  q.x /= (0.28 + t * 0.55);
  q.y /= (0.2 + t * 0.45);
  float body = exp(-dot(q, q) * 1.7);
  // 총구 가까이는 좁은 분출
  float2 j = d / float2(0.5 + t * 0.4, 0.09 + t * 0.2);
  float jet = exp(-dot(j, j)) * step(0.0, d.x);
  float shape = max(body, jet * 0.8);
  float n = fbm(d * 3.2 + float2(-t * 1.1, t * 0.8));
  float a = shape * smoothstep(0.32, 0.8, n + shape * 0.3) * u_amt;
  half3 col = mix(half3(0.30, 0.27, 0.24), half3(0.72, 0.68, 0.62), half(n));
  return half4(col * half(a), half(a));
}
`;

export const smokeEffect = Skia.RuntimeEffect.Make(SMOKE_SKSL);
if (!smokeEffect) console.warn('연기 셰이더를 만들지 못했다');
