/**
 * Round 10 screenshots: 造型四 player monk — close-up, walking, meditating, vs concept.
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
  joinHall: (id: string) => Promise<void>;
  hallId: () => string;
  statuesReady: () => Promise<void>;
  setAnim: (opts: { moving?: boolean | null; sitting?: boolean | null; phase?: number | null }) => void;
  sitOnCushion: (id?: number) => void;
  playerPose: () => Pose;
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

async function pose(page: import("playwright").Page): Promise<Pose> {
  return page.evaluate(() => (window as unknown as Jx).playerPose());
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
  await page.waitForTimeout(600);

  // Hide chrome UI for character close-ups.
  await page.evaluate(() => {
    const hud = document.getElementById("hud");
    if (hud) hud.style.display = "none";
    const labels = document.getElementById("labels");
    if (labels) labels.style.display = "none";
    document.querySelectorAll(".nametag").forEach((el) => { (el as HTMLElement).style.display = "none"; });
  });

  // rotY = 0 faces +Z (toward the main hall). Front cameras therefore sit at larger Z.

  // --- 1. Front close-up in the courtyard, slightly elevated so 戒疤 read clearly.
  await page.evaluate(() => {
    (window as unknown as Jx).teleport(0, -14, 0);
    (window as unknown as Jx).setAnim({ moving: false, sitting: false, phase: 0 });
  });
  await page.waitForTimeout(400);
  let p = await pose(page);
  // Eye-level-plus, in front of the face, looking at the mid-face so the 6 dots stay in frame.
  await freezeCam(page, p.x, 1.55, p.z + 1.55, p.x, 1.02, p.z);
  await shot(page, "round10-monk-closeup.png");

  // --- 2. Courtyard third-person walking, mid-stride, slight 3/4 so the new design reads.
  await page.evaluate(() => {
    const labelsOn = document.getElementById("labels");
    if (labelsOn) labelsOn.style.display = "";
    document.querySelectorAll(".nametag").forEach((el) => { (el as HTMLElement).style.display = ""; });
    (window as unknown as Jx).teleport(0, -16, 0);
    (window as unknown as Jx).setAnim({ moving: true, sitting: false, phase: 0.85 });
  });
  await page.waitForTimeout(400);
  p = await pose(page);
  // Behind and to the character's right, looking toward the main hall.
  await freezeCam(page, p.x - 1.35, 1.65, p.z - 2.15, p.x, 0.85, p.z + 1.4);
  await shot(page, "round10-monk-walking.png");

  // A 3/4 close shot used later for the concept comparison (same courtyard).
  await page.evaluate(() => {
    const labelsOff = document.getElementById("labels");
    if (labelsOff) labelsOff.style.display = "none";
    document.querySelectorAll(".nametag").forEach((el) => { (el as HTMLElement).style.display = "none"; });
    (window as unknown as Jx).teleport(0, -14, 0);
    (window as unknown as Jx).setAnim({ moving: false, sitting: false, phase: 0 });
  });
  await page.waitForTimeout(400);
  p = await pose(page);
  // Character's right and front, slightly above, matching the concept framing.
  // Facing +Z, character's right is -X.
  await freezeCam(page, p.x - 1.15, 1.35, p.z + 1.55, p.x, 0.72, p.z);
  await shot(page, "round10-monk-three-quarter.png");

  // --- 3. Seated meditation on a main-hall cushion, 3/4 front, hall around them.
  await joinHall(page, "main");
  await page.evaluate(() => {
    const labelsSit = document.getElementById("labels");
    if (labelsSit) labelsSit.style.display = "";
    document.querySelectorAll(".nametag").forEach((el) => { (el as HTMLElement).style.display = ""; });
    (window as unknown as Jx).sitOnCushion(25);
  });
  await page.waitForTimeout(800);
  p = await pose(page);
  // Front-right 3/4 (character faces the altar at +Z).
  await freezeCam(page, p.x - 1.7, 1.35, p.z + 2.05, p.x, 0.55, p.z);
  await shot(page, "round10-monk-meditating.png");

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
