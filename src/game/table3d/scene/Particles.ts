/**
 * 파티클 하나의 Points. 링버퍼라 spawn 은 그 조각만 갱신한다.
 */

import * as THREE from 'three';

import { hashNoise } from '../core/math';
import type { Vec3 } from '../core/types';
import { PARTICLE_FRAGMENT, PARTICLE_VERTEX } from '../materials/particle-shader';

export type ParticlePreset = 'sparkle' | 'dust' | 'explosion';

const PRESET: Record<
  ParticlePreset,
  { count: number; speed: [number, number]; up: [number, number]; life: [number, number]; size: [number, number]; grav: number; colors: string[] }
> = {
  sparkle: { count: 28, speed: [0.15, 0.5], up: [0.7, 1.5], life: [0.7, 1.1], size: [5, 9], grav: 0.4, colors: ['#F2C14E', '#8ED08A', '#FFF3C2'] },
  dust: { count: 22, speed: [0.5, 1.3], up: [0.1, 0.4], life: [0.35, 0.6], size: [8, 15], grav: 0.2, colors: ['#A08050', '#8A6A44', '#C0A070'] },
  explosion: { count: 90, speed: [1.2, 3.4], up: [0.6, 2.6], life: [0.55, 0.95], size: [9, 18], grav: 3.5, colors: ['#FF9A2E', '#E8402A', '#FFE07A', '#FFFFFF'] },
};

export class Particles {
  readonly points: THREE.Points;
  private readonly capacity: number;
  private cursor = 0;
  private lastDeath = 0;
  private salt = 0;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly birth: Float32Array;
  private readonly life: Float32Array;
  private readonly size: Float32Array;
  private readonly grav: Float32Array;
  private readonly color: Float32Array;
  private readonly material: THREE.ShaderMaterial;

  constructor(capacity: number) {
    this.capacity = capacity;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.birth = new Float32Array(capacity).fill(-1e9);
    this.life = new Float32Array(capacity).fill(1);
    this.size = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.color = new Float32Array(capacity * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aVel', new THREE.BufferAttribute(this.vel, 3));
    g.setAttribute('aBirth', new THREE.BufferAttribute(this.birth, 1));
    g.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aGrav', new THREE.BufferAttribute(this.grav, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3));
    this.material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
  }

  setPixelRatio(r: number) {
    this.material.uniforms.uPixelRatio.value = r;
  }

  /** nowSec 는 초 단위 (uTime 과 같은 시계) */
  spawn(at: Vec3, preset: ParticlePreset, nowSec: number, scale = 1) {
    const p = PRESET[preset];
    const n = Math.min(p.count, this.capacity);
    const colors = p.colors.map((c) => new THREE.Color(c));
    this.salt = (this.salt + 1) | 0;
    for (let k = 0; k < n; k++) {
      const i = this.cursor++ % this.capacity;
      const r = (j: number) => hashNoise(i * 7 + j, this.salt);
      const ang = r(1) * Math.PI * 2;
      const speed = (p.speed[0] + (p.speed[1] - p.speed[0]) * r(2)) * scale;
      const up = (p.up[0] + (p.up[1] - p.up[0]) * r(3)) * scale;
      this.pos[i * 3] = at[0] + (r(4) - 0.5) * 0.25;
      this.pos[i * 3 + 1] = at[1] + 0.05;
      this.pos[i * 3 + 2] = at[2] + (r(5) - 0.5) * 0.25;
      this.vel[i * 3] = Math.cos(ang) * speed;
      this.vel[i * 3 + 1] = up;
      this.vel[i * 3 + 2] = Math.sin(ang) * speed;
      this.birth[i] = nowSec;
      this.life[i] = p.life[0] + (p.life[1] - p.life[0]) * r(6);
      this.size[i] = p.size[0] + (p.size[1] - p.size[0]) * r(7);
      this.grav[i] = p.grav;
      const c = colors[Math.floor(r(8) * colors.length) % colors.length];
      this.color[i * 3] = c.r;
      this.color[i * 3 + 1] = c.g;
      this.color[i * 3 + 2] = c.b;
      this.lastDeath = Math.max(this.lastDeath, nowSec + this.life[i]);
    }
    const g = this.points.geometry;
    for (const name of ['position', 'aVel', 'aBirth', 'aLife', 'aSize', 'aGrav', 'aColor']) {
      (g.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  tick(nowSec: number): boolean {
    this.material.uniforms.uTime.value = nowSec;
    const alive = nowSec < this.lastDeath;
    this.points.visible = alive;
    return alive;
  }
}
