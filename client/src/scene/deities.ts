/**
 * Original smooth gilt (金身) figures — procedural meshes, not scans.
 * Soft gold PBR; seated and standing poses sit/stand flush on a lotus or 须弥座.
 */
import * as THREE from "three";
import type { DeityKind } from "../../../server/src/shared";

export function goldMat(color = 0xe4c56a, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.86,
    roughness: 0.3,
    envMapIntensity: 1.15,
    ...opts,
  });
}

function M(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x = 0, y = 0, z = 0,
  rx = 0, ry = 0, rz = 0,
  sx = 1, sy = 1, sz = 1,
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Multi-tier gilt lotus. Sitting surface at returned `userData.topY`. */
export function lotusThrone(radius: number, tiers = 3, goldM?: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const mat = goldM ?? goldMat(0xe0c068);
  const petalH = 0.16 * (radius / 1.2);
  let y = 0;
  for (let t = 0; t < tiers; t++) {
    const n = 14 - t * 2;
    const r = radius * (1 - t * 0.16);
    const yy = y + petalH * 0.45;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + t * 0.2;
      const p = M(new THREE.SphereGeometry(radius * 0.38, 10, 8), mat,
        Math.cos(a) * r * 0.85, yy, Math.sin(a) * r * 0.85,
        Math.PI / 2 - 0.4, -a, 0,
        0.55, 0.28, 1.05);
      g.add(p);
    }
    y += petalH * 0.7;
  }
  const topY = y + 0.08;
  g.add(M(new THREE.CylinderGeometry(radius * 0.52, radius * 0.68, 0.14, 20), mat, 0, topY - 0.05, 0));
  g.add(M(new THREE.CylinderGeometry(radius * 0.46, radius * 0.46, 0.04, 20), mat, 0, topY, 0));
  g.userData.topY = topY;
  return g;
}

/** Tall multi-tier 须弥座: wide–narrow–wide, carved waist, gold bands, front steps. */
export function sumeruBase(w: number, d: number, h: number, opts?: { steps?: boolean }): THREE.Group {
  const g = new THREE.Group();
  const verm = goldMat(0x6b1c16, { metalness: 0.18, roughness: 0.55, envMapIntensity: 0.4 });
  const gold = goldMat(0xe8d5a3, { metalness: 0.82, roughness: 0.32 });
  const stone = goldMat(0x5a4030, { metalness: 0.12, roughness: 0.65, envMapIntensity: 0.3 });
  // Proportions: plinth, 下枭, 束腰, 上枭, top 枋
  const bands = [
    { t: 0.18, wx: 1.00, dx: 1.00, m: stone }, // 土衬
    { t: 0.08, wx: 1.04, dx: 1.04, m: gold },  // gold band
    { t: 0.14, wx: 0.96, dx: 0.96, m: verm },  // 下枋
    { t: 0.12, wx: 0.86, dx: 0.88, m: verm },  // 下枭 (inward)
    { t: 0.22, wx: 0.78, dx: 0.80, m: stone }, // 束腰
    { t: 0.12, wx: 0.88, dx: 0.90, m: verm },  // 上枭
    { t: 0.08, wx: 1.00, dx: 1.00, m: gold },
    { t: 0.06, wx: 0.96, dx: 0.96, m: verm },
  ];
  const sumT = bands.reduce((s, b) => s + b.t, 0);
  let y = 0;
  for (const b of bands) {
    const hh = (b.t / sumT) * h;
    g.add(M(new THREE.BoxGeometry(w * b.wx, hh, d * b.dx), b.m, 0, y + hh / 2, 0));
    y += hh;
  }
  // 壶门-style recesses on the waist
  const waistY = h * 0.42;
  const panelM = goldMat(0xc9a84c, { metalness: 0.7, roughness: 0.4 });

  // carved gold panels on front 束腰
  const pw = (w * 0.72) / 5;
  for (let i = 0; i < 5; i++) {
    const px = -w * 0.32 + i * pw * 1.05;
    g.add(M(new THREE.BoxGeometry(pw * 0.7, h * 0.14, 0.08), panelM, px, waistY, -d * 0.4 - 0.02));
  }
  // ceremonial steps on the front (−Z)
  if (opts?.steps !== false) {
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const sh = (h * 0.55) / steps;
      const yy = sh * (i + 0.5);
      const zz = -(d / 2) - 0.35 - (steps - 1 - i) * 0.28;
      const sw = w * (0.36 + i * 0.02);
      g.add(M(new THREE.BoxGeometry(sw, sh, 0.3), verm, 0, yy, zz));
      g.add(M(new THREE.BoxGeometry(sw + 0.04, 0.03, 0.32), gold, 0, yy + sh / 2, zz));
    }
  }
  g.userData.topY = h;
  g.userData.frontZ = -(d / 2);
  return g;
}

function buddhaHead(mat: THREE.Material, scale = 1): THREE.Group {
  const h = new THREE.Group();
  h.add(M(new THREE.SphereGeometry(0.62 * scale, 28, 22), mat));
  // ushnisha
  h.add(M(new THREE.SphereGeometry(0.28 * scale, 16, 12), mat, 0, 0.62 * scale, 0));
  // 螺发 — rings of small bumps
  for (let ring = 0; ring < 5; ring++) {
    const n = 10 + ring * 4;
    const el = (ring / 5) * (Math.PI * 0.48);
    const rr = 0.62 * scale * Math.sin(el);
    const yy = 0.62 * scale * Math.cos(el) * 0.92;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      h.add(M(new THREE.SphereGeometry(0.055 * scale, 6, 5), mat,
        Math.cos(a) * rr, yy, Math.sin(a) * rr));
    }
  }
  // long ears
  h.add(M(new THREE.CapsuleGeometry(0.09 * scale, 0.42 * scale, 4, 8), mat, 0.64 * scale, -0.08 * scale, 0, 0, 0, 0.15));
  h.add(M(new THREE.CapsuleGeometry(0.09 * scale, 0.42 * scale, 4, 8), mat, -0.64 * scale, -0.08 * scale, 0, 0, 0, -0.15));
  // closed eyes
  const lid = goldMat(0xb8943c, { metalness: 0.7, roughness: 0.4 });
  h.add(M(new THREE.BoxGeometry(0.16 * scale, 0.025 * scale, 0.02), lid, 0.18 * scale, 0.04 * scale, 0.56 * scale, 0, 0, 0.2));
  h.add(M(new THREE.BoxGeometry(0.16 * scale, 0.025 * scale, 0.02), lid, -0.18 * scale, 0.04 * scale, 0.56 * scale, 0, 0, -0.2));
  // urna
  h.add(M(new THREE.SphereGeometry(0.035 * scale, 8, 8), goldMat(0xffe7a0, { metalness: 0.9, roughness: 0.2, emissive: 0xc9a84c, emissiveIntensity: 0.25 }),
    0, 0.14 * scale, 0.6 * scale));
  // slight smile
  h.add(M(new THREE.TorusGeometry(0.1 * scale, 0.014 * scale, 6, 10, Math.PI), lid, 0, -0.18 * scale, 0.56 * scale, 0.5, 0, Math.PI));
  // nose
  h.add(M(new THREE.SphereGeometry(0.07 * scale, 8, 8), mat, 0, -0.02 * scale, 0.6 * scale, 0, 0, 0, 0.7, 1.1, 0.85));
  return h;
}

function hand(mat: THREE.Material, s = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(M(new THREE.SphereGeometry(0.11 * s, 10, 8), mat));
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * 0.055 * s;
    g.add(M(new THREE.CapsuleGeometry(0.022 * s, 0.14 * s, 3, 6), mat, x, 0.14 * s, 0.02 * s));
  }
  g.add(M(new THREE.CapsuleGeometry(0.024 * s, 0.1 * s, 3, 6), mat, 0.12 * s, 0.02 * s, 0.04 * s, 0, 0, 1.1));
  return g;
}

/** Seated 释迦牟尼: lotus pose, right hand 施无畏印 (raised), left in lap. Facing −Z. */
export function seatedBuddha(bodyH = 5.6): THREE.Group {
  const g = new THREE.Group();
  const G = goldMat(0xe6c86e);
  const robe = goldMat(0xd4b052);
  const s = bodyH / 5.6;

  // Crossed knees
  g.add(M(new THREE.SphereGeometry(0.72 * s, 18, 14), robe, 1.35 * s, 0.7 * s, 0.1 * s, 0, 0, 0, 1.15, 0.75, 1));
  g.add(M(new THREE.SphereGeometry(0.72 * s, 18, 14), robe, -1.35 * s, 0.7 * s, 0.1 * s, 0, 0, 0, 1.15, 0.75, 1));
  // robe lathe
  const pts = [
    new THREE.Vector2(0.15 * s, 0.35 * s),
    new THREE.Vector2(1.55 * s, 0.45 * s),
    new THREE.Vector2(1.5 * s, 0.95 * s),
    new THREE.Vector2(0.85 * s, 1.5 * s),
    new THREE.Vector2(0.95 * s, 2.3 * s),
    new THREE.Vector2(0.8 * s, 3.15 * s),
    new THREE.Vector2(0.48 * s, 3.45 * s),
  ];
  g.add(M(new THREE.LatheGeometry(pts, 32), robe, 0, 0, 0));
  // chest drape
  g.add(M(new THREE.TorusGeometry(0.7 * s, 0.1 * s, 10, 22, Math.PI), goldMat(0xc9a040), 0, 2.85 * s, 0.28 * s, 0.55, 0, 0));

  // Right arm raised (viewer's left, +X if we face −Z... wait:
  // Figure faces −Z. Figure's RIGHT is −X (stage right = viewer's left).
  // Abhaya: Buddha's right hand raised. So −X side, hand up, palm toward viewer (−Z).
  const ra = M(new THREE.CylinderGeometry(0.16 * s, 0.14 * s, 1.05 * s, 12), robe, -0.95 * s, 2.55 * s, 0.25 * s, 0, 0, 0.85);
  g.add(ra);
  const rFore = M(new THREE.CylinderGeometry(0.13 * s, 0.12 * s, 0.85 * s, 12), robe, -1.15 * s, 3.35 * s, 0.45 * s, 0.35, 0, -0.15);
  g.add(rFore);
  const rHand = hand(G, s);
  rHand.position.set(-1.1 * s, 3.85 * s, 0.7 * s);
  rHand.rotation.set(0.2, 0.3, -0.4);
  g.add(rHand);

  // Left arm in lap
  g.add(M(new THREE.CylinderGeometry(0.16 * s, 0.14 * s, 1.0 * s, 12), robe, 0.95 * s, 2.2 * s, 0.35 * s, 0.9, 0, -1.05));
  const lHand = hand(G, s * 0.95);
  lHand.position.set(0.15 * s, 1.75 * s, 0.85 * s);
  lHand.rotation.set(1.1, 0.2, 0.4);
  g.add(lHand);

  g.add(M(new THREE.CylinderGeometry(0.28 * s, 0.34 * s, 0.32 * s, 14), G, 0, 3.55 * s, 0));
  const head = buddhaHead(G, s);
  head.position.set(0, 4.25 * s, 0);
  g.add(head);

  g.userData.height = 4.9 * s;
  return g;
}

/** Standing crowned bodhisattva / attendant, facing −Z. Variations by kind. */
export function standingBodhisattva(kind: DeityKind | "ananda" | "kasyapa" = "guanyin", h = 5.2): THREE.Group {
  const g = new THREE.Group();
  const G = goldMat(kind === "dizang" ? 0xd4b056 : 0xe6c86e);
  const robe = goldMat(kind === "dizang" ? 0xc9a848 : 0xd8b456);
  const s = h / 5.2;
  // skirt / lower robe
  const pts = [
    new THREE.Vector2(0.12 * s, 0.05 * s),
    new THREE.Vector2(0.62 * s, 0.1 * s),
    new THREE.Vector2(0.58 * s, 1.1 * s),
    new THREE.Vector2(0.38 * s, 2.0 * s),
    new THREE.Vector2(0.42 * s, 2.7 * s),
    new THREE.Vector2(0.32 * s, 3.15 * s),
  ];
  g.add(M(new THREE.LatheGeometry(pts, 28), robe));
  // torso
  g.add(M(new THREE.CylinderGeometry(0.32 * s, 0.38 * s, 1.15 * s, 16), robe, 0, 3.55 * s, 0));
  // sash
  g.add(M(new THREE.TorusGeometry(0.36 * s, 0.05 * s, 8, 18, Math.PI * 1.4), goldMat(0xc9a040), 0.05 * s, 3.3 * s, 0.05 * s, 1.1, 0, 0.4));
  // arms — right raised (figure's right = −X), left down or holding attribute
  g.add(M(new THREE.CylinderGeometry(0.1 * s, 0.09 * s, 0.95 * s, 10), robe, -0.5 * s, 3.85 * s, 0.15 * s, 0, 0, 0.55));
  g.add(M(new THREE.CylinderGeometry(0.09 * s, 0.08 * s, 0.7 * s, 10), robe, -0.62 * s, 4.5 * s, 0.35 * s, 0.4, 0, 0.1));
  const rh = hand(G, s * 0.85);
  rh.position.set(-0.58 * s, 4.95 * s, 0.55 * s);
  g.add(rh);
  g.add(M(new THREE.CylinderGeometry(0.1 * s, 0.09 * s, 1.05 * s, 10), robe, 0.52 * s, 3.4 * s, 0.12 * s, 0, 0, -0.25));
  const lh = hand(G, s * 0.85);
  lh.position.set(0.58 * s, 2.8 * s, 0.28 * s);
  g.add(lh);

  // attribute
  if (kind === "guanyin") {
    // vase in left hand
    g.add(M(new THREE.SphereGeometry(0.12 * s, 10, 8), G, 0.58 * s, 2.55 * s, 0.32 * s));
    g.add(M(new THREE.CylinderGeometry(0.04 * s, 0.07 * s, 0.22 * s, 10), G, 0.58 * s, 2.72 * s, 0.32 * s));
  } else if (kind === "wenshu") {
    // sword upright
    g.add(M(new THREE.BoxGeometry(0.05 * s, 0.9 * s, 0.02 * s), G, -0.58 * s, 5.4 * s, 0.55 * s));
    g.add(M(new THREE.SphereGeometry(0.07 * s, 8, 8), G, -0.58 * s, 4.92 * s, 0.55 * s));
  } else if (kind === "puxian") {
    g.add(M(new THREE.SphereGeometry(0.14 * s, 10, 8), G, 0.58 * s, 2.55 * s, 0.3 * s)); // lotus
  } else if (kind === "dizang") {
    // khakkhara staff
    g.add(M(new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 2.4 * s, 8), G, 0.7 * s, 3.6 * s, 0.2 * s));
    g.add(M(new THREE.TorusGeometry(0.14 * s, 0.025 * s, 6, 10), G, 0.7 * s, 4.85 * s, 0.2 * s, Math.PI / 2, 0, 0));
    // wish-fulfilling jewel
    g.add(M(new THREE.SphereGeometry(0.1 * s, 10, 8), goldMat(0xffe7a0, { emissive: 0xc9a84c, emissiveIntensity: 0.3 }), -0.55 * s, 5.05 * s, 0.55 * s));
  }

  g.add(M(new THREE.CylinderGeometry(0.16 * s, 0.2 * s, 0.22 * s, 12), G, 0, 4.2 * s, 0));
  const head = buddhaHead(G, s * 0.85);
  head.position.set(0, 4.72 * s, 0);
  // crown
  const crownM = goldMat(0xf0d78a, { metalness: 0.9, roughness: 0.25 });
  for (let i = 0; i < 5; i++) {
    const a = -0.8 + (i / 4) * 1.6;
    const ht = (i === 2 ? 0.32 : 0.2) * s;
    head.add(M(new THREE.ConeGeometry(0.08 * s, ht, 6), crownM, Math.sin(a) * 0.28 * s, 0.7 * s + ht / 2, Math.cos(a) * 0.15 * s));
  }
  g.add(head);
  g.userData.height = 5.15 * s;
  return g;
}

function seatedBuddhaLike(bodyH: number, tint = 0xe6c86e): THREE.Group {
  const g = seatedBuddha(bodyH);
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.material && (m.material as THREE.MeshStandardMaterial).color) {
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      mat.color.lerp(new THREE.Color(tint), 0.25);
      m.material = mat;
    }
  });
  return g;
}

export function mileBuddha(h = 4.8): THREE.Group {
  // Laughing Maitreya — potbelly, seated, open smile, still gilt with a warmer tone
  const g = new THREE.Group();
  const G = goldMat(0xe8c878);
  const s = h / 4.8;
  g.add(M(new THREE.SphereGeometry(1.15 * s, 22, 16), G, 0, 1.15 * s, 0.15 * s, 0, 0, 0, 1.15, 0.9, 1));
  g.add(M(new THREE.SphereGeometry(0.85 * s, 16, 12), G, 0.95 * s, 0.7 * s, 0.2 * s, 0, 0, 0, 1, 0.7, 1));
  g.add(M(new THREE.SphereGeometry(0.85 * s, 16, 12), G, -0.95 * s, 0.7 * s, 0.2 * s, 0, 0, 0, 1, 0.7, 1));
  g.add(M(new THREE.SphereGeometry(0.55 * s, 16, 12), G, 0, 2.15 * s, 0.1 * s));
  // head — rounder, smiling wider
  g.add(M(new THREE.SphereGeometry(0.62 * s, 22, 16), G, 0, 2.85 * s, 0.08 * s));
  g.add(M(new THREE.SphereGeometry(0.18 * s, 10, 8), G, 0, 3.4 * s, 0)); // small bun
  const lid = goldMat(0xb8943c);
  g.add(M(new THREE.BoxGeometry(0.18 * s, 0.03 * s, 0.02), lid, 0.2 * s, 2.9 * s, 0.58 * s, 0, 0, 0.25));
  g.add(M(new THREE.BoxGeometry(0.18 * s, 0.03 * s, 0.02), lid, -0.2 * s, 2.9 * s, 0.58 * s, 0, 0, -0.25));
  g.add(M(new THREE.TorusGeometry(0.2 * s, 0.03 * s, 6, 12, Math.PI), lid, 0, 2.62 * s, 0.55 * s, 0.6, 0, Math.PI));
  // ears
  g.add(M(new THREE.SphereGeometry(0.16 * s, 10, 8), G, 0.62 * s, 2.8 * s, 0, 0, 0, 0, 0.7, 1.1, 0.7));
  g.add(M(new THREE.SphereGeometry(0.16 * s, 10, 8), G, -0.62 * s, 2.8 * s, 0, 0, 0, 0, 0.7, 1.1, 0.7));
  // right hand on belly, left raised cheerfully
  g.add(M(new THREE.CylinderGeometry(0.14 * s, 0.12 * s, 0.9 * s, 10), G, 0.85 * s, 1.6 * s, 0.5 * s, 0.7, 0, -0.8));
  g.add(M(new THREE.SphereGeometry(0.16 * s, 10, 8), G, 0.35 * s, 1.25 * s, 0.85 * s));
  g.add(M(new THREE.CylinderGeometry(0.14 * s, 0.12 * s, 0.95 * s, 10), G, -0.9 * s, 2.15 * s, 0.35 * s, 0, 0, 0.7));
  g.add(M(new THREE.SphereGeometry(0.16 * s, 10, 8), G, -1.15 * s, 2.7 * s, 0.55 * s));
  g.userData.height = 3.5 * s;
  return g;
}

export function guanYu(h = 5.4): THREE.Group {
  const g = new THREE.Group();
  const s = h / 5.4;
  const armor = goldMat(0xc9a84c, { metalness: 0.75 });
  const green = new THREE.MeshStandardMaterial({ color: 0x1e4a32, roughness: 0.6, metalness: 0.15 });
  const red = new THREE.MeshStandardMaterial({ color: 0x8b1a16, roughness: 0.5, metalness: 0.08 });
  const beard = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.7 });
  // body
  g.add(M(new THREE.CylinderGeometry(0.42 * s, 0.5 * s, 2.2 * s, 14), green, 0, 2.0 * s, 0));
  g.add(M(new THREE.CylinderGeometry(0.5 * s, 0.62 * s, 1.2 * s, 14), green, 0, 0.7 * s, 0));
  g.add(M(new THREE.CylinderGeometry(0.38 * s, 0.42 * s, 0.5 * s, 12), armor, 0, 3.2 * s, 0));
  // head — red face
  g.add(M(new THREE.SphereGeometry(0.42 * s, 18, 14), red, 0, 3.85 * s, 0));
  // long beard
  g.add(M(new THREE.ConeGeometry(0.18 * s, 1.1 * s, 8), beard, 0, 3.2 * s, 0.28 * s, 0.35, 0, 0));
  g.add(M(new THREE.ConeGeometry(0.06 * s, 0.85 * s, 6), beard, 0.16 * s, 3.35 * s, 0.28 * s, 0.3, 0, -0.2));
  g.add(M(new THREE.ConeGeometry(0.06 * s, 0.85 * s, 6), beard, -0.16 * s, 3.35 * s, 0.28 * s, 0.3, 0, 0.2));
  // guan dao in right hand (−X)
  g.add(M(new THREE.CylinderGeometry(0.04 * s, 0.04 * s, 3.4 * s, 8), armor, -0.85 * s, 2.6 * s, 0.2 * s, 0, 0, 0.15));
  g.add(M(new THREE.BoxGeometry(0.08 * s, 0.9 * s, 0.35 * s), armor, -1.05 * s, 4.4 * s, 0.25 * s, 0, 0.4, 0.1));
  // left arm
  g.add(M(new THREE.CylinderGeometry(0.12 * s, 0.1 * s, 1.0 * s, 8), green, 0.55 * s, 2.7 * s, 0.15 * s, 0, 0, -0.4));
  // crown / hat
  g.add(M(new THREE.CylinderGeometry(0.28 * s, 0.36 * s, 0.35 * s, 10), armor, 0, 4.35 * s, 0));
  g.userData.height = 4.6 * s;
  return g;
}

export function wenChang(h = 5.0): THREE.Group {
  const g = new THREE.Group();
  const s = h / 5.0;
  const robe = goldMat(0xc9a84c);
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a2018, roughness: 0.55, metalness: 0.1 });
  const skin = goldMat(0xe8c878, { metalness: 0.35, roughness: 0.5 });
  g.add(M(new THREE.CylinderGeometry(0.48 * s, 0.7 * s, 2.6 * s, 16), robe, 0, 1.4 * s, 0));
  g.add(M(new THREE.CylinderGeometry(0.32 * s, 0.36 * s, 0.4 * s, 12), robe, 0, 2.85 * s, 0));
  g.add(M(new THREE.SphereGeometry(0.4 * s, 16, 12), skin, 0, 3.4 * s, 0));
  // official hat
  g.add(M(new THREE.BoxGeometry(0.7 * s, 0.28 * s, 0.4 * s), dark, 0, 3.9 * s, 0));
  g.add(M(new THREE.BoxGeometry(1.15 * s, 0.08 * s, 0.18 * s), dark, 0, 3.95 * s, 0));
  // tablet (笏)
  g.add(M(new THREE.BoxGeometry(0.18 * s, 0.7 * s, 0.04 * s), goldMat(0xe8d5a3), 0.15 * s, 2.2 * s, 0.55 * s));
  g.add(M(new THREE.CylinderGeometry(0.1 * s, 0.09 * s, 0.9 * s, 8), robe, 0.45 * s, 2.3 * s, 0.2 * s, 0.4, 0, -0.3));
  g.userData.height = 4.15 * s;
  return g;
}

export function caiShen(h = 5.0): THREE.Group {
  const g = new THREE.Group();
  const s = h / 5.0;
  const robe = new THREE.MeshStandardMaterial({ color: 0x8b1a16, roughness: 0.5, metalness: 0.15 });
  const G = goldMat(0xe8c878);
  g.add(M(new THREE.CylinderGeometry(0.5 * s, 0.72 * s, 2.5 * s, 16), robe, 0, 1.35 * s, 0));
  g.add(M(new THREE.SphereGeometry(0.42 * s, 16, 12), G, 0, 3.0 * s, 0));
  g.add(M(new THREE.CylinderGeometry(0.28 * s, 0.36 * s, 0.45 * s, 12), G, 0, 3.5 * s, 0)); // hat
  // gold ingot in hands
  g.add(M(new THREE.BoxGeometry(0.55 * s, 0.22 * s, 0.28 * s), G, 0, 1.85 * s, 0.55 * s));
  g.add(M(new THREE.SphereGeometry(0.16 * s, 8, 8), G, 0, 2.0 * s, 0.55 * s, 0, 0, 0, 1.4, 0.6, 0.8));
  g.add(M(new THREE.CylinderGeometry(0.1 * s, 0.09 * s, 0.8 * s, 8), robe, 0.45 * s, 2.1 * s, 0.3 * s, 0.6, 0, -0.5));
  g.add(M(new THREE.CylinderGeometry(0.1 * s, 0.09 * s, 0.8 * s, 8), robe, -0.45 * s, 2.1 * s, 0.3 * s, 0.6, 0, 0.5));
  g.userData.height = 3.8 * s;
  return g;
}

export function yueLao(h = 4.6): THREE.Group {
  const g = new THREE.Group();
  const s = h / 4.6;
  const robe = new THREE.MeshStandardMaterial({ color: 0xc45a2a, roughness: 0.6, metalness: 0.08 });
  const skin = goldMat(0xe8c0a0, { metalness: 0.15, roughness: 0.55 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e0d4, roughness: 0.7 });
  g.add(M(new THREE.CylinderGeometry(0.42 * s, 0.62 * s, 2.2 * s, 14), robe, 0, 1.2 * s, 0));
  g.add(M(new THREE.SphereGeometry(0.38 * s, 16, 12), skin, 0, 2.55 * s, 0));
  // beard + brows
  g.add(M(new THREE.ConeGeometry(0.16 * s, 0.7 * s, 8), white, 0, 2.15 * s, 0.28 * s, 0.4));
  g.add(M(new THREE.SphereGeometry(0.2 * s, 8, 8), white, 0, 2.9 * s, 0)); // bun
  // red thread in hands
  const thread = new THREE.MeshStandardMaterial({ color: 0xc01212, roughness: 0.5 });
  g.add(M(new THREE.TorusGeometry(0.28 * s, 0.025 * s, 6, 16), thread, 0.15 * s, 1.7 * s, 0.5 * s, 0.6, 0.3, 0));
  g.add(M(new THREE.CylinderGeometry(0.09 * s, 0.08 * s, 0.7 * s, 8), robe, 0.4 * s, 1.85 * s, 0.3 * s, 0.5, 0, -0.4));
  g.userData.height = 3.2 * s;
  return g;
}

export function weituoFigure(h = 3.2): THREE.Group {
  const g = standingBodhisattva("ananda", h);
  // vajra / 降魔杵 across arms — already a standing gilt guardian
  const G = goldMat(0xe8d5a3);
  g.add(M(new THREE.CylinderGeometry(0.04 * (h / 5.2), 0.04 * (h / 5.2), 1.4 * (h / 5.2), 8), G, 0, 3.3 * (h / 5.2), 0.45 * (h / 5.2), 0, 0, 1.2));
  return g;
}

export function heavenlyKing(index: number, h = 3.5): THREE.Group {
  const g = standingBodhisattva("ananda", h);
  const s = h / 5.2;
  const G = goldMat(0xe8d5a3);
  // attributes: pipa, sword, serpent, umbrella
  if (index === 0) {
    g.add(M(new THREE.SphereGeometry(0.22 * s, 10, 8), G, 0.55 * s, 3.2 * s, 0.45 * s, 0, 0, 0, 0.7, 0.5, 1.3));
  } else if (index === 1) {
    g.add(M(new THREE.BoxGeometry(0.05 * s, 1.1 * s, 0.02 * s), G, -0.6 * s, 4.6 * s, 0.4 * s));
  } else if (index === 2) {
    g.add(M(new THREE.TorusGeometry(0.28 * s, 0.05 * s, 6, 14, Math.PI * 1.5), G, 0.55 * s, 3.0 * s, 0.4 * s, 0.6, 0.4, 0));
  } else {
    g.add(M(new THREE.CylinderGeometry(0.35 * s, 0.35 * s, 0.08 * s, 14), G, 0.2 * s, 5.3 * s, 0.1 * s));
    g.add(M(new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 1.2 * s, 8), G, 0.2 * s, 4.7 * s, 0.1 * s));
  }
  return g;
}

/** Build the main deity for a hall, origin at the mesh bottom (no lotus — caller adds it). */
export function createDeity(kind: DeityKind, height: number): THREE.Group {
  switch (kind) {
    case "buddha": return seatedBuddha(height);
    case "guanyin": return standingBodhisattva("guanyin", height);
    case "wenshu": return standingBodhisattva("wenshu", height);
    case "puxian": return standingBodhisattva("puxian", height);
    case "dizang": return standingBodhisattva("dizang", height);
    case "yaoshi": return seatedBuddhaLike(height, 0xc8d0e8); // slightly cooler gilt
    case "mile": return mileBuddha(height);
    case "guanyu": return guanYu(height);
    case "wenchang": return wenChang(height);
    case "caishen": return caiShen(height);
    case "yuelao": return yueLao(height);
    default: return standingBodhisattva("guanyin", height);
  }
}

/** Snap the lowest point of a figure onto `surfaceY` (local to parent). */
export function seatFlush(fig: THREE.Object3D, surfaceY: number) {
  fig.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(fig);
  if (!isFinite(box.min.y)) return;
  // box is in world; convert delta
  const parent = fig.parent;
  if (!parent) {
    fig.position.y += surfaceY - box.min.y;
    return;
  }
  const min = new THREE.Vector3(fig.position.x, box.min.y, fig.position.z);
  parent.worldToLocal(min);
  fig.position.y += surfaceY - min.y;
}
