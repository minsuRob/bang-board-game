/**
 * 스프라이트 이펙트: 글로우·고리·탄환 줄기·접촉 그림자. 전부 additive 라 웹/네이티브가 같다.
 */

import * as THREE from 'three';

import { easeOutCubic, easeOutQuad } from '../core/math';
import { Timeline } from '../core/timeline';
import type { Vec3 } from '../core/types';
import { radialGlowTexture, ringTexture } from '../materials/textures';

const unit = new THREE.PlaneGeometry(1, 1);

function additive(map: THREE.Texture, color: string, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export class ShadowHandle {
  constructor(readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>) {}

  set(pos: Vec3, height: number, scale = 1) {
    const h = Math.max(0, height);
    this.mesh.visible = true;
    this.mesh.position.set(pos[0], 0.008, pos[2]);
    const s = (0.9 + h * 0.5) * scale;
    this.mesh.scale.set(s * 0.9, s * 1.1, 1);
    this.mesh.material.opacity = 0.42 * Math.max(0, 1 - h / 2.2);
  }

  release() {
    this.mesh.visible = false;
  }
}

export class FxLayer {
  readonly root = new THREE.Group();
  private readonly timeline = new Timeline();
  private readonly flats: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly sprites: THREE.Sprite[] = [];
  private readonly shadows: ShadowHandle[] = [];

  private flat(map: THREE.Texture, color: string): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
    const m = this.flats.pop() ?? new THREE.Mesh(unit, additive(map, color));
    m.material.map = map;
    m.material.color.set(color);
    m.material.blending = THREE.AdditiveBlending;
    m.material.needsUpdate = true;
    m.rotation.set(-Math.PI / 2, 0, 0);
    m.visible = true;
    this.root.add(m);
    return m;
  }

  private freeFlat(m: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>) {
    m.visible = false;
    this.root.remove(m);
    this.flats.push(m);
  }

  private sprite(color: string): THREE.Sprite {
    const s =
      this.sprites.pop() ??
      new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: radialGlowTexture(),
          color,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
    (s.material as THREE.SpriteMaterial).color.set(color);
    s.visible = true;
    this.root.add(s);
    return s;
  }

  private freeSprite(s: THREE.Sprite) {
    s.visible = false;
    this.root.remove(s);
    this.sprites.push(s);
  }

  /** 바닥에 퍼지는 고리 */
  ring(at: Vec3, color: string, from: number, to: number, ms: number, now: number, opacity = 0.9) {
    const m = this.flat(ringTexture(), color);
    m.position.set(at[0], at[1] + 0.02, at[2]);
    m.scale.set(from, from, 1);
    m.material.opacity = opacity;
    this.timeline.add({
      start: now,
      dur: ms,
      ease: easeOutCubic,
      update: (p) => {
        const s = from + (to - from) * p;
        m.scale.set(s, s, 1);
        m.material.opacity = opacity * (1 - p);
      },
      done: () => this.freeFlat(m),
    });
  }

  /** 빌보드 섬광 */
  flash(at: Vec3, color: string, scale: number, ms: number, now: number, lift = 0.3) {
    const s = this.sprite(color);
    s.position.set(at[0], at[1] + lift, at[2]);
    s.scale.set(scale, scale, 1);
    this.timeline.add({
      start: now,
      dur: ms,
      update: (p) => {
        const k = 1 + p * 0.6;
        s.scale.set(scale * k, scale * k, 1);
        (s.material as THREE.SpriteMaterial).opacity = 1 - easeOutQuad(p);
      },
      done: () => this.freeSprite(s),
    });
  }

  /** 총알 줄기. 바닥 위를 미끄러진다 */
  streak(from: Vec3, to: Vec3, color: string, ms: number, now: number) {
    const m = this.flat(radialGlowTexture(), color);
    const dx = to[0] - from[0];
    const dz = to[2] - from[2];
    const len = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);
    m.rotation.set(-Math.PI / 2, 0, 0, 'YXZ');
    m.rotation.y = yaw;
    m.material.opacity = 1;
    this.timeline.add({
      start: now,
      dur: ms,
      update: (p) => {
        const head = Math.min(1, p * 1.25);
        const tail = Math.max(0, p * 1.25 - 0.35);
        const mid = (head + tail) / 2;
        m.position.set(from[0] + dx * mid, 0.25, from[2] + dz * mid);
        m.scale.set(0.42, Math.max(0.3, (head - tail) * len), 1);
        m.material.opacity = 1 - p * p;
      },
      done: () => this.freeFlat(m),
    });
  }

  shadow(): ShadowHandle {
    let h = this.shadows.pop();
    if (!h) {
      const m = new THREE.Mesh(
        unit,
        new THREE.MeshBasicMaterial({
          map: radialGlowTexture(),
          color: '#000000',
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        }),
      );
      m.rotation.x = -Math.PI / 2;
      this.root.add(m);
      h = new ShadowHandle(m);
    }
    return h;
  }

  releaseShadow(h: ShadowHandle) {
    h.release();
    this.shadows.push(h);
  }

  tick(now: number): boolean {
    return this.timeline.tick(now);
  }
}
