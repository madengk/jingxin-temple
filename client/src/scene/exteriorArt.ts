/**
 * Daytime courtyard sky and tileable temple-façade 彩绘.
 * Motifs follow traditional 佛画 / 和玺、旋子彩绘 vocabulary
 * (lotus, 祥云, 法轮, 八吉祥 such as the endless knot and conch)
 * without using the 卍 sign.
 */
import * as THREE from "three";

let _wall: THREE.CanvasTexture | null = null;
let _sky: THREE.CanvasTexture | null = null;

export const DAY_HORIZON = 0xc5daf0;
export const DAY_FOG = 0xc8d6e6;
/** World position of the visible sun; directional light should match. */
export const SUN_POS = new THREE.Vector3(14, 22, -12);

function mulberry(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seamless 512² weathered red-ochre plaster with Buddhist decorative painting. */
export function templeWallTexture(): THREE.CanvasTexture {
  if (_wall) return _wall;
  const W = 512, H = 512;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const rnd = mulberry(20261113);

  // Weathered ochre-red plaster (not a flat pure vermilion)
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#9a3d2e");
  bg.addColorStop(0.45, "#8a3226");
  bg.addColorStop(1, "#6e261c");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  for (let i = 0; i < 1400; i++) {
    const x = rnd() * W, y = rnd() * H;
    const v = 90 + ((rnd() * 50) | 0);
    g.fillStyle = `rgba(${v + 30},${v - 8},${v - 22},${0.05 + rnd() * 0.1})`;
    g.fillRect(x, y, 2 + rnd() * 6, 2 + rnd() * 5);
  }
  // Lime bloom and faint rain streaks
  for (let i = 0; i < 40; i++) {
    const x = rnd() * W;
    g.strokeStyle = `rgba(230,210,170,${0.04 + rnd() * 0.06})`;
    g.lineWidth = 1 + rnd() * 2;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + (rnd() - 0.5) * 18, H);
    g.stroke();
  }

  // Gold / mineral-green frame bands (full-width so they tile)
  const band = (y: number, h: number, color: string) => {
    g.fillStyle = color;
    g.fillRect(0, y, W, h);
  };
  band(0, 18, "#c4a056");
  band(18, 6, "#2f5a44");
  band(H - 24, 6, "#2f5a44");
  band(H - 18, 18, "#c4a056");
  g.fillStyle = "rgba(80,40,20,0.35)";
  g.fillRect(0, 22, W, 2);
  g.fillRect(0, H - 26, W, 2);

  const wrap = (x: number, y: number, draw: (x: number, y: number) => void) => {
    for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) draw(x + ox, y + oy);
  };

  // 祥云
  const cloud = (x: number, y: number, s: number, a: number) => {
    g.fillStyle = `rgba(236, 214, 150, ${a})`;
    g.beginPath();
    g.arc(x, y, s * 0.45, 0, Math.PI * 2);
    g.arc(x + s * 0.42, y + s * 0.06, s * 0.34, 0, Math.PI * 2);
    g.arc(x - s * 0.4, y + s * 0.08, s * 0.3, 0, Math.PI * 2);
    g.arc(x + s * 0.08, y - s * 0.22, s * 0.28, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = `rgba(196, 160, 70, ${Math.min(1, a + 0.15)})`;
    g.lineWidth = 1.2;
    g.stroke();
  };

  // Lotus — pointed 八瓣, cream and soft rose with a gold seed pod
  const lotus = (x: number, y: number, r: number) => {
    for (const layer of [
      { n: 8, off: 0, col: "#f3d4b0", sr: 0.92 },
      { n: 8, off: Math.PI / 8, col: "#f7e6c8", sr: 0.7 },
    ]) {
      for (let i = 0; i < layer.n; i++) {
        const ang = (i / layer.n) * Math.PI * 2 - Math.PI / 2 + layer.off;
        const px = x + Math.cos(ang) * r * 0.22 * layer.sr;
        const py = y + Math.sin(ang) * r * 0.22 * layer.sr;
        g.fillStyle = layer.col;
        g.beginPath();
        g.moveTo(x, y);
        g.ellipse(px, py, r * 0.22 * layer.sr, r * 0.42 * layer.sr, ang, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "rgba(160,90,50,0.28)";
        g.lineWidth = 0.8;
        g.stroke();
      }
    }
    g.fillStyle = "#d4a03a";
    g.beginPath();
    g.arc(x, y, r * 0.14, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(110,60,20,0.35)";
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.beginPath();
      g.arc(x + Math.cos(a) * r * 0.07, y + Math.sin(a) * r * 0.07, r * 0.025, 0, Math.PI * 2);
      g.fill();
    }
  };

  // 法轮 — 8-spoke dharma wheel, no 卍
  const wheel = (x: number, y: number, r: number) => {
    g.strokeStyle = "#e6c56a";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(x, y, r * 0.72, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
      g.stroke();
    }
    g.fillStyle = "#f0d890";
    g.beginPath();
    g.arc(x, y, r * 0.16, 0, Math.PI * 2);
    g.fill();
  };

  // Simplified 盘长 (endless knot), one of the 八吉祥
  const knot = (x: number, y: number, s: number) => {
    g.strokeStyle = "#d4b36a";
    g.lineWidth = 2.2;
    g.lineJoin = "round";
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(x - s, y);
    g.lineTo(x, y - s);
    g.lineTo(x + s, y);
    g.lineTo(x, y + s);
    g.closePath();
    g.moveTo(x - s * 0.45, y - s * 0.45);
    g.lineTo(x + s * 0.45, y + s * 0.45);
    g.moveTo(x + s * 0.45, y - s * 0.45);
    g.lineTo(x - s * 0.45, y + s * 0.45);
    g.stroke();
  };

  // 飞天-style scrolling ribbon
  const ribbon = (x0: number, y0: number, len: number, amp: number) => {
    g.strokeStyle = "rgba(210, 170, 80, 0.55)";
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const x = x0 + t * len;
      const y = y0 + Math.sin(t * Math.PI * 2) * amp;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.strokeStyle = "rgba(90, 140, 110, 0.35)";
    g.lineWidth = 1.2;
    g.beginPath();
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const x = x0 + t * len;
      const y = y0 + 5 + Math.sin(t * Math.PI * 2 + 0.6) * amp * 0.7;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  };

  // Motifs, drawn with wrap so the texture tiles
  wrap(128, 160, (x, y) => cloud(x, y, 36, 0.55));
  wrap(380, 150, (x, y) => cloud(x, y, 30, 0.45));
  wrap(250, 200, (x, y) => cloud(x, y, 24, 0.4));
  wrap(80, 370, (x, y) => cloud(x, y, 28, 0.4));
  wrap(430, 360, (x, y) => cloud(x, y, 32, 0.45));

  wrap(0, 90, (x, y) => ribbon(x, y, W, 10));
  wrap(0, H - 100, (x, y) => ribbon(x, y, W, 8));

  wrap(256, 260, (x, y) => wheel(x, y, 36));
  wrap(0, 260, (x, y) => wheel(x, y, 28));

  wrap(130, 270, (x, y) => lotus(x, y, 28));
  wrap(382, 270, (x, y) => lotus(x, y, 28));
  wrap(256, 390, (x, y) => lotus(x, y, 24));
  wrap(256, 140, (x, y) => lotus(x, y, 22));

  wrap(130, 140, (x, y) => knot(x, y, 16));
  wrap(382, 140, (x, y) => knot(x, y, 16));
  wrap(130, 390, (x, y) => knot(x, y, 14));
  wrap(382, 390, (x, y) => knot(x, y, 14));

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  _wall = tex;
  return tex;
}

/** Unique material so each wall can have its own repeat, sharing one canvas. */
export function templeWallMat(repeatX = 2, repeatY = 2): THREE.MeshStandardMaterial {
  const map = templeWallTexture().clone();
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  return new THREE.MeshStandardMaterial({
    map,
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.06,
  });
}

export function paintedWall(
  w: number, h: number, d: number,
  x: number, y: number, z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    templeWallMat(Math.max(1, w / 5.5), Math.max(1, h / 4.8)),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function daySkyTexture(): THREE.CanvasTexture {
  if (_sky) return _sky;
  const W = 512, H = 256;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#5ea4e6");
  sky.addColorStop(0.45, "#8ec6f0");
  sky.addColorStop(0.78, "#d4e8f8");
  sky.addColorStop(1, "#efe6c8");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const rnd = mulberry(77);
  g.fillStyle = "rgba(255,255,255,0.55)";
  for (let i = 0; i < 18; i++) {
    const x = rnd() * W;
    const y = 40 + rnd() * (H * 0.55);
    const s = 24 + rnd() * 50;
    g.beginPath();
    g.arc(x, y, s * 0.5, 0, Math.PI * 2);
    g.arc(x + s * 0.5, y + s * 0.08, s * 0.38, 0, Math.PI * 2);
    g.arc(x - s * 0.45, y + s * 0.1, s * 0.34, 0, Math.PI * 2);
    g.arc(x + s * 0.1, y - s * 0.22, s * 0.3, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  _sky = tex;
  return tex;
}

export function makeDaySky(): THREE.Group {
  const g = new THREE.Group();
  g.name = "daySky";
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(90, 32, 20),
    new THREE.MeshBasicMaterial({
      map: daySkyTexture(),
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    }),
  );
  g.add(dome);
  const sunMat = (color: number, opacity = 1) =>
    new THREE.MeshBasicMaterial({
      color, transparent: opacity < 1, opacity, fog: false, depthWrite: false, toneMapped: false,
    });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(3.6, 24, 16), sunMat(0xfff8d8));
  sun.position.copy(SUN_POS);
  g.add(sun);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 12), sunMat(0xffe08a, 0.36));
  glow.position.copy(SUN_POS);
  g.add(glow);
  const haze = new THREE.Mesh(new THREE.SphereGeometry(13, 16, 12), sunMat(0xfff3c0, 0.14));
  haze.position.copy(SUN_POS);
  g.add(haze);
  return g;
}
