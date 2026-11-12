/**
 * Round 14: daytime courtyard with visible sun, and a close-up of
 * the painted hall façade (not flat vermilion).
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
  hallId: () => string;
  statuesReady: () => Promise<void>;
}

async function ready(page: import("playwright").Page) {
  await page.waitForFunction(() => typeof (window as unknown as Jx).freezeCam === "function", { timeout: 25000 });
  await page.waitForTimeout(400);
}

async function shot(page: import("playwright").Page, name: string) {
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
  page.setDefaultTimeout(40000);
  await page.goto(`${BASE}/?auto=1&name=日照僧${Date.now() % 10000}`, { waitUntil: "networkidle" });
  await page.waitForSelector("#game:not([hidden])", { timeout: 25000 });
  await ready(page);
  await page.evaluate(async () => {
    const w = window as unknown as Jx;
    await Promise.race([w.statuesReady(), new Promise((r) => setTimeout(r, 8000))]);
  });
  const hall = await page.evaluate(() => (window as unknown as Jx).hallId());
  const version = await page.evaluate(() => document.documentElement.dataset.version || "");
  console.log("hall", hall, "version", version);

  // Wide courtyard: halls + path in frame, sun in the upper sky.
  await page.evaluate(() => {
    const w = window as unknown as Jx;
    w.teleport(0, -18, 0);
    w.freezeCam(-6, 13, -38.0, 6, 16.0, 0);
  });
  await page.waitForTimeout(800);
  await shot(page, "round14-courtyard-day.png");

  // Close-up of the painted left leaf of the main-hall façade.
  await page.evaluate(() => {
    const w = window as unknown as Jx;
    w.teleport(-8, -6, 0);
    w.freezeCam(-10.2, 5.2, -4.6, -10.2, 5.8, 0.12);
  });
  await page.waitForTimeout(500);
  await shot(page, "round14-wall-closeup.png");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
