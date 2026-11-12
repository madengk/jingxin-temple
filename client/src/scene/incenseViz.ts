/**
 * Instanced incense sticks: shorten as they burn (server litAt + 10 min),
 * glowing ember tips, rising smoke. No labels, no HUD countdown.
 */
import * as THREE from "three";
import { INCENSE_DURATION_MS } from "../../../server/src/shared";
import { SmokeSystem } from "./fx";

export type StickIn = { id: string; x: number; z: number; litAt: number; burnerId?: string };

const MAX = 2048;
const FULL_LEN = 0.82;

export class IncenseField {
  group = new THREE.Group();
  smoke = new SmokeSystem();
  private sticks: THREE.InstancedMesh;
  private embers: THREE.InstancedMesh;
  private emberLightPool: THREE.PointLight[] = [];
  private list: StickIn[] = [];
  private dummy = new THREE.Object3D();
  private emberDummy = new THREE.Object3D();

  constructor() {
    const shaft = new THREE.CylinderGeometry(0.012, 0.014, 1, 6);
    shaft.translate(0, 0.5, 0); // scale-Y from the base
    const wood = new THREE.MeshStandardMaterial({
      color: 0xc4a56a,
      roughness: 0.7,
      metalness: 0.05,
    });
    this.sticks = new THREE.InstancedMesh(shaft, wood, MAX);
    this.sticks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.sticks.castShadow = true;
    this.sticks.count = 0;
    this.sticks.frustumCulled = false;

    const tip = new THREE.SphereGeometry(0.018, 8, 6);
    const emberM = new THREE.MeshStandardMaterial({
      color: 0xff5a20,
      emissive: 0xff3a10,
      emissiveIntensity: 1.6,
      roughness: 0.4,
      metalness: 0.1,
    });
    this.embers = new THREE.InstancedMesh(tip, emberM, MAX);
    this.embers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.embers.count = 0;
    this.embers.frustumCulled = false;

    this.group.add(this.sticks, this.embers, this.smoke.points);
    // A few shared glow lights near the busiest burners (not one per stick).
    for (let i = 0; i < 8; i++) {
      const l = new THREE.PointLight(0xff6a30, 0, 2.4, 2);
      l.castShadow = false;
      this.group.add(l);
      this.emberLightPool.push(l);
    }
  }

  sync(list: StickIn[]) {
    this.list = list;
    this.smoke.sync(list);
  }

  update(dt: number) {
    const now = Date.now();
    const live = this.list.filter((s) => now - s.litAt < INCENSE_DURATION_MS && now - s.litAt >= 0);
    const n = Math.min(live.length, MAX);
    this.sticks.count = n;
    this.embers.count = n;

    // Cluster lights at unique burner positions (average of sticks nearby).
    const clusters = new Map<string, { x: number; z: number; y: number; n: number }>();

    for (let i = 0; i < n; i++) {
      const s = live[i];
      const t = Math.min(1, Math.max(0, (now - s.litAt) / INCENSE_DURATION_MS));
      // Shorten to a stub near the end; never a countdown, just the length.
      const len = FULL_LEN * (1 - t * 0.92);
      const leanX = Math.sin(s.x * 17.1 + s.z * 9.3) * 0.08;
      const leanZ = Math.cos(s.x * 11.7 + s.z * 13.1) * 0.08;
      this.dummy.position.set(s.x, 0.92, s.z); // ash-bowl lip; hall burner bowl is ~0.92 high
      this.dummy.rotation.set(leanZ, 0, -leanX);
      this.dummy.scale.set(1, len, 1);
      this.dummy.updateMatrix();
      this.sticks.setMatrixAt(i, this.dummy.matrix);

      // Ember at the current tip
      const tipY = 0.92 + len * Math.cos(Math.hypot(leanX, leanZ));
      this.emberDummy.position.set(
        s.x + leanX * len,
        tipY,
        s.z + leanZ * len,
      );
      const pulse = 0.85 + Math.sin(now * 0.012 + i) * 0.15;
      this.emberDummy.scale.setScalar(pulse);
      this.emberDummy.updateMatrix();
      this.embers.setMatrixAt(i, this.emberDummy.matrix);

      const key = s.burnerId ?? `${s.x.toFixed(1)},${s.z.toFixed(1)}`;
      const c = clusters.get(key) ?? { x: 0, z: 0, y: 0, n: 0 };
      c.x += s.x;
      c.z += s.z;
      c.y += tipY;
      c.n += 1;
      clusters.set(key, c);
    }
    this.sticks.instanceMatrix.needsUpdate = true;
    this.embers.instanceMatrix.needsUpdate = true;

    const cl = [...clusters.values()].slice(0, this.emberLightPool.length);
    this.emberLightPool.forEach((l, i) => {
      if (cl[i]) {
        l.position.set(cl[i].x / cl[i].n, cl[i].y / cl[i].n, cl[i].z / cl[i].n);
        l.intensity = Math.min(1.6, 0.25 + cl[i].n * 0.04);
        l.visible = true;
      } else {
        l.intensity = 0;
        l.visible = false;
      }
    });

    // Tell smoke the current tip height by patching emitters — SmokeSystem uses y=1.2.
    this.smoke.update(dt);
  }
}
