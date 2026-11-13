/**
 * Measure door-crossing smoothness: longest rAF interval, position jump,
 * camera jump, fade opacity, and trigger→hallId latency.
 *
 * Usage: JINGXIN_URL=http://localhost:PORT npx tsx test/cross-timing.ts
 */
import { chromium, type Page } from "playwright";

const BASE = process.env.JINGXIN_URL || "http://localhost:2567";

interface Jx {
  teleport: (x: number, z: number, rotY?: number) => void;
  holdWalk?: (key: string | false) => void;
  unfreezeCam?: () => void;
  hallId: () => string;
  hallCached?: (id: string) => boolean;
  enterTiming?: () => Record<string, number>;
  crossingStats?: () => {
    maxFrame: number; p95: number; over33: number; over50: number;
    maxJump: number; maxCamJump: number; n: number; hallIds: string[];
  };
  beginCrossingSample?: () => void;
  playerPose?: () => { x: number; y: number; z: number; rotY: number };
}

interface Sample {
  t: number; frameMs: number; hallId: string;
  x: number; z: number; camX: number; camY: number; camZ: number;
  fade: number;
}

function summarize(frames: Sample[], label: string, marks: Record<string, number>, version: string) {
  const ms = frames.map((f) => f.frameMs);
  const maxFrame = ms.length ? Math.max(...ms) : -1;
  const sorted = [...ms].sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : -1;
  let maxJump = 0, maxCam = 0, maxFade = 0;
  for (let i = 1; i < frames.length; i++) {
    const dt = Math.max(0.001, frames[i].frameMs / 1000);
    const jump = Math.hypot(frames[i].x - frames[i - 1].x, frames[i].z - frames[i - 1].z);
    maxJump = Math.max(maxJump, Math.max(0, jump - 4.3 * dt - 0.08));
    const cam = Math.hypot(
      frames[i].camX - frames[i - 1].camX,
      frames[i].camY - frames[i - 1].camY,
      frames[i].camZ - frames[i - 1].camZ,
    );
    maxCam = Math.max(maxCam, Math.max(0, cam - 8 * dt - 0.1));
    maxFade = Math.max(maxFade, frames[i].fade, frames[i - 1].fade);
  }
  const hallChange = frames.findIndex((f, i) => i > 0 && f.hallId !== frames[0].hallId);
  const t0 = frames[0]?.t ?? 0;
  const msToHall = hallChange >= 0 ? Math.round(frames[hallChange].t - t0) : -1;
  return {
    label, version,
    maxFrame: Math.round(maxFrame * 10) / 10,
    p95: Math.round(p95 * 10) / 10,
    over33: ms.filter((v) => v > 33).length,
    over50: ms.filter((v) => v > 50).length,
    maxJump: Math.round(maxJump * 1000) / 1000,
    maxCamJump: Math.round(maxCam * 1000) / 1000,
    maxFade: Math.round(maxFade * 100) / 100,
    msToHallId: msToHall,
    n: frames.length,
    hallIds: [...new Set(frames.map((f) => f.hallId))],
    marks,
  };
}

async function ready(page: Page) {
  await page.waitForFunction(() => typeof (window as unknown as Jx).hallId === "function", { timeout: 30000 });
  await page.waitForTimeout(400);
}


async function walkAndSample(
  page: Page,
  dest: string,
  start: { x: number; z: number; rotY: number },
  key: string,
  ms = 5000,
) {
  await page.evaluate(({ x, z, rotY }) => {
    const w = window as unknown as Jx;
    w.unfreezeCam?.();
    w.teleport(x, z, rotY);
    w.beginCrossingSample?.();
  }, start);
  await page.waitForTimeout(150);

  // String form: tsx must not inject __name into the browser.
  const result = await page.evaluate(`(async ({ dest, key, ms }) => {
    const w = window;
    const fade = document.getElementById("door-fade");
    const samples = [];
    let last = performance.now();
    let running = true;
    function onFrame() {
      if (!running) return;
      const now = performance.now();
      const pose = w.playerPose ? w.playerPose() : { x: 0, y: 0, z: 0, rotY: 0 };
      const op = fade ? Number(getComputedStyle(fade).opacity) : 0;
      samples.push({
        t: now,
        frameMs: now - last,
        hallId: w.hallId(),
        x: pose.x,
        z: pose.z,
        camX: 0, camY: 0, camZ: 0,
        fade: op,
      });
      last = now;
      requestAnimationFrame(onFrame);
    }
    requestAnimationFrame(onFrame);
    if (w.holdWalk) w.holdWalk(key);
    else window.dispatchEvent(new KeyboardEvent("keydown", { key: key, bubbles: true }));
    const t0 = performance.now();
    let seen = false;
    while (performance.now() - t0 < ms) {
      if (w.hallId() === dest) seen = true;
      if (seen && performance.now() - t0 > 900) break;
      await new Promise((r) => setTimeout(r, 40));
    }
    await new Promise((r) => setTimeout(r, 400));
    running = false;
    if (w.holdWalk) w.holdWalk(false);
    else window.dispatchEvent(new KeyboardEvent("keyup", { key: key, bubbles: true }));
    const marks = w.enterTiming ? w.enterTiming() : {};
    const hook = w.crossingStats ? w.crossingStats() : null;
    return { samples, marks, hook, destSeen: seen };
  })(${JSON.stringify({ dest, key, ms })})`);

  return result as {
    samples: Sample[];
    marks: Record<string, number>;
    hook: unknown;
    destSeen: boolean;
  };
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome-stable",
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (err) => console.warn("pageerror", err.message));
  const url = `${BASE}/?auto=1&name=测卡僧${Date.now() % 10000}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const el = document.getElementById("game");
    return !!el && !el.hasAttribute("hidden") && !el.hidden;
  }, { timeout: 40000 });
  await ready(page);
  await page.waitForFunction(() => {
    const w = window as unknown as Jx;
    return typeof w.hallCached === "function" && w.hallCached("main");
  }, { timeout: 12000 }).catch(() => {});

  const version = await page.evaluate(() => document.documentElement.dataset.version || "");
  const preloaded = await page.evaluate(() => (window as unknown as Jx).hallCached?.("main") ?? false);
  console.log(JSON.stringify({ url: BASE, version, mainPreloaded: preloaded }));

  const rows: ReturnType<typeof summarize>[] = [];

  const enter = await walkAndSample(page, "main", { x: 1.6, z: -2.2, rotY: 0 }, "w", 8000);
  rows.push(summarize(enter.samples, "main-enter", enter.marks, version));
  await page.waitForTimeout(500);

  const leave = await walkAndSample(page, "courtyard", { x: 0, z: 2.4, rotY: Math.PI }, "w", 8000);
  rows.push(summarize(leave.samples, "main-leave", leave.marks, version));
  await page.waitForTimeout(500);

  // 观音: approach from courtyard facing -X
  await page.evaluate(() => (window as unknown as Jx).teleport(-15.5, -10, -Math.PI / 2));
  await page.waitForFunction(() => {
    const w = window as unknown as Jx;
    return typeof w.hallCached === "function" && w.hallCached("guanyin");
  }, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(300);
  const guan = await walkAndSample(page, "guanyin", { x: -15.5, z: -10, rotY: -Math.PI / 2 }, "w", 8000);
  rows.push(summarize(guan.samples, "guanyin-enter", guan.marks, version));

  console.log(JSON.stringify(rows, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
