/**
 * Measure hall-entry latency: trigger → hallId change → fade clear.
 * Usage: JINGXIN_URL=http://localhost:2567 npx tsx test/enter-timing.ts
 */
import { chromium } from "playwright";

const BASE = process.env.JINGXIN_URL || "http://localhost:2567";

interface Jx {
  teleport: (x: number, z: number, rotY?: number) => void;
  holdWalk?: (key: string | false) => void;
  unfreezeCam?: () => void;
  hallId: () => string;
  hallCached?: (id: string) => boolean;
  enterTiming?: () => Record<string, number>;
}

interface Result {
  dest: string;
  pass: string;
  msToHallId: number;
  msToFadeClear: number;
  fadeOpacityAtHallId: string;
  resourceBytes: number;
  resourceCount: number;
  glbs: { name: string; ms: number; bytes: number; cached: number }[];
  marks?: Record<string, number>;
}

async function measureEntry(
  page: import("playwright").Page,
  dest: string,
  start: { x: number; z: number; rotY: number },
): Promise<Result> {
  await page.evaluate(({ x, z, rotY }) => {
    const w = window as unknown as Jx;
    w.unfreezeCam?.();
    w.teleport(x, z, rotY);
  }, start);
  await page.waitForTimeout(200);

  const result = await page.evaluate(async ({ dest }) => {
    const w = window as unknown as Jx;
    const fade = document.getElementById("door-fade");
    const t0 = performance.now();
    let hallAt = -1;
    let fadeAt = -1;
    let fadeOpacityAtHallId = "";
    if (w.holdWalk) w.holdWalk("w");
    else window.dispatchEvent(new KeyboardEvent("keydown", { key: "w", bubbles: true }));
    try {
      while (performance.now() - t0 < 25000) {
        const h = w.hallId();
        const op = fade ? getComputedStyle(fade).opacity : "0";
        if (hallAt < 0 && h === dest) {
          hallAt = performance.now();
          fadeOpacityAtHallId = op;
        }
        if (hallAt >= 0 && Number(op) <= 0.08) {
          fadeAt = performance.now();
          break;
        }
        await new Promise((r) => setTimeout(r, 30));
      }
    } finally {
      if (w.holdWalk) w.holdWalk(false);
      else window.dispatchEvent(new KeyboardEvent("keyup", { key: "w", bubbles: true }));
    }
    // Let an in-flight join finish so the next teleport/entry is not blocked.
    const settleT0 = performance.now();
    while (performance.now() - settleT0 < 8000) {
      const marks = w.enterTiming?.() ?? {};
      if (marks.fadeClear || marks.joinDone) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const glbs = res
      .filter((e) => /\.glb($|\?)/.test(e.name))
      .map((e) => ({
        name: e.name.replace(/^.*\/statues\//, "statues/"),
        ms: Math.round(e.responseEnd - e.startTime),
        bytes: Math.round(e.transferSize || 0),
        cached: Math.round(e.decodedBodySize || 0),
      }));
    const resourceBytes = glbs.reduce((s, g) => s + g.bytes, 0);
    return {
      dest,
      msToHallId: hallAt < 0 ? -1 : Math.round(hallAt - t0),
      msToFadeClear: fadeAt < 0 ? -1 : Math.round(fadeAt - t0),
      fadeOpacityAtHallId,
      resourceBytes,
      resourceCount: glbs.length,
      glbs,
      marks: w.enterTiming?.() ?? {},
    };
  }, { dest });
  return { ...result, pass: "" };
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome-stable",
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(60000);
  const url = `${BASE}/?auto=1&name=计时僧${Date.now() % 10000}`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("#game:not([hidden])", { timeout: 25000 });
  await page.waitForFunction(() => typeof (window as unknown as Jx).hallId === "function", { timeout: 25000 });
  await page.waitForTimeout(400);
  // Give the courtyard idle warmup a chance to prebuild the main hall
  // (a walking player reaches the door in a few seconds anyway).
  await page.waitForFunction(() => {
    const w = window as unknown as Jx;
    return typeof w.hallCached === "function" && w.hallCached("main");
  }, { timeout: 12000 }).catch(() => {});
  const version = await page.evaluate(() => document.documentElement.dataset.version || "");
  const preloaded = await page.evaluate(() => (window as unknown as Jx).hallCached?.("main") ?? false);
  console.log(JSON.stringify({ url: BASE, version, mainPreloaded: preloaded }, null, 0));
  const rows: Result[] = [];
  const main1 = await measureEntry(page, "main", { x: 1.8, z: -2.35, rotY: 0 });
  main1.pass = "main-first";
  rows.push(main1);
  await page.waitForTimeout(400);

  // Leave to courtyard
  await page.evaluate(async () => {
    const w = window as unknown as Jx;
    if (w.holdWalk) w.holdWalk("s");
    const t0 = performance.now();
    while (performance.now() - t0 < 20000) {
      if (w.hallId() === "courtyard") break;
      await new Promise((r) => setTimeout(r, 40));
    }
    w.holdWalk?.(false);
  });
  await page.waitForFunction(() => {
    const w = window as unknown as Jx;
    return w.hallId() === "courtyard" && (!w.enterTiming || w.enterTiming().joinDone || w.enterTiming().fadeClear);
  }, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(400);

  const main2 = await measureEntry(page, "main", { x: 1.8, z: -2.35, rotY: 0 });
  main2.pass = "main-reentry";
  rows.push(main2);
  await page.waitForTimeout(400);

  await page.evaluate(async () => {
    const w = window as unknown as Jx;
    if (w.holdWalk) w.holdWalk("s");
    const t0 = performance.now();
    while (performance.now() - t0 < 20000) {
      if (w.hallId() === "courtyard") break;
      await new Promise((r) => setTimeout(r, 40));
    }
    w.holdWalk?.(false);
  });
  await page.waitForTimeout(400);

  await page.evaluate(() => (window as unknown as Jx).teleport(-15.3, -8.7, -Math.PI / 2));
  await page.waitForFunction(() => {
    const w = window as unknown as Jx;
    return typeof w.hallCached === "function" && w.hallCached("guanyin");
  }, { timeout: 12000 }).catch(() => {});
  const guan = await measureEntry(page, "guanyin", { x: -15.3, z: -8.7, rotY: -Math.PI / 2 });
  guan.pass = "guanyin-first";
  rows.push(guan);

  console.log(JSON.stringify(rows, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
