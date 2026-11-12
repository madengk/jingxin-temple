/**
 * Real-statue reliefs: CC0 photographs given a 2.5D body (depth-displaced
 * front, thick sides, gilt back) so they read as solid figures, not flat cards.
 * Sources: docs/LICENSES.md and STATUE_CREDITS below.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createNamePlaque, createBuddha, createHeavenlyKing, createWeituo } from "./statues";

export type CutoutId = "buddha" | "king-east" | "king-south" | "king-west" | "king-north" | "weituo";

export const STATUE_CREDITS: { id: CutoutId; credit: string }[] = [
  { id: "buddha", credit: "释迦牟尼佛：广州光孝寺大雄宝殿，Huangdan2060 摄，Wikimedia Commons，CC0" },
  { id: "king-east", credit: "东方持国天王：广州海幢寺，Huangdan2060 摄，Wikimedia Commons，CC0" },
  { id: "king-south", credit: "南方增长天王：广州海幢寺，Huangdan2060 摄，Wikimedia Commons，CC0" },
  { id: "king-west", credit: "西方广目天王：广州海幢寺，Huangdan2060 摄，Wikimedia Commons，CC0" },
  { id: "king-north", credit: "北方多闻天王：湖南南台寺，Huangdan2060 摄，Wikimedia Commons，CC0" },
  { id: "weituo", credit: "韦陀菩萨：明代韦驮立像，Gary Todd 摄，Wikimedia Commons，CC0" },
];

const IDS: CutoutId[] = ["buddha", "king-east", "king-south", "king-west", "king-north", "weituo"];

/** Preloaded relief scenes (height = 1, Y up, front faces −Z). */
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
                  // Hall lamps and the sun do the lighting — no emissive "sticker" glow.
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
    color: 0xe8d5a3, metalness: 0.72, roughness: 0.3, emissive: 0xd4b056, emissiveIntensity: 0.16,
  });
}
function mesh(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Pedestal + relief figure (or procedural fallback) + plaque on the pedestal front.
 * The relief already faces local −Z (worshippers). Parent rotation orients the kings.
 * No billboarding — orientation is fixed.
 */
export function createCutoutFigure(
  relief: THREE.Group | undefined,
  opts: {
    id: CutoutId;
    height: number;
    title: string;
    subtitle?: string;
    pedH?: number;
    pedW?: number;
    pedD?: number;
    plaqueScale?: number;
    /** Used only for the procedural / plane fallback pedestal width. */
    fallbackAspect?: number;
  },
): THREE.Group {
  const g = new THREE.Group();
  const h = opts.height;
  const pedH = opts.pedH ?? 0.52;
  const aspect = opts.fallbackAspect ?? 0.65;
  const pedW = opts.pedW ?? Math.max(h * aspect * 0.72, 1.6);
  const pedD = opts.pedD ?? 1.35;

  const wood = mat(0x6b1212, { roughness: 0.48 });
  const goldM = gold();
  g.add(mesh(new THREE.BoxGeometry(pedW, pedH, pedD), wood, 0, pedH / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(pedW + 0.1, 0.07, pedD + 0.1), goldM, 0, pedH - 0.02, 0));
  g.add(mesh(new THREE.BoxGeometry(pedW + 0.08, 0.06, pedD + 0.08), goldM, 0, 0.04, 0));

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
    // GLB is height 1, bottom at y=0, front toward −Z. Sit it on the pedestal.
    fig.scale.setScalar(h);
    fig.position.set(0, pedH, 0);
    fig.rotation.set(0, 0, 0); // fixed orientation, never billboard
    g.add(fig);
  }

  const pScale = opts.plaqueScale ?? 0.58;
  const plaque = createNamePlaque(opts.title, opts.subtitle, {
    height: opts.subtitle ? 1.55 : 1.4,
    width: 0.58,
  });
  plaque.scale.setScalar(pScale);
  plaque.userData.isPlaque = true;
  plaque.position.set(0, 0.04, -(pedD / 2) - 0.04);
  plaque.rotation.y = Math.PI;
  g.add(plaque);

  return g;
}

export function createBuddhaCutout(relief?: THREE.Group): THREE.Group {
  if (!relief) return createBuddha();
  const g = createCutoutFigure(relief, {
    id: "buddha",
    height: 6.4,
    title: "释迦牟尼佛",
    subtitle: "如来佛祖",
    pedH: 0.28,
    pedW: 3.6,
    pedD: 1.6,
    plaqueScale: 0.72,
    fallbackAspect: 0.66,
  });
  for (const c of g.children) {
    if (c.userData?.isPlaque) {
      c.position.set(0, 0.02, -3.5); // world (0, 1.07, 18.1) on the dais lip
      c.scale.setScalar(0.8);
      break;
    }
  }
  g.position.set(0, 1.05, 21.6);
  return g;
}

export function createKingCutout(index: number, relief?: THREE.Group): THREE.Group {
  if (!relief) return createHeavenlyKing(index);
  const info = [
    { id: "king-east" as CutoutId, title: "东方持国天王", aspect: 0.66, pedW: 2.6 },
    { id: "king-south" as CutoutId, title: "南方增长天王", aspect: 0.62, pedW: 2.6 },
    { id: "king-west" as CutoutId, title: "西方广目天王", aspect: 0.83, pedW: 3.1 },
    { id: "king-north" as CutoutId, title: "北方多闻天王", aspect: 0.69, pedW: 2.7 },
  ][index % 4];
  return createCutoutFigure(relief, {
    id: info.id,
    height: 4.55,
    title: info.title,
    pedH: 0.48,
    pedW: info.pedW,
    pedD: 1.55,
    plaqueScale: 0.62,
    fallbackAspect: info.aspect,
  });
}

export function createWeituoCutout(relief?: THREE.Group): THREE.Group {
  if (!relief) return createWeituo();
  const g = createCutoutFigure(relief, {
    id: "weituo",
    height: 3.85,
    title: "韦陀菩萨",
    pedH: 0.42,
    pedW: 1.7,
    pedD: 1.15,
    plaqueScale: 0.6,
    fallbackAspect: 0.55,
  });
  // Painted front faces the entrance (−Z). The gilt back faces the Buddha.
  g.position.set(-3.6, 0, 3.2);
  return g;
}
