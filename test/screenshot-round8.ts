/**
 * Round 8 screenshots: open hall fronts, empty main hall, side-hall door.
 */
import { chromium } from "playwright";
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
  joinHall: (id: string) => Promise<void>;
  hallId: () => string;
  statuesReady: () => Promise<void>;
}

async function ready(page: import("playwright").Page) {
  await page.waitForFunction(() => typeof (window as unknown as Jx).freezeCam === "function", { timeout: 25000 });
  await page.waitForTimeout(500);
}

async function freezeCam(page: import("playwright").Page, x: number, y: number, z: number, lx: number, ly: number, lz: number) {
  await page.evaluate(({ x, y, z, lx, ly, lz }) => {
    (window as unknown as Jx).freezeCam(x, y, z, lx, ly, lz);
  }, { x, y, z, lx, ly, lz });
  await page.waitForTimeout(400);
}

async function shot(page: import("playwright").Page, name: string) {
  const dest = path.join(OUT, name);
  await page.screenshot({ path: dest, type: "png" });
  console.log("wrote", dest);
}

async function joinHall(page: import("playwright").Page, id: string) {
  await page.evaluate(async (id) => {
    await (window as unknown as Jx).joinHall(id);
  }, id);
  await page.evaluate(async () => {
    await Promise.race([
      (window as unknown as Jx).statuesReady(),
      new Promise((r) => setTimeout(r, 8000)),
    ]);
  });
  await page.waitForTimeout(500);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome-stable",
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(40000);
  await page.goto(`${BASE}/?auto=1&name=拍摄僧${Date.now() % 10000}`, { waitUntil: "networkidle" });
  await page.waitForSelector("#game:not([hidden])", { timeout: 25000 });
  await ready(page);
  await page.evaluate(async () => {
    await Promise.race([
      (window as unknown as Jx).statuesReady(),
      new Promise((r) => setTimeout(r, 8000)),
    ]);
  });
  await page.waitForTimeout(800);

  // Courtyard: look through the open 大雄宝殿 doors at the gilt statue.
  await page.evaluate(() => (window as unknown as Jx).teleport(0, -8, 0));
  await freezeCam(page, 0, 3.15, -9.2, 0, 3.4, 6.5);
  await shot(page, "round8-courtyard-doors.png");

  // Side hall (观音殿, west row) — open lattice doors, deity visible inside.
  await page.evaluate(() => (window as unknown as Jx).teleport(-14, -10, Math.PI / 2));
  await freezeCam(page, -11.5, 2.35, -10, -19.6, 2.6, -10);
  await shot(page, "round8-side-hall-door.png");

  // Main hall interior: only the local player, empty cushions.
  await joinHall(page, "main");
  await page.evaluate(() => (window as unknown as Jx).teleport(6.5, 8.5, -0.9));
  await freezeCam(page, 7.4, 3.6, 7.2, 0, 2.2, 14);
  await shot(page, "round8-main-hall-empty.png");

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
