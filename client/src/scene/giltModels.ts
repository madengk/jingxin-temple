/**
 * Load CC0 museum statue scans and dress them in the temple's polished
 * gilt (金身) PBR material. Procedural figures remain the fallback.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { goldMat, seatFlush } from "./deities";
import type { DeityKind } from "../../../server/src/shared";

export type GiltId =
  | "shakyamuni"
  | "bodhisattva-standing"
  | "nikko"
  | "guanyin-eleven"
  | "guanyin-potalaka"
  | "miroku"
  | "teaching-buddha";

export interface GiltEntry {
  id: GiltId;
  /** Extra yaw on top of the hall's Math.PI (face the entrance). */
  yaw?: number;
  /** Multiply the requested height (unit-height models). */
  heightScale?: number;
  /** Bury this fraction of the figure's height into the lotus (hides a cut base). */
  sink?: number;
  title: string;
  author: string;
  accession: string;
  license: "CC0 1.0" | "generated-original";
  sourcePage: string;
  download: string;
  sketchfab: string;
}

/** Cleveland Museum of Art open-access photogrammetry, CC0. */
export const GILT_CATALOG: Record<GiltId, GiltEntry> = {
  shakyamuni: {
    id: "shakyamuni",
    sink: 0.055,
    title: "Seated Buddha (如来坐像), Japan, Heian period, 1100s. Gilded wood.",
    author: "Cleveland Museum of Art",
    accession: "1973.85.a",
    license: "CC0 1.0",
    sourcePage: "https://www.clevelandart.org/art/1973.85",
    download: "https://images.artheonmuseum.org/ugc/sketchfab/c9e0d5000ca345ea9dacf35f25db57b2.glb",
    sketchfab: "https://sketchfab.com/3d-models/197385a-seated-buddha-sculpture-c9e0d5000ca345ea9dacf35f25db57b2",
  },
  "bodhisattva-standing": {
    id: "bodhisattva-standing",
    sink: 0.02,
    title: "Standing Bodhisattva, Korea, Joseon dynasty, 1500s. Wood with lacquer and gold.",
    author: "Cleveland Museum of Art",
    accession: "1997.11",
    license: "CC0 1.0",
    sourcePage: "https://www.clevelandart.org/art/1997.11",
    download: "https://images.artheonmuseum.org/ugc/sketchfab/1a57a0d6609145b486ed5b1d3e9ec7fb.glb",
    sketchfab: "https://sketchfab.com/3d-models/199711-standing-bodhisattva-1a57a0d6609145b486ed5b1d3e9ec7fb",
  },
  nikko: {
    id: "nikko",
    sink: 0.02,
    title: "Sun Bodhisattva (Nikkō Bosatsu), Japan, Heian period. Wood with traces of color and gold.",
    author: "Cleveland Museum of Art",
    accession: "1961.48",
    license: "CC0 1.0",
    sourcePage: "https://www.clevelandart.org/art/1961.48",
    download: "https://images.artheonmuseum.org/ugc/sketchfab/d1f48511f45e4d0ba41eb0b27ed73f4d.glb",
    sketchfab: "https://sketchfab.com/3d-models/196148-sun-bodhisattva-nikko-bosatsu-d1f48511f45e4d0ba41eb0b27ed73f4d",
  },
  "guanyin-eleven": {
    id: "guanyin-eleven",
    sink: 0.03,
    title: "Eleven-Headed Guanyin, China, late Northern Song–Jin. Wood with polychromy and cut gold.",
    author: "Cleveland Museum of Art",
    accession: "1981.53",
    license: "CC0 1.0",
    sourcePage: "https://www.clevelandart.org/art/1981.53",
    download: "https://images.artheonmuseum.org/ugc/sketchfab/a8581040a43346718e1daadca397f3d0.glb",
    sketchfab: "https://sketchfab.com/3d-models/198153-eleven-headed-guanyin-a8581040a43346718e1daadca397f3d0",
  },
  "guanyin-potalaka": {
    id: "guanyin-potalaka",
    title: "Potalaka Guanyin, China, Five Dynasties. Carved sandalwood with traces of paint.",
    author: "Cleveland Museum of Art",
    accession: "1965.556",
    license: "CC0 1.0",
    sourcePage: "https://www.clevelandart.org/art/1965.556",
    download: "https://images.artheonmuseum.org/ugc/sketchfab/ea6471f3c4ef4280a31f014b67203084.glb",
    sketchfab: "https://sketchfab.com/3d-models/1965556-potalaka-guanyin-ea6471f3c4ef4280a31f014b67203084",
  },
  miroku: {
    id: "miroku",
    sink: 0.03,
    title: "Buddha of the Future (Miroku Bosatsu), Japan, Asuka period. Cast bronze with traces of gilding.",
    author: "Cleveland Museum of Art",
    accession: "1950.86.a",
    license: "CC0 1.0",
    sourcePage: "https://www.clevelandart.org/art/1950.86",
    download: "https://images.artheonmuseum.org/ugc/sketchfab/bd209abdcee1474995fa10eefb2cd862.glb",
    sketchfab: "https://sketchfab.com/3d-models/195086a-buddha-of-the-future-miroku-bosatsu-bd209abdcee1474995fa10eefb2cd862",
  },
  "teaching-buddha": {
    id: "teaching-buddha",
    title: "Buddha with Hands in Gesture of Teaching (Vitarka Mudra), Thailand, Mon-Dvaravati. Bronze.",
    author: "Cleveland Museum of Art",
    accession: "1958.334",
    license: "CC0 1.0",
    sourcePage: "https://www.clevelandart.org/art/1958.334",
    download: "https://images.artheonmuseum.org/ugc/sketchfab/c2de7dd469c3422794d0ffad4295da9c.glb",
    sketchfab: "https://sketchfab.com/3d-models/1958334-buddha-with-hands-in-gesture-of-teaching-c2de7dd469c3422794d0ffad4295da9c",
  },
};

/** Which scan to use for each hall deity / attendant. */
export const GILT_FOR: Partial<Record<DeityKind | "ananda" | "kasyapa", GiltId>> = {
  buddha: "shakyamuni",
  ananda: "bodhisattva-standing",
  kasyapa: "nikko",
  guanyin: "guanyin-eleven",
  mile: "miroku",
};

/** Default (round 7): fal-generated gilt Shakyamuni for the main hall.
 *  `?gilt=scan` keeps the Cleveland CC0 museum scan. `?gilt=off` is procedural. */
export function giltMode(): "fal" | "scan" | "off" {
  if (typeof location === "undefined") return "fal";
  const v = new URLSearchParams(location.search).get("gilt");
  if (v === "off" || v === "proc" || v === "0") return "off";
  if (v === "scan" || v === "museum") return "scan";
  if (v === "gen" || v === "generated" || v === "fal" || v === "on" || !v) return "fal";
  return "fal";
}

/** Fal image-to-3D Shakyamuni (Hunyuan 3D Pro, from original concept images). */
export const FAL_SHAKYAMUNI = {
  id: "shakyamuni" as GiltId,
  url: "/statues/fal/shakyamuni.glb",
  keepTexture: true,
  sink: 0.02,
  title: "释迦牟尼佛坐像（原创概念图经 fal Hunyuan 3D Pro 转成三维，保留金身贴图）",
  author: "静心寺原创概念图 + fal.ai Hunyuan 3D v3.1 Pro",
  license: "generated-original" as const,
};

const loader = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Group>>();

function applyGiltMaterial(root: THREE.Object3D, keepTexture = false) {
  // Museum photogrammetry albedo is often darkened lacquer or bronze and would
  // muddy the 金身. Keep carved normal maps; colour is the temple gold PBR.
  // Fal models already have a gilt albedo + PBR maps — keep those.
  const template = goldMat(0xf0d078, { metalness: 0.9, roughness: 0.24, envMapIntensity: 1.4 });
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const srcs = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next = srcs.map((raw) => {
      const src = raw as THREE.MeshStandardMaterial;
      const g = template.clone();
      if (src && src.normalMap) {
        g.normalMap = src.normalMap;
        g.normalScale = src.normalScale?.clone?.() ?? new THREE.Vector2(1.15, 1.15);
      }
      if (keepTexture && src?.map) {
        g.map = src.map;
        g.color.set(0xffffff);
        if (src.metalnessMap) g.metalnessMap = src.metalnessMap;
        if (src.roughnessMap) g.roughnessMap = src.roughnessMap;
        g.metalness = src.metalness ?? 0.9;
        g.roughness = src.roughness ?? 0.35;
        g.envMapIntensity = 1.25;
      } else {
        g.map = null;
        g.color.set(0xf0d078);
        g.metalness = 0.9;
        g.roughness = 0.24;
        g.envMapIntensity = 1.4;
      }
      g.needsUpdate = true;
      return g;
    });
    mesh.material = Array.isArray(mesh.material) ? next : next[0];
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

export function loadGiltModel(
  id: GiltId,
  height: number,
  useFal = false,
): Promise<THREE.Group> {
  const entry = GILT_CATALOG[id];
  const fal = useFal && id === "shakyamuni";
  const key = fal ? "fal:shakyamuni" : entry.id;
  const url = fal ? FAL_SHAKYAMUNI.url : `/statues/gilt/${entry.id}.glb`;
  const yaw = fal ? 0 : (entry.yaw ?? 0);
  const heightScale = entry.heightScale ?? 1;
  let pending = cache.get(key);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          const src = gltf.scene;
          applyGiltMaterial(src, fal && FAL_SHAKYAMUNI.keepTexture);
          cache.set(key, Promise.resolve(src));
          resolve(src);
        },
        undefined,
        (err) => reject(err),
      );
    });
    cache.set(key, pending);
  }
  return pending.then((src) => {
    const g = new THREE.Group();
    const inst = src.clone(true);
    inst.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((m) => (m as THREE.Material).clone())
          : (mesh.material as THREE.Material).clone();
      }
    });
    const scale = height * heightScale;
    inst.scale.setScalar(scale);
    inst.rotation.y = yaw;
    g.add(inst);
    g.userData.giltId = id;
    g.userData.fal = fal;
    return g;
  });
}

export function disposeFigure(fig: THREE.Object3D) {
  fig.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    // Don't dispose shared source geometry/textures held in the cache.
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) mat?.dispose?.();
  });
}

export async function replaceWithGilt(
  parent: THREE.Object3D,
  current: THREE.Object3D,
  id: GiltId,
  height: number,
  surfaceY: number,
  yaw = Math.PI,
): Promise<THREE.Group | null> {
  if (!parent.parent && parent.type !== "Scene") {
    // still ok if parent is the hall group already in a scene; check userData
  }
  if (parent.userData.tornDown) return null;
  const useFal = giltMode() === "fal" && id === "shakyamuni";
  let fig: THREE.Group;
  try {
    fig = await loadGiltModel(id, height, useFal);
  } catch (err) {
    console.warn("gilt model failed", id, err, "fal", useFal);
    if (useFal) {
      try {
        fig = await loadGiltModel(id, height, false);
      } catch (err2) {
        console.warn("gilt museum fallback failed", id, err2);
        return null;
      }
    } else {
      return null;
    }
  }
  if (parent.userData.tornDown || !current.parent) {
    disposeFigure(fig);
    return null;
  }
  fig.position.copy(current.position);
  fig.rotation.y = yaw;
  parent.add(fig);
  const sink = (useFal ? FAL_SHAKYAMUNI.sink : (GILT_CATALOG[id].sink ?? 0)) * height;
  seatFlush(fig, surfaceY - sink);
  parent.remove(current);
  disposeFigure(current);
  return fig;
}

export function usedGiltCredits(kinds: Array<DeityKind | "ananda" | "kasyapa">): GiltEntry[] {
  const seen = new Set<GiltId>();
  const out: GiltEntry[] = [];
  for (const k of kinds) {
    const id = GILT_FOR[k];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(GILT_CATALOG[id]);
  }
  return out;
}
