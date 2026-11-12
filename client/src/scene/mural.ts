import * as THREE from "three";

/** Original Buddhist-wall paintings (not copied from a living artist's work).
 *  Palette and motifs — circular mandorlas, seated/standing gilt figures,
 *  lotus and cloud — follow traditional 佛画 / 壁画 vocabulary
 *  (Dunhuang and later East-Asian temple walls are public-domain in style). */
const muralCache = new Map<string, THREE.CanvasTexture>();

export function muralTexture(seed = 1, w = 1024, h = 768): THREE.CanvasTexture {
  const key = `mural:${seed}:${w}x${h}`;
  const hit = muralCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  // Dark olive / teal ground
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#1a2418");
  bg.addColorStop(0.45, "#243022");
  bg.addColorStop(1, "#1c1810");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);

  const rnd = mulberry(seed * 997 + 13);

  // Faint gold floral field
  for (let i = 0; i < 80; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    goldLotus(g, x, y, 18 + rnd() * 28, 0.12 + rnd() * 0.18, rnd);
  }
  // Vines
  g.strokeStyle = "rgba(180,150,70,0.12)";
  g.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    g.beginPath();
    const x0 = rnd() * w;
    let y0 = rnd() * h;
    g.moveTo(x0, y0);
    for (let k = 0; k < 6; k++) {
      y0 -= 40 + rnd() * 50;
      g.quadraticCurveTo(x0 + (rnd() - 0.5) * 80, y0 + 20, x0 + (rnd() - 0.5) * 40, y0);
    }
    g.stroke();
  }

  // Three large mandorlas with painted figures
  const figures = [
    { x: w * 0.22, y: h * 0.42, r: h * 0.32, stand: true },
    { x: w * 0.50, y: h * 0.40, r: h * 0.38, stand: false },
    { x: w * 0.78, y: h * 0.42, r: h * 0.32, stand: true },
  ];
  // Optional extra half-figures at the edges
  const extras = [
    { x: w * -0.02, y: h * 0.45, r: h * 0.26, stand: true },
    { x: w * 1.02, y: h * 0.45, r: h * 0.26, stand: true },
  ];
  for (const f of [...figures, ...extras]) paintFigure(g, f.x, f.y, f.r, f.stand, rnd);

  // Cloud bands at the top
  g.fillStyle = "rgba(200,170,90,0.16)";
  for (let i = 0; i < 10; i++) {
    cloud(g, rnd() * w, 40 + rnd() * 160, 80 + rnd() * 120);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  muralCache.set(key, tex);
  return tex;
}

export function sideMuralTexture(seed = 2, w = 512, h = 512): THREE.CanvasTexture {
  const key = `side:${seed}:${w}x${h}`;
  const hit = muralCache.get(key);
  if (hit) return hit;
  const tex = muralTexture(seed, w, h).clone();
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  muralCache.set(key, tex);
  return tex;
}

function mulberry(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function goldLotus(g: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, rnd: () => number) {
  g.save();
  g.translate(x, y);
  g.fillStyle = `rgba(210,175,80,${a})`;
  const n = 8;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rnd() * 0.2;
    g.beginPath();
    g.ellipse(Math.cos(ang) * r * 0.45, Math.sin(ang) * r * 0.45, r * 0.28, r * 0.14, ang, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.arc(0, 0, r * 0.16, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function cloud(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath();
  g.arc(x, y, r * 0.5, 0, Math.PI * 2);
  g.arc(x + r * 0.45, y + r * 0.05, r * 0.38, 0, Math.PI * 2);
  g.arc(x - r * 0.4, y + r * 0.08, r * 0.34, 0, Math.PI * 2);
  g.fill();
}

function paintFigure(
  g: CanvasRenderingContext2D,
  x: number, y: number, r: number, standing: boolean, rnd: () => number,
) {
  g.save();
  // Mandorla rings
  const halo = g.createRadialGradient(x, y, r * 0.15, x, y, r);
  halo.addColorStop(0, "rgba(255,220,120,0.55)");
  halo.addColorStop(0.45, "rgba(180,80,40,0.35)");
  halo.addColorStop(0.72, "rgba(40,50,30,0.15)");
  halo.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = halo;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(230,190,90,0.55)";
  g.lineWidth = 6;
  g.beginPath();
  g.arc(x, y, r * 0.82, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = "rgba(230,190,90,0.28)";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(x, y, r * 0.9, 0, Math.PI * 2);
  g.stroke();

  // Figure — stylized, original
  const bodyH = standing ? r * 1.15 : r * 0.95;
  const top = y - bodyH * 0.38;
  // robes
  const robe = g.createLinearGradient(x, top, x, y + bodyH * 0.55);
  robe.addColorStop(0, "#6a1c18");
  robe.addColorStop(0.4, "#c9a24a");
  robe.addColorStop(1, "#4a3020");
  g.fillStyle = robe;
  g.beginPath();
  if (standing) {
    g.moveTo(x, top + 20);
    g.quadraticCurveTo(x + r * 0.32, top + bodyH * 0.4, x + r * 0.22, y + bodyH * 0.5);
    g.lineTo(x - r * 0.22, y + bodyH * 0.5);
    g.quadraticCurveTo(x - r * 0.32, top + bodyH * 0.4, x, top + 20);
  } else {
    // seated, wide knees
    g.moveTo(x, top + 16);
    g.quadraticCurveTo(x + r * 0.42, top + bodyH * 0.35, x + r * 0.5, y + bodyH * 0.38);
    g.quadraticCurveTo(x, y + bodyH * 0.5, x - r * 0.5, y + bodyH * 0.38);
    g.quadraticCurveTo(x - r * 0.42, top + bodyH * 0.35, x, top + 16);
  }
  g.fill();

  // lotus under the figure
  g.fillStyle = "rgba(212,170,70,0.75)";
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI + Math.PI;
    g.beginPath();
    g.ellipse(x + Math.cos(a) * r * 0.28, y + bodyH * 0.48 + Math.sin(a) * 8, r * 0.1, r * 0.05, a, 0, Math.PI * 2);
    g.fill();
  }

  // head + ushnisha (all in warm gold)
  const hy = top - r * 0.02;
  const hr = r * 0.13;
  g.fillStyle = "#e8c878";
  g.beginPath();
  g.arc(x, hy, hr, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(x, hy - hr * 0.75, hr * 0.45, 0, Math.PI * 2);
  g.fill();
  // ears
  g.beginPath();
  g.ellipse(x - hr * 1.05, hy + hr * 0.15, hr * 0.22, hr * 0.5, 0, 0, Math.PI * 2);
  g.ellipse(x + hr * 1.05, hy + hr * 0.15, hr * 0.22, hr * 0.5, 0, 0, Math.PI * 2);
  g.fill();
  if (standing) {
    // crown
    g.fillStyle = "#f0d78a";
    g.beginPath();
    g.moveTo(x - hr, hy - hr * 0.4);
    g.lineTo(x - hr * 0.5, hy - hr * 1.5);
    g.lineTo(x, hy - hr * 0.7);
    g.lineTo(x + hr * 0.5, hy - hr * 1.5);
    g.lineTo(x + hr, hy - hr * 0.4);
    g.closePath();
    g.fill();
  }
  // halo disc behind head
  g.strokeStyle = "rgba(255,230,140,0.65)";
  g.lineWidth = 4;
  g.beginPath();
  g.arc(x, hy, hr * 1.7, 0, Math.PI * 2);
  g.stroke();
  void rnd;
  g.restore();
}
