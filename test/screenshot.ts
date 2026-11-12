/**
 * Preview screenshots. SCREENSHOT_PREFIX=round5 writes screenshots/round5-*.png
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import { mkdir } from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "screenshots");
const PREFIX = process.env.SCREENSHOT_PREFIX || "round6";
const BASE = process.env.JINGXIN_URL || "http://localhost:2567";

const tag = PREFIX ? `${PREFIX}-` : "";

interface Jx {
  freezeCam: (x: number, y: number, z: number, lx: number, ly: number, lz: number) => void;
  unfreezeCam: () => void;
  teleport: (x: number, z: number, rotY?: number) => void;
  joinHall: (id: string) => Promise<void>;
  seedIncense: (n?: number, burnerId?: string) => void;
  hallId: () => string;
  statuesReady: () => Promise<void>;
}

async function ready(page: import("playwright").Page) {
  await page.waitForFunction(() => typeof (window as unknown as Jx).freezeCam === "function", { timeout: 25000 });
  await page.waitForTimeout(700);
}

async function freezeCam(page: import("playwright").Page, x: number, y: number, z: number, lx: number, ly: number, lz: number) {
  await page.evaluate(({ x, y, z, lx, ly, lz }) => {
    (window as unknown as Jx).freezeCam(x, y, z, lx, ly, lz);
  }, { x, y, z, lx, ly, lz });
  await page.waitForTimeout(350);
}

async function shot(page: import("playwright").Page, name: string) {
  const dest = path.join(OUT, `${tag}${name}.png`);
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
  await page.waitForTimeout(600);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(40000);
  await page.goto(`${BASE}/?auto=1&name=拍摄僧${Date.now() % 10000}`, { waitUntil: "networkidle" });
  await page.waitForSelector("#game:not([hidden])", { timeout: 25000 });
  await ready(page);
  // let fonts / murals settle
  await page.waitForTimeout(800);

  // 1. Courtyard — wide, all hall plaques
  await page.evaluate(() => (window as unknown as Jx).teleport(0, -18, 0));
  // Elevated overview: 大雄宝殿 plaque + both side-hall rows
  await freezeCam(page, 0, 12.5, -33.0, 0, 3.2, -6);
  await shot(page, "courtyard-plaques");
  await freezeCam(page, 0, 6.5, -8.0, 0, 8.5, 0.2);
  await shot(page, "courtyard-main-plaque");
  // closer west row plaques
  await freezeCam(page, -8, 4.2, -8, -20, 3.6, -14);
  await shot(page, "courtyard-west-plaques");
  await freezeCam(page, 8, 4.2, -8, 20, 3.6, -14);
  await shot(page, "courtyard-east-plaques");
  await freezeCam(page, 0, 4.0, -28, 0, 3.2, -35);
  await shot(page, "courtyard-south-plaques");

  // 2. Incense — seed many sticks on the main-hall entrance burner, no countdown
  await page.evaluate(() => (window as unknown as Jx).teleport(0, -4.2, 0));
  await page.evaluate(() => (window as unknown as Jx).seedIncense(56, "burner_main"));
  await page.waitForTimeout(800);
  await freezeCam(page, 1.6, 1.55, -5.4, 0, 1.15, -2.0);
  await shot(page, "incense-burner");

  // 3. Main hall — reference-like behind-player looking at the altar
  await joinHall(page, "main");
  await page.evaluate(() => (window as unknown as Jx).teleport(0, 8.2, 0));
  // behind a chibi monk, looking up at the tall gilt Buddha
  await freezeCam(page, 0, 2.05, 6.4, 0, 5.2, 21.0);
  await shot(page, "main-hall-reference");
  await freezeCam(page, 0, 2.4, 10.5, 0, 6.5, 21.5);
  await shot(page, "buddha-front");
  await freezeCam(page, 5.4, 3.6, 14.2, 0.2, 6.0, 21.2);
  await shot(page, "buddha-three-quarter");
  await freezeCam(page, 3.4, 2.2, 16.2, 0, 3.6, 21.0);
  await shot(page, "sumeru-low");

  // 4. One side hall (观音) + a second (弥勒, 关公) to show variety
  await joinHall(page, "guanyin");
  await page.evaluate(() => (window as unknown as Jx).teleport(0, 6.0, 0));
  await freezeCam(page, 0, 2.0, 4.6, 0, 4.8, 16.4);
  await shot(page, "hall-guanyin");

  await joinHall(page, "mile");
  await page.evaluate(() => (window as unknown as Jx).teleport(0, 6.0, 0));
  await freezeCam(page, 0, 2.0, 4.6, 0, 4.6, 16.4);
  await shot(page, "hall-mile");

  await joinHall(page, "qielan");
  await page.evaluate(() => (window as unknown as Jx).teleport(0, 6.0, 0));
  await freezeCam(page, 0, 2.0, 4.6, 0, 4.6, 16.4);
  await shot(page, "hall-qielan");

  await joinHall(page, "yaoshi");
  await page.evaluate(() => (window as unknown as Jx).teleport(0, 6.0, 0));
  await freezeCam(page, 0, 2.0, 4.6, 0, 4.6, 16.4);
  await shot(page, "hall-yaoshi");

  // Procedural halls still in this round (no suitable CC0 scan yet)
  await joinHall(page, "wenshu");
  await page.evaluate(() => (window as unknown as Jx).teleport(0, 6.0, 0));
  await freezeCam(page, 0, 2.0, 4.6, 0, 4.6, 16.4);
  await shot(page, "hall-wenshu");

  // 5. Tools UI: wooden fish + beads (already on HUD). Zoom a bit on the game view with panels visible.
  await joinHall(page, "main");
  await page.evaluate(() => (window as unknown as Jx).teleport(0, 9.0, 0));
  await freezeCam(page, 0, 2.05, 6.8, 0, 5.0, 21.0);
  // strike muyu and advance beads so the panels look alive
  await page.click("#muyu-canvas");
  await page.waitForTimeout(200);
  const box = await page.locator("#beads-canvas").boundingBox();
  if (box) {
    const cx = box.x + box.width * 0.5, cy = box.y + box.height * 0.35;
    for (let i = 0; i < 16; i++) {
      await page.mouse.click(cx + 20 * Math.cos(i), cy + 20 * Math.sin(i));
      await page.waitForTimeout(40);
    }
  }
  await page.waitForTimeout(300);
  await shot(page, "tools-muyu-beads");

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
