/**
 * Studio front/back/3-quarter shots of the fal player monks, to check facing.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "screenshots");
const PORT = 3458;

const HTML = `<!doctype html>
<html><head>
<meta charset="utf-8"/>
<style>html,body{margin:0;background:#f5e8d9;overflow:hidden}canvas{display:block}</style>
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
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5e8d9);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;

const camera = new THREE.PerspectiveCamera(32, 800/900, 0.05, 40);
const key = new THREE.DirectionalLight(0xfff1d0, 2.0);
key.position.set(2.2, 3.4, 3.0);
key.castShadow = true;
scene.add(key);
scene.add(new THREE.DirectionalLight(0xc8d8ff, 0.5).translateX(-2).translateY(1.5).translateZ(-1.5));
scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a2a18, 0.6));
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(2.2, 48),
  new THREE.MeshStandardMaterial({ color: 0xe8d5c0, roughness: 0.85, metalness: 0.05 })
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

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".glb": "model/gltf-binary",
  ".png": "image/png",
};

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
  { id: "stand", url: "/client/public/statues/fal/monk-stand.glb", mid: 0.5 },
  { id: "sit", url: "/client/public/statues/fal/monk-sit.glb", mid: 0.45 },
];

const VIEWS = [
  { name: "front", yaw: 0, camOff: [0, 0.15, 2.15] },
  { name: "back", yaw: Math.PI, camOff: [0, 0.15, 2.15] },
  { name: "three-quarter", yaw: 0, camOff: [1.4, 0.25, 1.7] },
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
    const cam = [v.camOff[0], m.mid + v.camOff[1], v.camOff[2], 0, m.mid, 0];
    await page.evaluate(({ url, yaw, cam }) => { (window as any)._preview.show(url, yaw, cam); }, { url: m.url, yaw: v.yaw, cam });
    await page.waitForTimeout(80);
    const dest = path.join(OUT, `round10-preview-${m.id}-${v.name}.png`);
    await page.screenshot({ path: dest, type: "png" });
    console.log("wrote", dest);
  }
}

await browser.close();
server.close();
