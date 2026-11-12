/**
 * Normalize and compress fal Hunyuan monk GLBs for players.
 * Y-up, bottom at 0, XZ-centered. Standing is unit height; sitting uses
 * the same world-scale as standing (not independently unit-normalized).
 * Target: each GLB < 1.5MB.
 *
 * Usage: node scripts/prepare_fal_monks.mjs
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  flatten, prune, dedup, weld, simplify, textureCompress,
} from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "docs/sources/fal");
const OUT = path.join(ROOT, "client/public/statues/fal");

function mulMat4Vec3(m, v, w = 1) {
  const x = v[0], y = v[1], z = v[2];
  const nx = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
  const ny = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
  const nz = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
  return [nx, ny, nz];
}

function bakeWorldTransforms(doc) {
  const baked = new Set();
  for (const n of doc.getRoot().listNodes()) {
    const mesh = n.getMesh();
    if (!mesh) continue;
    if (baked.has(mesh)) {
      throw new Error(`mesh instanced under multiple nodes: ${mesh.getName()}`);
    }
    baked.add(mesh);
    const M = n.getWorldMatrix();
    for (const p of mesh.listPrimitives()) {
      const pos = p.getAttribute("POSITION");
      if (pos) {
        const v = [0, 0, 0];
        for (let i = 0; i < pos.getCount(); i++) {
          pos.getElement(i, v);
          pos.setElement(i, mulMat4Vec3(M, v, 1));
        }
      }
      const nrm = p.getAttribute("NORMAL");
      if (nrm) {
        const v = [0, 0, 0];
        for (let i = 0; i < nrm.getCount(); i++) {
          nrm.getElement(i, v);
          const r = mulMat4Vec3(M, v, 0);
          const len = Math.hypot(r[0], r[1], r[2]) || 1;
          nrm.setElement(i, [r[0] / len, r[1] / len, r[2] / len]);
        }
      }
    }
  }
  for (const n of doc.getRoot().listNodes()) {
    n.setTranslation([0, 0, 0]);
    n.setRotation([0, 0, 0, 1]);
    n.setScale([1, 1, 1]);
  }
}

function worldBounds(doc) {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  let verts = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const p of mesh.listPrimitives()) {
      const pos = p.getAttribute("POSITION");
      if (!pos) continue;
      verts += pos.getCount();
      const v = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v);
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k], v[k]);
          max[k] = Math.max(max[k], v[k]);
        }
      }
    }
  }
  return { min, max, verts, size: min.map((a, i) => max[i] - a) };
}

function transformPositions(doc, fn) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const p of mesh.listPrimitives()) {
      const pos = p.getAttribute("POSITION");
      if (!pos) continue;
      const v = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v);
        fn(v);
        pos.setElement(i, v);
      }
    }
  }
}

function rotateY(doc, radians) {
  const c = Math.cos(radians), s = Math.sin(radians);
  transformPositions(doc, (v) => {
    const x = v[0], z = v[2];
    v[0] = c * x + s * z;
    v[2] = -s * x + c * z;
  });
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const p of mesh.listPrimitives()) {
      const nrm = p.getAttribute("NORMAL");
      if (!nrm) continue;
      const v = [0, 0, 0];
      for (let i = 0; i < nrm.getCount(); i++) {
        nrm.getElement(i, v);
        const x = v[0], z = v[2];
        v[0] = c * x + s * z;
        v[2] = -s * x + c * z;
        nrm.setElement(i, v);
      }
    }
  }
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
fs.mkdirSync(OUT, { recursive: true });

const yawDeg = Number(process.env.MONK_YAW_DEG || "0");
const standScaleEnv = process.env.MONK_STAND_SCALE; // if set, apply this instead of 1/height

const jobs = [
  { name: "monk-stand", src: "monk-stand-raw.glb", unitHeight: true, targetVerts: 18000 },
  { name: "monk-sit", src: "monk-sit-raw.glb", unitHeight: false, targetVerts: 18000 },
];

let sharedScale = null;

for (const { name, src, unitHeight, targetVerts } of jobs) {
  const srcPath = path.join(SRC, src);
  const dest = path.join(OUT, `${name}.glb`);
  if (!fs.existsSync(srcPath)) {
    console.warn("missing", srcPath);
    continue;
  }
  console.log("\n====", name, "====");
  const inSize = fs.statSync(srcPath).size;
  console.log("input", (inSize / 1e6).toFixed(2), "MB");
  const doc = await io.read(srcPath);

  bakeWorldTransforms(doc);
  await doc.transform(flatten(), prune());

  let b = worldBounds(doc);
  console.log("baked verts", b.verts, "size", b.size.map((n) => +n.toFixed(3)),
    "min", b.min.map((n) => +n.toFixed(3)));

  const cx = (b.min[0] + b.max[0]) / 2;
  const cz = (b.min[2] + b.max[2]) / 2;
  const y0 = b.min[1];
  transformPositions(doc, (v) => {
    v[0] -= cx;
    v[1] -= y0;
    v[2] -= cz;
  });
  b = worldBounds(doc);

  if (yawDeg) {
    rotateY(doc, yawDeg * Math.PI / 180);
    // re-center XZ after rotation, keep y=0
    b = worldBounds(doc);
    const cx2 = (b.min[0] + b.max[0]) / 2;
    const cz2 = (b.min[2] + b.max[2]) / 2;
    transformPositions(doc, (v) => { v[0] -= cx2; v[2] -= cz2; });
    b = worldBounds(doc);
  }

  let s;
  if (unitHeight) {
    s = standScaleEnv ? Number(standScaleEnv) : (1 / (b.size[1] || 1));
    sharedScale = s;
    console.log("unit-height scale", s);
  } else {
    s = sharedScale ?? (1 / (b.size[1] || 1));
    console.log("shared scale", s, "(sit height will be", (b.size[1] * s).toFixed(3), ")");
  }
  transformPositions(doc, (v) => {
    v[0] *= s; v[1] *= s; v[2] *= s;
  });
  b = worldBounds(doc);
  console.log("normalized size", b.size.map((n) => +n.toFixed(3)), "verts", b.verts);

  const ratio = Math.min(1, targetVerts / Math.max(1, b.verts));
  if (ratio < 0.98) {
    console.log("simplify ratio", ratio.toFixed(3));
    try {
      await MeshoptSimplifier.ready;
      await doc.transform(
        weld(),
        simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.001 }),
      );
    } catch (e) {
      console.warn("simplify failed", e.message);
    }
  }

  try {
    await doc.transform(
      textureCompress({
        targetFormat: "webp",
        resize: [1024, 1024],
        quality: 70,
      }),
    );
  } catch (e) {
    console.warn("textureCompress failed", e.message);
  }

  await doc.transform(dedup(), prune());
  for (const a of doc.getRoot().listAnimations()) a.dispose();

  await io.write(dest, doc);
  const outDoc = await io.read(dest);
  const b2 = worldBounds(outDoc);
  const outSize = fs.statSync(dest).size;
  const mb = outSize / 1e6;
  console.log("output", mb.toFixed(2), "MB", "verts", b2.verts,
    "size", b2.size.map((n) => +n.toFixed(3)),
    mb > 1.5 ? "WARNING over 1.5MB" : "ok under 1.5MB");
}
