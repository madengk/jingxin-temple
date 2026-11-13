/**
 * Round 15 previews: incense queue line, mid-bow, planted sticks, update banner.
 * Run: JINGXIN_URL=http://localhost:PORT npx tsx test/screenshot-round15.ts
 */
import { chromium, type Page, type Browser } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import { mkdir } from "fs/promises";
import { BURNERS, queueSlotPose, ritualPlantAtMs, RITUAL_PHASE_MS, RITUAL_PHASE } from "../server/src/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "screenshots");
const BASE = process.env.JINGXIN_URL || "http://localhost:2567";

interface Jx {
  freezeCam: (x: number, y: number, z: number, lx: number, ly: number, lz: number) => void;
  unfreezeCam: () => void;
  teleport: (x: number, z: number, rotY?: number) => void;
  hallId: () => string;
  statuesReady: () => Promise<void>;
  joinIncenseQueue: (burnerId?: string, offer?: boolean) => void;
  startIncenseRitual: () => void;
  incenseQueue: () => { burnerId: string; slot: number; phase: number; ahead: number };
  showUpdateBanner: (show?: boolean) => void;
  suppressRitualEnter: (v?: boolean) => void;
}

const mainBurner = BURNERS.find((b) => b.hallId === "main")!;
const slot = (i: number) => queueSlotPose(mainBurner, i);

async function ready(page: Page) {
  await page.waitForFunction(() => typeof (window as unknown as Jx).freezeCam === "function", { timeout: 25000 });
  await page.waitForTimeout(400);
  await page.evaluate(async () => {
    const w = window as unknown as Jx;
    await Promise.race([w.statuesReady(), new Promise((r) => setTimeout(r, 8000))]);
  });
}

async function enter(browser: Browser, name: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(45000);
  page.on("pageerror", (err) => console.warn("pageerror", name, err.message));
  await page.goto(`${BASE}/?auto=1&name=${encodeURIComponent(name)}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const el = document.getElementById("game");
    return !!el && !el.hasAttribute("hidden") && !el.hidden;
  }, { timeout: 40000 });
  await ready(page);
  return page;
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
  const tag = String(Date.now() % 10000);
  const names = [`香客甲${tag}`, `香客乙${tag}`, `香客丙${tag}`];
  const pages = [
    await enter(browser, names[0]),
    await enter(browser, names[1]),
    await enter(browser, names[2]),
  ];
  const version = await pages[0].evaluate(() => document.documentElement.dataset.version || "");
  console.log("version", version, "hall", await pages[0].evaluate(() => (window as unknown as Jx).hallId()));

  // Stay in the courtyard for ritual shots — do not auto-enter the hall.
  await pages[0].evaluate(() => (window as unknown as Jx).suppressRitualEnter(true));

  for (let i = 0; i < 3; i++) {
    const pose = slot(i);
    await pages[i].evaluate(({ x, z, rotY }) => {
      (window as unknown as Jx).teleport(x, z, rotY);
    }, { x: pose.x, z: pose.z, rotY: pose.rotY });
    await pages[i].waitForTimeout(400);
    await pages[i].evaluate(() => (window as unknown as Jx).joinIncenseQueue("burner_main", false));
    await pages[i].waitForFunction(() => (window as unknown as Jx).incenseQueue().slot >= 0, { timeout: 10000 });
    const q = await pages[i].evaluate(() => (window as unknown as Jx).incenseQueue());
    console.log("joined", i, q);
  }
  await pages[0].waitForTimeout(800);

  // Side view of the single-file line, hall façade behind, burner in front.
  await pages[0].evaluate(() => {
    (window as unknown as Jx).freezeCam(-6.2, 3.4, -7.8, 0.2, 1.05, -3.0);
  });
  await pages[0].waitForTimeout(400);
  await shot(pages[0], "round15-queue-line.png");

  // Closer side camera, then start the ritual and shoot mid first bow.
  await pages[0].evaluate(() => {
    (window as unknown as Jx).freezeCam(-4.4, 2.15, -6.15, 0.15, 0.95, -3.15);
  });
  await pages[0].evaluate(() => (window as unknown as Jx).startIncenseRitual());
  const midAt = RITUAL_PHASE_MS[RITUAL_PHASE.RAISE] + RITUAL_PHASE_MS[RITUAL_PHASE.BOW1] * 0.5;
  await pages[0].waitForTimeout(midAt);
  const midInfo = await pages[0].evaluate(() => {
    const w = window as unknown as Jx;
    return { hall: w.hallId(), q: w.incenseQueue() };
  });
  console.log("mid-bow state", midInfo);
  await shot(pages[0], "round15-mid-bow.png");

  // Planted: wait until the plant phase, same camera a touch closer to the burner.
  const plantWait = ritualPlantAtMs() - midAt + 200;
  await pages[0].waitForTimeout(Math.max(300, plantWait));
  await pages[0].evaluate(() => {
    (window as unknown as Jx).freezeCam(-3.6, 2.05, -5.35, 0.2, 1.05, -2.25);
  });
  await pages[0].waitForTimeout(200);
  const plantInfo = await pages[0].evaluate(() => {
    const w = window as unknown as Jx;
    return { hall: w.hallId(), q: w.incenseQueue() };
  });
  console.log("plant state", plantInfo);
  await shot(pages[0], "round15-incense-planted.png");

  // Update banner over the courtyard, no toast.
  await pages[0].evaluate(() => {
    const w = window as unknown as Jx;
    w.freezeCam(-4.5, 8.5, -24, 2, 6.5, 0);
    const toast = document.getElementById("toast");
    if (toast) { toast.hidden = true; toast.textContent = ""; }
    w.showUpdateBanner(true);
  });
  await pages[0].waitForTimeout(300);
  const banner = await pages[0].evaluate(() => {
    const el = document.getElementById("update-banner");
    const r = el?.getBoundingClientRect();
    return {
      hidden: el?.hidden,
      text: el?.textContent,
      display: el ? getComputedStyle(el).display : null,
      rect: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null,
    };
  });
  console.log("banner", banner);
  await shot(pages[0], "round15-update-banner.png");

  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 2000))]);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
