/**
 * Real-statue reliefs: CC0 photographs given a 2.5D gilt body
 * (depth-displaced front, thick sides, gilt back) so they read as solid 金身.
 * Sources: docs/LICENSES.md and STATUE_CREDITS below.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createNamePlaque, createBuddha, createHeavenlyKing, createWeituo } from "./statues";

export type CutoutId = "buddha" | "king-east" | "king-south" | "king-west" | "king-north" | "weituo";

export const STATUE_CREDITS: { id: CutoutId; credit: string }[] = [
  { id: "buddha", credit: "释迦牟尼佛：广州光孝寺大雄宝殿，Huangdan2060 摄，Wikimedia Commons，CC0（金身）" },
  { id: "king-east", credit: "东方持国天王：广州海幢寺，Huangdan2060 摄，Wikimedia Commons，CC0，金身转化" },
  { id: "king-south", credit: "南方增长天王：广州海幢寺，Huangdan2060 摄，Wikimedia Commons，CC0，金身转化" },
  { id: "king-west", credit: "西方广目天王：广州海幢寺，Huangdan2060 摄，Wikimedia Commons，CC0，金身转化" },
  { id: "king-north", credit: "北方多闻天王：湖南南台寺，Huangdan2060 摄，Wikimedia Commons，CC0，金身转化" },
  { id: "weituo", credit: "韦陀菩萨：明代韦驮立像，Gary Todd 摄，Wikimedia Commons，CC0，金身转化" },
];

const IDS: CutoutId[] = ["buddha", "king-east", "king-south", "king-west", "king-north", "weituo"];

export type ReliefMap = Map<CutoutId, THREE.Group>;

export async function preloadCutouts(): Promise<ReliefMap> {
  const loader = new GLTFLoader();
  const map: ReliefMap = new Map();
  await Promise.all(
    IDS.map(
      (id) =>
        new Promise<void>((resolve) => {
          loader.load(
            `/statues/${id}.glb`,
            (gltf) => {
              const root = gltf.scene;
              root.traverse((o) => {
                const m = o as THREE.Mesh;
                if (!m.isMesh) return;
                m.castShadow = true;
                m.receiveShadow = true;
                const mat = m.material as THREE.MeshStandardMaterial;
                if (mat) {
                  mat.emissive = new THREE.Color(0x000000);
                  mat.emissiveIntensity = 0;
                  mat.needsUpdate = true;
                }
              });
              map.set(id, root);
              resolve();
            },
            undefined,
            (err) => {
              console.warn("relief GLB missing, will fall back:", id, err);
              resolve();
            },
          );
        }),
    ),
  );
  return map;
}

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08, ...opts });
}
function gold() {
  return new THREE.MeshStandardMaterial({
    color: 0xe8d5a3, metalness: 0.78, roughness: 0.32, emissive: 0xd4b056, emissiveIntensity: 0.14,
  });
}
function mesh(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Two rings of gilt lotus petals with a flat seed-pod top. Returns the sitting-surface height. */
export function lotusThrone(radius: number, goldM: THREE.Material, opts?: { petals?: number; height?: number }): THREE.Group {
  const g = new THREE.Group();
  const H = opts?.height ?? 0.32;
  const n0 = opts?.petals ?? 14;
  for (let ring = 0; ring < 2; ring++) {
    const n = n0 - ring * 3;
    const r = radius * (0.92 - ring * 0.2);
    const y = 0.07 + ring * (H * 0.28);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.22;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.36, 9, 7), goldM);
      petal.scale.set(0.62, 0.28, 1.05);
      petal.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      // tip points outward and slightly up
      petal.rotation.order = "YXZ";
      petal.rotation.y = -a;
      petal.rotation.x = Math.PI / 2 - 0.42;
      petal.castShadow = true;
      petal.receiveShadow = true;
      g.add(petal);
    }
  }
  // seed platform the figure actually sits on
  g.add(mesh(new THREE.CylinderGeometry(radius * 0.58, radius * 0.72, H * 0.45, 20), goldM, 0, H - 0.08, 0));
  g.add(mesh(new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, 0.05, 20), goldM, 0, H - 0.01, 0));
  g.userData.topY = H;
  return g;
}

/**
 * Shift a scaled relief so the lowest vertex sits exactly on `surfaceY`.
 * Prevents floating (empty alpha at the photo's bottom) and clipping.
 */
function seatFlush(fig: THREE.Object3D, surfaceY: number) {
  fig.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(fig);
  if (!isFinite(box.min.y)) return;
  fig.position.y += surfaceY - box.min.y;
}

export function createCutoutFigure(
  relief: THREE.Group | undefined,
  opts: {
    id: CutoutId;
    height: number;
    title: string;
    subtitle?: string;
    /** Height of the lotus sitting surface (and short plinth beneath). */
    lotusH?: number;
    lotusR?: number;
    plinthH?: number;
    plinthW?: number;
    plinthD?: number;
    plaqueScale?: number;
    /** If set, skip the local plaque (caller places it, e.g. on the 须弥座). */
    skipPlaque?: boolean;
  },
): THREE.Group {
  const g = new THREE.Group();
  const h = opts.height;
  const lotusH = opts.lotusH ?? 0.34;
  const lotusR = opts.lotusR ?? Math.max(h * 0.28, 0.85);
  const plinthH = opts.plinthH ?? 0.22;
  const plinthW = opts.plinthW ?? Math.max(lotusR * 2.15, 1.5);
  const plinthD = opts.plinthD ?? Math.max(lotusR * 1.7, 1.15);
  const goldM = gold();
  const wood = mat(0x6b1212, { roughness: 0.48 });

  // Short vermillion plinth with gold rims, then a gilt lotus the figure sits on.
  g.add(mesh(new THREE.BoxGeometry(plinthW, plinthH, plinthD), wood, 0, plinthH / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(plinthW + 0.12, 0.06, plinthD + 0.12), goldM, 0, plinthH - 0.02, 0));
  g.add(mesh(new THREE.BoxGeometry(plinthW + 0.08, 0.05, plinthD + 0.08), goldM, 0, 0.03, 0));

  const lotus = lotusThrone(lotusR, goldM, { height: lotusH, petals: 14 });
  lotus.position.y = plinthH;
  g.add(lotus);
  const seatY = plinthH + lotusH;

  if (relief) {
    const fig = relief.clone(true);
    fig.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      if (m.material && !Array.isArray(m.material)) {
        m.material = (m.material as THREE.Material).clone();
      }
    });
    fig.scale.setScalar(h);
    fig.position.set(0, seatY, 0);
    fig.rotation.set(0, 0, 0);
    g.add(fig);
    // Snap the actual mesh bottom (not the photo frame) flush onto the lotus.
    seatFlush(fig, seatY);
  }

  if (!opts.skipPlaque) {
    const pScale = opts.plaqueScale ?? 0.58;
    const plaque = createNamePlaque(opts.title, opts.subtitle, {
      height: opts.subtitle ? 1.55 : 1.4,
      width: 0.58,
    });
    plaque.scale.setScalar(pScale);
    plaque.userData.isPlaque = true;
    // Front of the plinth, fully below the lotus and the figure.
    plaque.position.set(0, 0.04, -(plinthD / 2) - 0.05);
    plaque.rotation.y = Math.PI;
    g.add(plaque);
  }

  g.userData.seatY = seatY;
  return g;
}

/** Sitting surface of the 须弥座 lotus; hall.ts sets this after building the dais. */
export const BUDDHA_HEIGHT = 9.2;
export const KING_HEIGHT = 3.45;
export const WEITUO_HEIGHT = 3.05;

export function createBuddhaCutout(relief?: THREE.Group, daisSittingY = 3.4): THREE.Group {
  if (!relief) {
    const fb = createBuddha();
    fb.position.set(0, daisSittingY, 21.6);
    return fb;
  }
  // The 须弥座 already carries the grand lotus. Here only a shallow confirming
  // ring and the figure, snapped flush, so nothing floats or sinks.
  const g = createCutoutFigure(relief, {
    id: "buddha",
    height: BUDDHA_HEIGHT,
    title: "释迦牟尼佛",
    subtitle: "如来佛祖",
    lotusH: 0.42,
    lotusR: 2.35,
    plinthH: 0.08,
    plinthW: 5.0,
    plinthD: 2.6,
    plaqueScale: 0.95,
    skipPlaque: true, // hall places a large plaque on the 须弥座 front
  });
  g.position.set(0, daisSittingY, 21.6);
  return g;
}

export function createKingCutout(index: number, relief?: THREE.Group): THREE.Group {
  if (!relief) return createHeavenlyKing(index);
  const info = [
    { id: "king-east" as CutoutId, title: "东方持国天王", r: 1.05, w: 2.4, d: 1.55 },
    { id: "king-south" as CutoutId, title: "南方增长天王", r: 1.00, w: 2.3, d: 1.55 },
    { id: "king-west" as CutoutId, title: "西方广目天王", r: 1.25, w: 2.9, d: 1.75 },
    { id: "king-north" as CutoutId, title: "北方多闻天王", r: 1.10, w: 2.5, d: 1.6 },
  ][index % 4];
  return createCutoutFigure(relief, {
    id: info.id,
    height: KING_HEIGHT,
    title: info.title,
    lotusH: 0.32,
    lotusR: info.r,
    plinthH: 0.24,
    plinthW: info.w,
    plinthD: info.d,
    plaqueScale: 0.62,
  });
}

export function createWeituoCutout(relief?: THREE.Group): THREE.Group {
  if (!relief) return createWeituo();
  const g = createCutoutFigure(relief, {
    id: "weituo",
    height: WEITUO_HEIGHT,
    title: "韦陀菩萨",
    lotusH: 0.30,
    lotusR: 0.78,
    plinthH: 0.22,
    plinthW: 1.65,
    plinthD: 1.2,
    plaqueScale: 0.58,
  });
  g.position.set(-3.6, 0, 3.2);
  return g;
}

/** Place the Buddha's name plaque on the front face of the 须弥座, below the figure. */
export function placeBuddhaPlaque(parent: THREE.Group, worldY: number, worldZ: number, daisGroupY = 0) {
  const plaque = createNamePlaque("释迦牟尼佛", "如来佛祖", { height: 1.7, width: 0.68 });
  plaque.scale.setScalar(1.05);
  plaque.userData.isPlaque = true;
  plaque.position.set(0, worldY - daisGroupY, worldZ);
  plaque.rotation.y = Math.PI;
  parent.add(plaque);
  return plaque;
}
