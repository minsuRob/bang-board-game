/**
 * 카드 한 장의 3D 객체.
 *
 * group: 위치·진행 방향(yaw)·기울기(pitch/roll)·크기
 * inner: 눕히기·뒤집기(flip)·제자리 회전(spin)
 *
 * 두 단으로 나눈 이유는 비행 중 기울기와 뒤집기가 서로 다른 축이기 때문이다.
 */

import * as THREE from 'three';

import type { CardId } from '../../data/types';
import { damp, wrapAngle } from '../core/math';
import { CARD_SIZE, type Vec3 } from '../core/types';
import { backMaterialShared, cardPlaneGeometry, faceMaterialFor } from '../materials/card-materials';

export type Pose = {
  pos: Vec3;
  yaw: number;
  pitch: number;
  roll: number;
  /** 0 = 앞면 위, π = 뒷면 위 */
  flip: number;
  spin: number;
  scale: number;
};

export const IDLE_POSE: Pose = { pos: [0, 0, 0], yaw: 0, pitch: 0, roll: 0, flip: 0, spin: 0, scale: 1 };

const SNAP_LAMBDA = 16;

export class CardHandle {
  readonly group = new THREE.Group();
  private readonly inner = new THREE.Group();
  private readonly front: THREE.Mesh;
  private readonly back: THREE.Mesh;
  card: CardId | null = null;
  target: Pose = { ...IDLE_POSE };
  current: Pose = { ...IDLE_POSE };
  /** 타임라인이 직접 움직이는 중이면 tick 이 손대지 않는다 */
  driven = false;
  /** settle 에서 이번에 자리를 받았는가 */
  resident = false;

  constructor() {
    const geo = cardPlaneGeometry(CARD_SIZE.w, CARD_SIZE.h);
    this.front = new THREE.Mesh(geo, backMaterialShared());
    this.back = new THREE.Mesh(geo, backMaterialShared());
    this.back.rotation.y = Math.PI;
    this.front.position.z = CARD_SIZE.thickness / 2;
    this.back.position.z = -CARD_SIZE.thickness / 2;
    this.inner.add(this.front, this.back);
    this.inner.rotation.order = 'XYZ';
    this.group.rotation.order = 'YXZ';
    this.group.add(this.inner);
    this.group.visible = false;
  }

  assign(card: CardId) {
    if (this.card === card) return;
    this.card = card;
    this.front.material = faceMaterialFor(card);
  }

  show(visible: boolean) {
    this.group.visible = visible;
  }

  snap(pose: Pose) {
    this.target = { ...pose };
    this.current = { ...pose };
    this.apply();
  }

  setTarget(pose: Pose) {
    this.target = { ...pose };
  }

  /** current 를 three 객체에 쓴다 */
  apply() {
    const c = this.current;
    this.group.position.set(c.pos[0], c.pos[1], c.pos[2]);
    this.group.rotation.set(c.pitch, c.yaw, c.roll);
    this.group.scale.setScalar(c.scale);
    this.inner.rotation.set(-Math.PI / 2, c.flip, c.spin);
  }

  /** 타임라인이 current 를 직접 쓴 뒤 부른다 */
  set(pose: Partial<Pose>) {
    Object.assign(this.current, pose);
    this.apply();
  }

  /** target 으로 감쇠. 아직 움직이면 true */
  tick(dt: number): boolean {
    if (this.driven || !this.group.visible) return false;
    const c = this.current;
    const t = this.target;
    const dp = Math.hypot(c.pos[0] - t.pos[0], c.pos[1] - t.pos[1], c.pos[2] - t.pos[2]);
    const dr =
      Math.abs(wrapAngle(c.yaw - t.yaw)) +
      Math.abs(c.pitch - t.pitch) +
      Math.abs(c.roll - t.roll) +
      Math.abs(wrapAngle(c.flip - t.flip)) +
      Math.abs(wrapAngle(c.spin - t.spin)) +
      Math.abs(c.scale - t.scale);
    if (dp < 0.0008 && dr < 0.002) {
      if (dp > 0 || dr > 0) {
        this.current = { ...t };
        this.apply();
      }
      return false;
    }
    const k = SNAP_LAMBDA;
    this.current = {
      pos: [damp(c.pos[0], t.pos[0], k, dt), damp(c.pos[1], t.pos[1], k, dt), damp(c.pos[2], t.pos[2], k, dt)],
      yaw: t.yaw + damp(wrapAngle(c.yaw - t.yaw), 0, k, dt),
      pitch: damp(c.pitch, t.pitch, k, dt),
      roll: damp(c.roll, t.roll, k, dt),
      flip: t.flip + damp(wrapAngle(c.flip - t.flip), 0, k, dt),
      spin: t.spin + damp(wrapAngle(c.spin - t.spin), 0, k, dt),
      scale: damp(c.scale, t.scale, k, dt),
    };
    this.apply();
    return true;
  }
}
