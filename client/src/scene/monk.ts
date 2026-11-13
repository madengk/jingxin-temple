import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RITUAL_PHASE, RITUAL_PHASE_MS, ritualPhaseAt } from "../../../server/src/shared";

/** Kept for server look-id compatibility. All players share 造型四; no variants. */
export const MONK_LOOKS: { sash: number }[] = [
  { sash: 0x8d5a36 },
  { sash: 0x8d5a36 },
  { sash: 0x8d5a36 },
  { sash: 0x8d5a36 },
  { sash: 0x8d5a36 },
  { sash: 0x8d5a36 },
  { sash: 0x8d5a36 },
  { sash: 0x8d5a36 },
];

/** In-game standing height. Seated model uses the same world scale (shorter). */
export const MONK_HEIGHT = 1.28;
const STAND_URL = "/statues/fal/monk-stand.glb";
const SIT_URL = "/statues/fal/monk-sit.glb";
/** Cushion / mat top. Seated mesh sits on this. */
const SIT_Y = 0.07;
/**
 * Extra yaw baked onto the cloned mesh so the face looks toward +Z
 * (game forward). Adjusted after studio previews if the GLB faces another axis.
 */
let MESH_YAW = 0;

const loader = new GLTFLoader();
type Templates = { stand: THREE.Group; sit: THREE.Group; sitHeight: number };
let templates: Templates | null = null;
let loadPromise: Promise<Templates> | null = null;

function prepareTemplate(root: THREE.Object3D): THREE.Group {
  const g = root;
  g.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const raw of mats) {
      const m = raw as THREE.MeshStandardMaterial;
      if (m && "envMapIntensity" in m) {
        m.envMapIntensity = 0.85;
        m.needsUpdate = true;
      }
    }
  });
  return g as THREE.Group;
}

function loadOne(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(prepareTemplate(gltf.scene)),
      undefined,
      (err) => reject(err),
    );
  });
}

/** Preload both GLBs once. All player monks clone these templates (shared geo + mats). */
export function preloadMonks(): Promise<Templates> {
  if (templates) return Promise.resolve(templates);
  if (!loadPromise) {
    loadPromise = Promise.all([loadOne(STAND_URL), loadOne(SIT_URL)]).then(([stand, sit]) => {
      const box = new THREE.Box3().setFromObject(sit);
      templates = { stand, sit, sitHeight: Math.max(0.01, box.max.y - box.min.y) };
      return templates;
    });
  }
  return loadPromise;
}

/** Clone a template without duplicating geometry or materials. */
function cloneTemplate(src: THREE.Group): THREE.Group {
  const g = src.clone(true);
  g.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry = (o as THREE.Mesh).geometry;
      mesh.material = (o as THREE.Mesh).material;
    }
  });
  return g;
}

function easeInOut(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2;
}

/** Forward pitch (radians) for the three respectful bows, plus a slight lean when planting. */
export function ritualBowPitch(elapsedMs: number): number {
  const raise = RITUAL_PHASE_MS[RITUAL_PHASE.RAISE];
  const bow = RITUAL_PHASE_MS[RITUAL_PHASE.BOW1];
  const plant = RITUAL_PHASE_MS[RITUAL_PHASE.PLANT];
  if (elapsedMs < raise) return 0;
  let t = elapsedMs - raise;
  const bows = 3;
  const max = 0.78;
  if (t >= bow * bows) {
    const u = Math.min(1, (t - bow * bows) / plant);
    return 0.14 * Math.sin(Math.min(1, u) * Math.PI);
  }
  const u = (t % bow) / bow;
  if (u < 0.4) return easeInOut(u / 0.4) * max;
  if (u < 0.55) return max;
  return (1 - easeInOut((u - 0.55) / 0.45)) * max;
}

export class Monk {
  group = new THREE.Group();
  look: number;
  /** Screenshot / debug overrides. null = follow gameplay state. */
  debugMoving: boolean | null = null;
  debugSitting: boolean | null = null;
  debugPhase: number | null = null;

  private root = new THREE.Group();
  private stand: THREE.Group | null = null;
  private sit: THREE.Group | null = null;
  private sitHeight = 0.9;
  private phase = Math.random() * Math.PI * 2;
  private sitBlend = 0;
  private breath = Math.random() * 10;
  private ready = false;
  private ritualPhase = 0;
  private ritualStartedAt = 0;
  private sticks: THREE.Group | null = null;

  constructor(look: number) {
    this.look = look % MONK_LOOKS.length;
    this.root.scale.setScalar(MONK_HEIGHT);
    this.group.add(this.root);
    void this.attach();
  }

  private async attach() {
    try {
      const t = await preloadMonks();
      if (this.stand) return;
      this.stand = cloneTemplate(t.stand);
      this.sit = cloneTemplate(t.sit);
      this.sitHeight = t.sitHeight;
      this.stand.rotation.y = MESH_YAW;
      this.sit.rotation.y = MESH_YAW;
      this.sit.visible = false;
      this.root.add(this.stand, this.sit);
      this.ensureSticks();
      this.ready = true;
    } catch (err) {
      console.warn("Failed to load monk GLBs", err);
    }
  }

  /** Drive the incense ritual (0 = none). startedAt is server Unix ms. */
  setRitual(phase: number, startedAt = 0) {
    this.ritualPhase = phase;
    this.ritualStartedAt = startedAt;
    this.ensureSticks();
    if (this.sticks) {
      this.sticks.visible = phase >= RITUAL_PHASE.RAISE && phase <= RITUAL_PHASE.PLANT;
    }
    if (phase <= 0) {
      this.root.rotation.x = 0;
      if (this.sticks) {
        this.sticks.visible = false;
        this.sticks.position.set(0, 0.56, 0.22);
        this.sticks.rotation.x = 0;
      }
    }
  }

  ritualActive(): boolean {
    return this.ritualPhase > 0 && this.ritualPhase < RITUAL_PHASE.DONE;
  }

  private ensureSticks() {
    if (this.sticks) return;
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({
      color: 0xc4a56a,
      roughness: 0.65,
      metalness: 0.05,
    });
    const ember = new THREE.MeshStandardMaterial({
      color: 0xff5a20,
      emissive: 0xff3a10,
      emissiveIntensity: 1.8,
      roughness: 0.4,
      metalness: 0.08,
    });
    for (let i = 0; i < 3; i++) {
      const stick = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.48, 6), wood);
      shaft.position.y = 0.24;
      shaft.castShadow = true;
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), ember);
      tip.position.y = 0.49;
      const glow = new THREE.PointLight(0xff6a30, 0.28, 0.85, 2);
      glow.position.y = 0.49;
      stick.add(shaft, tip, glow);
      stick.position.set((i - 1) * 0.036, 0, 0);
      stick.rotation.z = (i - 1) * 0.09;
      g.add(stick);
    }
    g.position.set(0, 0.58, 0.32);
    g.visible = false;
    this.sticks = g;
    this.root.add(g);
  }

  /** Local-space height of the crown (for nametags). */
  crownY(): number {
    const h = this.sitBlend > 0.5
      ? this.sitHeight * MONK_HEIGHT + SIT_Y
      : MONK_HEIGHT;
    return h + 0.04;
  }

  /** World-space height of the crown, for camera hooks. */
  headWorldY(): number {
    return this.group.position.y + this.crownY();
  }

  update(dt: number, moving: boolean, sitting: boolean) {
    if (this.ritualPhase > 0) {
      this.updateRitual(dt);
      return;
    }

    if (this.debugMoving !== null) moving = this.debugMoving;
    if (this.debugSitting !== null) sitting = this.debugSitting;

    this.breath += dt;
    const targetSit = sitting ? 1 : 0;
    if (this.debugSitting !== null && this.debugPhase !== null) {
      this.sitBlend = targetSit;
    } else {
      this.sitBlend += (targetSit - this.sitBlend) * Math.min(1, dt * 6);
    }

    if (this.debugPhase !== null) this.phase = this.debugPhase;
    else if (moving && this.sitBlend < 0.2) this.phase += dt * 8;
    else this.phase += dt * 1.4;

    if (this.stand && this.sit) {
      const showSit = this.sitBlend >= 0.5;
      this.stand.visible = !showSit;
      this.sit.visible = showSit;
    }

    const walk = (1 - this.sitBlend) * (moving ? 1 : 0);
    const bob = walk ? Math.abs(Math.sin(this.phase * 2)) * 0.04 : 0;
    const sway = walk ? Math.sin(this.phase) * 0.07 : 0;
    const tilt = walk * 0.1;
    const breath = Math.sin(this.breath * 1.6) * 0.008;

    this.root.position.y = this.sitBlend * SIT_Y + bob + (this.sitBlend > 0.5 ? breath * 0.6 : breath);
    this.root.rotation.z = sway;
    this.root.rotation.x = tilt;
    if (this.stand) {
      const s = 1 + (this.sitBlend < 0.5 ? breath * 0.35 : 0);
      this.stand.scale.set(1, s, 1);
    }
    if (this.sit) {
      const s = 1 + (this.sitBlend >= 0.5 ? breath * 0.25 : 0);
      this.sit.scale.set(1, s, 1);
    }
    if (this.sticks) this.sticks.visible = false;
  }

  private updateRitual(_dt: number) {
    this.breath += _dt;
    if (this.stand && this.sit) {
      this.stand.visible = true;
      this.sit.visible = false;
    }
    const elapsed = this.ritualStartedAt > 0
      ? Math.max(0, Date.now() - this.ritualStartedAt)
      : 0;
    const phase = this.ritualStartedAt > 0 ? ritualPhaseAt(elapsed) : this.ritualPhase;
    const pitch = ritualBowPitch(elapsed);
    this.root.rotation.x = pitch;
    this.root.rotation.z = 0;
    this.root.position.y = pitch * 0.05 + Math.sin(this.breath * 1.6) * 0.004;
    if (this.stand) {
      const breath = Math.sin(this.breath * 1.6) * 0.004;
      this.stand.scale.set(1, 1 + breath, 1);
    }

    if (this.sticks) {
      const raise = RITUAL_PHASE_MS[RITUAL_PHASE.RAISE];
      const plantStart =
        raise +
        RITUAL_PHASE_MS[RITUAL_PHASE.BOW1] +
        RITUAL_PHASE_MS[RITUAL_PHASE.BOW2] +
        RITUAL_PHASE_MS[RITUAL_PHASE.BOW3];
      const plantDur = RITUAL_PHASE_MS[RITUAL_PHASE.PLANT];
      this.sticks.visible = phase >= RITUAL_PHASE.RAISE && phase <= RITUAL_PHASE.PLANT;
      if (phase === RITUAL_PHASE.PLANT) {
        const t = Math.min(1, Math.max(0, (elapsed - plantStart) / plantDur));
        const e = easeInOut(t);
        this.sticks.position.set(0, 0.58 - e * 0.42, 0.32 + e * 0.45);
        this.sticks.rotation.x = e * 0.7;
        if (t > 0.82) this.sticks.visible = false;
      } else {
        const t = Math.min(1, elapsed / raise);
        this.sticks.position.set(0, 0.46 + t * 0.12, 0.26 + t * 0.08);
        this.sticks.rotation.x = (1 - t) * 0.25;
      }
    }
  }
}

/** Used by the studio preview script if the baked facing is off. */
export function setMonkMeshYaw(radians: number) {
  MESH_YAW = radians;
}
