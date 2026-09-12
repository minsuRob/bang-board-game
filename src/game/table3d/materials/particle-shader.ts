/**
 * 파티클 셰이더. 위치를 시간으로 계산하므로 CPU 는 spawn 때만 일한다.
 */

export const PARTICLE_VERTEX = /* glsl */ `
attribute vec3 aVel;
attribute float aBirth;
attribute float aLife;
attribute float aSize;
attribute float aGrav;
attribute vec3 aColor;
uniform float uTime;
uniform float uPixelRatio;
varying float vLife;
varying vec3 vColor;

void main() {
  float age = uTime - aBirth;
  float t = age / max(aLife, 0.001);
  vLife = t;
  vColor = aColor;
  if (t < 0.0 || t > 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  vec3 p = position + aVel * age + vec3(0.0, -0.5 * aGrav * age * age, 0.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * (1.0 - t * 0.55) * uPixelRatio * (46.0 / max(1.0, -mv.z));
}
`;

export const PARTICLE_FRAGMENT = /* glsl */ `
varying float vLife;
varying vec3 vColor;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float a = smoothstep(1.0, 0.25, d) * (1.0 - vLife);
  gl_FragColor = vec4(vColor * a, a);
}
`;
