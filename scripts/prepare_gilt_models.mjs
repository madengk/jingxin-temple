/**
 * Bake world transforms, recenter (Y-up, bottom at 0, XZ-centered),
 * scale to unit height, decimate, and shrink textures of CC0 museum
 * statue scans into game-ready GLBs.
 *
 * Usage: node scripts/prepare_gilt_models.mjs
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
const SRC = "/tmp/statue-glb";
const OUT = path.join(ROOT, "client/public/statues/gilt");

const MODELS = [
  "shakyamuni",
  "bodhisattva-standing",
  "nikko",
  "guanyin-eleven",
  "guanyin-potalaka",
  "miroku",
  "teaching-buddha",
];

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
    // normal matrix ≈ upper 3x3 (uniform/rotation+translation only here)
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
  // Reset every node transform now that meshes are in world space.
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

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
fs.mkdirSync(OUT, { recursive: true });

for (const name of MODELS) {
  const src = path.join(SRC, `${name}.glb`);
  const dest = path.join(OUT, `${name}.glb`);
  if (!fs.existsSync(src)) {
    console.warn("missing", src);
    continue;
  }
  console.log("\n====", name, "====");
  const inSize = fs.statSync(src).size;
  console.log("input", (inSize / 1e6).toFixed(2), "MB");
  const doc = await io.read(src);

  bakeWorldTransforms(doc);
  await doc.transform(flatten(), prune());

  let b = worldBounds(doc);
  console.log("baked verts", b.verts, "size", b.size.map((n) => +n.toFixed(3)),
    "min", b.min.map((n) => +n.toFixed(3)),
    "tallest", ["x", "y", "z"][b.size.indexOf(Math.max(...b.size))]);

  const cx = (b.min[0] + b.max[0]) / 2;
  const cz = (b.min[2] + b.max[2]) / 2;
  const y0 = b.min[1];
  transformPositions(doc, (v) => {
    v[0] -= cx;
    v[1] -= y0;
    v[2] -= cz;
  });
  b = worldBounds(doc);
  const h = b.size[1] || 1;
  const s = 1 / h;
  transformPositions(doc, (v) => {
    v[0] *= s; v[1] *= s; v[2] *= s;
  });
  b = worldBounds(doc);
  console.log("normalized size", b.size.map((n) => +n.toFixed(3)), "verts", b.verts);

  const target = name === "shakyamuni" ? 28000 : 20000;
  const ratio = Math.min(1, target / Math.max(1, b.verts));
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
  const leftover = outDoc.getRoot().listNodes().filter((n) => {
    const t = n.getTranslation(), r = n.getRotation(), s = n.getScale();
    return t.some((x) => Math.abs(x) > 1e-5)
      || s.some((x) => Math.abs(x - 1) > 1e-5)
      || r.some((x, i) => Math.abs(x - (i === 3 ? 1 : 0)) > 1e-5);
  });
  const b2 = worldBounds(outDoc);
  const outSize = fs.statSync(dest).size;
  console.log("output", (outSize / 1e6).toFixed(2), "MB", "verts", b2.verts,
    "size", b2.size.map((n) => +n.toFixed(3)),
    leftover.length ? `WARNING leftover xforms ${leftover.length}` : "identity nodes");
}
