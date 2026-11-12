import * as THREE from "three";

/** Kept for server look-id compatibility. All players now share 造型四; no sash variants. */
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

/** 造型四 palette — warm brown robe, peach skin, wooden beads. */
const SKIN = 0xf0c2a8;
const SKIN_EAR = 0xe8b49a;
const ROBE = 0x9a6238;
const ROBE_DK = 0x7e4d2c;
const ROBE_LINING = 0xe8d5c0;
const SHOE = 0x6a4028;
const SHOE_SOLE = 0x4a2c1c;
const BEAD = 0x8a5a32;
const BEAD_DK = 0x6e4524;
const SCAR = 0x4a2e22;

function std(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.04, ...opts });
}

/** Shared geometries, materials and the face decal — one copy for every player. */
type Kit = {
  mats: {
    skin: THREE.MeshStandardMaterial;
    skinEar: THREE.MeshStandardMaterial;
    robe: THREE.MeshStandardMaterial;
    robeDk: THREE.MeshStandardMaterial;
    lining: THREE.MeshStandardMaterial;
    shoe: THREE.MeshStandardMaterial;
    sole: THREE.MeshStandardMaterial;
    bead: THREE.MeshStandardMaterial;
    beadDk: THREE.MeshStandardMaterial;
    scar: THREE.MeshStandardMaterial;
    face: THREE.MeshBasicMaterial;
    collar: THREE.MeshBasicMaterial;
  };
  geos: {
    skull: THREE.SphereGeometry;
    ear: THREE.SphereGeometry;
    earInner: THREE.SphereGeometry;
    scar: THREE.SphereGeometry;
    face: THREE.SphereGeometry;
    robe: THREE.LatheGeometry;
    hem: THREE.LatheGeometry;
    collar: THREE.PlaneGeometry;
    sleeve: THREE.CylinderGeometry;
    cuff: THREE.CylinderGeometry;
    hand: THREE.SphereGeometry;
    thigh: THREE.CylinderGeometry;
    shoe: THREE.SphereGeometry;
    sole: THREE.CylinderGeometry;
    bead: THREE.SphereGeometry;
  };
};

let _kit: Kit | null = null;

function drawFaceTexture(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, s, s);

  const eye = (cx: number, cy: number, dir: 1 | -1) => {
    // Soft almond eye, half-lidded, looking slightly down.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(dir * -0.04);

    // White / sclera (lower half visible)
    ctx.beginPath();
    ctx.ellipse(0, 6, 38, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#f7f1ea";
    ctx.fill();

    // Iris
    const irisGrad = ctx.createRadialGradient(0, 8, 2, 0, 9, 16);
    irisGrad.addColorStop(0, "#7a4a32");
    irisGrad.addColorStop(0.55, "#5a3222");
    irisGrad.addColorStop(1, "#3a2018");
    ctx.beginPath();
    ctx.arc(0, 9, 15, 0, Math.PI * 2);
    ctx.fillStyle = irisGrad;
    ctx.fill();

    // Pupil
    ctx.beginPath();
    ctx.arc(0, 10, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = "#1a0e0a";
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(5, 5, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fill();

    // Upper eyelid (covers top of iris — half-lowered)
    ctx.beginPath();
    ctx.moveTo(-44, 2);
    ctx.quadraticCurveTo(0, -16, 44, 2);
    ctx.quadraticCurveTo(0, 10, -44, 2);
    ctx.fillStyle = "#f0c2a8";
    ctx.fill();

    // Lash / lid line
    ctx.beginPath();
    ctx.moveTo(-44, 2);
    ctx.quadraticCurveTo(0, -15, 44, 2);
    ctx.strokeStyle = "#2a1810";
    ctx.lineWidth = 4.2;
    ctx.lineCap = "round";
    ctx.stroke();

    // Soft crease above the lid
    ctx.beginPath();
    ctx.moveTo(-32, -6);
    ctx.quadraticCurveTo(0, -20, 32, -6);
    ctx.strokeStyle = "rgba(80,40,28,0.28)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Thin lower lash
    ctx.beginPath();
    ctx.moveTo(-34, 16);
    ctx.quadraticCurveTo(0, 22, 34, 16);
    ctx.strokeStyle = "rgba(50,28,20,0.55)";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.restore();
  };

  const brow = (cx: number, cy: number, dir: 1 | -1) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(dir * -0.08);
    ctx.beginPath();
    ctx.moveTo(-34, 6);
    ctx.quadraticCurveTo(-4, -10, 32, 2);
    ctx.strokeStyle = "#3a2418";
    ctx.lineWidth = 4.4;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  };

  // Blush
  for (const x of [150, 362]) {
    const g = ctx.createRadialGradient(x, 300, 4, x, 300, 52);
    g.addColorStop(0, "rgba(232,120,110,0.42)");
    g.addColorStop(1, "rgba(232,120,110,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, 300, 54, 32, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  brow(186, 188, -1);
  brow(326, 188, 1);
  eye(186, 248, -1);
  eye(326, 248, 1);

  // Small closed smile
  ctx.beginPath();
  ctx.moveTo(228, 348);
  ctx.quadraticCurveTo(256, 368, 284, 348);
  ctx.strokeStyle = "#b07068";
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  ctx.stroke();
  // soft lip shadow under the smile
  ctx.beginPath();
  ctx.moveTo(232, 352);
  ctx.quadraticCurveTo(256, 366, 280, 352);
  ctx.strokeStyle = "rgba(160,80,70,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}


function drawCollarTexture(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, s, s);

  const brown = "#9a6238";
  const brownDk = "#7e4d2c";
  const cream = "#e8d5c0";

  // Two 交领 flaps forming a V, cream lining along the inner edges.
  const flap = (side: number) => {
    ctx.beginPath();
    const x0 = s / 2 + side * 8;
    ctx.moveTo(x0, 18);
    ctx.lineTo(x0 + side * 110, 18);
    ctx.lineTo(x0 + side * 118, 240);
    ctx.lineTo(x0 + side * 16, 240);
    ctx.closePath();
    ctx.fillStyle = brown;
    ctx.fill();
    // darker outer edge
    ctx.strokeStyle = brownDk;
    ctx.lineWidth = 3;
    ctx.stroke();
  };
  flap(-1);
  flap(1);

  // Cream inner V
  ctx.beginPath();
  ctx.moveTo(s / 2, 20);
  ctx.lineTo(s / 2 - 22, 240);
  ctx.lineTo(s / 2 - 8, 240);
  ctx.lineTo(s / 2, 80);
  ctx.lineTo(s / 2 + 8, 240);
  ctx.lineTo(s / 2 + 22, 240);
  ctx.closePath();
  ctx.fillStyle = cream;
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function kit(): Kit {
  if (_kit) return _kit;

  const faceTex = drawFaceTexture();
  const mats = {
    skin: std(SKIN, { roughness: 0.48 }),
    skinEar: std(SKIN_EAR, { roughness: 0.5 }),
    robe: std(ROBE, { roughness: 0.78 }),
    robeDk: std(ROBE_DK, { roughness: 0.8 }),
    lining: std(ROBE_LINING, { roughness: 0.7 }),
    shoe: std(SHOE, { roughness: 0.7 }),
    sole: std(SHOE_SOLE, { roughness: 0.82 }),
    bead: std(BEAD, { roughness: 0.42, metalness: 0.08 }),
    beadDk: std(BEAD_DK, { roughness: 0.45, metalness: 0.08 }),
    scar: std(SCAR, { roughness: 0.85, metalness: 0 }),
    face: new THREE.MeshBasicMaterial({
      map: faceTex,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    collar: new THREE.MeshBasicMaterial({
      map: drawCollarTexture(),
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  };

  const robePts = [
    new THREE.Vector2(0.09, 0.38),
    new THREE.Vector2(0.15, 0.36),
    new THREE.Vector2(0.20, 0.30),
    new THREE.Vector2(0.215, 0.20),
    new THREE.Vector2(0.225, 0.10),
    new THREE.Vector2(0.24, 0.00),
    new THREE.Vector2(0.275, -0.10),
    new THREE.Vector2(0.31, -0.20),
  ];
  const hemPts = [
    new THREE.Vector2(0.305, -0.195),
    new THREE.Vector2(0.318, -0.225),
  ];

  const built: Kit = {
    mats,
    geos: {
      skull: new THREE.SphereGeometry(0.285, 28, 22),
      ear: new THREE.SphereGeometry(0.062, 12, 10),
      earInner: new THREE.SphereGeometry(0.032, 8, 8),
      scar: new THREE.SphereGeometry(0.018, 10, 8),
      face: new THREE.SphereGeometry(
        0.296, 20, 16,
        Math.PI / 2 - 0.78, 1.56,
        Math.PI / 2 - 0.58, 1.20,
      ),
      robe: new THREE.LatheGeometry(robePts, 22),
      hem: new THREE.LatheGeometry(hemPts, 18),
      collar: new THREE.PlaneGeometry(0.28, 0.30),
      sleeve: new THREE.CylinderGeometry(0.10, 0.055, 0.30, 14),
      cuff: new THREE.CylinderGeometry(0.125, 0.10, 0.14, 14),
      hand: new THREE.SphereGeometry(0.042, 10, 8),
      thigh: new THREE.CylinderGeometry(0.07, 0.055, 0.24, 10),
      shoe: new THREE.SphereGeometry(0.055, 12, 10),
      sole: new THREE.CylinderGeometry(0.05, 0.055, 0.03, 12),
      bead: new THREE.SphereGeometry(0.022, 8, 6),
    },
  };
  _kit = built;
  return built;
}

export class Monk {
  group = new THREE.Group();
  look: number;
  /** Screenshot / debug overrides. null = follow gameplay state. */
  debugMoving: boolean | null = null;
  debugSitting: boolean | null = null;
  debugPhase: number | null = null;

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
    const { mats, geos } = kit();

    this.group.add(this.root);

    this.leftLeg = this.makeLeg(mats, geos);
    this.rightLeg = this.makeLeg(mats, geos);
    this.leftLeg.position.set(0.085, 0.28, 0);
    this.rightLeg.position.set(-0.085, 0.28, 0);
    this.root.add(this.leftLeg, this.rightLeg);

    this.torso = new THREE.Group();
    this.torso.position.y = 0.46;

    const body = new THREE.Mesh(geos.robe, mats.robe);
    body.castShadow = true;
    const collar = new THREE.Mesh(geos.collar, mats.collar);
    collar.position.set(0, 0.22, 0.205);
    collar.renderOrder = 2;

    this.torso.add(body, collar);
    this.addBeads(this.torso, mats, geos);
    this.root.add(this.torso);

    this.leftArm = this.makeArm(mats, geos, 1);
    this.rightArm = this.makeArm(mats, geos, -1);
    this.leftArm.position.set(0.195, 0.76, 0.02);
    this.rightArm.position.set(-0.195, 0.76, 0.02);
    this.root.add(this.leftArm, this.rightArm);

    this.head = this.makeHead(mats, geos);
    this.head.position.y = 1.00;
    this.root.add(this.head);

    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    // Face decal is MeshBasic + transparent; don't need shadows on it.
    this.head.traverse((o) => {
      if ((o as THREE.Mesh).material === mats.face || (o as THREE.Mesh).material === mats.collar) {
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
  }

  private makeHead(mats: Kit["mats"], geos: Kit["geos"]) {
    const head = new THREE.Group();
    const skull = new THREE.Mesh(geos.skull, mats.skin);
    // Slightly taller, a touch narrower in Z so the face shell sits cleanly.
    skull.scale.set(1.02, 1.04, 0.98);
    skull.castShadow = true;

    const ear = (side: number) => {
      const g = new THREE.Group();
      const outer = new THREE.Mesh(geos.ear, mats.skinEar);
      outer.scale.set(0.55, 1.15, 0.78);
      const inner = new THREE.Mesh(geos.earInner, mats.skin);
      inner.scale.set(0.7, 1.0, 0.5);
      inner.position.set(side * 0.01, 0, 0.02);
      g.add(outer, inner);
      g.position.set(side * 0.275, -0.03, -0.01);
      g.rotation.z = side * -0.15;
      g.rotation.y = side * -0.25;
      return g;
    };

    // Spherical face shell, slightly larger than the skull so it is never occluded.
    const face = new THREE.Mesh(geos.face, mats.face);
    face.renderOrder = 2;

    // 六颗戒疤: two rows of three on the upper crown, slightly forward.
    // Parent to the skull so they inherit its scale and stay on the scalp.
    const scars = new THREE.Group();
    const R = 0.285;
    const rows: { theta: number; phis: number[] }[] = [
      { theta: 0.58, phis: [-0.34, 0, 0.34] }, // front row (upper forehead)
      { theta: 0.36, phis: [-0.34, 0, 0.34] }, // back row (upper crown)
    ];
    for (const row of rows) {
      for (const phi of row.phis) {
        const m = new THREE.Mesh(geos.scar, mats.scar);
        const r = R * 1.01;
        m.position.set(
          r * Math.sin(row.theta) * Math.sin(phi),
          r * Math.cos(row.theta),
          r * Math.sin(row.theta) * Math.cos(phi),
        );
        scars.add(m);
      }
    }
    skull.add(scars);

    head.add(skull, ear(1), ear(-1), face);
    return head;
  }

  private addBeads(torso: THREE.Group, mats: Kit["mats"], geos: Kit["geos"]) {
    const n = 22;
    const g = new THREE.Group();
    g.position.set(0, 0.22, 0.02);
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      // Ellipse around the neck, hanging down the chest; frontmost at the bottom.
      const x = 0.13 * Math.cos(t);
      const y = 0.155 * Math.sin(t);
      const z = 0.05 - 0.10 * Math.sin(t);
      const m = new THREE.Mesh(geos.bead, i % 2 ? mats.beadDk : mats.bead);
      m.position.set(x, y, z);
      // Slight scale variation so the string doesn't look perfectly uniform.
      const s = 0.92 + (i % 5) * 0.04;
      m.scale.setScalar(s);
      g.add(m);
    }
    torso.add(g);
  }

  private makeLeg(mats: Kit["mats"], geos: Kit["geos"]) {
    const g = new THREE.Group();
    const thigh = new THREE.Mesh(geos.thigh, mats.robeDk);
    thigh.position.y = -0.11;
    const shoe = new THREE.Mesh(geos.shoe, mats.shoe);
    shoe.scale.set(1.15, 0.55, 1.55);
    shoe.position.set(0, -0.255, 0.025);
    const sole = new THREE.Mesh(geos.sole, mats.sole);
    sole.rotation.x = Math.PI / 2;
    sole.scale.set(1.15, 1.6, 1);
    sole.position.set(0, -0.28, 0.03);
    g.add(thigh, shoe, sole);
    return g;
  }

  private makeArm(mats: Kit["mats"], geos: Kit["geos"], side: number) {
    const g = new THREE.Group();
    // Wide, flared sleeves of 造型四; hand tucked near the cuff.
    const sleeve = new THREE.Mesh(geos.sleeve, mats.robe);
    sleeve.position.y = -0.14;
    const cuff = new THREE.Mesh(geos.cuff, mats.robe);
    cuff.position.y = -0.32;
    const lining = new THREE.Mesh(geos.cuff, mats.lining);
    lining.scale.set(0.82, 0.7, 0.82);
    lining.position.y = -0.355;
    const hand = new THREE.Mesh(geos.hand, mats.skin);
    hand.position.y = -0.38;
    g.add(sleeve, cuff, lining, hand);
    g.rotation.z = side * 0.28;
    return g;
  }

  /** Height of the crown, for nametag / camera. */
  headWorldY(): number {
    return this.group.position.y + 1.30;
  }

  update(dt: number, moving: boolean, sitting: boolean) {
    if (this.debugMoving !== null) moving = this.debugMoving;
    if (this.debugSitting !== null) sitting = this.debugSitting;

    this.breath += dt;
    const targetSit = sitting ? 1 : 0;
    this.sitBlend += (targetSit - this.sitBlend) * Math.min(1, dt * 5);
    // Snap for frozen screenshot poses so we don't catch a mid-blend frame.
    if (this.debugSitting !== null && this.debugPhase !== null) {
      this.sitBlend = targetSit;
    }

    if (this.debugPhase !== null) {
      this.phase = this.debugPhase;
    } else if (moving && this.sitBlend < 0.2) {
      this.phase += dt * 9;
    } else {
      this.phase += dt * 1.2;
    }

    const walk = (1 - this.sitBlend) * (moving ? 1 : 0);
    const swing = Math.sin(this.phase) * 0.65 * walk;
    this.leftLeg.rotation.x = swing + this.sitBlend * 1.25;
    this.rightLeg.rotation.x = -swing + this.sitBlend * 1.25;
    this.leftLeg.rotation.y = this.sitBlend * 0.65;
    this.rightLeg.rotation.y = -this.sitBlend * 0.65;
    this.leftLeg.rotation.z = this.sitBlend * 0.5;
    this.rightLeg.rotation.z = -this.sitBlend * 0.5;

    // Walking: opposite arm swing. Sitting: hands gather in the lap (dhyāna).
    this.leftArm.rotation.x = -swing * 0.65 - this.sitBlend * 0.95;
    this.rightArm.rotation.x = swing * 0.65 - this.sitBlend * 0.95;
    this.leftArm.rotation.z = 0.28 + this.sitBlend * 0.55;
    this.rightArm.rotation.z = -0.28 - this.sitBlend * 0.55;

    const bob = moving && this.sitBlend < 0.2 ? Math.abs(Math.sin(this.phase * 2)) * 0.03 : 0;
    const breath = Math.sin(this.breath * 1.5) * 0.01;
    this.torso.scale.y = 1 + breath * 0.35;
    // Sit down onto the thin mat (mat top ≈ 0.07).
    this.root.position.y = bob - this.sitBlend * 0.18 + breath * 0.12;
    this.head.rotation.x = this.sitBlend * 0.08;
  }
}
