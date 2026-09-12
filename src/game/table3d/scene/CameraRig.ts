/**
 * 카메라 리그. 기본 프레임 위에 포커스·펀치·흔들림을 얹는다.
 */

import * as THREE from 'three';

import { hashNoise } from '../core/math';
import type { CameraFrame, Vec3 } from '../core/types';

export class CameraRig {
  private base: CameraFrame = { position: [0, 8, 8], lookAt: [0, 0, 0], fov: 45 };
  private readonly pos = new THREE.Vector3(0, 8, 8);
  private readonly look = new THREE.Vector3();
  private readonly goalPos = new THREE.Vector3(0, 8, 8);
  private readonly goalLook = new THREE.Vector3();
  private focusUntil = 0;
  private focusAt: Vec3 | null = null;
  private punchDir = new THREE.Vector3();
  private punchLeft = 0;
  private punchMs = 1;
  private punchStrength = 0;
  private shakeLeft = 0;
  private shakeMs = 1;
  private shakeStrength = 0;
  private shakeSeed = 0;
  private readonly offset = new THREE.Vector3();
  /** 이번 프레임에 카메라가 움직였는가 (앵커 투영 트리거) */
  moving = true;

  setBase(frame: CameraFrame, snap: boolean) {
    this.base = frame;
    this.goalPos.set(...frame.position);
    this.goalLook.set(...frame.lookAt);
    if (snap) {
      this.pos.copy(this.goalPos);
      this.look.copy(this.goalLook);
    }
    this.moving = true;
  }

  /** 시선을 잠시 pid 쪽으로. 위치는 조금만 따라간다 */
  focus(at: Vec3 | null, holdMs: number, now: number) {
    this.focusAt = at;
    this.focusUntil = now + holdMs;
  }

  punch(dir: Vec3, strength: number, ms: number) {
    this.punchDir.set(dir[0], dir[1], dir[2]).normalize();
    this.punchStrength = strength;
    this.punchLeft = ms;
    this.punchMs = ms;
  }

  shake(strength: number, ms: number) {
    this.shakeStrength = Math.max(this.shakeStrength * (this.shakeLeft / Math.max(1, this.shakeMs)), strength);
    this.shakeLeft = ms;
    this.shakeMs = ms;
    this.shakeSeed = (this.shakeSeed + 1) | 0;
  }

  tick(dt: number, now: number): boolean {
    const b = this.base;
    if (this.focusAt && now < this.focusUntil) {
      // 시선은 대상과 중심의 중간, 위치는 그쪽으로 조금
      this.goalLook.set(
        b.lookAt[0] + (this.focusAt[0] - b.lookAt[0]) * 0.45,
        b.lookAt[1],
        b.lookAt[2] + (this.focusAt[2] - b.lookAt[2]) * 0.45,
      );
      this.goalPos.set(
        b.position[0] + (this.focusAt[0] - b.lookAt[0]) * 0.2,
        b.position[1] * 0.93,
        b.position[2] + (this.focusAt[2] - b.lookAt[2]) * 0.2,
      );
    } else {
      this.focusAt = null;
      this.goalLook.set(...b.lookAt);
      this.goalPos.set(...b.position);
    }

    const before = this.pos.distanceToSquared(this.goalPos) + this.look.distanceToSquared(this.goalLook);
    const k = 1 - Math.exp(-5 * dt);
    this.pos.lerp(this.goalPos, k);
    this.look.lerp(this.goalLook, k);
    let active = before > 1e-6;

    this.offset.set(0, 0, 0);
    if (this.punchLeft > 0) {
      const p = this.punchLeft / this.punchMs;
      // 빠르게 밀렸다가 돌아온다
      const amp = Math.sin(p * Math.PI) * this.punchStrength;
      this.offset.addScaledVector(this.punchDir, amp);
      this.punchLeft -= dt * 1000;
      active = true;
    }
    if (this.shakeLeft > 0) {
      const p = this.shakeLeft / this.shakeMs;
      const amp = p * p * this.shakeStrength;
      const t = Math.floor(now / 16);
      this.offset.x += (hashNoise(t, this.shakeSeed) - 0.5) * amp;
      this.offset.y += (hashNoise(t, this.shakeSeed + 1) - 0.5) * amp * 0.6;
      this.offset.z += (hashNoise(t, this.shakeSeed + 2) - 0.5) * amp;
      this.shakeLeft -= dt * 1000;
      active = true;
    }
    this.moving = active;
    return active;
  }

  apply(camera: THREE.PerspectiveCamera) {
    camera.position.copy(this.pos).add(this.offset);
    camera.lookAt(this.look);
    if (camera.fov !== this.base.fov) {
      camera.fov = this.base.fov;
      camera.updateProjectionMatrix();
    }
    // 렌더 전에 투영하려면 행렬을 직접 갱신해야 한다. 안 그러면 앵커가 한 프레임 전 카메라로 찍힌다
    camera.updateMatrixWorld(true);
  }
}
