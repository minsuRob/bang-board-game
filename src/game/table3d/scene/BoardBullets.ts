/**
 * 보드 위 목숨 총알. 남은 목숨만큼 총알 칸에 총알을 눕힌다.
 *
 * 잃은 칸은 비워 두어 그림의 흰 윤곽만 보이고, 최대 목숨을 넘는 칸은 어둡게 덮는다.
 */

import * as THREE from 'three';

import type { GameState } from '../../engine';
import { BOARD_SLOTS } from '../core/layout';
import { BOARD_SIZE, type TableLayout } from '../core/types';
import { bulletMaterial } from '../materials/card-materials';

const PER_SEAT = BOARD_SLOTS.bullets.length;
const MAX = 8 * PER_SEAT;

/** 총알 한 발 크기 (보드 폭 기준 비율) */
const LEN = 0.155;
/** 그림의 윤곽처럼 오른쪽 아래로 기울인다 */
const TILT = -0.61;

export class BoardBullets {
  readonly root = new THREE.Group();
  private readonly bullets: THREE.InstancedMesh;
  private readonly blanks: THREE.InstancedMesh;
  private readonly dummy = new THREE.Object3D();

  constructor() {
    const geo = new THREE.PlaneGeometry(1, 1);
    this.bullets = new THREE.InstancedMesh(geo, bulletMaterial(), MAX);
    this.blanks = new THREE.InstancedMesh(
      new THREE.CircleGeometry(0.5, 20),
      new THREE.MeshBasicMaterial({ color: '#1A120A', transparent: true, opacity: 0.6, depthWrite: false }),
      MAX,
    );
    for (const m of [this.bullets, this.blanks]) {
      m.count = 0;
      m.frustumCulled = false;
      this.root.add(m);
    }
    this.dummy.rotation.order = 'YXZ';
  }

  update(layout: TableLayout, state: GameState) {
    let nb = 0;
    let nx = 0;
    const d = this.dummy;
    state.players.forEach((p, i) => {
      const seat = layout.seats[i];
      if (!seat || state.draft || (!p.alive && !p.ghost)) return;
      const hp = Math.max(0, p.hp);
      seat.bullets.forEach((at, j) => {
        const len = LEN * BOARD_SIZE.w * seat.scale;
        if (j < hp) {
          d.position.set(at[0], 0.012, at[2]);
          d.rotation.set(-Math.PI / 2, seat.yaw, TILT);
          d.scale.set(len, len / 3, 1);
          d.updateMatrix();
          this.bullets.setMatrixAt(nb++, d.matrix);
        } else if (j >= p.maxHp) {
          d.position.set(at[0], 0.011, at[2]);
          d.rotation.set(-Math.PI / 2, seat.yaw, 0);
          d.scale.set(len * 0.9, len * 0.9, 1);
          d.updateMatrix();
          this.blanks.setMatrixAt(nx++, d.matrix);
        }
      });
    });
    this.bullets.count = nb;
    this.blanks.count = nx;
    this.bullets.instanceMatrix.needsUpdate = true;
    this.blanks.instanceMatrix.needsUpdate = true;
  }
}
