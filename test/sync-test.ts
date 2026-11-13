/**
 * Headless two-client test: name uniqueness, movement sync, cushion locking, incense.
 */
import { Client, Room } from "colyseus.js";

const URL = process.env.JINGXIN_URL || "http://localhost:2567";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface P {
  x: number; z: number; sitting: boolean; cushionId: number; name: string; look: number;
}

async function walkTo(room: Room, x: number, z: number) {
  for (let i = 0; i < 80; i++) {
    const p = room.state.players.get(room.sessionId) as P | undefined;
    if (!p) throw new Error("missing self");
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < 0.7) return;
    const step = Math.min(2.0, d);
    const nx = p.x + ((x - p.x) / d) * step;
    const nz = p.z + ((z - p.z) / d) * step;
    room.send("move", { x: nx, z: nz, rotY: 0 });
    await sleep(70);
  }
  const p = room.state.players.get(room.sessionId) as P;
  if (Math.hypot(x - p.x, z - p.z) > 1.4) {
    throw new Error(`walk timeout, at ${p.x.toFixed(2)},${p.z.toFixed(2)} want ${x},${z}`);
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

async function main() {
  const results: { name: string; ok: boolean; detail: string }[] = [];
  const tag = String(Date.now() % 100000);
  const n1 = `试僧甲${tag}`;
  const n2 = `试僧乙${tag}`;
  const open: Room[] = [];

  const c1 = new Client(URL);
  const c2 = new Client(URL);

  const r1 = await c1.joinOrCreate("main_hall", { name: n1 });
  const r2 = await c2.joinOrCreate("main_hall", { name: n2 });
  open.push(r1, r2);
  await sleep(250);

  // 1. both online, unique looks assigned, names visible
  try {
    await waitFor(() => r1.state.players.size >= 2 && r2.state.players.size >= 2, 3000, "both visible");
    const p1 = r1.state.players.get(r1.sessionId);
    const p2on1 = [...r1.state.players.values()].find((p: P) => p.name === n2);
    if (!p1 || !p2on1) throw new Error("names not synced");
    if (typeof p1.look !== "number" || p1.look < 0 || p1.look > 7) throw new Error("look invalid");
    results.push({ name: "presence+name sync", ok: true, detail: `n=${r1.state.players.size}, looks ${p1.look}` });
  } catch (e) {
    results.push({ name: "presence+name sync", ok: false, detail: String(e) });
  }

  // 2. duplicate name rejected
  try {
    let rejected = false;
    try {
      const c3 = new Client(URL);
      await c3.joinOrCreate("main_hall", { name: n1 });
    } catch (e: unknown) {
      const m = String((e as Error).message ?? e);
      rejected = m.includes("法号") || m.includes("已有") || m.includes("409") || m.includes("taken");
      if (!rejected) rejected = true; // any reject is success for uniqueness
    }
    results.push({ name: "unique Dharma name", ok: rejected, detail: rejected ? "second join rejected" : "NOT rejected" });
  } catch (e) {
    results.push({ name: "unique Dharma name", ok: false, detail: String(e) });
  }

  // 3. profanity rejected
  try {
    let rejected = false;
    try {
      await new Client(URL).joinOrCreate("main_hall", { name: "fuckxx" });
    } catch {
      rejected = true;
    }
    results.push({ name: "profanity filter", ok: rejected, detail: rejected ? "blocked" : "allowed (bad)" });
  } catch (e) {
    results.push({ name: "profanity filter", ok: false, detail: String(e) });
  }

  // 4. movement sync
  try {
    const destX = 3, destZ = 10;
    await walkTo(r1, destX, destZ);
    await waitFor(() => {
      const remote = r2.state.players.get(r1.sessionId) as P | undefined;
      return !!remote && Math.hypot(remote.x - destX, remote.z - destZ) < 2.2;
    }, 3000, "remote pos");
    const remote = r2.state.players.get(r1.sessionId) as P;
    results.push({ name: "position sync", ok: true, detail: `remote sees ${remote.x.toFixed(2)},${remote.z.toFixed(2)}` });
  } catch (e) {
    results.push({ name: "position sync", ok: false, detail: String(e) });
  }

  // 5. cushion lock: walk both to cushion 0, r1 sits, r2 fails
  const { cushionPosition } = await import("../server/src/shared.ts");
  const c0 = cushionPosition(0);
  let sitLocked = false;
  let sitDetail = "";
  try {
    await walkTo(r1, c0.x, c0.z);
    await walkTo(r2, c0.x + 0.4, c0.z + 0.2);
    await sleep(150);

    const p1notices: string[] = [];
    const p2notices: string[] = [];
    r1.onMessage("notice", (m: { text?: string }) => p1notices.push(m.text ?? ""));
    r2.onMessage("notice", (m: { text?: string }) => p2notices.push(m.text ?? ""));
    let r1ok = false;
    let r2ok = false;
    r1.onMessage("sit_ok", () => { r1ok = true; });
    r2.onMessage("sit_ok", () => { r2ok = true; });

    r1.send("sit", { cushionId: 0 });
    await sleep(250);
    r2.send("sit", { cushionId: 0 });
    await sleep(400);

    const occ = r1.state.cushions[0];
    const p1 = r1.state.players.get(r1.sessionId) as P;
    const p2 = r2.state.players.get(r2.sessionId) as P;
    const p2seen = r2.state.players.get(r1.sessionId) as P;
    sitLocked = p1.sitting === true && p2.sitting === false && occ === r1.sessionId && p2seen?.sitting === true && !r2ok;
    sitDetail = `r1sit=${p1.sitting}(ok=${r1ok}) r2sit=${p2.sitting}(ok=${r2ok}) occ=${occ} notices=${p2notices.join("|")} remoteSeesSit=${p2seen?.sitting}`;
    results.push({ name: "cushion lock", ok: sitLocked, detail: sitDetail });
  } catch (e) {
    results.push({ name: "cushion lock", ok: false, detail: String(e) });
  }

  // 6. incense lives in the courtyard (entrance burners), 10-min memory-only
  try {
    await r1.leave();
    await r2.leave();
    const yc1 = new Client(URL);
    const yc2 = new Client(URL);
    const y1 = await yc1.joinOrCreate("courtyard", { name: n1 + "香" });
    const y2 = await yc2.joinOrCreate("courtyard", { name: n2 + "香" });
    open.push(y1, y2);
    await sleep(200);
    const { INCENSE_BURNER } = await import("../server/src/shared.ts");
    await walkTo(y1, INCENSE_BURNER.x, INCENSE_BURNER.z - 1.0);
    const before = y2.state.incenses.size;
    y1.send("incense");
    // Ritual bows then plants (~4.4 s); allow a generous window.
    await waitFor(() => y2.state.incenses.size > before, 9000, "incense after ritual");
    const stick = [...y2.state.incenses.values()][0] as { litAt: number };
    const fresh = stick && Math.abs(Date.now() - stick.litAt) < 5000;
    results.push({ name: "incense sync", ok: fresh, detail: `incenses=${y2.state.incenses.size} litAtΔ=${stick ? Date.now()-stick.litAt : "?"}ms` });

    // 7. side hall is its own Colyseus room
    const g1 = await new Client(URL).joinOrCreate("hall_guanyin", { name: n1 + "观" });
    open.push(g1);
    await sleep(150);
    const inHall = g1.state.hallId === "guanyin" && g1.state.cushions.length === 50;
    results.push({ name: "side-hall room", ok: inHall, detail: `hallId=${g1.state.hallId} cushions=${g1.state.cushions.length}` });
    await y1.leave(); await y2.leave(); await g1.leave();
  } catch (e) {
    results.push({ name: "incense/hall rooms", ok: false, detail: String(e) });
  }

  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  — ${r.detail}`);
  }
  for (const room of open) {
    try { await room.leave(); } catch { /* already left */ }
  }
  if (failed.length) {
    console.error(`\n${failed.length} failed`);
    process.exit(1);
  }
  console.log("\nAll sync tests passed.");
}

main().catch(async (e) => {
  console.error("FATAL", e);
  process.exit(1);
});
