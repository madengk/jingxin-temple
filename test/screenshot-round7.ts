/**
 * Main-hall shots for round 7: fal default + museum scan comparison cameras.
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
  teleport: (x: number, z: number, rotY?: number) => void;
  joinHall: (id: string) => Promise<void>;
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
  await page.waitForTimeout(400);
}

async function shot(page: import("playwright").Page, name: string) {
  const dest = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: dest, type: "png" });
  console.log("wrote", dest);
}

async function joinMain(page: import("playwright").Page) {
  await page.evaluate(async () => {
    await (window as unknown as Jx).joinHall("main");
    await Promise.race([
      (window as unknown as Jx).statuesReady(),
      new Promise((r) => setTimeout(r, 10000)),
    ]);
  });
  await page.waitForTimeout(800);
}

async function open(browser: import("playwright").Browser, query: string) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(40000);
  await page.goto(`${BASE}/?auto=1&name=拍摄僧${Date.now() % 10000}${query}`, { waitUntil: "networkidle" });
  await page.waitForSelector("#game:not([hidden])", { timeout: 25000 });
  await ready(page);
  await page.waitForTimeout(600);
  await joinMain(page);
  await page.evaluate(() => (window as unknown as Jx).teleport(0, 8.2, 0));
  return page;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome-stable" });

  const fal = await open(browser, "");
  await freezeCam(fal, 0, 2.05, 6.4, 0, 5.2, 21.0);
  await shot(fal, "round7-fal-main-hall");
  await freezeCam(fal, 0, 2.4, 10.5, 0, 6.5, 21.5);
  await shot(fal, "round7-fal-buddha-front");
  await freezeCam(fal, 5.4, 3.6, 14.2, 0.2, 6.0, 21.2);
  await shot(fal, "round7-fal-buddha-three-quarter");
  await fal.close();

  const scan = await open(browser, "&gilt=scan");
  await freezeCam(scan, 0, 2.05, 6.4, 0, 5.2, 21.0);
  await shot(scan, "round7-scan-main-hall");
  await freezeCam(scan, 0, 2.4, 10.5, 0, 6.5, 21.5);
  await shot(scan, "round7-scan-buddha-front");
  await scan.close();

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
