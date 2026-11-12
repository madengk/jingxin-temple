/**
 * Studio previews of museum scan vs fal Hunyuan vs fal Trellis 2.
 * Writes screenshots/round7-preview-*.png
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "screenshots");
const PORT = 3457;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".glb": "model/gltf-binary",
  ".png": "image/png",
  ".webp": "image/webp",
  ".css": "text/css",
};

const HTML = `<!doctype html>
<html><head>
<meta charset="utf-8"/>
<style>html,body{margin:0;background:#1a120c;overflow:hidden}canvas{display:block}</style>
<script type="importmap">
{"imports":{
  "three":"/node_modules/three/build/three.module.js",
  "three/addons/":"/node_modules/three/examples/jsm/"
}}
</script>
</head>
<body>
<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(800, 900);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a120c);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(32, 800/900, 0.05, 40);
const key = new THREE.DirectionalLight(0xfff1d0, 2.2);
key.position.set(2.2, 3.4, 3.0);
key.castShadow = true;
scene.add(key);
scene.add(new THREE.DirectionalLight(0xc8d8ff, 0.55).translateX(-2).translateY(1.5).translateZ(-1.5));
scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a2a18, 0.55));
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(2.2, 48),
  new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.85, metalness: 0.05 })
);
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);

const loader = new GLTFLoader();
const models = {};
window._preview = {
  async load(url) {
    const gltf = await loader.loadAsync(url);
    const g = gltf.scene;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    models[url] = g;
    return true;
  },
  show(url, yaw, cam) {
    for (const k of Object.keys(models)) models[k].removeFromParent();
    const g = models[url];
    if (!g) throw new Error("not loaded " + url);
    g.rotation.y = yaw;
    scene.add(g);
    const [x,y,z,lx,ly,lz] = cam;
    camera.position.set(x,y,z);
    camera.lookAt(lx,ly,lz);
    renderer.render(scene, camera);
  }
};
</script>
</body></html>`;

const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url?.startsWith("/index")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML);
    return;
  }
  const rel = decodeURIComponent((req.url || "/").split("?")[0]);
  const fp = path.join(ROOT, rel);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    res.writeHead(404); res.end("no"); return;
  }
  const ext = path.extname(fp).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(fp).pipe(res);
});

await new Promise<void>((r) => server.listen(PORT, "127.0.0.1", r));

const MODELS = [
  { id: "scan", url: "/client/public/statues/gilt/shakyamuni.glb" },
  { id: "hunyuan", url: "/client/public/statues/fal/hunyuan-shakyamuni.glb" },
  { id: "trellis", url: "/client/public/statues/fal/trellis2-shakyamuni.glb" },
];

const VIEWS = [
  { name: "front", yaw: 0, cam: [0, 0.55, 2.15, 0, 0.48, 0] },
  { name: "front-back", yaw: Math.PI, cam: [0, 0.55, 2.15, 0, 0.48, 0] },
  { name: "three-quarter", yaw: 0, cam: [1.45, 0.72, 1.7, 0, 0.48, 0] },
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome-stable" });
const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
page.setDefaultTimeout(30000);
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });
await page.waitForFunction(() => typeof (window as any)._preview?.load === "function");

for (const m of MODELS) {
  await page.evaluate(async (url) => { await (window as any)._preview.load(url); }, m.url);
  for (const v of VIEWS) {
    await page.evaluate(({ url, yaw, cam }) => { (window as any)._preview.show(url, yaw, cam); }, { url: m.url, yaw: v.yaw, cam: v.cam });
    await page.waitForTimeout(80);
    const dest = path.join(OUT, `round7-preview-${m.id}-${v.name}.png`);
    await page.screenshot({ path: dest, type: "png" });
    console.log("wrote", dest);
  }
}

await browser.close();
server.close();
