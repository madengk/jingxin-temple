/**
 * Headless Chromium screenshots of 静心寺: login, courtyard, main hall.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../screenshots");
fs.mkdirSync(outDir, { recursive: true });

const BASE = process.env.JINGXIN_URL || "http://localhost:2567";

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

  // Login screen
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(800);
  const loginOut = path.join(outDir, "login.png");
  await page.screenshot({ path: loginOut, type: "png" });
  console.log("wrote", loginOut, fs.statSync(loginOut).size);

  // Join by clicking 入寺 (real user gesture so WebAudio can start)
  await page.fill("#name-input", "清心行者");
  await page.click("#enter-btn");
  await page.waitForFunction(() => (window as unknown as { __JINGXIN_READY?: boolean }).__JINGXIN_READY === true, {
    timeout: 20000,
  });
  await page.waitForTimeout(2000);
  const courtOut = path.join(outDir, "courtyard.png");
  await page.screenshot({ path: courtOut, type: "png" });
  console.log("wrote", courtOut, fs.statSync(courtOut).size);

  // Teleport into the hall, facing the Buddha
  await page.evaluate(() => {
    const j = (window as unknown as { __JINGXIN?: { teleport: (x: number, z: number, r?: number) => void } }).__JINGXIN;
    if (!j) throw new Error("no hook");
    j.teleport(0, 9.5, 0);
  });
  await page.waitForTimeout(1800);
  const hallOut = path.join(outDir, "main-hall.png");
  await page.screenshot({ path: hallOut, type: "png" });
  console.log("wrote", hallOut, fs.statSync(hallOut).size);

  // Light incense + sit for a third angle if possible
  await page.evaluate(() => {
    const j = (window as unknown as { __JINGXIN?: { teleport: (x: number, z: number) => void } }).__JINGXIN;
    j?.teleport(0, 15.5, 0);
  });
  await page.waitForTimeout(400);
  await page.click("#btn-incense").catch(() => {});
  await page.waitForTimeout(1500);
  const incenseOut = path.join(outDir, "incense.png");
  await page.screenshot({ path: incenseOut, type: "png" });
  console.log("wrote", incenseOut, fs.statSync(incenseOut).size);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
