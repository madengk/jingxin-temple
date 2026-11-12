/**
 * Overlay tools: a 3D wooden-fish + mallet (click to strike) and a 3D
 * 108-bead string with guru bead. Usable at the same time.
 * No 功德 floaties — a strike only shows a quiet ripple on the fish.
 */
import * as THREE from "three";

function wood(color: number, rough = 0.55) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.06 });
}

function makeMuyuMesh(): { fish: THREE.Group; mallet: THREE.Group } {
  const fish = new THREE.Group();
  const bodyM = wood(0x9a5a28, 0.48);
  const dark = wood(0x5a3014, 0.6);
  // Hollow-looking rounded body (wooden fish is a slit camphor-wood oval)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 20), bodyM);
  body.scale.set(1.15, 0.85, 0.95);
  body.castShadow = true;
  fish.add(body);
  // slit
  const slit = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.06, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x1a0c06, roughness: 0.8 }),
  );
  slit.position.set(0, 0.22, 0.28);
  slit.rotation.x = -0.35;
  fish.add(slit);
  // carved eye bumps
  fish.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), dark, 0.38, 0.25, 0.38));
  fish.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), dark, -0.38, 0.25, 0.38));
  // base ring
  const base = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 20), dark);
  base.rotation.x = Math.PI / 2;
  base.position.y = -0.42;
  fish.add(base);
  fish.position.set(0, 0.05, 0);

  const mallet = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.15, 10), wood(0x6a3a18));
  handle.position.y = 0.4;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), wood(0x4a2810, 0.45));
  head.position.y = -0.22;
  mallet.add(handle, head);
  mallet.position.set(0.85, 0.55, 0.55);
  mallet.rotation.set(-0.6, 0.4, -0.5);
  mallet.userData.rest = mallet.rotation.clone();
  return { fish, mallet };
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x=0,y=0,z=0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x,y,z);
  m.castShadow = true;
  return m;
}

function smallScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
  scene.add(new THREE.AmbientLight(0xffe8c8, 0.7));
  const key = new THREE.DirectionalLight(0xffe0b0, 1.3);
  key.position.set(2, 3, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc8d8ff, 0.35);
  fill.position.set(-3, 1, -2);
  scene.add(fill);
  return { renderer, scene, camera };
}

export class MuyuPanel {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private mallet: THREE.Group;
  private fish: THREE.Group;
  private ripples: { mesh: THREE.Mesh; t: number }[] = [];
  private strikeT = 0;
  private rest = new THREE.Euler();
  onStrike: () => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    const s = smallScene(canvas);
    this.renderer = s.renderer;
    this.scene = s.scene;
    this.camera = s.camera;
    this.camera.position.set(0, 1.15, 3.15);
    this.camera.lookAt(0, 0.1, 0);

    const { fish, mallet } = makeMuyuMesh();
    this.fish = fish;
    this.mallet = mallet;
    this.rest.copy(mallet.rotation);
    this.scene.add(fish, mallet);

    const strike = (e: Event) => {
      e.preventDefault();
      this.strike();
    };
    canvas.addEventListener("pointerdown", strike);
    canvas.style.touchAction = "none";
    canvas.style.cursor = "pointer";
    this.resize();
  }

  resize() {
    const c = this.renderer.domElement;
    const r = c.getBoundingClientRect();
    const w = Math.max(64, Math.floor(r.width * (window.devicePixelRatio || 1)));
    const h = Math.max(64, Math.floor(r.height * (window.devicePixelRatio || 1)));
    if (c.width !== w || c.height !== h) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = r.width / Math.max(1, r.height);
      this.camera.updateProjectionMatrix();
    }
  }

  strike() {
    this.strikeT = 1;
    this.onStrike();
    // subtle ripple ring on the fish — respectful, no floating text
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.16, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffe7b0,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2 + 0.4;
    ring.position.set(0, 0.35, 0.25);
    this.scene.add(ring);
    this.ripples.push({ mesh: ring, t: 0 });
  }

  update(dt: number) {
    this.resize();
    if (this.strikeT > 0) {
      this.strikeT = Math.max(0, this.strikeT - dt * 5.2);
      const s = Math.sin((1 - this.strikeT) * Math.PI);
      this.mallet.rotation.z = this.rest.z - s * 0.95;
      this.mallet.rotation.x = this.rest.x - s * 0.35;
      this.fish.scale.setScalar(1 + (this.strikeT > 0.5 ? (1 - this.strikeT) * 0.04 : this.strikeT * 0.04));
    } else {
      this.mallet.rotation.copy(this.rest);
      this.fish.scale.setScalar(1);
    }
    // idle sway
    const t = performance.now() * 0.001;
    this.fish.rotation.y = Math.sin(t * 0.4) * 0.08;
    const remain: typeof this.ripples = [];
    for (const r of this.ripples) {
      r.t += dt;
      const k = r.t / 0.55;
      r.mesh.scale.setScalar(1 + k * 2.4);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k);
      if (k < 1) remain.push(r);
      else {
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        (r.mesh.material as THREE.Material).dispose();
      }
    }
    this.ripples = remain;
    this.renderer.render(this.scene, this.camera);
  }
}

export class BeadsPanel {
  count = 0;
  rounds = 0;
  onAdvance: (count: number, completedRound: boolean) => void = () => {};
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private beads: THREE.Mesh[] = [];
  private group = new THREE.Group();
  private rot = 0;
  private targetRot = 0;
  private dragging = false;
  private lastAng = 0;
  private acc = 0;

  constructor(canvas: HTMLCanvasElement) {
    const s = smallScene(canvas);
    this.renderer = s.renderer;
    this.scene = s.scene;
    this.camera = s.camera;
    this.camera.position.set(0, 0.35, 3.4);
    this.camera.lookAt(0, 0, 0);

    const bodhi = new THREE.MeshStandardMaterial({ color: 0x8a5a28, roughness: 0.55, metalness: 0.08 });
    const guruM = new THREE.MeshStandardMaterial({ color: 0xd4b056, roughness: 0.35, metalness: 0.45 });
    const doneM = new THREE.MeshStandardMaterial({ color: 0xc9a84c, roughness: 0.45, metalness: 0.25 });
    const curM = new THREE.MeshStandardMaterial({ color: 0xf0d9a0, roughness: 0.35, metalness: 0.35, emissive: 0x6a5010, emissiveIntensity: 0.2 });
    const cord = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.7 });

    const R = 0.95;
    // cord loop
    const torus = new THREE.Mesh(new THREE.TorusGeometry(R, 0.012, 8, 64), cord);
    torus.rotation.x = 0.55;
    this.group.add(torus);

    for (let i = 0; i < 108; i++) {
      const isGuru = i === 0;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(isGuru ? 0.072 : 0.048, 10, 8),
        isGuru ? guruM.clone() : bodhi.clone(),
      );
      m.userData = { isGuru, base: isGuru ? guruM : bodhi, doneM, curM };
      const a = -Math.PI / 2 + (i / 108) * Math.PI * 2;
      // slight oval, tilted like a held mala
      m.position.set(Math.cos(a) * R, Math.sin(a) * R * 0.95, Math.sin(a) * 0.12);
      this.group.add(m);
      this.beads.push(m);
    }
    // tassel under the guru bead
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.28, 8), guruM);
    tassel.position.set(0, -R - 0.18, 0);
    tassel.rotation.x = 0.2;
    this.group.add(tassel);
    this.scene.add(this.group);
    this.group.rotation.x = 0.15;

    canvas.style.touchAction = "none";
    canvas.style.cursor = "pointer";
    const start = (e: PointerEvent) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      this.dragging = true;
      this.lastAng = this.angle(e);
      this.acc = 0;
    };
    const move = (e: PointerEvent) => {
      if (!this.dragging) return;
      const a = this.angle(e);
      let d = a - this.lastAng;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      this.lastAng = a;
      this.acc += Math.abs(d);
      const step = 0.11;
      while (this.acc >= step) {
        this.acc -= step;
        this.advance();
      }
    };
    const end = (e: PointerEvent) => {
      if (!this.dragging) return;
      const was = this.acc > 0.02;
      this.dragging = false;
      if (!was) this.advance();
    };
    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    this.colorBeads();
    this.resize();
  }

  private angle(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  }

  advance() {
    this.count += 1;
    let round = false;
    if (this.count >= 108) {
      this.count = 0;
      this.rounds += 1;
      round = true;
    }
    this.targetRot -= (Math.PI * 2) / 108;
    this.colorBeads();
    this.onAdvance(this.count, round);
  }

  private colorBeads() {
    for (let i = 0; i < 108; i++) {
      const b = this.beads[i];
      const { isGuru, base, doneM, curM } = b.userData;
      if (isGuru) continue;
      const done = this.count > 0 && i > 0 && i <= this.count;
      const cur = i === this.count;
      b.material = cur ? curM : done ? doneM : base;
      b.scale.setScalar(cur ? 1.25 : 1);
    }
  }

  resize() {
    const c = this.renderer.domElement;
    const r = c.getBoundingClientRect();
    const w = Math.max(64, Math.floor(r.width * (window.devicePixelRatio || 1)));
    const h = Math.max(64, Math.floor(r.height * (window.devicePixelRatio || 1)));
    if (c.width !== w || c.height !== h) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = r.width / Math.max(1, r.height);
      this.camera.updateProjectionMatrix();
    }
  }

  update(dt: number) {
    this.resize();
    this.rot += (this.targetRot - this.rot) * Math.min(1, dt * 8);
    this.group.rotation.z = this.rot;
    this.group.rotation.y = Math.sin(performance.now() * 0.0004) * 0.12;
    this.renderer.render(this.scene, this.camera);
  }
}
