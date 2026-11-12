/**
 * Headless Chromium screenshots of 静心寺.
 * SCREENSHOT_PREFIX=round2 writes screenshots/round2-*.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../screenshots");
fs.mkdirSync(outDir, { recursive: true });

const BASE = process.env.JINGXIN_URL || "http://localhost:2567";
const PREFIX = process.env.SCREENSHOT_PREFIX || "";
const tag = PREFIX ? `${PREFIX}-` : "";

function out(name: string): string {
  return path.join(outDir, `${tag}${name}.png`);
}

async function shot(page: Page, name: string) {
  const dest = out(name);
  await page.screenshot({ path: dest, type: "png" });
  console.log("wrote", dest, fs.statSync(dest).size);
}

type Hook = {
  teleport: (x: number, z: number, r?: number) => void;
  freezeCam: (x: number, y: number, z: number, lx: number, ly: number, lz: number) => void;
  unfreezeCam: () => void;
};

async function teleport(page: Page, x: number, z: number, r = 0) {
  await page.evaluate(({ x, z, r }) => {
    const j = (window as unknown as { __JINGXIN?: Hook }).__JINGXIN;
    if (!j) throw new Error("no hook");
    j.unfreezeCam?.();
    j.teleport(x, z, r);
  }, { x, z, r });
  await page.waitForTimeout(1400);
}

async function freezeCam(
  page: Page,
  x: number, y: number, z: number,
  lx: number, ly: number, lz: number,
) {
  // Park the monk out of frame so the plaque is unobstructed.
  await page.evaluate(({ x, y, z, lx, ly, lz }) => {
    const j = (window as unknown as { __JINGXIN?: Hook }).__JINGXIN;
    if (!j) throw new Error("no hook");
    j.teleport(0, -22, 0);
    j.freezeCam(x, y, z, lx, ly, lz);
  }, { x, y, z, lx, ly, lz });
  await page.waitForTimeout(700);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME || "/usr/bin/google-chrome",
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ],
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on("pageerror", (e) => console.error("pageerror", e));
  page.on("console", (m) => {
    const t = m.type();
    if (t === "error" || t === "warning") console.log("console", t, m.text());
  });

  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(800);
  await shot(page, "login");

  await page.fill("#name-input", "清心行者");
  await page.click("#enter-btn");
  await page.waitForFunction(() => (window as unknown as { __JINGXIN_READY?: boolean }).__JINGXIN_READY === true, {
    timeout: 25000,
  });
  await page.waitForTimeout(2200);
  await shot(page, "courtyard");

  // Main hall, facing the Buddha (monk in frame, third-person)
  await teleport(page, 0, 9.5, 0);
  await shot(page, "main-hall");

  // Close plaques: frozen camera, monk parked out of frame
  // 释迦牟尼佛 / 如来佛祖 — seated on dais at (0, 21.6), plaque in front
  await freezeCam(page, 0, 2.35, 17.4, 0, 1.4, 21.2);
  await shot(page, "buddha-plaque");

  // Eastern kings at x=−13, face +X (inward). Camera in the aisle looking west.
  await freezeCam(page, -9.4, 2.0, 8.0, -13.0, 1.2, 8.0);
  await shot(page, "king-east-dhritarashtra");
  await freezeCam(page, -9.4, 2.0, 16.0, -13.0, 1.2, 16.0);
  await shot(page, "king-east-virudhaka");

  // Western kings at x=+13, face −X (inward).
  await freezeCam(page, 9.4, 2.0, 8.0, 13.0, 1.2, 8.0);
  await shot(page, "king-west-virupaksha");
  await freezeCam(page, 9.4, 2.0, 16.0, 13.0, 1.2, 16.0);
  await shot(page, "king-west-vaishravana");

  // 韦陀 at (−3.6, 3.2), plaque faces −Z (the entrance, south)
  await freezeCam(page, -3.6, 1.85, 0.65, -3.6, 1.15, 2.35);
  await shot(page, "weituo");

  // Incense + a turned-facing shot (camera follows behind the monk)
  await teleport(page, 0, 15.5, 0);
  await page.click("#btn-incense").catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, "incense");

  await teleport(page, 2, 11, Math.PI * 0.55);
  await shot(page, "turn-follow");

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
