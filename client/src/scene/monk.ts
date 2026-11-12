import * as THREE from "three";

/** Chibi 小和尚: big orange bald head, small body, grey robe, yellow sash.
 *  Looks are subtle sash-tint variations only — the silhouette stays consistent. */
export const MONK_LOOKS: { sash: number }[] = [
  { sash: 0xefd85a },
  { sash: 0xe8c84a },
  { sash: 0xf0dc6e },
  { sash: 0xe6d050 },
  { sash: 0xf2e080 },
  { sash: 0xe8ce58 },
  { sash: 0xedd46a },
  { sash: 0xe2c648 },
];

const SKIN = 0xf0b888;
const ROBE = 0x8e989e;
const ROBE_DK = 0x7a858c;
const SHOE = 0x6a7378;

function std(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.04, ...opts });
}

export class Monk {
  group = new THREE.Group();
  look: number;
  private root = new THREE.Group();
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private torso: THREE.Group;
  private head: THREE.Group;
  private phase = Math.random() * Math.PI * 2;
  private sitBlend = 0;
  private breath = Math.random() * 10;

  constructor(look: number) {
    this.look = look % MONK_LOOKS.length;
    const sashCol = MONK_LOOKS[this.look].sash;
    const robe = std(ROBE);
    const robeDk = std(ROBE_DK);
    const sash = std(sashCol, { roughness: 0.62 });
    const skin = std(SKIN, { roughness: 0.5 });
    const shoe = std(SHOE);

    this.group.add(this.root);

    this.leftLeg = this.makeLeg(robeDk, shoe);
    this.rightLeg = this.makeLeg(robeDk, shoe);
    this.leftLeg.position.set(0.09, 0.28, 0);
    this.rightLeg.position.set(-0.09, 0.28, 0);
    this.root.add(this.leftLeg, this.rightLeg);

    this.torso = new THREE.Group();
    this.torso.position.y = 0.46;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.195, 0.36, 14), robe);
    body.position.y = 0.16;
    body.castShadow = true;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.16, 14), robe);
    skirt.position.y = -0.04;
    // Yellow sash / vest panel — front and back, as in the reference.
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.22), sash);
    panel.position.set(0, 0.15, 0);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.022, 8, 16), sash);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.02;
    this.torso.add(body, skirt, panel, belt);
    this.root.add(this.torso);

    this.leftArm = this.makeArm(robe, skin, 1);
    this.rightArm = this.makeArm(robe, skin, -1);
    this.leftArm.position.set(0.2, 0.78, 0);
    this.rightArm.position.set(-0.2, 0.78, 0);
    this.root.add(this.leftArm, this.rightArm);

    this.head = new THREE.Group();
    this.head.position.y = 0.98;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.265, 22, 18), skin);
    skull.scale.set(1.02, 1.0, 0.98);
    skull.castShadow = true;
    // tiny ears
    const earG = new THREE.SphereGeometry(0.055, 8, 8);
    const le = new THREE.Mesh(earG, skin);
    const re = new THREE.Mesh(earG, skin);
    le.position.set(0.25, -0.02, 0);
    re.position.set(-0.25, -0.02, 0);
    le.scale.set(0.55, 1.05, 0.7);
    re.scale.set(0.55, 1.05, 0.7);
    // simple peaceful face (barely visible from behind)
    const lid = std(0x5a3a32, { roughness: 0.6 });
    const eyeG = new THREE.BoxGeometry(0.07, 0.016, 0.01);
    const eyeL = new THREE.Mesh(eyeG, lid);
    const eyeR = new THREE.Mesh(eyeG, lid);
    eyeL.position.set(0.08, 0.02, 0.24);
    eyeR.position.set(-0.08, 0.02, 0.24);
    eyeL.rotation.z = 0.18;
    eyeR.rotation.z = -0.18;
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.007, 6, 8, Math.PI), lid);
    smile.position.set(0, -0.08, 0.24);
    smile.rotation.set(0.5, 0, Math.PI);
    this.head.add(skull, le, re, eyeL, eyeR, smile);
    this.root.add(this.head);

    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }

  private makeLeg(robe: THREE.Material, shoe: THREE.Material) {
    const g = new THREE.Group();
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.26, 8), robe);
    thigh.position.y = -0.12;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.14), shoe);
    foot.position.set(0, -0.27, 0.02);
    g.add(thigh, foot);
    return g;
  }

  private makeArm(robe: THREE.Material, skin: THREE.Material, side: number) {
    const g = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.28, 8), robe);
    upper.position.y = -0.13;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), skin);
    hand.position.y = -0.29;
    g.add(upper, hand);
    g.rotation.z = side * 0.22;
    return g;
  }

  /** Height of the crown, for nametag / camera. */
  headWorldY(): number {
    return this.group.position.y + 1.28;
  }

  update(dt: number, moving: boolean, sitting: boolean) {
    this.breath += dt;
    const targetSit = sitting ? 1 : 0;
    this.sitBlend += (targetSit - this.sitBlend) * Math.min(1, dt * 5);

    if (moving && this.sitBlend < 0.2) this.phase += dt * 9;
    else this.phase += dt * 1.2;

    const walk = (1 - this.sitBlend) * (moving ? 1 : 0);
    const swing = Math.sin(this.phase) * 0.65 * walk;
    this.leftLeg.rotation.x = swing + this.sitBlend * 1.25;
    this.rightLeg.rotation.x = -swing + this.sitBlend * 1.25;
    this.leftLeg.rotation.y = this.sitBlend * 0.65;
    this.rightLeg.rotation.y = -this.sitBlend * 0.65;
    this.leftLeg.rotation.z = this.sitBlend * 0.5;
    this.rightLeg.rotation.z = -this.sitBlend * 0.5;

    this.leftArm.rotation.x = -swing * 0.65 - this.sitBlend * 0.85;
    this.rightArm.rotation.x = swing * 0.65 - this.sitBlend * 0.85;
    this.leftArm.rotation.z = 0.22 + this.sitBlend * 0.45;
    this.rightArm.rotation.z = -0.22 - this.sitBlend * 0.45;

    const bob = moving && this.sitBlend < 0.2 ? Math.abs(Math.sin(this.phase * 2)) * 0.03 : 0;
    const breath = Math.sin(this.breath * 1.5) * 0.01;
    this.torso.scale.y = 1 + breath * 0.35;
    // Sit down onto the thin mat (mat top ≈ 0.07).
    this.root.position.y = bob - this.sitBlend * 0.18 + breath * 0.12;
    this.head.rotation.x = this.sitBlend * 0.08;
  }
}
