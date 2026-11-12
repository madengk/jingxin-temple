import { chromium } from "playwright";

async function main() {
  const b = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox","--disable-gpu","--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist"],
    headless: true,
  });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  p.on("pageerror", (e) => console.log("PAGEERROR", e.message, "\n", e.stack));
  p.on("console", (m) => console.log("CON", m.type(), m.text()));
  p.on("requestfailed", (r) => console.log("REQFAIL", r.url(), r.failure()));
  p.on("response", (r) => {
    if (r.status() >= 400) console.log("HTTP", r.status(), r.url());
  });
  await p.goto("http://localhost:2567/?name=" + encodeURIComponent("巡礼者") + "&auto=1", {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  await p.waitForTimeout(5000);
  const info = await p.evaluate(() => ({
    ready: (window as any).__JINGXIN_READY,
    err: document.getElementById("login-err")?.textContent,
    errHidden: (document.getElementById("login-err") as HTMLElement)?.hidden,
    loginHidden: (document.getElementById("login") as HTMLElement)?.hidden,
    gameHidden: (document.getElementById("game") as HTMLElement)?.hidden,
    name: (document.getElementById("name-input") as HTMLInputElement)?.value,
    enterDisabled: (document.getElementById("enter-btn") as HTMLButtonElement)?.disabled,
  }));
  console.log("INFO", JSON.stringify(info, null, 2));
  await p.screenshot({ path: "/workspace/jingxin-temple/screenshots/debug.png" });
  await b.close();
}
main();
