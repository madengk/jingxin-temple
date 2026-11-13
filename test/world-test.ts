/**
 * Shared-world transforms and door-crossing continuity.
 * Run: npx tsx test/world-test.ts
 */
import { MAIN_HALL, SIDE_HALLS, hallById, hallFrontDistance, courtyardDoorHit, interiorExitHit, clampToWalkable } from "../server/src/shared";
import {
  doorPose as dp, localToWorld as l2w, worldToLocal as w2l,
  courtyardTransformIn as cti, transferPoint as tp, transferRot as tr,
  localRotToWorld as lr2w, worldRotToLocal as wr2l,
} from "../client/src/scene/world";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log("  ok ", name);
  else {
    failed++;
    console.error("  FAIL", name, detail);
  }
}
function almost(a: number, b: number, eps = 1e-6) {
  return Math.abs(a - b) <= eps;
}
function almost2(p: { x: number; z: number }, x: number, z: number, eps = 1e-6) {
  return almost(p.x, x, eps) && almost(p.z, z, eps);
}

console.log("door poses");
const mainDoor = dp(MAIN_HALL);
check("main hall door is the identity", mainDoor.x === 0 && mainDoor.z === 0 && mainDoor.inwardYaw === 0);
check("main courtyard transform is identity", (() => {
  const t = cti("main");
  return t.x === 0 && t.z === 0 && t.rotY === 0;
})());
check("courtyard transform is identity", cti("courtyard").x === 0 && cti("courtyard").rotY === 0);

console.log("round trips");
for (const h of [MAIN_HALL, ...SIDE_HALLS]) {
  const samples: [number, number][] = [[0, 0], [1.5, 2.5], [-2, 0.3], [0, 8], [3, -1]];
  let ok = true;
  let detail = "";
  for (const [x, z] of samples) {
    const w = l2w(h.id, x, z);
    const back = w2l(h.id, w.x, w.z);
    if (!almost(back.x, x) || !almost(back.z, z)) {
      ok = false;
      detail = `local(${x},${z}) -> world(${w.x.toFixed(3)},${w.z.toFixed(3)}) -> (${back.x.toFixed(3)},${back.z.toFixed(3)})`;
      break;
    }
    const rot = 0.7;
    const wr = lr2w(h.id, rot);
    if (!almost(wr2l(h.id, wr), rot)) { ok = false; detail = "rot"; break; }
  }
  check(`${h.name} local↔world round-trips`, ok, detail);
}

console.log("door alignment");
for (const h of [MAIN_HALL, ...SIDE_HALLS]) {
  const d = dp(h);
  const localOrigin = l2w(h.id, 0, 0);
  check(`${h.name} local origin is the door`, almost2(localOrigin, d.x, d.z), `${localOrigin.x},${localOrigin.z} vs ${d.x},${d.z}`);
  // 1m inward (local +Z) should go against the façade facing.
  const inward = l2w(h.id, 0, 1);
  const fx = Math.sin(h.rotY), fz = Math.cos(h.rotY);
  // Façade facing is toward the courtyard; inward is the opposite.
  const expectX = d.x - fx;
  const expectZ = d.z - fz;
  check(`${h.name} +Z is into the building`, almost2(inward, expectX, expectZ, 1e-6),
    `got ${inward.x.toFixed(3)},${inward.z.toFixed(3)} want ${expectX.toFixed(3)},${expectZ.toFixed(3)}`);
}

console.log("courtyard group transform maps door to origin");
for (const h of SIDE_HALLS) {
  const d = dp(h);
  const t = cti(h.id);
  // p' = R(t.rotY) * p + t  should send the door to (0,0)
  const c = Math.cos(t.rotY), s = Math.sin(t.rotY);
  const px = d.x * c + d.z * s + t.x;
  const pz = -d.x * s + d.z * c + t.z;
  check(`${h.name} door → local origin via courtyard transform`, almost(px, 0) && almost(pz, 0), `${px},${pz}`);
  // A point 2m in front of the door (courtyard side) should land at local (0, -2)
  const front = { x: d.x + Math.sin(h.rotY) * 2, z: d.z + Math.cos(h.rotY) * 2 };
  const qx = front.x * c + front.z * s + t.x;
  const qz = -front.x * s + front.z * c + t.z;
  check(`${h.name} 2m in front → (0,-2)`, almost(qx, 0, 1e-6) && almost(qz, -2, 1e-6), `${qx.toFixed(3)},${qz.toFixed(3)}`);
}

console.log("crossing continuity (frame transfer)");
// Main hall is identity: a courtyard point is unchanged.
const a = tp("courtyard", "main", 1.2, 2, -0.1);
check("main crossing keeps the same coordinates", almost(a.x, 1.2) && almost(a.y, 2) && almost(a.z, -0.1));
check("main crossing keeps facing", almost(tr("courtyard", "main", 0.3), 0.3));

const guan = hallById("guanyin")!;
const dG = dp(guan);
// Stand at the 观音 door facing inward, then transfer to interior: should be origin facing +Z.
const atDoor = tp("courtyard", "guanyin", dG.x, 1.15, dG.z);
check("观音 door maps to local origin", almost(atDoor.x, 0, 1e-6) && almost(atDoor.z, 0, 1e-6), `${atDoor.x},${atDoor.z}`);
const faceIn = tr("courtyard", "guanyin", dG.inwardYaw);
check("观音 inward facing becomes rotY=0", almost(((faceIn + Math.PI * 3) % (Math.PI * 2)) - Math.PI, 0, 1e-6) || almost(faceIn, 0, 1e-6), `rot=${faceIn}`);

// Round-trip transfer is identity
for (const h of SIDE_HALLS) {
  const p = tp(h.id, "courtyard", 1, 2, 3);
  const back = tp("courtyard", h.id, p.x, p.y, p.z);
  check(`${h.name} transfer round-trip`, almost(back.x, 1) && almost(back.y, 2) && almost(back.z, 3), `${back.x},${back.z}`);
}

console.log("walkable at the threshold");
const mid = clampToWalkable(0, 0.2, "courtyard");
check("courtyard opening allows z=0.2", almost(mid.x, 0, 0.05) && almost(mid.z, 0.2, 0.05), `${mid.x},${mid.z}`);
const midI = clampToWalkable(0, 0.2, "main");
check("main interior allows z=0.2", almost(midI.x, 0, 0.05) && almost(midI.z, 0.2, 0.05), `${midI.x},${midI.z}`);
check("threshold is a courtyard door hit", courtyardDoorHit(0, 0.1)?.id === "main");
check("threshold is an interior exit hit", interiorExitHit(0, 0.1, "main"));
check("hysteresis: 0.5m inside is not an exit", !interiorExitHit(0, 0.5, "main"));

console.log("done");
if (failed) {
  console.error(`FAILED ${failed} check(s)`);
  process.exit(1);
}
console.log("all world checks passed");
