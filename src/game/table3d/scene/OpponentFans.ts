/**
 * 상대 손패. 장수만 보이면 되므로 뒷면 카드를 InstancedMesh 하나로 그린다.
 */

import * as THREE from 'three';

import { fanOffset } from '../core/layout';
import { CARD_SIZE, type TableLayout } from '../core/types';
import { backMaterialDouble, cardPlaneGeometry } from '../materials/card-materials';

const MAX = 8 * 12;

export class OpponentFans {
  readonly mesh: THREE.InstancedMesh;
  private readonly dummy = new THREE.Object3D();

  constructor() {
    this.mesh = new THREE.InstancedMesh(cardPlaneGeometry(CARD_SIZE.w, CARD_SIZE.h), backMaterialDouble(), MAX);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
  }

  /** counts[i] = i 번 좌석의 손패 장수. viewer 좌석은 0 으로 넘긴다 */
  update(layout: TableLayout, counts: number[]) {
    let k = 0;
    const d = this.dummy;
    d.rotation.order = 'YXZ';
    for (let i = 0; i < layout.n && i < counts.length; i++) {
      const seat = layout.seats[i];
      const n = Math.min(counts[i], 12);
      for (let j = 0; j < n && k < MAX; j++) {
        const { dx, rot } = fanOffset(j, n);
        // 매트 기준 오른쪽 방향 = inward 를 y 축으로 -90° 돌린 것
        const rx = -seat.inward[2];
        const rz = seat.inward[0];
        d.position.set(
          seat.hand[0] + rx * dx,
          0.01 + j * CARD_SIZE.thickness,
          seat.hand[2] + rz * dx,
        );
        d.rotation.set(-Math.PI / 2, seat.yaw, rot);
        d.scale.setScalar(0.92);
        d.updateMatrix();
        this.mesh.setMatrixAt(k++, d.matrix);
      }
    }
    this.mesh.count = k;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
