import * as THREE from "three";

function gold(color = 0xc9a84c, emissive = 0.09): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.72,
    roughness: 0.34,
    emissive: color,
    emissiveIntensity: emissive,
  });
}
function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.08, ...opts });
}
function mesh(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** 如来佛祖 — seated, lotus throne, meditation mudra, respectful stylized form. */
export function createBuddha(): THREE.Group {
  const g = new THREE.Group();
  const G = gold(0xd4b056, 0.12);
  const G2 = gold(0xb8943c, 0.07);
  const robe = gold(0xc9a040, 0.08);
  const lotus = mat(0xc98a8a, { roughness: 0.5, emissive: 0x4a2020, emissiveIntensity: 0.08 });
  const lotusGold = gold(0xe8d5a3, 0.06);

  // two-tier lotus
  for (const [r, y, n, s] of [
    [1.85, 0.15, 16, 1.0],
    [1.45, 0.38, 14, 0.85],
  ] as const) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (n === 14 ? 0.2 : 0);
      const p = mesh(new THREE.SphereGeometry(0.42 * s, 10, 8), lotus);
      p.scale.set(0.55, 0.28, 1.15);
      p.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      p.lookAt(new THREE.Vector3(Math.cos(a) * r * 2, y - 0.2, Math.sin(a) * r * 2));
      g.add(p);
    }
  }
  g.add(mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.35, 24), lotusGold, 0, 0.55, 0));
  g.add(mesh(new THREE.CylinderGeometry(1.05, 1.1, 0.2, 24), G, 0, 0.78, 0));

  // seated body
  g.add(mesh(new THREE.SphereGeometry(1.05, 20, 16), robe, 0, 1.85, 0));
  const torso = mesh(new THREE.CylinderGeometry(0.85, 1.05, 1.5, 18), robe, 0, 2.55, 0);
  g.add(torso);
  // knees
  const kneeG = new THREE.SphereGeometry(0.62, 14, 12);
  g.add(mesh(kneeG, robe, 1.35, 1.45, 0.35));
  g.add(mesh(kneeG, robe, -1.35, 1.45, 0.35));
  // shin / crossed calves
  const calf = new THREE.CylinderGeometry(0.32, 0.28, 1.3, 10);
  const c1 = mesh(calf, robe, 0.7, 1.2, 0.7);
  c1.rotation.z = Math.PI / 2.4;
  c1.rotation.y = 0.4;
  const c2 = mesh(calf, robe, -0.7, 1.15, 0.85);
  c2.rotation.z = -Math.PI / 2.4;
  c2.rotation.y = -0.4;
  g.add(c1, c2);

  // chest drape
  const drape = mesh(new THREE.TorusGeometry(0.75, 0.12, 8, 18, Math.PI), G2, 0, 2.85, 0.35);
  drape.rotation.x = 0.5;
  g.add(drape);

  // arms to lap (dhyana mudra)
  const armG = new THREE.CylinderGeometry(0.22, 0.18, 1.15, 10);
  const la = mesh(armG, robe, 0.95, 2.35, 0.45);
  la.rotation.z = 1.05;
  la.rotation.x = 0.55;
  const ra = mesh(armG, robe, -0.95, 2.35, 0.45);
  ra.rotation.z = -1.05;
  ra.rotation.x = 0.55;
  g.add(la, ra);
  const hand = new THREE.SphereGeometry(0.2, 10, 8);
  g.add(mesh(hand, G, 0.12, 1.85, 0.85));
  g.add(mesh(hand, G, -0.12, 1.78, 0.85));

  // neck + head
  g.add(mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.35, 12), G, 0, 3.45, 0));
  const head = mesh(new THREE.SphereGeometry(0.62, 20, 16), G, 0, 4.1, 0);
  g.add(head);
  // ushnisha
  g.add(mesh(new THREE.SphereGeometry(0.28, 12, 10), G, 0, 4.72, 0));
  g.add(mesh(new THREE.SphereGeometry(0.1, 8, 8), gold(0xf0e0b0, 0.2), 0, 5.02, 0));
  // long ears
  const earG = new THREE.CapsuleGeometry(0.1, 0.38, 4, 8);
  const le = mesh(earG, G, 0.62, 4.0, 0);
  const re = mesh(earG, G, -0.62, 4.0, 0);
  le.rotation.z = 0.15;
  re.rotation.z = -0.15;
  g.add(le, re);
  // 白毫
  g.add(mesh(new THREE.SphereGeometry(0.045, 8, 8), mat(0xf5f0e0, { emissive: 0xffffff, emissiveIntensity: 0.4 }), 0, 4.2, 0.58));
  // half-lidded eyes
  const lid = mat(0x3a2a1c, { roughness: 0.5 });
  const eye = new THREE.BoxGeometry(0.2, 0.035, 0.03);
  const eL = mesh(eye, lid, 0.2, 4.12, 0.55);
  const eR = mesh(eye, lid, -0.2, 4.12, 0.55);
  eL.rotation.z = 0.12;
  eR.rotation.z = -0.12;
  g.add(eL, eR);
  // serene mouth
  const mouth = mesh(new THREE.TorusGeometry(0.1, 0.015, 6, 10, Math.PI), lid, 0, 3.88, 0.56);
  mouth.rotation.set(0.5, 0, Math.PI);
  g.add(mouth);

  // mandorla / halo
  const halo = mesh(new THREE.TorusGeometry(2.15, 0.07, 8, 40), gold(0xffe7a0, 0.45), 0, 3.6, -1.15);
  halo.rotation.x = 0.08;
  g.add(halo);
  const disc = mesh(
    new THREE.CircleGeometry(2.05, 36),
    new THREE.MeshStandardMaterial({
      color: 0xe8c86a,
      emissive: 0xc9a84c,
      emissiveIntensity: 0.28,
      metalness: 0.3,
      roughness: 0.5,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }),
    0, 3.6, -1.2,
  );
  g.add(disc);

  g.position.set(0, 1.05, 21.6);
  return g;
}

export type KingKind = "pipa" | "sword" | "serpent" | "umbrella";

const KING_INFO: { kind: KingKind; armor: number; name: string }[] = [
  { kind: "pipa", armor: 0xd8d0b8, name: "持国天王" }, // 东 白
  { kind: "sword", armor: 0x3a5a8c, name: "增长天王" }, // 南 青
  { kind: "serpent", armor: 0x8c2a28, name: "广目天王" }, // 西 红
  { kind: "umbrella", armor: 0x2f5a3a, name: "多闻天王" }, // 北 绿
];

/** 四大天王 — standing armored guardians, stylized. */
export function createHeavenlyKing(index: number): THREE.Group {
  const info = KING_INFO[index % 4];
  const g = new THREE.Group();
  const armor = mat(info.armor, { metalness: 0.45, roughness: 0.4, emissive: info.armor, emissiveIntensity: 0.05 });
  const goldM = gold(0xc9a84c, 0.08);
  const skin = mat(0xd4a574, { roughness: 0.55 });
  const dark = mat(0x2a1c12);

  // pedestal
  g.add(mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.35, 10), goldM, 0, 0.18, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.15, 10), mat(0x6b1c16), 0, 0.4, 0));

  // legs & body
  g.add(mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.1, 8), armor, 0.22, 0.95, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.1, 8), armor, -0.22, 0.95, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.48, 0.55, 1.35, 10), armor, 0, 2.15, 0));
  // shoulder armor
  g.add(mesh(new THREE.SphereGeometry(0.32, 10, 8), goldM, 0.52, 2.75, 0));
  g.add(mesh(new THREE.SphereGeometry(0.32, 10, 8), goldM, -0.52, 2.75, 0));
  // arms
  const arm = new THREE.CylinderGeometry(0.13, 0.12, 1.05, 8);
  const la = mesh(arm, armor, 0.7, 2.15, 0.15);
  const ra = mesh(arm, armor, -0.7, 2.15, 0.15);
  la.rotation.z = 0.25;
  ra.rotation.z = -0.25;
  g.add(la, ra);
  // head + helmet
  g.add(mesh(new THREE.SphereGeometry(0.32, 12, 10), skin, 0, 3.15, 0));
  const helm = mesh(new THREE.SphereGeometry(0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), goldM, 0, 3.28, 0);
  g.add(helm);
  // plume
  const plume = mesh(new THREE.ConeGeometry(0.08, 0.45, 8), mat(0x8b1e1e), 0, 3.7, 0);
  g.add(plume);
  // fierce but stylized brows
  const brow = mat(0x2a1a10);
  const bL = mesh(new THREE.BoxGeometry(0.14, 0.04, 0.03), brow, 0.12, 3.22, 0.28);
  const bR = mesh(new THREE.BoxGeometry(0.14, 0.04, 0.03), brow, -0.12, 3.22, 0.28);
  bL.rotation.z = 0.35;
  bR.rotation.z = -0.35;
  g.add(bL, bR);

  // attribute
  const attr = new THREE.Group();
  if (info.kind === "pipa") {
    const body = mesh(new THREE.BoxGeometry(0.35, 0.7, 0.12), goldM, 0, 0, 0);
    body.scale.set(1, 1, 1);
    const neck = mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), goldM, 0, 0.58, 0);
    attr.add(body, neck);
    attr.position.set(0.85, 1.7, 0.35);
    attr.rotation.z = -0.4;
  } else if (info.kind === "sword") {
    const blade = mesh(new THREE.BoxGeometry(0.07, 1.6, 0.04), mat(0xc8d0d8, { metalness: 0.8, roughness: 0.25 }), 0, 0.5, 0);
    const hilt = mesh(new THREE.BoxGeometry(0.22, 0.08, 0.08), goldM, 0, -0.3, 0);
    attr.add(blade, hilt);
    attr.position.set(-0.95, 2.3, 0.2);
    attr.rotation.z = 0.15;
    ra.rotation.z = -0.7;
    ra.rotation.x = -0.3;
  } else if (info.kind === "serpent") {
    const snake = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.08, 6, 16, Math.PI * 1.6),
      mat(0x4a7a3a, { roughness: 0.45 }),
    );
    snake.position.set(-0.95, 1.9, 0.3);
    snake.rotation.y = 0.6;
    snake.castShadow = true;
    g.add(snake);
    const headS = mesh(new THREE.SphereGeometry(0.1, 8, 8), mat(0x3a5a2a), -0.7, 2.2, 0.5);
    g.add(headS);
  } else {
    // umbrella
    const pole = mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.8, 8), dark, 0, 0, 0);
    const top = mesh(new THREE.ConeGeometry(0.55, 0.22, 14), mat(0x6b1c16, { roughness: 0.6 }), 0, 0.95, 0);
    attr.add(pole, top);
    attr.position.set(-0.9, 2.7, 0.15);
  }
  if (info.kind !== "serpent") g.add(attr);

  // name plaque
  g.add(makePlaque(info.name, 0.7));
  return g;
}

/** 韦陀护法 — standing at the hall entrance, facing the Buddha, vajra across arms. */
export function createWeituo(): THREE.Group {
  const g = new THREE.Group();
  const armor = gold(0xc9a84c, 0.1);
  const darkG = gold(0x8a6a30, 0.05);
  const skin = mat(0xd4a574);

  g.add(mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.3, 10), gold(0xb8943c), 0, 0.15, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.18, 1.0, 8), armor, 0.18, 0.85, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.18, 1.0, 8), armor, -0.18, 0.85, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.42, 0.48, 1.25, 10), armor, 0, 1.95, 0));
  g.add(mesh(new THREE.SphereGeometry(0.28, 10, 8), darkG, 0.48, 2.55, 0));
  g.add(mesh(new THREE.SphereGeometry(0.28, 10, 8), darkG, -0.48, 2.55, 0));
  // arms folded, holding vajra horizontally
  const arm = new THREE.CylinderGeometry(0.11, 0.1, 0.85, 8);
  const la = mesh(arm, armor, 0.45, 1.95, 0.28);
  const ra = mesh(arm, armor, -0.45, 1.95, 0.28);
  la.rotation.set(0.9, 0, 0.5);
  ra.rotation.set(0.9, 0, -0.5);
  g.add(la, ra);
  const vajra = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.15, 8), gold(0xe8d5a3, 0.2), 0, 1.75, 0.5);
  vajra.rotation.z = Math.PI / 2;
  g.add(vajra);
  const tip = new THREE.ConeGeometry(0.09, 0.18, 8);
  const tipL = mesh(tip, armor, 0.62, 1.75, 0.5);
  tipL.rotation.z = -Math.PI / 2;
  const tipR = mesh(tip, armor, -0.62, 1.75, 0.5);
  tipR.rotation.z = Math.PI / 2;
  g.add(tipL, tipR);

  g.add(mesh(new THREE.SphereGeometry(0.3, 12, 10), skin, 0, 2.9, 0));
  g.add(mesh(new THREE.SphereGeometry(0.33, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), armor, 0, 3.02, 0));
  const plume = mesh(new THREE.ConeGeometry(0.07, 0.4, 8), mat(0x8b1e1e), 0, 3.42, 0);
  g.add(plume);

  g.add(makePlaque("韦陀护法", 0.55));
  g.position.set(-3.6, 0, 3.2);
  // faces +Z (Buddha)
  return g;
}

function makePlaque(text: string, y = 0.55): THREE.Mesh {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#5c1212";
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = "#d4b36a";
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 244, 84);
  ctx.fillStyle = "#f0d9a0";
  ctx.font = "bold 42px 'Noto Serif SC', 'Songti SC', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.42),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }),
  );
  m.position.set(0, y, 0.9);
  return m;
}

export { KING_INFO };
