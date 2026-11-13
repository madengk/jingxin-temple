import * as THREE from "three";
import {
  SIDE_HALLS, MAIN_HALL, BURNERS, ALL_HALLS,
  allCushionPositions, PLAYER_RADIUS,
  type HallDef, type HallId, type BurnerDef,
} from "../../../server/src/shared";
import { muralTexture, sideMuralTexture } from "./mural";
import {
  goldMat, lotusThrone, sumeruBase, createDeity, seatedBuddha,
  standingBodhisattva, heavenlyKing, weituoFigure, seatFlush,
} from "./deities";
import { createNamePlaque } from "./statues";
import { replaceWithGilt, giltMode, GILT_FOR } from "./giltModels";
import { paintedWall, makeDaySky } from "./exteriorArt";

export type Obstacle = { x: number; z: number; r: number };

export interface HallObjects {
  group: THREE.Group;
  obstacles: Obstacle[];
  cushions: THREE.InstancedMesh | null;
  cushionMats: Float32Array;
  burners: (BurnerDef & { group: THREE.Group })[];
  doors: { name: string; hallId: HallId; room: string; x: number; z: number; rotY: number }[];
  floorMeshes: THREE.Mesh[];
  hallId: HallId;
  muyu: THREE.Group;
  statuesReady: Promise<void>;
}

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08, ...opts });
}
function M(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

let _darkPlank: THREE.CanvasTexture | null = null;
function darkPlankTex(w = 512, h = 512): THREE.CanvasTexture {
  if (_darkPlank) return _darkPlank;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1a1210";
  g.fillRect(0, 0, w, h);
  // planks run along V so they go toward the altar when repeat is set on Z
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x0 = (i / n) * w;
    const ww = w / n;
    const v = 18 + ((i * 37) % 11);
    g.fillStyle = `rgb(${v + 8},${v},${v - 4})`;
    g.fillRect(x0 + 1, 0, ww - 2, h);
    g.strokeStyle = "rgba(0,0,0,0.55)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x0, 0);
    g.lineTo(x0, h);
    g.stroke();
    // grain
    for (let k = 0; k < 14; k++) {
      g.strokeStyle = `rgba(0,0,0,${0.08 + (k % 3) * 0.04})`;
      g.lineWidth = 1;
      g.beginPath();
      const xx = x0 + 4 + (k / 14) * (ww - 8);
      g.moveTo(xx, 0);
      for (let y = 0; y <= h; y += 16) g.lineTo(xx + Math.sin(y * 0.05 + i + k) * 1.6, y);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 14);
  t.anisotropy = 8;
  t.rotation = 0;
  _darkPlank = t;
  return t;
}

let _stone: THREE.CanvasTexture | null = null;
function stoneTex(): THREE.CanvasTexture {
  if (_stone) return _stone;
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#5a544c";
  g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) {
    for (let x = 0; x < 512; x += 64) {
      const v = 80 + ((x * 13 + y * 7) % 28);
      g.fillStyle = `rgb(${v},${v - 5},${v - 12})`;
      g.fillRect(x + 1, y + 1, 62, 62);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(12, 14);
  _stone = t;
  return t;
}

/** Horizontal gilt 匾额. */

function makeFacadePreview(hallId: HallId): THREE.Group {
  const g = new THREE.Group();
  g.name = `facadePreview_${hallId}`;
  g.userData.facadeHallId = hallId;
  return g;
}

/** Show or hide a courtyard façade's shallow interior (used when the real hall is visible). */
export function setFacadePreviewVisible(root: THREE.Object3D, hallId: HallId, visible: boolean) {
  const name = `facadePreview_${hallId}`;
  root.traverse((o) => {
    if (o.name === name || o.userData?.facadeHallId === hallId && o.name.startsWith("facadePreview_")) {
      o.visible = visible;
    }
  });
}

export function hangingPlaque(title: string, w = 3.6, h = 1.05): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(0x3a100c, { roughness: 0.45, metalness: 0.1 });
  const gold = goldMat(0xe8d5a3);
  g.add(M(new THREE.BoxGeometry(w, h, 0.12), wood, 0, 0, 0));
  g.add(M(new THREE.BoxGeometry(w + 0.14, 0.08, 0.16), gold, 0, h / 2, 0.01));
  g.add(M(new THREE.BoxGeometry(w + 0.14, 0.08, 0.16), gold, 0, -h / 2, 0.01));
  g.add(M(new THREE.BoxGeometry(0.08, h + 0.08, 0.16), gold, -w / 2, 0, 0.01));
  g.add(M(new THREE.BoxGeometry(0.08, h + 0.08, 0.16), gold, w / 2, 0, 0.01));
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 320;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#3a100c";
  ctx.fillRect(0, 0, 1024, 320);
  ctx.strokeStyle = "#e8d5a3";
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, 988, 284);
  ctx.fillStyle = "#f3dd9a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(80,50,0,0.45)";
  ctx.shadowBlur = 10;
  const chars = Array.from(title);
  const fontSize = Math.min(168, 860 / Math.max(chars.length, 1));
  ctx.font = `bold ${fontSize}px "Noto Serif SC","Noto Serif CJK SC","Source Han Serif SC","Songti SC","STSong","SimSun",serif`;
  const span = 820;
  const start = 512 - span / 2;
  chars.forEach((ch, i) => {
    const x = start + (span / chars.length) * (i + 0.5);
    ctx.fillText(ch, x, 168);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = M(new THREE.PlaneGeometry(w - 0.16, h - 0.18), mat(0xffffff, { map: tex, roughness: 0.55 }), 0, 0, 0.07);
  face.castShadow = false;
  g.add(face);
  return g;
}

export function createBurner(): THREE.Group {
  const g = new THREE.Group();
  const bronze = goldMat(0x8a5a28, { metalness: 0.78, roughness: 0.38, color: 0x8a5a28 } as any);
  const bronzeM = new THREE.MeshStandardMaterial({ color: 0x6a4220, metalness: 0.82, roughness: 0.36, envMapIntensity: 1.0 });
  const ash = new THREE.MeshStandardMaterial({ color: 0x3a342e, roughness: 0.95, metalness: 0.02 });
  // ding-style tripod bowl
  g.add(M(new THREE.CylinderGeometry(0.62, 0.48, 0.55, 20), bronzeM, 0, 0.55, 0));
  g.add(M(new THREE.CylinderGeometry(0.68, 0.66, 0.08, 20), bronzeM, 0, 0.86, 0));
  g.add(M(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 16), ash, 0, 0.9, 0));
  // three legs
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    g.add(M(new THREE.CylinderGeometry(0.07, 0.09, 0.38, 8), bronzeM, Math.cos(a) * 0.38, 0.18, Math.sin(a) * 0.38));
  }
  // two handles
  for (const s of [-1, 1]) {
    const hdl = M(new THREE.TorusGeometry(0.16, 0.035, 8, 14, Math.PI), bronzeM, s * 0.62, 0.85, 0);
    hdl.rotation.z = s * Math.PI / 2;
    hdl.rotation.y = Math.PI / 2;
    g.add(hdl);
  }
  return g;
}

function dummyMuyu(): THREE.Group {
  // World-space fish is optional; the UI panel is the actual tool. Keep a quiet one near halls.
  return new THREE.Group();
}

function placeCushions(hallId: HallId): { mesh: THREE.InstancedMesh; mats: Float32Array } {
  const positions = allCushionPositions(hallId);
  const geo = new THREE.BoxGeometry(0.95, 0.07, 0.95);
  const matC = new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.88, metalness: 0.04 });
  const mesh = new THREE.InstancedMesh(geo, matC, positions.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color(0x3a3a3c);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(positions.length * 3), 3);
  positions.forEach((p, i) => {
    dummy.position.set(p.x, 0.045, p.z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, color);
  });
  return { mesh, mats: (mesh.instanceColor as THREE.InstancedBufferAttribute).array as Float32Array };
}

export function setCushionOccupied(cushions: THREE.InstancedMesh | null, i: number, occupied: boolean) {
  if (!cushions || !cushions.instanceColor) return;
  const c = new THREE.Color(occupied ? 0x4a4a4e : 0x3a3a3c);
  cushions.setColorAt(i, c);
  (cushions.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
}


function latticeTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#4a1610";
  g.fillRect(0, 0, 256, 512);
  const cols = 4, rows = 8;
  const padX = 18, padY = 18;
  const iw = (256 - padX * 2) / cols;
  const ih = (512 - padY * 2) / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = padX + col * iw;
      const y = padY + r * ih;
      g.fillStyle = "#e6d3a8";
      g.fillRect(x + 4, y + 4, iw - 8, ih - 8);
      g.strokeStyle = "#6b2418";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x + 4, y + 4);
      g.lineTo(x + iw - 4, y + ih - 4);
      g.moveTo(x + iw - 4, y + 4);
      g.lineTo(x + 4, y + ih - 4);
      g.stroke();
      g.strokeStyle = "#c9a84c";
      g.lineWidth = 2.2;
      g.strokeRect(x + 3, y + 3, iw - 6, ih - 6);
    }
  }
  g.strokeStyle = "#e8d5a3";
  g.lineWidth = 12;
  g.strokeRect(6, 6, 244, 500);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

let _latticeTex: THREE.CanvasTexture | null = null;
function latticeMat() {
  if (!_latticeTex) _latticeTex = latticeTexture();
  return new THREE.MeshStandardMaterial({ map: _latticeTex, roughness: 0.55, metalness: 0.08 });
}

function makeLatticeLeaf(w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(0x6b1c16, { roughness: 0.55, metalness: 0.1 });
  const gold = goldMat(0xc9a84c);
  g.add(M(new THREE.BoxGeometry(w, h, 0.07), latticeMat(), 0, 0, 0));
  g.add(M(new THREE.BoxGeometry(0.08, h, 0.1), wood, -w / 2 + 0.04, 0, 0.01));
  g.add(M(new THREE.BoxGeometry(0.08, h, 0.1), wood, w / 2 - 0.04, 0, 0.01));
  g.add(M(new THREE.BoxGeometry(w, 0.08, 0.1), wood, 0, h / 2 - 0.04, 0.01));
  g.add(M(new THREE.BoxGeometry(w, 0.08, 0.1), wood, 0, -h / 2 + 0.04, 0.01));
  g.add(M(new THREE.BoxGeometry(w, 0.05, 0.1), wood, 0, 0, 0.01));
  g.add(M(new THREE.SphereGeometry(0.045, 10, 8), gold, w * 0.28, 0, 0.08));
  return g;
}

/** Fold 格扇门 open. openToNegZ=true swings the leaves into −Z (typical side-hall interior). */
function addOpenLatticeDoors(
  parent: THREE.Group, doorW: number, doorH: number, zFront: number, openToNegZ: boolean,
) {
  const leafW = doorW * 0.46;
  const ang = (openToNegZ ? -1 : 1) * 1.32;
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(side * (doorW / 2), 0, zFront);
    hinge.rotation.y = side * ang;
    const leaf = makeLatticeLeaf(leafW, doorH);
    leaf.position.set(-side * (leafW / 2), doorH / 2, 0);
    hinge.add(leaf);
    parent.add(hinge);
  }
}

function addFacadeShrine(
  parent: THREE.Group,
  def: HallDef,
  opts: {
    z: number;
    faceYaw: number;
    deityH: number;
    daisW: number;
    daisD: number;
    daisH: number;
    jobs: Promise<unknown>[];
  },
) {
  const { z, faceYaw, deityH, daisW, daisD, daisH, jobs } = opts;
  const dais = sumeruBase(daisW, daisD, daisH);
  dais.position.set(0, 0, z);
  parent.add(dais);
  const lotusR = Math.min(daisW, daisD) * 0.28;
  const lotus = lotusThrone(lotusR, 3);
  lotus.position.set(0, daisH, z);
  parent.add(lotus);
  const lotusTop = daisH + (lotus.userData.topY as number);
  const deity = createDeity(def.kind, deityH);
  deity.rotation.y = faceYaw;
  deity.position.set(0, lotusTop, z);
  parent.add(deity);
  seatFlush(deity, lotusTop);
  if (giltMode() !== "off") {
    const gid = GILT_FOR[def.kind];
    if (gid) jobs.push(replaceWithGilt(parent, deity, gid, deityH, lotusTop, faceYaw));
  }
  const plaque = createNamePlaque(def.deity, def.deityTitle, { height: 1.2, width: 0.48 });
  plaque.scale.setScalar(def.id === "main" ? 0.72 : 0.5);
  const facingNegZ = Math.abs(faceYaw) > 1;
  plaque.position.set(0, Math.max(0.55, daisH * 0.35), z + (facingNegZ ? -(daisD / 2 + 0.08) : daisD / 2 + 0.08));
  plaque.rotation.y = faceYaw;
  parent.add(plaque);
}

function candlesAndVases(parent: THREE.Group, y: number, z: number, spread: number) {
  const wax = mat(0xf0ead8, { roughness: 0.6 });
  const flameM = new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffa028, emissiveIntensity: 1.2 });
  const porc = mat(0xcfd8d0, { roughness: 0.4, metalness: 0.1 });
  for (const s of [-1, 1]) {
    for (const k of [0.7, 1.35]) {
      const x = s * spread * k;
      const c = M(new THREE.CylinderGeometry(0.04, 0.045, 0.45, 8), wax, x, y + 0.28, z);
      parent.add(c);
      const fl = M(new THREE.ConeGeometry(0.03, 0.1, 6), flameM, x, y + 0.56, z);
      parent.add(fl);
      const light = new THREE.PointLight(0xffb060, 0.45, 5, 2);
      light.position.set(x, y + 0.55, z);
      parent.add(light);
    }
    const vase = M(new THREE.SphereGeometry(0.12, 12, 10), porc, s * spread * 1.7, y + 0.16, z + 0.15);
    vase.scale.set(1, 1.3, 1);
    parent.add(vase);
    parent.add(M(new THREE.CylinderGeometry(0.05, 0.07, 0.1, 8), porc, s * spread * 1.7, y + 0.34, z + 0.15));
  }
}

/** Courtyard: all façades with gilt 匾额, bronze burners at every entrance, door portals. */
export function buildCourtyard(_scene: THREE.Scene): HallObjects {
  const group = new THREE.Group();
  const obstacles: Obstacle[] = [];
  const verm = mat(0x8b1e1e, { roughness: 0.5, metalness: 0.08 });
  const goldM = goldMat(0xc9a84c);
  const plaster = mat(0xe8dcc8, { roughness: 0.85 });
  const roof = mat(0x6b1c16, { roughness: 0.6, metalness: 0.1 });
  const darkWood = mat(0x2a1c12, { roughness: 0.8 });
  const stone = mat(0xc9c0b2, { map: stoneTex(), roughness: 0.88 });

  const court = M(new THREE.BoxGeometry(48, 0.12, 36), stone, 0, -0.06, -18);
  court.receiveShadow = true;
  group.add(court);
  const path = M(new THREE.BoxGeometry(4.0, 0.04, 28), mat(0x8a8074, { roughness: 0.9 }), 0, 0.02, -16);
  path.receiveShadow = true;
  group.add(path);

  // Enclosure
  group.add(M(new THREE.BoxGeometry(48, 4.2, 0.5), plaster, 0, 2.1, -36.4));
  group.add(M(new THREE.BoxGeometry(0.5, 4.2, 40), plaster, -23.8, 2.1, -16.5));
  group.add(M(new THREE.BoxGeometry(0.5, 4.2, 40), plaster, 23.8, 2.1, -16.5));
  group.add(paintedWall(18, 5.5, 0.6, -13, 2.75, -36.3));
  group.add(paintedWall(18, 5.5, 0.6, 13, 2.75, -36.3));
  group.add(paintedWall(10, 1.6, 0.65, 0, 5.5, -36.3));
  const gatePlaque = hangingPlaque("静心寺", 3.4, 1.15);
  gatePlaque.position.set(0, 5.5, -36.0);
  group.add(gatePlaque);

  // 大雄宝殿: open portico so the gilt Buddha is visible from the courtyard.
  // No solid wall across the doorway. Interior preview occupies +Z (beyond the threshold).
  const giltJobs: Promise<unknown>[] = [];
  const wallH = 11.5;
  const hallW = 32;
  const depth = 9.0;
  const doorW = 8.2;
  const doorH = 8.0;
  const midZ = depth / 2;
  const backZ = depth;
  const frontZ = 0.12;
  const preview = makeFacadePreview("main");
  const floor = M(new THREE.BoxGeometry(hallW - 0.4, 0.1, depth + 0.2), mat(0x2a1c16, { map: darkPlankTex(), roughness: 0.72 }), 0, 0.02, midZ);
  floor.receiveShadow = true;
  preview.add(floor);
  preview.add(M(new THREE.BoxGeometry(hallW + 0.3, wallH, 0.4), plaster, 0, wallH / 2, backZ));
  preview.add(M(new THREE.BoxGeometry(0.4, wallH, depth), plaster, -hallW / 2, wallH / 2, midZ));
  preview.add(M(new THREE.BoxGeometry(0.4, wallH, depth), plaster, hallW / 2, wallH / 2, midZ));
  const leafW = (hallW - doorW) / 2;
  group.add(paintedWall(leafW, wallH, 0.4, -(hallW / 2 - leafW / 2), wallH / 2, frontZ));
  group.add(paintedWall(leafW, wallH, 0.4, (hallW / 2 - leafW / 2), wallH / 2, frontZ));
  group.add(paintedWall(doorW + 0.8, wallH - doorH, 0.45, 0, doorH + (wallH - doorH) / 2, frontZ));
  for (const x of [-doorW / 2, doorW / 2, -10.6, 10.6, -15.4, 15.4]) {
    group.add(M(new THREE.CylinderGeometry(0.36, 0.4, wallH, 14), verm, x, wallH / 2, frontZ + 0.12));
    group.add(M(new THREE.CylinderGeometry(0.48, 0.4, 0.22, 12), goldM, x, wallH + 0.02, frontZ + 0.12));
    if (Math.abs(x) > doorW / 2 + 0.2) obstacles.push({ x, z: frontZ + 0.12, r: 0.5 });
  }
  obstacles.push({ x: -doorW / 2, z: frontZ + 0.12, r: 0.42 }, { x: doorW / 2, z: frontZ + 0.12, r: 0.42 });
  addOpenLatticeDoors(group, doorW, doorH, frontZ + 0.06, false);
  const backMural = muralTexture(hash("main-facade"), 1024, 768);
  const mural = M(
    new THREE.PlaneGeometry(hallW * 0.9, wallH * 0.86),
    new THREE.MeshStandardMaterial({ map: backMural, roughness: 0.78, metalness: 0.04 }),
    0, wallH * 0.5, backZ - 0.22,
  );
  mural.rotation.y = Math.PI;
  mural.castShadow = false;
  preview.add(mural);
  addFacadeShrine(preview, MAIN_HALL, {
    z: depth - 2.2, faceYaw: Math.PI, deityH: 4.4, daisW: 8.4, daisD: 3.6, daisH: 1.7, jobs: giltJobs,
  });
  const lan = new THREE.MeshStandardMaterial({ color: 0xe8a04a, emissive: 0xe07020, emissiveIntensity: 0.85, roughness: 0.4 });
  for (const x of [-3.2, 3.2]) {
    preview.add(M(new THREE.CylinderGeometry(0.18, 0.18, 0.36, 10), lan, x, 7.2, 3.2));
    const L = new THREE.PointLight(0xffc070, 2.4, 16, 1.5);
    L.position.set(x, 7.2, 3.2);
    preview.add(L);
  }
  const deityLight = new THREE.PointLight(0xffe0a0, 3.2, 14, 1.4);
  deityLight.position.set(0, 7.4, depth - 2.4);
  preview.add(deityLight);
  preview.add(M(new THREE.BoxGeometry(34, 0.45, depth + 2.2), roof, 0, wallH + 0.5, midZ + 0.2));
  preview.add(M(new THREE.BoxGeometry(2, 0.7, depth + 1.2), goldM, 0, wallH + 1.15, midZ + 0.2));
  group.add(preview);
  const mainPl = hangingPlaque("大雄宝殿", 5.0, 1.45);
  mainPl.position.set(0, 9.55, frontZ - 0.32);
  mainPl.rotation.y = Math.PI; // face the courtyard (−Z)
  group.add(mainPl);
  // A short eave over the façade stays when the shallow preview is hidden
  // (the real interior then supplies the hall's own roof).
  group.add(M(new THREE.BoxGeometry(34, 0.45, 3.2), roof, 0, wallH + 0.5, frontZ + 0.6));
  group.add(M(new THREE.BoxGeometry(2, 0.7, 2.2), goldM, 0, wallH + 1.15, frontZ + 0.4));
  group.add(M(new THREE.BoxGeometry(doorW + 0.4, 0.14, 0.7), darkWood, 0, 0.06, frontZ - 0.2));
  for (let i = 0; i < 4; i++) {
    group.add(M(new THREE.BoxGeometry(9, 0.16, 0.7), mat(0x7a746c), 0, 0.02 + i * 0.12, -0.3 - i * 0.5));
  }

  const doors: HallObjects["doors"] = [
    { name: MAIN_HALL.name, hallId: "main", room: MAIN_HALL.room, x: 0, z: 0, rotY: Math.PI },
  ];

  // Side-hall buildings
  for (const h of SIDE_HALLS) {
    group.add(buildFacade(h, verm, goldM, darkWood, roof, plaster, obstacles, giltJobs));
    doors.push({ name: h.name, hallId: h.id, room: h.room, x: h.x, z: h.z, rotY: h.rotY });
  }

  // Bronze burners at every entrance
  const burners: HallObjects["burners"] = [];
  for (const b of BURNERS) {
    const gB = createBurner();
    gB.position.set(b.x, 0, b.z);
    group.add(gB);
    burners.push({ ...b, group: gB });
    obstacles.push({ x: b.x, z: b.z, r: 0.85 });
  }

  // pines
  for (const [x, z] of [[-17, -6], [17, -6], [-17, -28], [17, -28], [-10, -33], [10, -33]] as const) {
    group.add(createPine(x, z));
    obstacles.push({ x, z, r: 0.8 });
  }
  group.add(makeDaySky());

  // Caller attaches the group (allows off-screen warmup).
  // Sky color, fog, and exposure live in Game.tuneLights so a warm
  // interior cannot clobber the visible courtyard, and vice versa.

  return {
    group, obstacles, cushions: null, cushionMats: new Float32Array(0),
    burners, doors, floorMeshes: [court, path], hallId: "courtyard", muyu: dummyMuyu(),
    statuesReady: Promise.all(giltJobs).then(() => undefined),
  };
}

function buildFacade(
  h: HallDef,
  verm: THREE.Material, goldM: THREE.Material, darkWood: THREE.Material,
  roof: THREE.Material, plaster: THREE.Material, obstacles: Obstacle[],
  jobs: Promise<unknown>[],
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(h.x, 0, h.z);
  g.rotation.y = h.rotY;
  // Local: +Z faces the courtyard. Building extends −Z (back).
  // East/west halls can be deeper; south pair sits against the mountain gate.
  const W = 6.0, H = 5.15;
  const D = Math.abs(h.x) > 15 ? 5.4 : 4.2;
  const doorW = 2.7;
  const doorH = 3.55;
  const frontZ = D / 2;
  const backZ = -D / 2;
  const preview = makeFacadePreview(h.id);
  preview.add(M(new THREE.BoxGeometry(W - 0.2, 0.08, D), mat(0x2a1c16, { roughness: 0.75 }), 0, 0.04, 0));
  preview.add(M(new THREE.BoxGeometry(W, H, 0.32), plaster, 0, H / 2, backZ));
  preview.add(M(new THREE.BoxGeometry(0.32, H, D), plaster, -W / 2, H / 2, 0));
  preview.add(M(new THREE.BoxGeometry(0.32, H, D), plaster, W / 2, H / 2, 0));
  const leaf = (W - doorW) / 2;
  g.add(paintedWall(leaf, H, 0.32, -(W / 2 - leaf / 2), H / 2, frontZ));
  g.add(paintedWall(leaf, H, 0.32, (W / 2 - leaf / 2), H / 2, frontZ));
  g.add(paintedWall(doorW + 0.2, H - doorH, 0.36, 0, doorH + (H - doorH) / 2, frontZ));
  g.add(M(new THREE.CylinderGeometry(0.16, 0.16, H, 10), verm, -doorW / 2, H / 2, frontZ + 0.1));
  g.add(M(new THREE.CylinderGeometry(0.16, 0.16, H, 10), verm, doorW / 2, H / 2, frontZ + 0.1));
  addOpenLatticeDoors(g, doorW, doorH, frontZ + 0.02, true);
  const mural = M(
    new THREE.PlaneGeometry(W * 0.88, H * 0.82),
    new THREE.MeshStandardMaterial({ map: muralTexture(hash(h.id + "-facade"), 768, 576), roughness: 0.8, metalness: 0.04 }),
    0, H * 0.5, backZ + 0.18,
  );
  mural.castShadow = false;
  preview.add(mural);
  addFacadeShrine(preview, h, {
    z: backZ + 1.35, faceYaw: 0, deityH: 2.35, daisW: 3.1, daisD: 1.55, daisH: 0.85, jobs,
  });
  const L = new THREE.PointLight(0xffc070, 1.8, 8, 1.6);
  L.position.set(0, 3.4, 0.2);
  preview.add(L);
  preview.add(M(new THREE.BoxGeometry(W + 0.8, 0.28, D + 1.1), roof, 0, H + 0.25, 0));
  preview.add(M(new THREE.BoxGeometry(0.5, 0.4, D + 0.6), goldM, 0, H + 0.6, 0));
  g.add(preview);
  const pl = hangingPlaque(h.name, 3.15, 0.95);
  pl.position.set(0, H - 0.5, frontZ + 0.3);
  g.add(pl);
  // Front eave remains when the preview is hidden (player is inside this hall).
  g.add(M(new THREE.BoxGeometry(W + 0.8, 0.28, 1.6), roof, 0, H + 0.25, frontZ - 0.2));
  g.add(M(new THREE.BoxGeometry(0.5, 0.4, 1.0), goldM, 0, H + 0.6, frontZ - 0.15));
  g.add(M(new THREE.BoxGeometry(doorW, 0.12, 0.6), darkWood, 0, 0.06, frontZ + 0.2));
  // Columns at the door posts only, plus side/back walls. The opening itself is clear
  // so the approach trigger in front of the façade is never blocked.
  const fx = Math.sin(h.rotY), fz = Math.cos(h.rotY);
  const doorHalf = doorW / 2;
  const posts: [number, number, number][] = [
    [-doorHalf, frontZ, 0.28],
    [doorHalf, frontZ, 0.28],
    [-(doorHalf + 1.05), frontZ, 0.5],
    [doorHalf + 1.05, frontZ, 0.5],
    [-W / 2, 0, 0.7],
    [W / 2, 0, 0.7],
    [0, -D / 2, 0.7],
  ];
  for (const [lx, lz, r] of posts) {
    const wx = h.x + lx * (-fz) + lz * fx;
    const wz = h.z + lx * fx + lz * fz;
    obstacles.push({ x: wx, z: wz, r });
  }
  return g;
}

function createPine(x: number, z: number) {
  const g = new THREE.Group();
  const trunk = M(new THREE.CylinderGeometry(0.16, 0.22, 2.2, 8), mat(0x4a3020), 0, 1.1, 0);
  g.add(trunk);
  const leaf = mat(0x1e3a28, { roughness: 0.85 });
  for (let i = 0; i < 4; i++) {
    g.add(M(new THREE.ConeGeometry(1.15 - i * 0.18, 1.3, 8), leaf, 0, 2.0 + i * 0.7, 0));
  }
  g.position.set(x, 0, z);
  return g;
}

/** Hall interior: mural walls, dark wood floor, tall gilt deity, 50 square cushions. */
export function buildInterior(_scene: THREE.Scene, def: HallDef): HallObjects {
  const main = def.id === "main";
  const group = new THREE.Group();
  const obstacles: Obstacle[] = [];
  const verm = mat(0x8b1e1e, { roughness: 0.5, metalness: 0.08 });
  const goldM = goldMat(0xc9a84c);
  const plaster = mat(0xe8dcc8, { roughness: 0.85 });
  const darkWood = mat(0x2a1c12, { roughness: 0.8 });
  const roof = mat(0x6b1c16, { roughness: 0.6 });
  const woodFloor = mat(0x2a1c16, { map: darkPlankTex(), roughness: 0.72, metalness: 0.04 });

  const hallW = main ? 31 : 18;
  const hallD = main ? 26 : 20;
  const wallH = main ? 15.5 : 11.5;
  const midZ = hallD / 2;
  const backZ = hallD - 0.3;

  const floor = M(new THREE.BoxGeometry(hallW, 0.14, hallD), woodFloor, 0, -0.02, midZ);
  floor.receiveShadow = true;
  group.add(floor);

  // Walls
  group.add(M(new THREE.BoxGeometry(hallW + 0.4, wallH, 0.45), plaster, 0, wallH / 2, backZ));
  group.add(M(new THREE.BoxGeometry(0.45, wallH, hallD), plaster, -hallW / 2, wallH / 2, midZ));
  group.add(M(new THREE.BoxGeometry(0.45, wallH, hallD), plaster, hallW / 2, wallH / 2, midZ));
  const doorW = main ? 8.4 : 4.4;
  const leafW = (hallW - doorW) / 2;
  group.add(M(new THREE.BoxGeometry(leafW, wallH, 0.45), plaster, -(hallW / 2 - leafW / 2), wallH / 2, 0));
  group.add(M(new THREE.BoxGeometry(leafW, wallH, 0.45), plaster, (hallW / 2 - leafW / 2), wallH / 2, 0));
  group.add(M(new THREE.BoxGeometry(doorW, 2.0, 0.5), verm, 0, wallH - 1.0, 0));
  const inPlaque = hangingPlaque(def.name, main ? 4.2 : 3.2, main ? 1.25 : 1.0);
  inPlaque.position.set(0, wallH - 1.15, 0.32);
  inPlaque.rotation.y = Math.PI;
  group.add(inPlaque);

  // Murals — back wall fully covered, sides similarly patterned
  const backMural = muralTexture(hash(def.id), 1024, 768);
  const backH = wallH * 0.88;
  const backPlane = M(
    new THREE.PlaneGeometry(hallW * 0.92, backH),
    new THREE.MeshStandardMaterial({ map: backMural, roughness: 0.78, metalness: 0.04, envMapIntensity: 0.25 }),
    0, backH * 0.52, backZ - 0.26,
  );
  backPlane.rotation.y = Math.PI;
  backPlane.castShadow = false;
  group.add(backPlane);
  const sideM = sideMuralTexture(hash(def.id) + 9, 512, 512);
  sideM.repeat.set(1, 1);
  for (const sx of [-1, 1]) {
    const p = M(
      new THREE.PlaneGeometry(hallD * 0.85, wallH * 0.8),
      new THREE.MeshStandardMaterial({ map: sideM, roughness: 0.8, metalness: 0.04 }),
      sx * (hallW / 2 - 0.28), wallH * 0.48, midZ,
    );
    p.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    p.castShadow = false;
    group.add(p);
  }

  // Pillars + beams
  const px = main ? 10 : 6.4;
  const pzs = main ? [5, 10, 15, 20] : [4, 8, 12, 16];
  const pH = wallH - 1.4;
  for (const z of pzs) {
    for (const x of [-px, px]) {
      group.add(M(new THREE.CylinderGeometry(0.38, 0.44, pH, 14), verm, x, pH / 2, z));
      group.add(M(new THREE.CylinderGeometry(0.5, 0.42, 0.24, 12), goldM, x, pH + 0.05, z));
      obstacles.push({ x, z, r: 0.68 });
    }
    group.add(M(new THREE.BoxGeometry(hallW - 0.5, 0.28, 0.36), darkWood, 0, pH + 0.15, z));
  }
  // ceiling / roof suggestion
  group.add(M(new THREE.BoxGeometry(hallW + 2, 0.3, hallD + 2), roof, 0, wallH + 0.4, midZ));

  // 须弥座 + lotus + deity
  const daisW = main ? 14.5 : 9.5;
  const daisD = main ? 7.6 : 5.6;
  const daisH = main ? 3.15 : 2.25;
  const daisZ = main ? 21.4 : 16.4;
  const dais = sumeruBase(daisW, daisD, daisH);
  dais.position.set(0, 0, daisZ);
  group.add(dais);
  const sitY = daisH;
  const lotusR = main ? 2.45 : 1.65;
  const lotus = lotusThrone(lotusR, main ? 4 : 3);
  lotus.position.set(0, sitY, daisZ);
  group.add(lotus);
  const lotusTop = sitY + (lotus.userData.topY as number);

  const deityH = main ? 6.6 : 5.4;
  const deity = createDeity(def.kind, deityH);
  deity.rotation.y = Math.PI; // face the entrance (−Z)
  deity.position.set(0, lotusTop, daisZ);
  group.add(deity);
  seatFlush(deity, lotusTop);
  const giltJobs: Promise<unknown>[] = [];
  const mode = giltMode();
  if (mode !== "off") {
    const gid = GILT_FOR[def.kind];
    if (gid) giltJobs.push(replaceWithGilt(group, deity, gid, deityH, lotusTop));
  }
  // name plaque on the 须弥座 front, below the figure — visible
  const plaque = createNamePlaque(def.deity, def.deityTitle, { height: main ? 1.75 : 1.5, width: main ? 0.7 : 0.6 });
  plaque.scale.setScalar(main ? 1.05 : 0.9);
  plaque.position.set(0, 1.15, daisZ - daisD / 2 - 0.12);
  plaque.rotation.y = Math.PI;
  group.add(plaque);
  obstacles.push({ x: 0, z: daisZ, r: main ? 5.0 : 3.6 });

  candlesAndVases(group, lotusTop - 0.15, daisZ - lotusR * 0.15, main ? 3.4 : 2.2);
  // offering box
  group.add(M(new THREE.BoxGeometry(1.1, 0.45, 0.7), darkWood, 0, 0.22, daisZ - daisD / 2 - 1.15));

  if (main) {
    // Flanking gilt bodhisattvas — smaller than the main Buddha
    for (const [x, kind] of [[-4.6, "ananda"], [4.6, "kasyapa"]] as const) {
      const lot = lotusThrone(0.95, 3);
      lot.position.set(x, sitY * 0.55, daisZ - 0.4);
      group.add(lot);
      const fig = standingBodhisattva(kind, 4.35);
      fig.rotation.y = Math.PI;
      const attY = sitY * 0.55 + (lot.userData.topY as number);
      fig.position.set(x, attY, daisZ - 0.4);
      group.add(fig);
      seatFlush(fig, attY);
      if (mode !== "off") {
        const gid = GILT_FOR[kind];
        if (gid) giltJobs.push(replaceWithGilt(group, fig, gid, 4.35, attY));
      }
      obstacles.push({ x, z: daisZ - 0.4, r: 1.3 });
    }
    // Four heavenly kings, smaller, flanking the nave
    const kingPlaces = [
      { i: 0, x: -13.0, z: 8, rot: -Math.PI / 2 },
      { i: 1, x: -13.0, z: 16, rot: -Math.PI / 2 },
      { i: 2, x: 13.0, z: 8, rot: Math.PI / 2 },
      { i: 3, x: 13.0, z: 16, rot: Math.PI / 2 },
    ];
    const kingNames = ["东方持国天王", "南方增长天王", "西方广目天王", "北方多闻天王"];
    for (const k of kingPlaces) {
      const kg = new THREE.Group();
      const lot = lotusThrone(0.85, 2);
      kg.add(lot);
      const fig = heavenlyKing(k.i, 3.35);
      fig.rotation.y = Math.PI;
      fig.position.y = lot.userData.topY;
      kg.add(fig);
      seatFlush(fig, lot.userData.topY);
      const kp = createNamePlaque(kingNames[k.i], undefined, { height: 1.35, width: 0.5 });
      kp.scale.setScalar(0.55);
      kp.position.set(0, 0.04, -0.95);
      kp.rotation.y = Math.PI;
      kg.add(kp);
      kg.position.set(k.x, 0, k.z);
      kg.rotation.y = k.rot;
      group.add(kg);
      obstacles.push({ x: k.x, z: k.z, r: 1.2 });
    }
    // 韦陀 facing the entrance (−Z already)
    const wg = new THREE.Group();
    const wlot = lotusThrone(0.7, 2);
    wg.add(wlot);
    const wf = weituoFigure(2.95);
    wf.rotation.y = Math.PI;
    wf.position.y = wlot.userData.topY;
    wg.add(wf);
    seatFlush(wf, wlot.userData.topY);
    const wp = createNamePlaque("韦陀菩萨", undefined, { height: 1.3, width: 0.5 });
    wp.scale.setScalar(0.55);
    wp.position.set(0, 0.04, -0.8);
    wp.rotation.y = Math.PI;
    wg.add(wp);
    wg.position.set(-3.6, 0, 3.2);
    group.add(wg);
    obstacles.push({ x: -3.6, z: 3.2, r: 1.05 });
  }

  const { mesh: cushions, mats } = placeCushions(def.id);
  group.add(cushions);
  // Only real connected players may sit — never spawn decorative monks.

  // lanterns
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0xe8a04a, emissive: 0xe07020, emissiveIntensity: 0.7, roughness: 0.4 });
  const lanY = wallH * 0.62;
  for (const [x, z] of [[-5, 6], [5, 6], [-5, 12], [5, 12]]) {
    if (!main && z > 14) continue;
    group.add(M(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 10), lanternMat, x, lanY, z));
    const L = new THREE.PointLight(0xffb060, 0.85, 10, 2);
    L.position.set(x, lanY, z);
    group.add(L);
  }

  // Deity key light lives on the interior group so it follows any frame change.
  const deitySpot = new THREE.SpotLight(0xffe8b0, 4.4, 40, 0.7, 0.45, 1.0);
  deitySpot.position.set(0, main ? 18 : 13, daisZ - 7);
  deitySpot.target.position.set(0, 6, daisZ);
  group.add(deitySpot, deitySpot.target);

  // Warm daylight spilling in through the open door onto the nave floor.
  const spill = new THREE.SpotLight(0xffe6b8, 3.6, 22, 0.95, 0.55, 1.0);
  spill.name = "doorSpill";
  spill.position.set(0, main ? 7.2 : 4.6, -1.2);
  spill.target.position.set(0, 0.05, 5.5);
  group.add(spill, spill.target);

  // Caller attaches the group (allows off-screen warmup).
  // Background and fog are applied in Game.tuneLights.

  return {
    group, obstacles, cushions, cushionMats: mats,
    burners: [],
    doors: [{ name: "山门庭院", hallId: "courtyard", room: "courtyard", x: 0, z: 0, rotY: Math.PI }],
    floorMeshes: [floor],
    hallId: def.id,
    muyu: dummyMuyu(),
    statuesReady: Promise.all(giltJobs).then(() => undefined),
  };
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) + 1;
}

export function resolveMove(
  x0: number, z0: number, x1: number, z1: number,
  obstacles: Obstacle[], radius: number = PLAYER_RADIUS,
): { x: number; z: number } {
  let x = x1, z = z1;
  const vx = x1 - x0, vz = z1 - z0;
  const vlen = Math.hypot(vx, vz);
  // A couple of passes so neighbouring posts don't re-overlap after a push.
  for (let pass = 0; pass < 3; pass++) {
    for (const o of obstacles) {
      let dx = x - o.x, dz = z - o.z;
      let d = Math.hypot(dx, dz);
      const min = o.r + radius;
      if (d >= min) continue;
      if (d <= 1e-5) {
        if (vlen > 1e-6) { dx = -vz / vlen; dz = vx / vlen; }
        else { dx = 1; dz = 0; }
        d = 1;
      }
      let nx = dx / d, nz = dz / d;
      // Head-on hits used to pin the player on the incense burner in front of
      // the main hall. Nudge along the tangent so they slide around it.
      if (vlen > 1e-6) {
        const headOn = -(vx * nx + vz * nz) / vlen;
        if (headOn > 0.92) {
          let sx = -vz / vlen, sz = vx / vlen;
          if ((x0 - o.x) * sx + (z0 - o.z) * sz < 0) { sx = -sx; sz = -sz; }
          const mix = 0.4;
          nx = nx * (1 - mix) + sx * mix;
          nz = nz * (1 - mix) + sz * mix;
          const nlen = Math.hypot(nx, nz) || 1;
          nx /= nlen; nz /= nlen;
        }
      }
      x = o.x + nx * min;
      z = o.z + nz * min;
    }
  }
  return { x, z };
}

/** Back-compat: previous single-scene builder (courtyard only if called). */
export function buildHall(scene: THREE.Scene): HallObjects {
  return buildCourtyard(scene);
}
