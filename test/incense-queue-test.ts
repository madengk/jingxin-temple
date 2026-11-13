/**
 * Incense-queue geometry plus a multi-client Colyseus test:
 * ordering, advance on leave, disconnect removal, ritual plant.
 * Run: JINGXIN_URL=http://localhost:PORT npx tsx test/incense-queue-test.ts
 */
import { Client, Room } from "colyseus.js";
import {
  BURNERS, MAIN_HALL, SIDE_HALLS, OFFER_DISTANCE, QUEUE_SLOT_SPACING,
  courtyardDoorHit, queueSlotPose, ritualDoneAtMs, ritualPhaseAt, ritualPlantAtMs,
  RITUAL_PHASE, BUILD_VERSION,
} from "../server/src/shared";

const URL = process.env.JINGXIN_URL || "http://localhost:2567";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log("  ok ", name);
  else {
    failed++;
    console.error("  FAIL", name, detail);
  }
}

async function waitFor(pred: () => boolean, ms = 4000, label = "condition") {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (pred()) return;
    await sleep(50);
  }
  throw new Error(`timeout waiting for ${label}`);
}

async function walkTo(room: Room, x: number, z: number) {
  for (let i = 0; i < 80; i++) {
    const p = room.state.players.get(room.sessionId) as { x: number; z: number } | undefined;
    if (!p) throw new Error("missing self");
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < 0.7) return;
    const step = Math.min(2.0, d);
    room.send("move", { x: p.x + ((x - p.x) / d) * step, z: p.z + ((z - p.z) / d) * step, rotY: 0 });
    await sleep(70);
  }
  const p = room.state.players.get(room.sessionId) as { x: number; z: number };
  if (Math.hypot(x - p.x, z - p.z) > 1.4) {
    throw new Error(`walk timeout, at ${p.x.toFixed(2)},${p.z.toFixed(2)} want ${x},${z}`);
  }
}

function lineupOf(room: Room, burnerId: string): string[] {
  const q = room.state.queues?.get(burnerId);
  return q ? [...q.lineup] : [];
}

console.log("queue geometry");

const mainBurner = BURNERS.find((b) => b.hallId === "main")!;
check("main burner exists", !!mainBurner, `at ${mainBurner?.x},${mainBurner?.z}`);
const s0 = queueSlotPose(mainBurner, 0);
const s1 = queueSlotPose(mainBurner, 1);
const s2 = queueSlotPose(mainBurner, 2);
check("main offering spot is in the courtyard, south of the burner", s0.z < mainBurner.z - 1.0, `s0.z=${s0.z.toFixed(2)} burner.z=${mainBurner.z.toFixed(2)}`);
check("main slots form a column along −Z", Math.abs(s0.x) < 0.05 && Math.abs(s1.x) < 0.05 && Math.abs(s2.x) < 0.05 && s2.z < s1.z && s1.z < s0.z);
check("main slot spacing", Math.abs(Math.hypot(s1.x - s0.x, s1.z - s0.z) - QUEUE_SLOT_SPACING) < 0.02);
check("main offering distance", Math.abs(Math.hypot(s0.x - mainBurner.x, s0.z - mainBurner.z) - OFFER_DISTANCE) < 0.02);
check("main lineup is outside the door trigger", !courtyardDoorHit(s0.x, s0.z) && !courtyardDoorHit(s1.x, s1.z) && !courtyardDoorHit(s2.x, s2.z));
check("main offering faces the hall (+Z)", Math.abs(s0.rotY) < 0.05 || Math.abs(s0.rotY - Math.PI * 2) < 0.05, `rotY=${s0.rotY}`);

for (const h of SIDE_HALLS) {
  const b = BURNERS.find((x) => x.hallId === h.id)!;
  const a = queueSlotPose(b, 0);
  const c = queueSlotPose(b, 2);
  const hit0 = courtyardDoorHit(a.x, a.z);
  const hit2 = courtyardDoorHit(c.x, c.z);
  // Column extends into the courtyard (away from the hall centre).
  const d0 = Math.hypot(a.x - h.x, a.z - h.z);
  const d2 = Math.hypot(c.x - h.x, c.z - h.z);
  check(`${h.name} lineup is outside its door`, hit0 === undefined && hit2 === undefined, hit0 || hit2 ? `hit ${(hit0 ?? hit2)!.id}` : "");
  check(`${h.name} column points away from the hall`, d2 > d0 + 1.5, `d0=${d0.toFixed(2)} d2=${d2.toFixed(2)}`);
}

console.log("ritual timing");
check("three bows then plant then done", ritualPhaseAt(0) === RITUAL_PHASE.RAISE);
check("mid first bow", ritualPhaseAt(500 + 400) === RITUAL_PHASE.BOW1);
check("mid third bow", ritualPhaseAt(500 + 900 + 900 + 400) === RITUAL_PHASE.BOW3);
check("plant phase", ritualPhaseAt(ritualPlantAtMs() - 10) === RITUAL_PHASE.PLANT);
check("done after plant", ritualPhaseAt(ritualDoneAtMs() - 10) === RITUAL_PHASE.DONE);
check("total ritual is 5–7 seconds", ritualDoneAtMs() >= 4000 && ritualDoneAtMs() <= 7000, `doneAt=${ritualDoneAtMs()}`);
check("build version matches the planned id", BUILD_VERSION === "round16-seamless-doors-20261113");

async function runLive() {
  console.log(`live queue @ ${URL}`);
  // Version endpoint + no-cache headers.
  const ver = await fetch(`${URL}/version`, { cache: "no-store" });
  const vj = await ver.json() as { version?: string; ok?: boolean };
  check("GET /version returns the build id", ver.ok && vj.version === BUILD_VERSION, JSON.stringify(vj));
  const cc = ver.headers.get("cache-control") || "";
  check("GET /version is no-cache", /no-store|no-cache/i.test(cc), cc);
  const home = await fetch(`${URL}/`, { cache: "no-store" });
  const html = await home.text();
  const hcc = home.headers.get("cache-control") || "";
  check("index.html is no-cache", /no-store|no-cache/i.test(hcc), hcc);
  check("index.html data-version matches", html.includes(`data-version="${BUILD_VERSION}"`));

  const tag = String(Date.now() % 100000);
  const names = [`香甲${tag}`, `香乙${tag}`, `香丙${tag}`];
  const open: Room[] = [];
  const clients = [new Client(URL), new Client(URL), new Client(URL)];
  // Spawn near the main burner, just on the courtyard side, so join is in range.
  const near = { x: 0, z: mainBurner.z - 2.0 };
  const rooms: Room[] = [];
  for (let i = 0; i < 3; i++) {
    const r = await clients[i].joinOrCreate("courtyard", { name: names[i], x: near.x + (i - 1) * 0.8, z: near.z });
    ignoreUnknownMessages(r);
    rooms.push(r);
    open.push(r);
  }
  await sleep(250);
  check("hello carries build version", rooms[0].state.buildVersion === BUILD_VERSION, `bv=${rooms[0].state.buildVersion}`);

  // Walk each a little closer, then join WITHOUT auto-starting the ritual.
  for (const r of rooms) {
    const p = r.state.players.get(r.sessionId) as { x: number; z: number };
    await walkTo(r, p.x, mainBurner.z - 1.6);
    r.send("queue_join", { burnerId: mainBurner.id });
    await sleep(180);
  }
  await waitFor(() => lineupOf(rooms[0], mainBurner.id).length === 3, 4000, "3 in lineup");

  const line = lineupOf(rooms[0], mainBurner.id);
  const orderOk = line[0] === rooms[0].sessionId && line[1] === rooms[1].sessionId && line[2] === rooms[2].sessionId;
  check("join order is preserved (甲乙丙)", orderOk, `line=${line.join(",")}`);

  // Positions: a single-file column, one at the offering spot.
  const poses = rooms.map((r) => r.state.players.get(r.sessionId) as { x: number; z: number; queueSlot: number; queueBurner: string; rotY: number });
  check("slots are 0,1,2", poses[0].queueSlot === 0 && poses[1].queueSlot === 1 && poses[2].queueSlot === 2, poses.map((p) => p.queueSlot).join(","));
  check("all share the main burner queue", poses.every((p) => p.queueBurner === mainBurner.id));
  const want = [s0, s1, s2];
  let atSlots = true;
  for (let i = 0; i < 3; i++) {
    const d = Math.hypot(poses[i].x - want[i].x, poses[i].z - want[i].z);
    if (d > 0.35) atSlots = false;
  }
  check("server placed them on the column", atSlots, poses.map((p) => `${p.x.toFixed(2)},${p.z.toFixed(2)}`).join(" | "));
  // Only one at the offering spot.
  const atFront = poses.filter((p) => Math.hypot(p.x - s0.x, p.z - s0.z) < 0.4).length;
  check("only one monk stands at the offering spot", atFront === 1, `n=${atFront}`);

  // Remote visibility: 乙 sees 甲's slot.
  const aOnB = rooms[1].state.players.get(rooms[0].sessionId) as { queueSlot: number };
  check("queue state is synced to other clients", aOnB?.queueSlot === 0);

  // Disconnect the middle person (乙); 丙 should advance to slot 1, 甲 stays at 0.
  await rooms[1].leave();
  await waitFor(() => {
    const ln = lineupOf(rooms[0], mainBurner.id);
    return ln.length === 2 && ln[0] === rooms[0].sessionId && ln[1] === rooms[2].sessionId;
  }, 4000, "advance after disconnect");
  const after = lineupOf(rooms[0], mainBurner.id);
  const p0 = rooms[0].state.players.get(rooms[0].sessionId) as { queueSlot: number; x: number; z: number };
  const p2 = rooms[2].state.players.get(rooms[2].sessionId) as { queueSlot: number; x: number; z: number };
  check("disconnect removes the leaver and advances the line", after.length === 2 && p0.queueSlot === 0 && p2.queueSlot === 1, `line=${after.length} slots=${p0.queueSlot},${p2.queueSlot}`);
  check("丙 moved up to slot 1", Math.hypot(p2.x - s1.x, p2.z - s1.z) < 0.4, `at ${p2.x.toFixed(2)},${p2.z.toFixed(2)} want ${s1.x.toFixed(2)},${s1.z.toFixed(2)}`);

  // 甲 starts the ritual; 丙 stays in line; a stick appears after the plant; 甲 is then dequeued.
  const before = rooms[2].state.incenses.size;
  rooms[0].send("incense", { burnerId: mainBurner.id });
  await waitFor(() => {
    const p = rooms[0].state.players.get(rooms[0].sessionId) as { ritualPhase?: number } | undefined;
    return (p?.ritualPhase ?? 0) >= RITUAL_PHASE.RAISE;
  }, 3000, "ritual start");
  const mid = rooms[0].state.players.get(rooms[0].sessionId) as { ritualPhase: number };
  const p2still = rooms[2].state.players.get(rooms[2].sessionId) as { queueSlot: number; ritualPhase: number };
  check("甲 is in ritual, 丙 is still waiting", mid.ritualPhase >= 1 && p2still.queueSlot === 1 && p2still.ritualPhase === 0, `phase=${mid.ritualPhase} p2slot=${p2still.queueSlot}`);

  // Only one ritual at a time: 丙 clicking 上香 should not start a second ritual.
  rooms[2].send("incense", { burnerId: mainBurner.id });
  await sleep(300);
  const stillWaiting = (rooms[2].state.players.get(rooms[2].sessionId) as { ritualPhase: number }).ritualPhase === 0;
  check("second monk cannot start a ritual while the front is offering", stillWaiting);

  await waitFor(() => rooms[2].state.incenses.size > before, ritualPlantAtMs() + 2500, "stick after plant");
  check("incense appears in the burner after the ritual plant", rooms[2].state.incenses.size > before, `n=${rooms[2].state.incenses.size}`);

  // After ritual_done, 甲 leaves the queue and 丙 becomes the front.
  await waitFor(() => {
    const ln = lineupOf(rooms[2], mainBurner.id);
    const p = rooms[2].state.players.get(rooms[2].sessionId) as { queueSlot: number };
    return ln.length === 1 && ln[0] === rooms[2].sessionId && p.queueSlot === 0;
  }, ritualDoneAtMs() + 2500, "丙 becomes front");
  const frontNow = rooms[2].state.players.get(rooms[2].sessionId) as { queueSlot: number };
  check("when the front finishes, the next monk advances to the offering spot", frontNow.queueSlot === 0);

  // Voluntary leave: 丙 walks far away.
  for (let i = 0; i < 20; i++) {
    const p = rooms[2].state.players.get(rooms[2].sessionId) as { x: number; z: number };
    rooms[2].send("move", { x: p.x, z: p.z - 2.0, rotY: Math.PI });
    await sleep(70);
  }
  await waitFor(() => lineupOf(rooms[2], mainBurner.id).length === 0, 4000, "walk-away leave");
  const left = (rooms[2].state.players.get(rooms[2].sessionId) as { queueSlot: number }).queueSlot;
  check("walking away removes you from the queue", left < 0 && lineupOf(rooms[2], mainBurner.id).length === 0, `slot=${left}`);

  // Entering a hall without offering incense is still allowed — that's a client
  // door trigger, asserted here as: a fourth player who never joins a queue
  // is not placed on one just by standing near the burner / door.
  const r4 = await new Client(URL).joinOrCreate("courtyard", { name: `路过${tag}`, x: 0, z: -4 });
  ignoreUnknownMessages(r4);
  open.push(r4);
  await sleep(200);
  const passerState = r4.state as { players: Map<string, { queueSlot: number; queueBurner: string }> };
  const passer = passerState.players.get(r4.sessionId)!;
  check("approaching without clicking 上香 does not enqueue", (passer.queueSlot ?? -1) < 0 && !passer.queueBurner);

  for (const r of open) {
    try { await Promise.race([r.leave(), sleep(400)]); } catch { /* already left */ }
  }
}

function ignoreUnknownMessages(room: Room) {
  for (const t of ["hello", "queue_ok", "ritual_start", "ritual_done", "notice"]) {
    room.onMessage(t, () => { /* test does not need these */ });
  }
}

runLive()
  .catch((e) => {
    failed++;
    console.error("  FAIL live suite", e);
  })
  .finally(() => {
    console.log("done");
    if (failed) {
      console.error(`FAILED ${failed} check(s)`);
      process.exit(1);
    }
    console.log("all incense-queue checks passed");
    process.exit(0);
  });
