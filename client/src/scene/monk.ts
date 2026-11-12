import * as THREE from "three";

/** All playable looks are little monks — only robe color and small accessories vary. */
export const MONK_LOOKS: {
  robe: number;
  sash: number;
  inner: number;
  accessory: "none" | "beads" | "kasaya" | "bag" | "headcloth" | "rosary";
}[] = [
  { robe: 0xc4652a, sash: 0xe8c56a, inner: 0xecd5a8, accessory: "beads" },
  { robe: 0x6b3e26, sash: 0xc4652a, inner: 0xe2c49a, accessory: "kasaya" },
  { robe: 0x6a6460, sash: 0x3d3a38, inner: 0xd8d0c4, accessory: "bag" },
  { robe: 0x7a2e32, sash: 0xd4b06a, inner: 0xe8d0a8, accessory: "beads" },
  { robe: 0xb8862a, sash: 0x5c3a21, inner: 0xf0e0b8, accessory: "none" },
  { robe: 0x8b3a2a, sash: 0xe8d5a3, inner: 0xe6c8a0, accessory: "headcloth" },
  { robe: 0xa67c4e, sash: 0x4a3020, inner: 0xead4ac, accessory: "rosary" },
  { robe: 0x4a5a62, sash: 0xc4b49a, inner: 0xd8dce0, accessory: "kasaya" },
];

const SKIN = 0xe0b894;

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
    const L = MONK_LOOKS[this.look];
    const robe = std(L.robe);
    const sash = std(L.sash);
    const skin = std(SKIN, { roughness: 0.55 });
    const shoe = std(0x3a2a1c);
    const inner = std(L.inner);

    this.group.add(this.root);

    this.leftLeg = this.makeLeg(robe, shoe, 1);
    this.rightLeg = this.makeLeg(robe, shoe, -1);
    this.leftLeg.position.set(0.13, 0.42, 0);
    this.rightLeg.position.set(-0.13, 0.42, 0);
    this.root.add(this.leftLeg, this.rightLeg);

    this.torso = new THREE.Group();
    this.torso.position.y = 0.82;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.62, 12), robe);
    body.position.y = 0.28;
    body.castShadow = true;
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.5, 12, 1, true), robe);
    skirt.position.y = 0.02;
    skirt.castShadow = true;
    const sashM = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 8, 16), sash);
    sashM.rotation.x = Math.PI / 2;
    sashM.position.y = 0.38;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.1, 12), inner);
    collar.position.y = 0.58;
    this.torso.add(body, skirt, sashM, collar);
    this.root.add(this.torso);

    this.leftArm = this.makeArm(robe, skin, 1);
    this.rightArm = this.makeArm(robe, skin, -1);
    this.leftArm.position.set(0.3, 1.28, 0);
    this.rightArm.position.set(-0.3, 1.28, 0);
    this.root.add(this.leftArm, this.rightArm);

    this.head = new THREE.Group();
    this.head.position.y = 1.58;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), skin);
    skull.castShadow = true;
    const earG = new THREE.SphereGeometry(0.055, 8, 8);
    const le = new THREE.Mesh(earG, skin);
    const re = new THREE.Mesh(earG, skin);
    le.position.set(0.2, -0.02, 0);
    re.position.set(-0.2, -0.02, 0);
    le.scale.set(0.7, 1.15, 0.8);
    re.scale.set(0.7, 1.15, 0.8);
    // peaceful closed eyes
    const lid = std(0x3a2a28);
    const eyeG = new THREE.BoxGeometry(0.07, 0.012, 0.01);
    const eyeL = new THREE.Mesh(eyeG, lid);
    const eyeR = new THREE.Mesh(eyeG, lid);
    eyeL.position.set(0.075, 0.01, 0.175);
    eyeR.position.set(-0.075, 0.01, 0.175);
    eyeL.rotation.z = 0.15;
    eyeR.rotation.z = -0.15;
    const browG = new THREE.BoxGeometry(0.075, 0.01, 0.01);
    const brow = std(0x4a3028);
    const bL = new THREE.Mesh(browG, brow);
    const bR = new THREE.Mesh(browG, brow);
    bL.position.set(0.075, 0.055, 0.17);
    bR.position.set(-0.075, 0.055, 0.17);
    bL.rotation.z = 0.12;
    bR.rotation.z = -0.12;
    // gentle smile
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.007, 6, 8, Math.PI), lid);
    smile.position.set(0, -0.07, 0.175);
    smile.rotation.set(0.4, 0, Math.PI);
    this.head.add(skull, le, re, eyeL, eyeR, bL, bR, smile);
    this.root.add(this.head);

    this.addAccessory(L.accessory, robe, sash, skin);
    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }

  private makeLeg(robe: THREE.Material, shoe: THREE.Material, side: number) {
    const g = new THREE.Group();
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.36, 8), robe);
    thigh.position.y = -0.16;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.2), shoe);
    foot.position.set(0, -0.38, 0.03);
    g.add(thigh, foot);
    g.userData.side = side;
    return g;
  }

  private makeArm(robe: THREE.Material, skin: THREE.Material, side: number) {
    const g = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.38, 8), robe);
    upper.position.y = -0.18;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skin);
    hand.position.y = -0.4;
    g.add(upper, hand);
    g.userData.side = side;
    g.rotation.z = side * 0.18;
    return g;
  }

  private addAccessory(
    kind: (typeof MONK_LOOKS)[number]["accessory"],
    robe: THREE.Material,
    sash: THREE.Material,
    skin: THREE.Material,
  ) {
    if (kind === "beads" || kind === "rosary") {
      const beads = new THREE.Group();
      const n = 14;
      const mat = new THREE.MeshStandardMaterial({
        color: kind === "rosary" ? 0x6b3e26 : 0xc9a84c,
        roughness: 0.4,
        metalness: kind === "rosary" ? 0.05 : 0.45,
      });
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), mat);
        b.position.set(Math.cos(a) * 0.16, 1.32 + Math.sin(a) * 0.05, Math.sin(a) * 0.16);
        beads.add(b);
      }
      this.root.add(beads);
    }
    if (kind === "kasaya") {
      const patch = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.22, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 }),
      );
      patch.position.set(0.08, 1.05, 0.26);
      this.root.add(patch);
    }
    if (kind === "bag") {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.08), robe);
      bag.position.set(-0.28, 0.85, 0.05);
      bag.rotation.z = 0.2;
      this.root.add(bag);
    }
    if (kind === "headcloth") {
      const cloth = new THREE.Mesh(
        new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45),
        sash,
      );
      cloth.position.y = 1.66;
      this.root.add(cloth);
    }
    void skin;
  }

  /** height of the head, for nametag / camera */
  headWorldY(): number {
    return this.group.position.y + 1.85;
  }

  update(dt: number, moving: boolean, sitting: boolean) {
    this.breath += dt;
    const targetSit = sitting ? 1 : 0;
    this.sitBlend += (targetSit - this.sitBlend) * Math.min(1, dt * 5);

    if (moving && this.sitBlend < 0.2) {
      this.phase += dt * 8;
    } else {
      this.phase += dt * 1.2;
    }

    const walk = (1 - this.sitBlend) * (moving ? 1 : 0);
    const swing = Math.sin(this.phase) * 0.7 * walk;
    this.leftLeg.rotation.x = swing + this.sitBlend * 1.35;
    this.rightLeg.rotation.x = -swing + this.sitBlend * 1.35;
    this.leftLeg.rotation.y = this.sitBlend * 0.7;
    this.rightLeg.rotation.y = -this.sitBlend * 0.7;
    this.leftLeg.rotation.z = this.sitBlend * 0.55;
    this.rightLeg.rotation.z = -this.sitBlend * 0.55;

    this.leftArm.rotation.x = -swing * 0.7 - this.sitBlend * 0.9;
    this.rightArm.rotation.x = swing * 0.7 - this.sitBlend * 0.9;
    this.leftArm.rotation.z = 0.18 + this.sitBlend * 0.5;
    this.rightArm.rotation.z = -0.18 - this.sitBlend * 0.5;

    const bob = moving && this.sitBlend < 0.2 ? Math.abs(Math.sin(this.phase * 2)) * 0.035 : 0;
    const breath = Math.sin(this.breath * 1.4) * 0.012;
    this.torso.scale.y = 1 + breath * 0.4;
    this.root.position.y = bob - this.sitBlend * 0.28 + breath * 0.15;
    this.head.rotation.x = this.sitBlend * 0.12;
    this.group.rotation.x = this.sitBlend * 0.04;
  }
}
