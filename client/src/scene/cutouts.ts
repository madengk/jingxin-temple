/**
 * Real-statue photo cutouts (CC0 / public-domain photographs).
 * Sources and licenses: docs/LICENSES.md and STATUE_CREDITS below.
 */
import * as THREE from "three";
import { createNamePlaque, createBuddha, createHeavenlyKing, createWeituo } from "./statues";

export type CutoutId = "buddha" | "king-east" | "king-south" | "king-west" | "king-north" | "weituo";

/** Short in-game credit lines (full record in docs/LICENSES.md). */
export const STATUE_CREDITS: { id: CutoutId; credit: string }[] = [
  {
    id: "buddha",
    credit: "释迦牟尼佛：广州光孝寺大雄宝殿，Huangdan2060 摄，Wikimedia Commons，CC0",
  },
  {
    id: "king-east",
    credit: "东方持国天王：广州海幢寺，Huangdan2060 摄，Wikimedia Commons，CC0",
  },
  {
    id: "king-south",
    credit: "南方增长天王：广州海幢寺，Huangdan2060 摄，Wikimedia Commons，CC0",
  },
  {
    id: "king-west",
    credit: "西方广目天王：广州海幢寺，Huangdan2060 摄，Wikimedia Commons，CC0",
  },
  {
    id: "king-north",
    credit: "北方多闻天王：湖南南台寺，Huangdan2060 摄，Wikimedia Commons，CC0",
  },
  {
    id: "weituo",
    credit: "韦陀菩萨：明代韦驮立像，Gary Todd 摄，Wikimedia Commons，CC0",
  },
];

const URLS: Record<CutoutId, string> = {
  buddha: "/statues/buddha.webp",
  "king-east": "/statues/king-east.webp",
  "king-south": "/statues/king-south.webp",
  "king-west": "/statues/king-west.webp",
  "king-north": "/statues/king-north.webp",
  weituo: "/statues/weituo.webp",
};

/** Intrinsic image aspect (width/height) of the processed cutouts. */
const ASPECT: Record<CutoutId, number> = {
  buddha: 824 / 1235,
  "king-east": 967 / 1473,
  "king-south": 927 / 1481,
  "king-west": 1137 / 1266,
  "king-north": 1253 / 1800,
  weituo: 798 / 1456,
};

export async function preloadCutouts(): Promise<Map<CutoutId, THREE.Texture>> {
  const loader = new THREE.TextureLoader();
  const map = new Map<CutoutId, THREE.Texture>();
  await Promise.all(
    (Object.keys(URLS) as CutoutId[]).map(
      (id) =>
        new Promise<void>((resolve) => {
          loader.load(
            URLS[id],
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.anisotropy = 8;
              tex.minFilter = THREE.LinearMipmapLinearFilter;
              tex.magFilter = THREE.LinearFilter;
              tex.needsUpdate = true;
              map.set(id, tex);
              resolve();
            },
            undefined,
            (err) => {
              console.warn("cutout missing, will use procedural fallback:", id, err);
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
 * Pedestal + upright photo plane + plaque on the pedestal front (below the figure).
 * The plane faces local −Z (worshippers) by default; parent rotation orients it.
 */
export function createCutoutFigure(
  tex: THREE.Texture,
  opts: {
    id: CutoutId;
    height: number;
    title: string;
    subtitle?: string;
    /** Pedestal height; plaque sits on its front face, fully below the figure. */
    pedH?: number;
    pedW?: number;
    pedD?: number;
    plaqueScale?: number;
  },
): THREE.Group {
  const g = new THREE.Group();
  const h = opts.height;
  const w = h * (ASPECT[opts.id] ?? 0.65);
  const pedH = opts.pedH ?? 0.52;
  const pedW = opts.pedW ?? Math.max(w * 0.72, 1.6);
  const pedD = opts.pedD ?? 1.05;

  // Pedestal — red lacquer, gold rims
  const wood = mat(0x6b1212, { roughness: 0.48 });
  const goldM = gold();
  g.add(mesh(new THREE.BoxGeometry(pedW, pedH, pedD), wood, 0, pedH / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(pedW + 0.1, 0.07, pedD + 0.1), goldM, 0, pedH - 0.02, 0));
  g.add(mesh(new THREE.BoxGeometry(pedW + 0.08, 0.06, pedD + 0.08), goldM, 0, 0.04, 0));

  // Photo plane: sits on the pedestal, faces −Z (rotate Y=π because PlaneGeometry faces +Z)
  const cutMat = new THREE.MeshStandardMaterial({
    map: tex,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 0.22,
    transparent: true,
    alphaTest: 0.12,
    roughness: 0.62,
    metalness: 0.04,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cutMat);
  plane.position.set(0, pedH + h / 2, 0);
  plane.rotation.y = Math.PI; // face −Z
  plane.castShadow = true;
  g.add(plane);

  // Soft fill light in front of the figure (local −Z)
  const fill = new THREE.PointLight(0xffe6c0, 2.4, h * 3.2, 1.4);
  fill.position.set(0, pedH + h * 0.55, -h * 0.85);
  g.add(fill);
  const rim = new THREE.PointLight(0xfff0d0, 0.9, h * 2.2, 1.6);
  rim.position.set(w * 0.35, pedH + h * 0.7, h * 0.4);
  g.add(rim);

  // Plaque on the front of the pedestal, entirely below the figure's feet
  const pScale = opts.plaqueScale ?? 0.58;
  const plaque = createNamePlaque(opts.title, opts.subtitle, {
    height: opts.subtitle ? 1.55 : 1.4,
    width: 0.58,
  });
  plaque.scale.setScalar(pScale);
  plaque.userData.isPlaque = true;
  // After scale, plaque height ≈ 1.4*0.58 ≈ 0.81, sits at y=0.04 on the front face
  plaque.position.set(0, 0.04, -(pedD / 2) - 0.04);
  plaque.rotation.y = Math.PI; // face worshippers (−Z)
  g.add(plaque);

  return g;
}

export function createBuddhaCutout(tex: THREE.Texture | undefined): THREE.Group {
  if (!tex) return createBuddha();
  const g = createCutoutFigure(tex, {
    id: "buddha",
    height: 6.4,
    title: "释迦牟尼佛",
    subtitle: "如来佛祖",
    pedH: 0.28, // already sits on the hall dais
    pedW: 3.6,
    pedD: 1.4,
    plaqueScale: 0.72,
  });
  // Group sits on the dais top (y=1.05, z=21.6). Dais body is 7.4 deep centred
  // at z=21.8, so its front face is at z=18.1; steps sit around z=18.0.
  // Stand the plaque on the floor just in front of the steps, fully below the
  // figure (feet at y≈1.33) and not embedded in the dais.
  for (const c of g.children) {
    if (c.userData?.isPlaque) {
      // Sit on the dais top at its front lip (dais gold top y=1.05, front ≈18.1)
      // so the plaque is below the figure and visible in a close-up.
      c.position.set(0, 0.02, -3.5); // world (0, 1.07, 18.1)
      c.scale.setScalar(0.8);
      break;
    }
  }
  g.position.set(0, 1.05, 21.6);
  return g;
}

export function createKingCutout(index: number, tex: THREE.Texture | undefined): THREE.Group {
  if (!tex) return createHeavenlyKing(index);
  const info = [
    { id: "king-east" as CutoutId, title: "东方持国天王" },
    { id: "king-south" as CutoutId, title: "南方增长天王" },
    { id: "king-west" as CutoutId, title: "西方广目天王" },
    { id: "king-north" as CutoutId, title: "北方多闻天王" },
  ][index % 4];
  return createCutoutFigure(tex, {
    id: info.id,
    height: 4.55,
    title: info.title,
    pedH: 0.48,
    pedW: 2.4,
    pedD: 1.15,
    plaqueScale: 0.62,
  });
}

export function createWeituoCutout(tex: THREE.Texture | undefined): THREE.Group {
  if (!tex) return createWeituo();
  const g = createCutoutFigure(tex, {
    id: "weituo",
    height: 3.85,
    title: "韦陀菩萨",
    pedH: 0.42,
    pedW: 1.7,
    pedD: 0.95,
    plaqueScale: 0.6,
  });
  // Photo cutouts have only one good face. Traditional 3D Weituo faces the
  // Buddha, but a mirrored backside would greet everyone entering the hall.
  // Keep the painted side and the plaque toward the entrance (−Z) so visitors
  // see the correct, un-flipped image. (Procedural fallback still faces +Z.)
  g.position.set(-3.6, 0, 3.2);
  return g;
}
