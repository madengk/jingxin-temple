import * as THREE from "three";

/**
 * Temple statues following canonical Chinese Buddhist iconography.
 * All geometry and painted textures are original works (not copies of a
 * specific temple or copyrighted scan). Faces look toward -Z (the worshippers).
 */

function gold(color = 0xd4b056, emissive = 0.16): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.78,
    roughness: 0.28,
    emissive: color,
    emissiveIntensity: emissive,
  });
}
function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.08, ...opts });
}
function M(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Features sit on -Z (south, toward the hall entrance). */
const F = -1;

function paintedFace(kind: "buddha" | "king" | "weituo", skinHex: string, accent?: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = skinHex;
  g.fillRect(0, 0, 512, 512);
  // soft forehead highlight
  const hg = g.createRadialGradient(256, 200, 20, 256, 220, 200);
  hg.addColorStop(0, "rgba(255,255,240,0.28)");
  hg.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = hg;
  g.fillRect(0, 0, 512, 512);

  // Eyes — half-lidded (buddha) or fierce (king)
  g.lineCap = "round";
  if (kind === "buddha" || kind === "weituo") {
    g.strokeStyle = "#2a1a10";
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(150, 268);
    g.quadraticCurveTo(190, 258, 230, 268);
    g.moveTo(282, 268);
    g.quadraticCurveTo(322, 258, 362, 268);
    g.stroke();
    // lids
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(150, 272);
    g.quadraticCurveTo(190, 278, 230, 272);
    g.moveTo(282, 272);
    g.quadraticCurveTo(322, 278, 362, 272);
    g.stroke();
  } else {
    g.fillStyle = "#f4eee4";
    g.beginPath();
    g.ellipse(190, 268, 38, 22, 0, 0, Math.PI * 2);
    g.ellipse(322, 268, 38, 22, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#1a1008";
    g.beginPath();
    g.ellipse(190, 268, 14, 18, 0, 0, Math.PI * 2);
    g.ellipse(322, 268, 14, 18, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#3a1a10";
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(140, 236);
    g.quadraticCurveTo(190, 220, 240, 242);
    g.moveTo(272, 242);
    g.quadraticCurveTo(322, 220, 372, 236);
    g.stroke();
  }

  // 白毫
  if (kind === "buddha") {
    const urna = g.createRadialGradient(256, 214, 2, 256, 214, 12);
    urna.addColorStop(0, "#fffaf0");
    urna.addColorStop(0.5, "#e8d5a3");
    urna.addColorStop(1, "rgba(200,170,80,0)");
    g.fillStyle = urna;
    g.beginPath();
    g.arc(256, 214, 12, 0, Math.PI * 2);
    g.fill();
  }

  // brows
  g.strokeStyle = kind === "king" ? "#1a0c08" : "#4a3020";
  g.lineWidth = kind === "king" ? 9 : 6;
  g.beginPath();
  g.moveTo(145, 242);
  g.quadraticCurveTo(190, kind === "king" ? 220 : 232, 236, 244);
  g.moveTo(276, 244);
  g.quadraticCurveTo(322, kind === "king" ? 220 : 232, 367, 242);
  g.stroke();

  // nose
  g.strokeStyle = "rgba(80,50,30,0.45)";
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(256, 230);
  g.lineTo(244, 310);
  g.quadraticCurveTo(256, 322, 268, 310);
  g.stroke();

  // mouth — serene slight smile, or firm for kings
  g.strokeStyle = kind === "king" ? "#5a2018" : "#7a4030";
  g.lineWidth = 5;
  g.beginPath();
  if (kind === "king") {
    g.moveTo(220, 360);
    g.lineTo(292, 360);
  } else {
    g.moveTo(220, 358);
    g.quadraticCurveTo(256, 372, 292, 358);
  }
  g.stroke();

  // 螺发 suggestion at top of map (upper third used less on a sphere)
  if (kind === "buddha") {
    g.fillStyle = accent || "#2a2218";
    for (let i = 0; i < 40; i++) {
      const x = 80 + (i % 10) * 36;
      const y = 36 + Math.floor(i / 10) * 28;
      g.beginPath();
      g.arc(x, y, 11, 0, Math.PI * 2);
      g.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Vertical 神位牌: red lacquer, gold frame, gold regular-script names. */
export function createNamePlaque(
  title: string,
  subtitle?: string,
  opts: { height?: number; width?: number } = {},
): THREE.Group {
  const h = opts.height ?? (subtitle ? 1.85 : 1.72);
  const w = opts.width ?? 0.68;
  const g = new THREE.Group();
  const wood = mat(0x5c1212, { roughness: 0.45, metalness: 0.08 });
  const goldM = gold(0xe8d5a3, 0.22);

  // tablet body
  g.add(M(new THREE.BoxGeometry(w, h, 0.1), wood, 0, h / 2, 0));
  // gold frame
  const tw = 0.045;
  g.add(M(new THREE.BoxGeometry(w + 0.06, tw, 0.12), goldM, 0, h - tw / 2, 0.01));
  g.add(M(new THREE.BoxGeometry(w + 0.06, tw, 0.12), goldM, 0, tw / 2, 0.01));
  g.add(M(new THREE.BoxGeometry(tw, h, 0.12), goldM, -w / 2, h / 2, 0.01));
  g.add(M(new THREE.BoxGeometry(tw, h, 0.12), goldM, w / 2, h / 2, 0.01));
  // cloud-shaped top (云头)
  const top = M(new THREE.SphereGeometry(w * 0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), goldM, 0, h + 0.02, 0);
  g.add(top);
  const jewel = M(new THREE.SphereGeometry(0.06, 10, 8), gold(0xffe7a0, 0.4), 0, h + 0.16, 0.04);
  g.add(jewel);

  const c = document.createElement("canvas");
  const CW = 384, CH = 1024;
  c.width = CW;
  c.height = CH;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#6b1212";
  ctx.fillRect(0, 0, CW, CH);
  // inner gold border
  ctx.strokeStyle = "#e8d5a3";
  ctx.lineWidth = 14;
  ctx.strokeRect(22, 22, CW - 44, CH - 44);

  const chars = Array.from(title);
  ctx.fillStyle = "#f3dd9a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(80,50,0,0.45)";
  ctx.shadowBlur = 8;
  const topPad = 110;
  const botPad = subtitle ? 260 : 110;
  const span = CH - topPad - botPad;
  const fontSize = Math.min(128, (span / Math.max(chars.length, 1)) * 0.88);
  ctx.font = `bold ${fontSize}px "Noto Serif SC","Noto Serif CJK SC","Source Han Serif SC","Songti SC","STSong","SimSun",serif`;
  chars.forEach((ch, i) => {
    const y = topPad + (span / chars.length) * (i + 0.5);
    ctx.fillText(ch, CW / 2, y);
  });
  if (subtitle) {
    ctx.font = `bold 64px "Noto Serif SC","Noto Serif CJK SC","Source Han Serif SC","Songti SC","STSong","SimSun",serif`;
    ctx.fillStyle = "#d4b36a";
    ctx.shadowBlur = 0;
    const sub = Array.from(subtitle);
    sub.forEach((ch, i) => {
      const y = CH - 210 + i * 72;
      ctx.fillText(ch, CW / 2, y);
    });
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = M(
    new THREE.PlaneGeometry(w * 0.86, h * 0.86),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.05 }),
    0, h / 2, 0.06,
  );
  // Face the worshippers (−Z): default plane faces +Z, so flip.
  face.rotation.y = 0; // parent will be oriented
  g.add(face);
  return g;
}

function placePlaque(parent: THREE.Group, title: string, subtitle: string | undefined, zFront: number, y = 0.08, scale = 1) {
  const p = createNamePlaque(title, subtitle);
  p.scale.setScalar(scale);
  p.position.set(0, y, zFront);
  // Plaque front faces −Z (worshippers)
  p.rotation.y = Math.PI;
  parent.add(p);
}

function lotusThrone(radius = 1.9): THREE.Group {
  const g = new THREE.Group();
  const petalM = mat(0xc98a96, { roughness: 0.48, emissive: 0x4a2028, emissiveIntensity: 0.1 });
  const goldM = gold(0xe8d5a3, 0.1);
  const tip = (n: number, r: number, y: number, s: number, tilt: number) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (n % 2 ? 0.12 : 0);
      const petal = M(new THREE.SphereGeometry(0.48 * s, 12, 10), petalM);
      petal.scale.set(0.5, 0.26, 1.25);
      petal.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      petal.lookAt(Math.cos(a) * r * 2, y - tilt, Math.sin(a) * r * 2);
      g.add(petal);
    }
  };
  tip(16, radius, 0.12, 1.05, 0.35);
  tip(14, radius * 0.78, 0.36, 0.88, 0.25);
  tip(12, radius * 0.55, 0.55, 0.7, 0.15);
  g.add(M(new THREE.CylinderGeometry(radius * 0.62, radius * 0.72, 0.32, 24), goldM, 0, 0.62, 0));
  g.add(M(new THREE.CylinderGeometry(radius * 0.55, radius * 0.6, 0.16, 24), gold(0xd4b056, 0.14), 0, 0.84, 0));
  // seed pod
  g.add(M(new THREE.CylinderGeometry(radius * 0.42, radius * 0.5, 0.12, 20), mat(0xc9a84c, { roughness: 0.55 }), 0, 0.95, 0));
  return g;
}

function spiralHair(head: THREE.Group, y: number, goldM: THREE.Material) {
  const curlM = gold(0x2a2218, 0.02);
  (curlM as THREE.MeshStandardMaterial).metalness = 0.25;
  (curlM as THREE.MeshStandardMaterial).color.set(0x3a2e20);
  const geo = new THREE.SphereGeometry(0.075, 8, 6);
  for (let ring = 0; ring < 5; ring++) {
    const n = 10 + ring * 2;
    const r = 0.42 - ring * 0.06;
    const yy = y + 0.18 + ring * 0.09;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.2;
      const s = M(geo, curlM, Math.cos(a) * r, yy, Math.sin(a) * r);
      s.scale.setScalar(0.85 + (ring === 4 ? 0.2 : 0));
      head.add(s);
    }
  }
  // ushnisha
  head.add(M(new THREE.SphereGeometry(0.26, 14, 12), goldM, 0, y + 0.68, 0));
  head.add(M(new THREE.SphereGeometry(0.1, 10, 8), gold(0xf0e0b0, 0.28), 0, y + 0.96, 0));
}

/** 释迦牟尼佛 / 如来佛祖 — seated lotus, 禅定印. */
export function createBuddha(): THREE.Group {
  const g = new THREE.Group();
  const G = gold(0xd7b45a, 0.15);
  const robe = gold(0xc9a040, 0.1);
  const robeInner = gold(0xb8862a, 0.07);

  const throne = lotusThrone(1.95);
  g.add(throne);

  // crossed legs / knees
  const kneeG = new THREE.SphereGeometry(0.68, 16, 14);
  g.add(M(kneeG, robe, 1.42, 1.42, 0.15 * F));
  g.add(M(kneeG, robe, -1.42, 1.42, 0.15 * F));
  const calfG = new THREE.CylinderGeometry(0.34, 0.3, 1.45, 12);
  const c1 = M(calfG, robe, 0.72, 1.18, 0.72 * F);
  c1.rotation.z = Math.PI / 2.3;
  c1.rotation.y = 0.45 * F;
  const c2 = M(calfG, robe, -0.72, 1.14, 0.88 * F);
  c2.rotation.z = -Math.PI / 2.3;
  c2.rotation.y = -0.45 * F;
  g.add(c1, c2);
  // feet on thighs
  const foot = new THREE.SphereGeometry(0.22, 10, 8);
  g.add(M(foot, G, 0.55, 1.55, 0.95 * F));
  g.add(M(foot, G, -0.55, 1.5, 1.05 * F));

  // torso
  g.add(M(new THREE.SphereGeometry(1.08, 22, 18), robe, 0, 1.95, 0.05 * F));
  g.add(M(new THREE.CylinderGeometry(0.82, 1.08, 1.65, 20), robe, 0, 2.7, 0));
  // chest drape
  const drape = M(new THREE.TorusGeometry(0.78, 0.13, 10, 20, Math.PI), robeInner, 0, 3.0, 0.28 * F);
  drape.rotation.x = 0.55 * -F;
  g.add(drape);
  // kasaya sash
  const sash = M(new THREE.TorusGeometry(0.85, 0.07, 8, 18, Math.PI * 1.2), gold(0xb8943c, 0.08), 0.15, 2.85, 0.1);
  sash.rotation.z = 0.4;
  sash.rotation.x = 1.1;
  g.add(sash);

  // arms to lap — 禅定印 (dhyana, right hand on left, thumbs touching)
  const armG = new THREE.CylinderGeometry(0.22, 0.18, 1.2, 12);
  const la = M(armG, robe, 0.98, 2.4, 0.42 * F);
  la.rotation.z = 1.08;
  la.rotation.x = 0.55 * -F;
  const ra = M(armG, robe, -0.98, 2.4, 0.42 * F);
  ra.rotation.z = -1.08;
  ra.rotation.x = 0.55 * -F;
  g.add(la, ra);
  const hand = new THREE.SphereGeometry(0.2, 12, 10);
  // 禅定印: Buddha's right hand (−X from the viewer) rests on the left, palms up.
  g.add(M(hand, G, -0.12, 1.92, 0.88 * F));
  g.add(M(hand, G, 0.14, 1.84, 0.88 * F));
  // thumbs meeting
  const thumb = new THREE.CapsuleGeometry(0.045, 0.12, 4, 8);
  const t1 = M(thumb, G, 0.02, 2.02, 0.98 * F);
  t1.rotation.x = 0.6 * F;
  g.add(t1);

  // neck + head (facing −Z)
  g.add(M(new THREE.CylinderGeometry(0.3, 0.36, 0.32, 14), G, 0, 3.6, 0));
  const head = new THREE.Group();
  head.position.set(0, 4.25, 0);
  const faceTex = paintedFace("buddha", "#e8c878");
  const headM = mat(0xe8c878, {
    map: faceTex,
    metalness: 0.22,
    roughness: 0.48,
    emissive: 0x4a3818,
    emissiveIntensity: 0.06,
  });
  // Sphere default UV: front is +Z. Rotate head so painted front faces −Z.
  const skull = M(new THREE.SphereGeometry(0.62, 24, 18), headM, 0, 0, 0);
  skull.rotation.y = Math.PI;
  head.add(skull);
  spiralHair(head, 0.15, G);
  // long ears
  const earG = new THREE.CapsuleGeometry(0.1, 0.42, 4, 10);
  const le = M(earG, G, 0.62, -0.08, 0.02);
  const re = M(earG, G, -0.62, -0.08, 0.02);
  le.rotation.z = 0.12;
  re.rotation.z = -0.12;
  head.add(le, re);
  g.add(head);

  // 火焰背光 (mandorla) toward the back wall (+Z)
  const halo = M(new THREE.TorusGeometry(2.25, 0.08, 10, 48), gold(0xffe7a0, 0.5), 0, 3.7, 1.25);
  halo.rotation.x = 0.04;
  g.add(halo);
  const disc = M(
    new THREE.CircleGeometry(2.15, 40),
    new THREE.MeshStandardMaterial({
      color: 0xe8c86a,
      emissive: 0xc9a84c,
      emissiveIntensity: 0.32,
      metalness: 0.3,
      roughness: 0.48,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }),
    0, 3.7, 1.32,
  );
  g.add(disc);
  // flame tips around the ring
  const flameM = gold(0xffcc66, 0.35);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const fl = M(new THREE.ConeGeometry(0.12, 0.45, 6), flameM, Math.cos(a) * 2.28, 3.7 + Math.sin(a) * 2.28, 1.25);
    fl.rotation.z = a - Math.PI / 2;
    g.add(fl);
  }

  placePlaque(g, "释迦牟尼佛", "如来佛祖", -2.35, 0.02, 1.15);

  g.position.set(0, 1.05, 21.6);
  return g;
}

export type KingKind = "pipa" | "sword" | "serpent" | "umbrella";

export const KING_INFO: { kind: KingKind; armor: number; trim: number; name: string; dir: string }[] = [
  { kind: "pipa", armor: 0xe8e0c8, trim: 0xd4b056, name: "东方持国天王", dir: "东" },
  { kind: "sword", armor: 0x3a5a8c, trim: 0xc9a84c, name: "南方增长天王", dir: "南" },
  { kind: "serpent", armor: 0x8c2a28, trim: 0xd4b056, name: "西方广目天王", dir: "西" },
  { kind: "umbrella", armor: 0x2f5a3a, trim: 0xc9a84c, name: "北方多闻天王", dir: "北" },
];

function pipa(): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(0x8a5a28, { roughness: 0.45, metalness: 0.15 });
  const goldM = gold(0xe8d5a3, 0.15);
  // teardrop body
  const body = M(new THREE.SphereGeometry(0.28, 14, 12), wood, 0, 0, 0);
  body.scale.set(0.85, 1.25, 0.35);
  g.add(body);
  g.add(M(new THREE.BoxGeometry(0.07, 0.62, 0.07), wood, 0, 0.62, 0));
  g.add(M(new THREE.BoxGeometry(0.22, 0.1, 0.08), goldM, 0, 0.95, 0));
  // strings
  for (const x of [-0.04, 0, 0.04]) {
    g.add(M(new THREE.CylinderGeometry(0.006, 0.006, 1.05, 6), mat(0xe8d5a3), x, 0.35, 0.12));
  }
  return g;
}

function treasureSword(): THREE.Group {
  const g = new THREE.Group();
  const blade = mat(0xc8d4dc, { metalness: 0.85, roughness: 0.18, emissive: 0x8899aa, emissiveIntensity: 0.08 });
  const goldM = gold(0xe8d5a3, 0.18);
  const b = M(new THREE.BoxGeometry(0.08, 1.75, 0.035), blade, 0, 0.55, 0);
  b.scale.set(1, 1, 1);
  g.add(b);
  const tip = M(new THREE.ConeGeometry(0.05, 0.18, 8), blade, 0, 1.5, 0);
  g.add(tip);
  g.add(M(new THREE.BoxGeometry(0.28, 0.08, 0.1), goldM, 0, -0.32, 0));
  g.add(M(new THREE.CylinderGeometry(0.045, 0.05, 0.35, 8), goldM, 0, -0.52, 0));
  return g;
}

function dragonSerpent(): THREE.Group {
  const g = new THREE.Group();
  const skin = mat(0x3a7a38, { roughness: 0.4, metalness: 0.2, emissive: 0x143018, emissiveIntensity: 0.08 });
  const goldM = gold(0xc9a84c, 0.12);
  const pts = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.15, 0.35, 0.15),
    new THREE.Vector3(-0.1, 0.7, 0.35),
    new THREE.Vector3(0.2, 1.05, 0.2),
    new THREE.Vector3(-0.05, 1.35, 0.4),
    new THREE.Vector3(0.1, 1.55, 0.55),
  ];
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.08, 8, false), skin);
  tube.castShadow = true;
  g.add(tube);
  const head = M(new THREE.SphereGeometry(0.13, 10, 8), skin, 0.1, 1.58, 0.58);
  g.add(head);
  g.add(M(new THREE.ConeGeometry(0.05, 0.12, 6), goldM, 0.1, 1.7, 0.64));
  return g;
}

function jeweledUmbrella(): THREE.Group {
  const g = new THREE.Group();
  const pole = mat(0x3a2412, { roughness: 0.5 });
  const canopy = mat(0x6b1c16, { roughness: 0.55, metalness: 0.15 });
  const goldM = gold(0xe8d5a3, 0.2);
  g.add(M(new THREE.CylinderGeometry(0.035, 0.04, 2.15, 8), pole, 0, 0, 0));
  g.add(M(new THREE.ConeGeometry(0.72, 0.28, 16), canopy, 0, 1.15, 0));
  g.add(M(new THREE.TorusGeometry(0.7, 0.03, 8, 20), goldM, 0, 1.02, 0));
  g.add(M(new THREE.SphereGeometry(0.08, 10, 8), goldM, 0, 1.32, 0));
  // hanging beads
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(M(new THREE.SphereGeometry(0.035, 6, 6), goldM, Math.cos(a) * 0.62, 0.88, Math.sin(a) * 0.62));
  }
  return g;
}

function vajraPestle(): THREE.Group {
  const g = new THREE.Group();
  const goldM = gold(0xe8d5a3, 0.25);
  g.add(M(new THREE.CylinderGeometry(0.055, 0.055, 1.05, 10), goldM, 0, 0, 0));
  g.add(M(new THREE.SphereGeometry(0.1, 10, 8), goldM, 0, 0, 0));
  for (const s of [-1, 1]) {
    const cone = M(new THREE.ConeGeometry(0.11, 0.22, 8), goldM, 0, s * 0.58, 0);
    if (s < 0) cone.rotation.x = Math.PI;
    g.add(cone);
    // side prongs
    for (const ang of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
      const p = M(new THREE.ConeGeometry(0.045, 0.16, 6), goldM, Math.cos(ang) * 0.08, s * 0.48, Math.sin(ang) * 0.08);
      p.rotation.z = -s * Math.cos(ang) * 0.6;
      p.rotation.x = s * Math.sin(ang) * 0.6;
      g.add(p);
    }
  }
  return g;
}

/** 四大天王 — standing, correct attributes. */
export function createHeavenlyKing(index: number): THREE.Group {
  const info = KING_INFO[index % 4];
  const g = new THREE.Group();
  const armor = mat(info.armor, { metalness: 0.48, roughness: 0.38, emissive: info.armor, emissiveIntensity: 0.06 });
  const goldM = gold(info.trim, 0.12);
  const skin = mat(0xe0b894, { roughness: 0.52, metalness: 0.08, map: paintedFace("king", "#e0b894"), emissive: 0x2a1810, emissiveIntensity: 0.04 });

  // pedestal
  g.add(M(new THREE.CylinderGeometry(0.9, 1.0, 0.32, 12), goldM, 0, 0.16, 0));
  g.add(M(new THREE.CylinderGeometry(0.72, 0.78, 0.12, 12), mat(0x6b1c16), 0, 0.36, 0));

  // legs & boots
  const boot = mat(0x3a2418, { roughness: 0.6 });
  g.add(M(new THREE.CylinderGeometry(0.18, 0.22, 1.15, 10), armor, 0.24, 0.98, 0));
  g.add(M(new THREE.CylinderGeometry(0.18, 0.22, 1.15, 10), armor, -0.24, 0.98, 0));
  g.add(M(new THREE.BoxGeometry(0.28, 0.16, 0.4), boot, 0.24, 0.38, 0.06 * F));
  g.add(M(new THREE.BoxGeometry(0.28, 0.16, 0.4), boot, -0.24, 0.38, 0.06 * F));

  // body armor
  g.add(M(new THREE.CylinderGeometry(0.5, 0.58, 1.45, 12), armor, 0, 2.2, 0));
  // animal-head shoulder guards
  g.add(M(new THREE.SphereGeometry(0.34, 12, 10), goldM, 0.58, 2.85, 0));
  g.add(M(new THREE.SphereGeometry(0.34, 12, 10), goldM, -0.58, 2.85, 0));
  // breast plate
  g.add(M(new THREE.BoxGeometry(0.55, 0.65, 0.12), goldM, 0, 2.25, 0.48 * F));
  // belt
  const belt = M(new THREE.TorusGeometry(0.52, 0.06, 8, 16), goldM, 0, 1.55, 0);
  belt.rotation.x = Math.PI / 2;
  g.add(belt);

  // arms
  const arm = new THREE.CylinderGeometry(0.13, 0.12, 1.1, 10);
  const la = M(arm, armor, 0.75, 2.15, 0.12 * F);
  const ra = M(arm, armor, -0.75, 2.15, 0.12 * F);
  la.rotation.z = 0.28;
  ra.rotation.z = -0.28;
  g.add(la, ra);

  // head
  const skull = M(new THREE.SphereGeometry(0.34, 14, 12), skin, 0, 3.22, 0);
  skull.rotation.y = Math.PI; // painted face toward −Z
  g.add(skull);
  const helm = M(new THREE.SphereGeometry(0.38, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), goldM, 0, 3.36, 0);
  g.add(helm);
  g.add(M(new THREE.ConeGeometry(0.09, 0.5, 8), mat(0x8b1e1e), 0, 3.82, 0));
  // fierce brows already on texture; jaw guard
  g.add(M(new THREE.BoxGeometry(0.5, 0.1, 0.15), goldM, 0, 3.02, 0.22 * F));

  // attribute
  const attr = new THREE.Group();
  if (info.kind === "pipa") {
    const inst = pipa();
    inst.position.set(0.85, 1.85, 0.4 * F);
    inst.rotation.set(0.3 * F, 0.2, -0.5);
    g.add(inst);
    la.rotation.z = 0.55;
    la.rotation.x = 0.4 * -F;
  } else if (info.kind === "sword") {
    const inst = treasureSword();
    inst.position.set(-0.95, 2.45, 0.2 * F);
    inst.rotation.z = 0.12;
    g.add(inst);
    ra.rotation.z = -0.75;
    ra.rotation.x = -0.25;
  } else if (info.kind === "serpent") {
    const inst = dragonSerpent();
    inst.position.set(-0.85, 1.55, 0.3 * F);
    g.add(inst);
    ra.rotation.z = -0.5;
  } else {
    const inst = jeweledUmbrella();
    inst.position.set(-0.95, 2.55, 0.15 * F);
    g.add(inst);
    ra.rotation.z = -0.85;
    ra.rotation.x = -0.15;
  }
  void attr;

  placePlaque(g, info.name, undefined, -1.22, 0.02, 1.0);
  return g;
}

/** 韦陀菩萨 — 降魔杵 across the forearms, facing the Buddha (+Z). */
export function createWeituo(): THREE.Group {
  const g = new THREE.Group();
  const armor = gold(0xd4b056, 0.14);
  const darkG = gold(0x8a6a30, 0.06);
  const skin = mat(0xe6c09a, { roughness: 0.52, metalness: 0.08, map: paintedFace("weituo", "#e6c09a"), emissive: 0x2a1810, emissiveIntensity: 0.04 });

  g.add(M(new THREE.CylinderGeometry(0.75, 0.85, 0.28, 12), gold(0xb8943c), 0, 0.14, 0));
  g.add(M(new THREE.CylinderGeometry(0.16, 0.19, 1.05, 10), armor, 0.2, 0.88, 0));
  g.add(M(new THREE.CylinderGeometry(0.16, 0.19, 1.05, 10), armor, -0.2, 0.88, 0));
  g.add(M(new THREE.CylinderGeometry(0.44, 0.5, 1.3, 12), armor, 0, 2.0, 0));
  g.add(M(new THREE.SphereGeometry(0.3, 12, 10), darkG, 0.52, 2.62, 0));
  g.add(M(new THREE.SphereGeometry(0.3, 12, 10), darkG, -0.52, 2.62, 0));
  g.add(M(new THREE.BoxGeometry(0.5, 0.55, 0.12), gold(0xe8d5a3, 0.15), 0, 2.05, 0.42)); // breast, faces +Z (Buddha)

  // arms folded, holding 降魔杵 horizontally (toward Buddha, +Z)
  const arm = new THREE.CylinderGeometry(0.11, 0.1, 0.9, 10);
  const la = M(arm, armor, 0.48, 2.0, 0.32);
  const ra = M(arm, armor, -0.48, 2.0, 0.32);
  la.rotation.set(0.95, 0, 0.5);
  ra.rotation.set(0.95, 0, -0.5);
  g.add(la, ra);

  const pestle = vajraPestle();
  pestle.position.set(0, 1.78, 0.52);
  pestle.rotation.z = Math.PI / 2;
  g.add(pestle);

  const skull = M(new THREE.SphereGeometry(0.32, 14, 12), skin, 0, 2.98, 0);
  skull.rotation.y = 0; // Weituo faces +Z (the Buddha); painted face on +Z after... painted UV front is +Z by default, then we usually rot PI for -Z. Here face +Z: no rot.
  // Wait, paintedFace UV: we rot PI for buddha to face -Z. For Weituo facing +Z, no rotation — front of sphere is +Z.
  g.add(skull);
  g.add(M(new THREE.SphereGeometry(0.35, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), armor, 0, 3.12, 0));
  g.add(M(new THREE.ConeGeometry(0.08, 0.45, 8), mat(0x8b1e1e), 0, 3.52, 0));

  // Plaque faces worshippers (−Z), so rotate the plaque group (already does PI in placePlaque)
  placePlaque(g, "韦陀菩萨", undefined, -1.15, 0.02, 0.95);
  g.position.set(-3.6, 0, 3.2);
  // Face the Buddha (+Z): default
  return g;
}

