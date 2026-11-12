/**
 * Round 11: walk into the main hall and one side hall with WASD,
 * confirm auto-entry, no re-entry bounce, and take screenshots.
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import { mkdir } from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "screenshots");
const BASE = process.env.JINGXIN_URL || "http://localhost:2567";

interface Pose {
  x: number; y: number; z: number; rotY: number; headY: number;
}

interface Jx {
  freezeCam: (x: number, y: number, z: number, lx: number, ly: number, lz: number) => void;
  unfreezeCam: () => void;
  teleport: (x: number, z: number, rotY?: number) => void;
  holdWalk: (key: string | false) => void;
  joinHall: (id: string) => Promise<void>;
  hallId: () => string;
  statuesReady: () => Promise<void>;
  playerPose: () => Pose;
}

async function ready(page: import("playwright").Page) {
  await page.waitForFunction(() => typeof (window as unknown as Jx).freezeCam === "function", { timeout: 25000 });
  await page.waitForTimeout(400);
}

async function pose(page: import("playwright").Page): Promise<Pose> {
  return page.evaluate(() => (window as unknown as Jx).playerPose());
}

async function hallId(page: import("playwright").Page): Promise<string> {
  return page.evaluate(() => (window as unknown as Jx).hallId());
}

async function shot(page: import("playwright").Page, name: string) {
  const dest = path.join(OUT, name);
  await page.screenshot({ path: dest, type: "png" });
  console.log("wrote", dest);
}

async function walkUntilHallNode(
  page: import("playwright").Page,
  dest: string,
  inZoneSrc: string,
  timeoutMs = 20000,
): Promise<{ msFromDoor: number; totalMs: number; pose: Pose }> {
  // Stay inside one page.evaluate so Playwright polling does not starve the
  // game loop. holdWalk writes the same WASD key the player would hold.
  const result = await page.evaluate(async ({ dest, inZoneSrc, timeoutMs }) => {
    const w = window as unknown as Jx;
    const inZone = new Function("pos", "hall", `return (${inZoneSrc})(pos, hall);`) as (p: Pose, hall: string) => boolean;
    w.holdWalk("w");
    const t0 = performance.now();
    let reached = -1;
    try {
      while (performance.now() - t0 < timeoutMs) {
        const p = w.playerPose();
        const h = w.hallId();
        if (reached < 0 && (h === dest || inZone(p, h))) reached = performance.now();
        if (h === dest) {
          return { ok: true, msFromDoor: performance.now() - reached, totalMs: performance.now() - t0, pose: p, hall: h };
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      const pEnd = w.playerPose();
      const hEnd = w.hallId();
      if (hEnd === dest) {
        return { ok: true, msFromDoor: performance.now() - (reached < 0 ? t0 : reached), totalMs: performance.now() - t0, pose: pEnd, hall: hEnd };
      }
      return { ok: false, msFromDoor: -1, totalMs: performance.now() - t0, pose: pEnd, hall: hEnd };
    } finally {
      w.holdWalk(false);
    }
  }, { dest, inZoneSrc, timeoutMs });
  if (!result.ok) {
    throw new Error(`did not reach ${dest} in ${timeoutMs}ms (hall=${result.hall} x=${result.pose.x.toFixed(2)} z=${result.pose.z.toFixed(2)})`);
  }
  return { msFromDoor: result.msFromDoor, totalMs: result.totalMs, pose: result.pose };
}

async function walkOutToCourtyard(page: import("playwright").Page, timeoutMs = 20000) {
  const result = await page.evaluate(async (timeoutMs) => {
    const w = window as unknown as Jx;
    w.holdWalk("s");
    const t0 = performance.now();
    try {
      while (performance.now() - t0 < timeoutMs) {
        if (w.hallId() === "courtyard") return { ok: true, ms: performance.now() - t0, pose: w.playerPose() };
        await new Promise((r) => setTimeout(r, 50));
      }
      return { ok: false, ms: performance.now() - t0, pose: w.playerPose(), hall: w.hallId() };
    } finally {
      w.holdWalk(false);
    }
  }, timeoutMs);
  if (!result.ok) throw new Error(`did not return to courtyard (hall=${(result as { hall?: string }).hall})`);
  return result;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome-stable",
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(40000);
  await page.goto(`${BASE}/?auto=1&name=入殿僧${Date.now() % 10000}`, { waitUntil: "networkidle" });
  await page.waitForSelector("#game:not([hidden])", { timeout: 25000 });
  await ready(page);
  await page.evaluate(async () => {
    await Promise.race([
      (window as unknown as Jx).statuesReady(),
      new Promise((r) => setTimeout(r, 8000)),
    ]);
  });
  await page.waitForTimeout(400);

  // --- Approach the main hall, slightly off-center so the burner is not dead ahead.
  await page.evaluate(() => {
    const w = window as unknown as Jx;
    w.unfreezeCam();
    w.teleport(1.8, -4.8, 0);
  });
  await page.waitForTimeout(300);
  let p = await pose(page);
  await page.evaluate(({ x, z }) => {
    (window as unknown as Jx).freezeCam(x - 0.4, 2.4, z - 3.2, 0, 3.2, 0.4);
  }, p);
  await page.waitForTimeout(350);
  await shot(page, "round11-approaching-door.png");
  await page.evaluate(() => {
    const w = window as unknown as Jx;
    w.unfreezeCam();
    // Step just outside the trigger so the walk-in itself is short.
    w.teleport(1.8, -2.35, 0);
  });
  await page.waitForTimeout(150);

  const mainEnter = await walkUntilHallNode(page, "main", " (pos, hall) => hall === 'main' || (pos.z > -1.8 && Math.abs(pos.x) < 3.8) ");
  console.log(`main hall entry: ${mainEnter.msFromDoor}ms after reaching the door (walk ${mainEnter.totalMs}ms)`);
  if (mainEnter.msFromDoor > 1500) {
    console.warn(`note: main hall entry took ${Math.round(mainEnter.msFromDoor)}ms on this box (fade is 300ms; hall rebuild is the rest)`);
  }
  await page.waitForTimeout(500);
  p = await pose(page);
  await page.evaluate(({ x, z }) => {
    (window as unknown as Jx).freezeCam(x, 2.4, z - 3.4, 0, 3.6, 10);
  }, p);
  await page.waitForTimeout(400);
  await shot(page, "round11-inside-hall.png");
  await page.evaluate(() => (window as unknown as Jx).unfreezeCam());

  // Leave by walking back toward the door (spawn faces +Z, door is −Z).
  const leftMain = await walkOutToCourtyard(page);
  console.log(`left main hall to courtyard at x=${leftMain.pose.x.toFixed(2)} z=${leftMain.pose.z.toFixed(2)} (${Math.round(leftMain.ms)}ms)`);
  await page.waitForTimeout(1500);
  const stillCourt = await hallId(page);
  if (stillCourt !== "courtyard") throw new Error(`bounced back into ${stillCourt} after leaving`);
  console.log("no bounce after leaving main hall");

  // --- 观音殿 (west row). Approach from the courtyard, facing −X.
  await page.evaluate(() => {
    (window as unknown as Jx).teleport(-15.3, -8.7, -Math.PI / 2);
  });
  await page.waitForTimeout(300);
  const startHall = await hallId(page);
  if (startHall !== "courtyard") throw new Error(`expected courtyard before 观音, got ${startHall}`);
  const guanEnter = await walkUntilHallNode(
    page,
    "guanyin",
    " (pos, hall) => hall === 'guanyin' || (pos.x < -15.75 && pos.x > -17.7 && Math.abs(pos.z + 10) < 1.5) ",
  );
  console.log(`观音殿 entry: ${guanEnter.msFromDoor}ms after reaching the door (walk ${guanEnter.totalMs}ms)`);
  if (guanEnter.msFromDoor > 1500) {
    console.warn(`note: 观音殿 entry took ${Math.round(guanEnter.msFromDoor)}ms on this box (fade is 300ms; hall rebuild is the rest)`);
  }
  await walkOutToCourtyard(page);
  await page.waitForTimeout(1500);
  if (await hallId(page) !== "courtyard") throw new Error("bounced back into 观音殿 after leaving");
  console.log("no bounce after leaving 观音殿");

  await browser.close();
  console.log("round 11 door walkthrough OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
