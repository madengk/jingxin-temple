import * as THREE from "three";
import { OTHER_HALLS, allCushionPositions, INCENSE_BURNER, CUSHION_RADIUS } from "../../../server/src/shared";
import { createBuddha, createHeavenlyKing, createWeituo } from "./statues";

export type Obstacle = { x: number; z: number; r: number };

export interface HallObjects {
  group: THREE.Group;
  obstacles: Obstacle[];
  cushions: THREE.InstancedMesh;
  cushionMats: Float32Array;
  burner: THREE.Group;
  muyu: THREE.Group;
  doors: { name: string; x: number; z: number; rotY: number }[];
  floorMeshes: THREE.Mesh[];
}

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, ...opts });
}
function M(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function woodTex(w = 512, h = 512): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#4a3222";
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(0,0,0,${0.07 + Math.random() * 0.12})`;
    g.lineWidth = 1 + Math.random() * 2;
    g.beginPath();
    const y0 = (i / 40) * h;
    g.moveTo(0, y0);
    for (let x = 0; x <= w; x += 16) {
      g.lineTo(x, y0 + Math.sin(x * 0.04 + i) * 3);
    }
    g.stroke();
  }
  for (let i = 0; i < 8; i++) {
    g.fillStyle = `rgba(80,50,25,${0.08})`;
    g.fillRect((i * w) / 8, 0, 3, h);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 10);
  t.anisotropy = 8;
  return t;
}

function stoneTex(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#6a645c";
  g.fillRect(0, 0, 512, 512);
  const tile = 64;
  for (let y = 0; y < 512; y += tile) {
    for (let x = 0; x < 512; x += tile) {
      const v = 90 + Math.random() * 30;
      g.fillStyle = `rgb(${v},${v - 6},${v - 14})`;
      g.fillRect(x + 1, y + 1, tile - 2, tile - 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(12, 14);
  return t;
}

function plaqueTex(title: string, sub = "即将开放"): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#5c1212";
  g.fillRect(0, 0, 256, 128);
  g.strokeStyle = "#d4b36a";
  g.lineWidth = 8;
  g.strokeRect(6, 6, 244, 116);
  g.fillStyle = "#f0d9a0";
  g.font = "bold 40px 'Noto Serif SC','Songti SC',serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(title, 128, 50);
  g.font = "24px 'Noto Serif SC','Songti SC',serif";
  g.fillStyle = "#cbb891";
  g.fillText(sub, 128, 96);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildHall(scene: THREE.Scene): HallObjects {
  const group = new THREE.Group();
  const obstacles: Obstacle[] = [];
  const wood = mat(0x6a4a32, { map: woodTex(), roughness: 0.75 });
  const plaster = mat(0xe8dcc8, { roughness: 0.85 });
  const verm = mat(0x8b1e1e, { roughness: 0.5, metalness: 0.08 });
  const goldM = mat(0xc9a84c, { metalness: 0.7, roughness: 0.35, emissive: 0xc9a84c, emissiveIntensity: 0.1 });
  const stone = mat(0x8a847c, { map: stoneTex(), roughness: 0.9 });
  const roof = mat(0x6b1c16, { roughness: 0.6, metalness: 0.1 });
  const darkWood = mat(0x2a1c12, { roughness: 0.8 });

  // —— Courtyard ground ——
  const court = M(new THREE.BoxGeometry(48, 0.12, 40), stone, 0, -0.06, -16);
  court.receiveShadow = true;
  group.add(court);

  // —— Hall floor ——
  const hallFloor = M(new THREE.BoxGeometry(31, 0.14, 27), wood, 0, -0.02, 13);
  hallFloor.receiveShadow = true;
  group.add(hallFloor);

  // steps at entrance z=0
  for (let i = 0; i < 4; i++) {
    const s = M(new THREE.BoxGeometry(9, 0.16, 0.7), mat(0x7a746c), 0, 0.02 + i * 0.12, -0.2 - i * 0.55);
    group.add(s);
  }

  // —— Hall walls (opening at z=0, |x|<4.2) ——
  const wallH = 9.2;
  const wallY = wallH / 2;
  // back wall
  group.add(M(new THREE.BoxGeometry(31.4, wallH, 0.5), plaster, 0, wallY, 26.3));
  // side walls
  group.add(M(new THREE.BoxGeometry(0.5, wallH, 27), plaster, -15.6, wallY, 13));
  group.add(M(new THREE.BoxGeometry(0.5, wallH, 27), plaster, 15.6, wallY, 13));
  // front wall with door opening
  group.add(M(new THREE.BoxGeometry(11.2, wallH, 0.5), plaster, -10.2, wallY, 0));
  group.add(M(new THREE.BoxGeometry(11.2, wallH, 0.5), plaster, 10.2, wallY, 0));
  // lintel
  group.add(M(new THREE.BoxGeometry(9.2, 2.2, 0.55), verm, 0, 8.1, 0));
  group.add(M(new THREE.BoxGeometry(9.2, 0.22, 0.7), goldM, 0, 9.15, 0));
  // door frame pillars
  group.add(M(new THREE.CylinderGeometry(0.32, 0.32, wallH, 12), verm, -4.3, wallY, 0.15));
  group.add(M(new THREE.CylinderGeometry(0.32, 0.32, wallH, 12), verm, 4.3, wallY, 0.15));
  obstacles.push({ x: -4.3, z: 0.15, r: 0.5 }, { x: 4.3, z: 0.15, r: 0.5 });

  // plaque 大雄宝殿
  const hallPlaque = plaqueTex("大雄宝殿", "如来佛祖");
  const hp = M(new THREE.PlaneGeometry(3.4, 1.5), mat(0xffffff, { map: hallPlaque, roughness: 0.6 }), 0, 7.4, 0.32);
  group.add(hp);

  // —— Interior pillars ——
  const pillarPos = [
    [-10, 5], [-10, 10], [-10, 15], [-10, 20],
    [10, 5], [10, 10], [10, 15], [10, 20],
  ];
  for (const [x, z] of pillarPos) {
    const p = M(new THREE.CylinderGeometry(0.42, 0.48, 8.4, 16), verm, x, 4.2, z);
    const cap = M(new THREE.CylinderGeometry(0.58, 0.48, 0.28, 12), goldM, x, 8.45, z);
    const base = M(new THREE.CylinderGeometry(0.55, 0.6, 0.3, 12), goldM, x, 0.15, z);
    group.add(p, cap, base);
    obstacles.push({ x, z, r: 0.72 });
  }

  // —— Ceiling beams + 藻井 ——
  for (let i = 0; i < 7; i++) {
    const z = 3 + i * 3.5;
    group.add(M(new THREE.BoxGeometry(30, 0.28, 0.4), darkWood, 0, 8.7, z));
  }
  for (let i = 0; i < 6; i++) {
    const x = -12.5 + i * 5;
    group.add(M(new THREE.BoxGeometry(0.35, 0.22, 26), darkWood, x, 8.55, 13));
  }
  // caisson above Buddha
  const caissonColors = [0x6b1c16, 0xc9a84c, 0x1e4a3a, 0xc9a84c];
  for (let i = 0; i < 4; i++) {
    const s = 8 - i * 1.6;
    const plank = M(new THREE.BoxGeometry(s, 0.08, s), mat(caissonColors[i], { metalness: 0.2, roughness: 0.5 }), 0, 8.95 + i * 0.12, 21.5);
    plank.castShadow = false;
    group.add(plank);
  }
  const lotusC = M(new THREE.CircleGeometry(0.7, 16), goldM, 0, 9.35, 21.5);
  lotusC.rotation.x = -Math.PI / 2;
  group.add(lotusC);

  // hip-roof suggestion (exterior, visible from courtyard)
  const roofMain = M(new THREE.BoxGeometry(34, 0.35, 30), roof, 0, 9.6, 13.2);
  group.add(roofMain);
  // slightly upturned eaves at front
  const eave = M(new THREE.BoxGeometry(35, 0.2, 2.2), roof, 0, 9.35, -1.0);
  eave.rotation.x = 0.15;
  group.add(eave);
  // ridge
  group.add(M(new THREE.BoxGeometry(2, 0.7, 28), goldM, 0, 10.1, 13));
  // two chiwei (ridge ends), simplified
  group.add(M(new THREE.ConeGeometry(0.55, 1.4, 8), goldM, 0, 10.9, -0.5));
  group.add(M(new THREE.ConeGeometry(0.55, 1.4, 8), goldM, 0, 10.9, 26.5));

  // windows on side walls (from inside: emissive dusk)
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xecd9a0,
    emissive: 0xc47a3a,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  for (const x of [-15.3, 15.3]) {
    for (const z of [6, 12, 18]) {
      const w = M(new THREE.BoxGeometry(0.12, 2.2, 1.5), winMat, x, 5.2, z);
      group.add(w);
      // lattice
      for (let i = 0; i < 3; i++) {
        group.add(M(new THREE.BoxGeometry(0.14, 2.2, 0.05), darkWood, x + Math.sign(x) * 0.05, 5.2, z - 0.5 + i * 0.5));
      }
    }
  }

  // hanging lanterns
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xe8a04a,
    emissive: 0xe07020,
    emissiveIntensity: 0.7,
    roughness: 0.4,
  });
  const lanternPos = [
    [-7, 4], [7, 4], [-7, 11], [7, 11], [-7, 17], [7, 17],
    [-5, -8], [5, -8], [-5, -18], [5, -18],
  ];
  for (const [x, z] of lanternPos) {
    const y = z > 0 ? 6.8 : 4.6;
    const body = M(new THREE.CylinderGeometry(0.22, 0.22, 0.45, 10), lanternMat, x, y, z);
    body.castShadow = false;
    const cap = M(new THREE.CylinderGeometry(0.26, 0.18, 0.1, 10), goldM, x, y + 0.28, z);
    const cord = M(new THREE.CylinderGeometry(0.015, 0.015, 1.1, 6), darkWood, x, y + 0.8, z);
    group.add(body, cap, cord);
    const light = new THREE.PointLight(0xffb060, 1.15, 11, 2);
    light.position.set(x, y, z);
    group.add(light);
  }

  // —— Buddha dais ——
  const dais = M(new THREE.BoxGeometry(12.4, 1.05, 7.4), mat(0x6b1c16, { roughness: 0.55 }), 0, 0.5, 21.8);
  group.add(dais);
  group.add(M(new THREE.BoxGeometry(12.8, 0.12, 7.8), goldM, 0, 1.05, 21.8));
  // steps of dais
  group.add(M(new THREE.BoxGeometry(4, 0.35, 1.1), verm, 0, 0.2, 18.0));
  obstacles.push({ x: 0, z: 21.8, r: 4.2 });

  // statues
  const buddha = createBuddha();
  group.add(buddha);
  obstacles.push({ x: 0, z: 21.6, r: 2.6 });

  // When facing the Buddha (looking +Z), Three.js lookAt puts world −X on
  // screen-right. Worshippers facing north have east on their right, so the
  // eastern kings (持国、增长) sit at x = −13 (screen right) and face inward (+X).
  const kingPlaces = [
    { i: 0, x: -13.0, z: 8, rot: -Math.PI / 2 },  // 东方持国天王 · 琵琶
    { i: 1, x: -13.0, z: 16, rot: -Math.PI / 2 }, // 南方增长天王 · 宝剑
    { i: 2, x: 13.0, z: 8, rot: Math.PI / 2 },    // 西方广目天王 · 龙/蛇
    { i: 3, x: 13.0, z: 16, rot: Math.PI / 2 },   // 北方多闻天王 · 宝伞
  ];
  for (const k of kingPlaces) {
    const kg = createHeavenlyKing(k.i);
    kg.position.set(k.x, 0, k.z);
    kg.rotation.y = k.rot;
    group.add(kg);
    obstacles.push({ x: k.x, z: k.z, r: 1.1 });
  }

  const weituo = createWeituo();
  group.add(weituo);
  obstacles.push({ x: -3.6, z: 3.2, r: 1.0 });

  // —— Incense burner ——
  const burner = createBurner();
  burner.position.set(INCENSE_BURNER.x, 0, INCENSE_BURNER.z);
  group.add(burner);
  obstacles.push({ x: INCENSE_BURNER.x, z: INCENSE_BURNER.z, r: 0.95 });

  // wooden fish beside the burner
  const muyu = createMuyu();
  muyu.position.set(3.4, 0, 16.6);
  group.add(muyu);
  obstacles.push({ x: 3.4, z: 16.6, r: 0.55 });

  // —— 50 cushions ——
  const positions = allCushionPositions();
  const cushGeo = new THREE.CylinderGeometry(CUSHION_RADIUS, CUSHION_RADIUS + 0.03, 0.14, 18);
  const cushMat = new THREE.MeshStandardMaterial({ color: 0xa03a3a, roughness: 0.85 });
  const cushions = new THREE.InstancedMesh(cushGeo, cushMat, positions.length);
  cushions.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cushions.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  cushions.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(positions.length * 3), 3);
  positions.forEach((p, i) => {
    dummy.position.set(p.x, 0.08, p.z);
    dummy.updateMatrix();
    cushions.setMatrixAt(i, dummy.matrix);
    color.set(0xa03a3a);
    cushions.setColorAt(i, color);
  });
  group.add(cushions);

  // —— Courtyard enclosure and other halls ——
  // back (south) wall
  group.add(M(new THREE.BoxGeometry(48, 4.2, 0.5), plaster, 0, 2.1, -36.4));
  // side enclosure
  group.add(M(new THREE.BoxGeometry(0.5, 4.2, 40), plaster, -23.8, 2.1, -16.5));
  group.add(M(new THREE.BoxGeometry(0.5, 4.2, 40), plaster, 23.8, 2.1, -16.5));
  // mountain gate (south), opening in the middle
  group.add(M(new THREE.BoxGeometry(18, 5.5, 0.6), verm, -13, 2.75, -36.3));
  group.add(M(new THREE.BoxGeometry(18, 5.5, 0.6), verm, 13, 2.75, -36.3));
  group.add(M(new THREE.BoxGeometry(10, 1.6, 0.65), verm, 0, 5.5, -36.3));
  const gatePlaque = plaqueTex("静心寺", "海外清净地");
  group.add(M(new THREE.PlaneGeometry(3.2, 1.4), mat(0xffffff, { map: gatePlaque }), 0, 5.5, -36.0));

  const doors = OTHER_HALLS.map((h) => ({ name: h.name, x: h.x, z: h.z, rotY: h.rotY }));
  for (const d of doors) {
    group.add(buildFacade(d.name, d.x, d.z, d.rotY, verm, goldM, darkWood, roof, plaster));
    obstacles.push({ x: d.x, z: d.z, r: 2.2 });
  }

  // pines in courtyard corners
  for (const [x, z] of [
    [-17, -6], [17, -6], [-17, -28], [17, -28], [-10, -33], [10, -33],
  ] as const) {
    group.add(createPine(x, z));
    obstacles.push({ x, z, r: 0.8 });
  }

  // stone path
  const path = M(new THREE.BoxGeometry(3.6, 0.04, 28), mat(0x8a847c, { roughness: 0.9 }), 0, 0.02, -16);
  path.receiveShadow = true;
  group.add(path);

  // moon in the dusk sky (visible from courtyard looking south / up)
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff2d0 }),
  );
  moon.position.set(-16, 22, -48);
  group.add(moon);

  scene.add(group);
  scene.background = new THREE.Color(0x1c1520);
  scene.fog = new THREE.Fog(0x1e1614, 40, 90);
  scene.backgroundBlurriness = 0;

  return {
    group,
    obstacles,
    cushions,
    cushionMats: (cushions.instanceColor as THREE.InstancedBufferAttribute).array as Float32Array,
    burner,
    muyu,
    doors,
    floorMeshes: [court, hallFloor, path],
  };
}

function buildFacade(
  name: string,
  x: number,
  z: number,
  rotY: number,
  verm: THREE.Material,
  goldM: THREE.Material,
  darkWood: THREE.Material,
  roof: THREE.Material,
  plaster: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  g.add(M(new THREE.BoxGeometry(5.4, 3.8, 2.2), plaster, 0, 1.9, 0));
  g.add(M(new THREE.BoxGeometry(1.8, 2.6, 0.12), darkWood, 0, 1.3, 1.15));
  // door split
  g.add(M(new THREE.BoxGeometry(0.06, 2.6, 0.14), goldM, 0, 1.3, 1.18));
  g.add(M(new THREE.BoxGeometry(6.2, 0.25, 2.8), roof, 0, 3.95, 0));
  const eave = M(new THREE.BoxGeometry(6.6, 0.12, 1.0), roof, 0, 3.85, 1.3);
  eave.rotation.x = -0.25;
  g.add(eave);
  const tex = plaqueTex(name);
  g.add(M(new THREE.PlaneGeometry(2.2, 1.05), mat(0xffffff, { map: tex, roughness: 0.6 }), 0, 3.15, 1.16));
  g.add(M(new THREE.CylinderGeometry(0.18, 0.18, 3.6, 10), verm, -2.2, 1.8, 1.0));
  g.add(M(new THREE.CylinderGeometry(0.18, 0.18, 3.6, 10), verm, 2.2, 1.8, 1.0));
  return g;
}

function createPine(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const trunk = M(new THREE.CylinderGeometry(0.14, 0.2, 1.6, 8), mat(0x4a3020), 0, 0.8, 0);
  g.add(trunk);
  const green = mat(0x1e3a28, { roughness: 0.85 });
  g.add(M(new THREE.ConeGeometry(1.15, 1.6, 10), green, 0, 2.0, 0));
  g.add(M(new THREE.ConeGeometry(0.9, 1.35, 10), green, 0, 2.8, 0));
  g.add(M(new THREE.ConeGeometry(0.6, 1.1, 10), green, 0, 3.5, 0));
  return g;
}

function createBurner(): THREE.Group {
  const g = new THREE.Group();
  const bronze = mat(0x5a4a32, { metalness: 0.65, roughness: 0.4, emissive: 0x2a1c08, emissiveIntensity: 0.08 });
  const sand = mat(0xc2a878, { roughness: 0.95 });
  g.add(M(new THREE.CylinderGeometry(0.7, 0.62, 0.7, 18), bronze, 0, 0.7, 0));
  g.add(M(new THREE.CylinderGeometry(0.78, 0.7, 0.1, 18), bronze, 0, 1.08, 0));
  const sandTop = M(new THREE.CircleGeometry(0.66, 18), sand, 0, 1.14, 0);
  sandTop.rotation.x = -Math.PI / 2;
  g.add(sandTop);

  // three legs
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const leg = M(new THREE.CylinderGeometry(0.06, 0.09, 0.45, 8), bronze, Math.cos(a) * 0.45, 0.22, Math.sin(a) * 0.45);
    g.add(leg);
  }
  // two handles
  const h1 = M(new THREE.TorusGeometry(0.16, 0.04, 6, 12, Math.PI), bronze, 0.72, 0.95, 0);
  h1.rotation.z = -Math.PI / 2;
  const h2 = M(new THREE.TorusGeometry(0.16, 0.04, 6, 12, Math.PI), bronze, -0.72, 0.95, 0);
  h2.rotation.z = Math.PI / 2;
  g.add(h1, h2);
  // stone base
  g.add(M(new THREE.CylinderGeometry(0.85, 0.9, 0.16, 12), mat(0x5a544c), 0, 0.08, 0));
  return g;
}

function createMuyu(): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(0x8a5a28, { roughness: 0.55 });
  const dark = mat(0x3a2412);
  const body = M(new THREE.SphereGeometry(0.32, 16, 12), wood, 0, 0.48, 0);
  body.scale.set(1.15, 0.9, 1);
  g.add(body);
  // mouth slit
  const slit = M(new THREE.BoxGeometry(0.04, 0.12, 0.28), dark, 0.34, 0.5, 0);
  g.add(slit);
  // stand
  g.add(M(new THREE.CylinderGeometry(0.22, 0.28, 0.16, 10), mat(0x6b1c16), 0, 0.12, 0));
  // mallet
  const mallet = new THREE.Group();
  mallet.add(M(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 6), dark, 0, 0, 0));
  mallet.add(M(new THREE.SphereGeometry(0.06, 8, 8), wood, 0, 0.25, 0));
  mallet.position.set(0.55, 0.35, 0.15);
  mallet.rotation.z = -0.6;
  mallet.name = "mallet";
  g.add(mallet);
  return g;
}

export function setCushionOccupied(mesh: THREE.InstancedMesh, i: number, occupied: boolean) {
  const c = new THREE.Color(occupied ? 0x5a2020 : 0xa03a3a);
  mesh.setColorAt(i, c);
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/** Resolve a desired XZ against circular obstacles and hall walls. */
export function resolveMove(
  x: number,
  z: number,
  nx: number,
  nz: number,
  obstacles: Obstacle[],
  radius: number,
): { x: number; z: number } {
  let px = nx;
  let pz = nz;
  for (const o of obstacles) {
    const dx = px - o.x;
    const dz = pz - o.z;
    const min = o.r + radius;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 1e-8) {
      const d = Math.sqrt(d2);
      px = o.x + (dx / d) * min;
      pz = o.z + (dz / d) * min;
    }
  }
  // front wall of hall at z≈0, opening |x|<4.2
  const OPEN = 4.2;
  if (pz > -0.45 && pz < 0.95 && Math.abs(px) >= OPEN) {
    // crossed the wall: keep previous side
    if (z <= 0) pz = -0.45;
    else pz = 0.95;
    if (Math.abs(px) < OPEN + 0.3 && Math.abs(x) >= OPEN) {
      // sliding toward the door is allowed on z-fixed
    }
  }
  return { x: px, z: pz };
}
