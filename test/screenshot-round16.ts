/**
 * Round 16 previews: looking out a hall door at the sunny courtyard,
 * looking into a hall from the yard, and a mid-crossing frame.
 * Run: JINGXIN_URL=http://localhost:PORT npx tsx test/screenshot-round16.ts
 */
import { chromium, type Page } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import { mkdir } from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "screenshots");
const BASE = process.env.JINGXIN_URL || "http://localhost:2567";

interface Jx {
  freezeCam: (x: number, y: number, z: number, lx: number, ly: number, lz: number) => void;
  unfreezeCam: () => void;
  teleport: (x: number, z: number, rotY?: number) => void;
  holdWalk?: (key: string | false) => void;
  joinHall: (id: string) => Promise<void>;
  hallId: () => string;
  hallCached?: (id: string) => boolean;
  statuesReady: () => Promise<void>;
  playerPose?: () => { x: number; z: number; rotY: number };
}

async function ready(page: Page) {
  await page.waitForFunction(() => typeof (window as unknown as Jx).freezeCam === "function", { timeout: 30000 });
  await page.waitForTimeout(400);
  await page.evaluate(`(async () => {
    const w = window;
    if (w.statuesReady) await Promise.race([w.statuesReady(), new Promise((r) => setTimeout(r, 8000))]);
  })()`);
}

async function shot(page: Page, name: string) {
  const dest = path.join(OUT, name);
  await page.screenshot({ path: dest, type: "png" });
  console.log("wrote", dest);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome-stable",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(50000);
  page.on("pageerror", (err) => console.warn("pageerror", err.message));
  await page.goto(`${BASE}/?auto=1&name=通门僧${Date.now() % 10000}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const el = document.getElementById("game");
    return !!el && !el.hasAttribute("hidden") && !el.hidden;
  }, { timeout: 40000 });
  await ready(page);
  const version = await page.evaluate(() => document.documentElement.dataset.version || "");
  console.log("version", version, "hall", await page.evaluate(() => (window as unknown as Jx).hallId()));

  // Warm the main hall so looking in/out uses the real interior.
  await page.waitForFunction(() => {
    const w = window as unknown as Jx;
    return typeof w.hallCached === "function" && w.hallCached("main");
  }, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(600);

  // 1. Courtyard looking into the open main-hall door (lit nave, not black).
  await page.evaluate(`(() => {
    const w = window;
    w.teleport(0, -6.5, 0);
    w.freezeCam(0, 2.15, -7.4, 0, 2.4, 12);
  })()`);
  await page.waitForTimeout(700);
  await shot(page, "round16-courtyard-into-main.png");

  // 2. Inside the main hall looking out the door at the sunny courtyard.
  await page.evaluate(`(async () => {
    const w = window;
    await w.joinHall("main");
  })()`);
  await page.waitForFunction(() => (window as unknown as Jx).hallId() === "main", { timeout: 15000 });
  await page.evaluate(`(async () => {
    const w = window;
    if (w.statuesReady) await Promise.race([w.statuesReady(), new Promise((r) => setTimeout(r, 6000))]);
    w.teleport(0, 4.2, Math.PI);
    w.freezeCam(0, 2.15, 6.4, 0, 1.7, -8);
  })()`);
  await page.waitForTimeout(800);
  await shot(page, "round16-main-looking-out.png");

  // 3. Mid-crossing: standing on the threshold, camera seeing both sides.
  await page.evaluate(`(() => {
    const w = window;
    w.teleport(0, 0.4, Math.PI);
    w.freezeCam(5.6, 2.3, 0.4, 0, 1.6, 0.2);
  })()`);
  await page.waitForTimeout(600);
  await shot(page, "round16-mid-crossing.png");

  // 4. Inside 观音殿 looking out.
  await page.evaluate(`(async () => {
    const w = window;
    await w.joinHall("guanyin");
  })()`);
  await page.waitForFunction(() => (window as unknown as Jx).hallId() === "guanyin", { timeout: 15000 });
  await page.evaluate(`(async () => {
    const w = window;
    if (w.statuesReady) await Promise.race([w.statuesReady(), new Promise((r) => setTimeout(r, 6000))]);
    w.teleport(0, 3.8, Math.PI);
    w.freezeCam(0, 2.0, 6.0, 0, 1.6, -8);
  })()`);
  await page.waitForTimeout(800);
  await shot(page, "round16-guanyin-looking-out.png");

  // 5. A short walk-through sequence from just outside the main door.
  await page.evaluate(`(async () => {
    const w = window;
    await w.joinHall("courtyard");
  })()`);
  await page.waitForFunction(() => (window as unknown as Jx).hallId() === "courtyard", { timeout: 15000 });
  await page.evaluate(`(() => {
    const w = window;
    w.unfreezeCam();
    w.teleport(0, -3.2, 0);
  })()`);
  await page.waitForTimeout(300);
  // Hold W and grab a few frames as we cross.
  await page.evaluate(`(() => { const w = window; if (w.holdWalk) w.holdWalk("w"); })()`);
  for (const name of [
    "round16-walk-01-approach.png",
    "round16-walk-02-threshold.png",
    "round16-walk-03-inside.png",
  ]) {
    await page.waitForTimeout(450);
    await shot(page, name);
  }
  await page.evaluate(`(() => { const w = window; if (w.holdWalk) w.holdWalk(false); })()`);

  const finalHall = await page.evaluate(() => (window as unknown as Jx).hallId());
  const pose = await page.evaluate(() => (window as unknown as Jx).playerPose?.());
  console.log("final", { hall: finalHall, pose, version });
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
