import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { INCENSE_DURATION_MS } from "../../../server/src/shared";

function smokeTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, "rgba(220,210,200,0.7)");
  grd.addColorStop(0.4, "rgba(180,170,160,0.3)");
  grd.addColorStop(1, "rgba(160,150,140,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; max: number; size: number;
  emitter: string;
}

interface Emitter {
  id: string; x: number; z: number; litAt: number;
}

const MAX_P = 900;

export class SmokeSystem {
  points: THREE.Points;
  private geo = new THREE.BufferGeometry();
  private pos = new Float32Array(MAX_P * 3);
  private alpha = new Float32Array(MAX_P);
  private size = new Float32Array(MAX_P);
  private particles: Particle[] = [];
  private emitters = new Map<string, Emitter>();
  private acc = 0;

  constructor() {
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute("aAlpha", new THREE.BufferAttribute(this.alpha, 1));
    this.geo.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1));
    const mat = new THREE.PointsMaterial({
      map: smokeTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.7,
      size: 0.45,
      sizeAttenuation: true,
      color: 0xd8d0c8,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
  }

  sync(list: { id: string; x: number; z: number; litAt: number }[]) {
    const seen = new Set<string>();
    for (const e of list) {
      seen.add(e.id);
      if (!this.emitters.has(e.id)) this.emitters.set(e.id, { ...e });
    }
    for (const id of [...this.emitters.keys()]) {
      if (!seen.has(id)) this.emitters.delete(id);
    }
  }

  update(dt: number) {
    this.acc += dt;
    const now = Date.now();
    // spawn
    this.emitters.forEach((e) => {
      const age = now - e.litAt;
      if (age > INCENSE_DURATION_MS) return;
      const fade = age > INCENSE_DURATION_MS - 8000 ? (INCENSE_DURATION_MS - age) / 8000 : 1;
      const rate = 18 * fade; // per second per stick
      const n = Math.min(4, Math.floor(this.acc * rate + Math.random()));
      for (let i = 0; i < n && this.particles.length < MAX_P; i++) {
        this.particles.push({
          x: e.x + (Math.random() - 0.5) * 0.08,
          y: 1.2 + Math.random() * 0.05,
          z: e.z + (Math.random() - 0.5) * 0.08,
          vx: (Math.random() - 0.5) * 0.08,
          vy: 0.35 + Math.random() * 0.25,
          vz: (Math.random() - 0.5) * 0.08,
          life: 0,
          max: 2.4 + Math.random() * 1.8,
          size: 0.25 + Math.random() * 0.3,
          emitter: e.id,
        });
      }
    });
    if (this.acc > 0.08) this.acc = 0;

    const alive: Particle[] = [];
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.max) continue;
      p.vy += dt * 0.05;
      p.x += p.vx * dt + Math.sin(p.life * 2.1 + i) * 0.04 * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt + Math.cos(p.life * 1.7 + i) * 0.04 * dt;
      p.vx *= 0.99;
      p.vz *= 0.99;
      alive.push(p);
    }
    this.particles = alive;

    for (let i = 0; i < MAX_P; i++) {
      if (i < alive.length) {
        const p = alive[i];
        this.pos[i * 3] = p.x;
        this.pos[i * 3 + 1] = p.y;
        this.pos[i * 3 + 2] = p.z;
        const t = p.life / p.max;
        this.alpha[i] = t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9;
        this.size[i] = p.size * (0.6 + t * 1.4);
      } else {
        this.pos[i * 3 + 1] = -99;
        this.alpha[i] = 0;
      }
    }
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}

export function makeNametag(name: string, isMe: boolean): CSS2DObject {
  const el = document.createElement("div");
  el.className = "nametag" + (isMe ? " me" : "");
  el.textContent = name;
  const obj = new CSS2DObject(el);
  obj.position.set(0, 1.95, 0);
  return obj;
}
