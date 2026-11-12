/**
 * Door-trigger / spawn / collision unit checks for round 11.
 * Run: npx tsx test/door-test.ts
 */
import {
  MAIN_HALL, SIDE_HALLS, hallById, hallFrontDistance, PLAYER_RADIUS,
  courtyardDoorHit, interiorExitHit, courtyardSpawnFrom, interiorSpawn,
  clampToWalkable,
} from "../server/src/shared";
import { resolveMove } from "../client/src/scene/hall";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log("  ok ", name);
  else {
    failed++;
    console.error("  FAIL", name, detail);
  }
}

function almost(a: number, b: number, eps = 0.08) {
  return Math.abs(a - b) <= eps;
}

console.log("door geometry");

check("main steps are a door trigger", courtyardDoorHit(0, -1.0)?.id === "main");
check("main mid-courtyard is not a trigger", courtyardDoorHit(0, -8) === undefined);
check("main at burner front is not a trigger", courtyardDoorHit(0, -2.4) === undefined);
check("main opening is walkable up to the steps", (() => {
  const c = clampToWalkable(0, -1.0, "courtyard");
  return almost(c.x, 0) && almost(c.z, -1.0);
})());

const guanyin = hallById("guanyin")!;
const frontG = hallFrontDistance(guanyin);
// Façade is at forward=frontG; a point 1 unit in front of it should trigger.
const fx = Math.sin(guanyin.rotY), fz = Math.cos(guanyin.rotY);
const approach = {
  x: guanyin.x + fx * (frontG + 1.0),
  z: guanyin.z + fz * (frontG + 1.0),
};
check("观音殿 approach triggers", courtyardDoorHit(approach.x, approach.z)?.id === "guanyin");


const spawnC = courtyardSpawnFrom(MAIN_HALL);
check("main return spawn faces the yard", almost(spawnC.rotY, Math.PI, 0.01));
check("main return spawn is outside the trigger", courtyardDoorHit(spawnC.x, spawnC.z) === undefined);
check("main return spawn is in front of the burner", spawnC.z < -3.2);

for (const h of SIDE_HALLS) {
  const s = courtyardSpawnFrom(h);
  const hit = courtyardDoorHit(s.x, s.z);
  check(`${h.name} return spawn is outside its trigger`, hit === undefined, hit ? `hit ${hit.id} at ${s.x.toFixed(2)},${s.z.toFixed(2)}` : "");
}

const inside = interiorSpawn("main");
check("interior spawn is past the exit trigger", !interiorExitHit(inside.x, inside.z, "main"));
check("walking to the interior door exits", interiorExitHit(0, 0.5, "main"));
check("far from the interior door does not exit", !interiorExitHit(0, 6, "main"));

console.log("collision slide");
const burner = { x: 0, z: -2.0, r: 0.85 };
let x = 0, z = -6;
const speed = 4.3, dt = 1 / 60;
let steps = 0;
let gotAround = false;
for (; steps < 240; steps++) {
  const rawZ = z + speed * dt;
  const r = resolveMove(x, z, x, rawZ, [burner], PLAYER_RADIUS);
  const c = clampToWalkable(r.x, r.z, "courtyard");
  x = c.x; z = c.z;
  if (z > -1.55 && Math.abs(x) < 3.8) { gotAround = true; break; }
}
check(`walking +Z from (0,-6) clears the burner and reaches the door in ${steps} frames`, gotAround && steps < 180, `x=${x.toFixed(2)} z=${z.toFixed(2)} steps=${steps}`);

console.log("done");
if (failed) {
  console.error(`FAILED ${failed} check(s)`);
  process.exit(1);
}
console.log("all door checks passed");
