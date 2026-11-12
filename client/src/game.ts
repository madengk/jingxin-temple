import * as THREE from "three";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { Client, Room } from "colyseus.js";
import { Monk } from "./scene/monk";
import { buildHall, resolveMove, setCushionOccupied, type HallObjects } from "./scene/hall";
import { SmokeSystem, makeNametag } from "./scene/fx";
import { Controls } from "./controls";
import { TempleAudio } from "./audio";
import { Beads } from "./beads";
import {
  CUSHION_COUNT,
  INCENSE_BURNER,
  PLAYER_RADIUS,
  SIT_RANGE,
  clampToWalkable,
  cushionPosition,
  dist2,
} from "../../server/src/shared";

export function serverUrl(): string {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}`;
}

interface Remote {
  monk: Monk;
  group: THREE.Group;
  tx: number;
  tz: number;
  trot: number;
  sitting: boolean;
  moving: boolean;
}

export class Game {
  room!: Room;
  audio: TempleAudio;
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  private clock = new THREE.Clock();
  private hall!: HallObjects;
  private smoke = new SmokeSystem();
  private controls = new Controls();
  private beads: Beads;
  private localMonk: Monk | null = null;
  private localGroup = new THREE.Group();
  private remotes = new Map<string, Remote>();
  private sessionId = "";
  private sitting = false;
  private nearCushion = -1;
  private nearBurner = false;
  private nearDoor: string | null = null;
  private sendAcc = 0;
  private camYawOff = 0;
  private camDist = 7.6;
  private camPivot = new THREE.Vector3();
  private drag: { x: number; y: number; moving: boolean; id: number } | null = null;
  private malletRest = -0.6;
  private malletT = 0;
  private toastTimer = 0;
  private running = false;
  private speed = 4.3;
  private myName = "";
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private camFrozen: { x: number; y: number; z: number; lx: number; ly: number; lz: number } | null = null;

  constructor(audio: TempleAudio) {
    this.audio = audio;
    const canvas = document.getElementById("scene") as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;

    const labels = document.getElementById("labels")!;
    this.labelRenderer = new CSS2DRenderer({ element: labels });

    this.beads = new Beads(document.getElementById("beads-canvas") as HTMLCanvasElement);
    this.beads.onAdvance = (_c, round) => {
      this.audio.playBead();
      const el = document.getElementById("bead-count")!;
      el.textContent = `${this.beads.count} / 108`;
      if (round) {
        this.audio.playBowlSoft();
        this.toast(`一轮已满${this.beads.rounds > 1 ? ` · 第 ${this.beads.rounds} 轮` : ""}`);
        el.textContent = `0 / 108`;
      }
    };

    window.addEventListener("resize", () => this.resize());
    this.resize();
    this.bindInput();
  }

  async connect(name: string): Promise<void> {
    const client = new Client(serverUrl());
    this.room = await client.joinOrCreate("main_hall", { name });
    this.sessionId = this.room.sessionId;
    this.myName = name;
    document.getElementById("my-name")!.textContent = name;

    await Promise.race([
      document.fonts.ready,
      new Promise<void>((r) => setTimeout(r, 1600)),
    ]);
    try {
      await document.fonts.load('bold 96px "Noto Serif SC"');
      await document.fonts.load('bold 96px "Noto Serif CJK SC"');
    } catch { /* system fallback is fine */ }
    this.setupScene();
    this.bindRoom();
    this.running = true;
    this.loop();
    const w = window as unknown as {
      __JINGXIN_READY?: boolean;
      __JINGXIN?: {
        teleport: (x: number, z: number, rotY?: number) => void;
        sitLocal: (id: number) => void;
        freezeCam: (x: number, y: number, z: number, lx: number, ly: number, lz: number) => void;
        unfreezeCam: () => void;
      };
    };
    w.__JINGXIN_READY = true;
    w.__JINGXIN = {
      teleport: (x, z, rotY = 0) => {
        this.localGroup.position.set(x, 0, z);
        this.localGroup.rotation.y = rotY;
        this.camYawOff = 0;
        this.camera.position.set(x - Math.sin(rotY) * this.camDist, 4.15, z - Math.cos(rotY) * this.camDist);
        this.camPivot.set(x, 1.45, z);
        this.camera.lookAt(this.camPivot);
        this.room?.send("move", { x, z, rotY });
      },
      sitLocal: (id) => this.room?.send("sit", { cushionId: id }),
      freezeCam: (x, y, z, lx, ly, lz) => {
        this.camFrozen = { x, y, z, lx, ly, lz };
        this.camera.position.set(x, y, z);
        this.camera.lookAt(lx, ly, lz);
      },
      unfreezeCam: () => { this.camFrozen = null; },
    };
  }

  private setupScene() {
    this.hall = buildHall(this.scene);
    this.scene.add(this.smoke.points);

    const hemi = new THREE.HemisphereLight(0xffe0c0, 0x4a3020, 0.85);
    this.scene.add(hemi);
    const amb = new THREE.AmbientLight(0x5a4030, 0.75);
    this.scene.add(amb);

    const sun = new THREE.DirectionalLight(0xffd0a8, 1.45);
    sun.position.set(-10, 18, -22);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -16;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 70;
    sun.shadow.bias = -0.0007;
    this.scene.add(sun);

    const spot = new THREE.SpotLight(0xffe8b0, 5.5, 32, 0.65, 0.4, 1.0);
    spot.position.set(0, 11.5, 16);
    spot.target.position.set(0, 4, 21.6);
    spot.castShadow = true;
    this.scene.add(spot, spot.target);
    const fill = new THREE.DirectionalLight(0xffe8d0, 0.55);
    fill.position.set(4, 10, 8);
    this.scene.add(fill);

    this.scene.add(this.localGroup);
    this.camera.position.set(0, 6, -28);
    this.camPivot.set(0, 1.2, -22);

    const joy = document.getElementById("joystick")!;
    this.controls.attachJoystick(
      document.getElementById("joy-base")!,
      document.getElementById("joy-knob")!,
    );
    void joy;
  }

  private bindRoom() {
    const state = this.room.state as {
      players: Map<string, PlayerView> & { onAdd?: Function; onRemove?: Function };
      cushions: string[];
      incenses: Map<string, { id: string; x: number; z: number; litAt: number }>;
    };

    const addPlayer = (p: PlayerView, id: string) => {
      if (id === this.sessionId) {
        this.localMonk = new Monk(p.look);
        this.localGroup.add(this.localMonk.group);
        const tag = makeNametag(p.name, true);
        this.localGroup.add(tag);
        this.localGroup.position.set(p.x, 0, p.z);
        this.localGroup.rotation.y = p.rotY;
        this.sitting = p.sitting;
        this.camPivot.copy(this.localGroup.position);
        return;
      }
      const monk = new Monk(p.look);
      const group = new THREE.Group();
      group.add(monk.group);
      group.add(makeNametag(p.name, false));
      group.position.set(p.x, 0, p.z);
      group.rotation.y = p.rotY;
      this.scene.add(group);
      this.remotes.set(id, {
        monk, group,
        tx: p.x, tz: p.z, trot: p.rotY,
        sitting: p.sitting, moving: false,
      });
    };

    this.room.state.players.onAdd((p: PlayerView, id: string) => {
      addPlayer(p, id);
      p.onChange(() => {
        if (id === this.sessionId) {
          if (p.sitting !== this.sitting) {
            this.sitting = p.sitting;
            this.audio.setSitting(this.sitting);
            this.updateActionButtons();
          }
          return;
        }
        const r = this.remotes.get(id);
        if (!r) return;
        r.tx = p.x;
        r.tz = p.z;
        r.trot = p.rotY;
        r.sitting = p.sitting;
      });
    });

    this.room.state.players.onRemove((_p: PlayerView, id: string) => {
      const r = this.remotes.get(id);
      if (r) {
        this.scene.remove(r.group);
        this.remotes.delete(id);
      }
    });

    this.room.onStateChange(() => this.onState());
    this.room.onMessage("notice", (m: { text?: string }) => {
      if (m?.text) this.toast(m.text);
    });
    this.room.onMessage("sit_ok", (m: { cushionId: number }) => {
      this.sitting = true;
      const pos = cushionPosition(m.cushionId);
      this.localGroup.position.set(pos.x, 0, pos.z);
      this.localGroup.rotation.y = 0;
      this.audio.setSitting(true);
      this.controls.dest = null;
      this.updateActionButtons();
    });
    this.room.onMessage("stand_ok", () => {
      this.sitting = false;
      this.audio.setSitting(false);
      this.updateActionButtons();
    });
    this.room.onError((_c, msg) => this.toast(msg || "连接出现问题"));
    this.room.onLeave((code) => {
      if (code !== 1000) this.toast("已与寺中失联，请刷新重入");
    });
    void state;
  }

  private onState() {
    const st = this.room.state;
    document.getElementById("online")!.textContent = `在线 ${st.players.size} 人`;
    const inc: { id: string; x: number; z: number; litAt: number }[] = [];
    st.incenses.forEach((v: { id: string; x: number; z: number; litAt: number }) => inc.push(v));
    this.smoke.sync(inc);
    for (let i = 0; i < CUSHION_COUNT; i++) {
      setCushionOccupied(this.hall.cushions, i, !!st.cushions[i]);
    }
  }

  private bindInput() {
    document.getElementById("btn-muyu")!.addEventListener("click", () => this.strikeMuyu());
    document.getElementById("btn-sit")!.addEventListener("click", () => this.toggleSit());
    document.getElementById("btn-incense")!.addEventListener("click", () => {
      this.room?.send("incense");
    });
    document.getElementById("mute-btn")!.addEventListener("click", () => {
      const m = this.audio.toggleMute();
      this.syncAudioUi();
      void m;
    });
    document.getElementById("vol-slider")!.addEventListener("input", (e) => {
      const v = Number((e.target as HTMLInputElement).value) / 100;
      this.audio.setVolume(v);
      if (v > 0 && this.audio.muted) this.audio.setMuted(false);
      this.syncAudioUi();
    });
    this.syncAudioUi();

    const wrap = document.getElementById("canvas-wrap")!;
    wrap.addEventListener("pointerdown", (e) => {
      if ((e.target as HTMLElement).closest("#hud") && e.target !== wrap && e.target !== this.renderer.domElement && e.target !== document.getElementById("labels")) {
        return;
      }
      this.drag = { x: e.clientX, y: e.clientY, moving: false, id: e.pointerId };
      wrap.setPointerCapture(e.pointerId);
    });
    wrap.addEventListener("pointermove", (e) => {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      if (!this.drag.moving && Math.hypot(dx, dy) > 6) this.drag.moving = true;
      if (this.drag.moving) {
        this.camYawOff -= dx * 0.005;
        this.camDist = Math.min(13, Math.max(4.5, this.camDist + dy * 0.01));
        this.drag.x = e.clientX;
        this.drag.y = e.clientY;
      }
    });
    wrap.addEventListener("pointerup", (e) => {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      if (!this.drag.moving) this.tryTap(e);
      this.drag = null;
    });
    wrap.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.camDist = Math.min(13, Math.max(4.5, this.camDist + Math.sign(e.deltaY) * 0.5));
    }, { passive: false });
  }

  private syncAudioUi() {
    const btn = document.getElementById("mute-btn")!;
    btn.classList.toggle("muted", this.audio.muted);
    btn.textContent = this.audio.muted ? "♫" : "♪";
    btn.title = this.audio.muted ? "取消静音" : "静音";
    (document.getElementById("vol-slider") as HTMLInputElement).value = String(Math.round(this.audio.volume * 100));
  }

  private tryTap(e: PointerEvent) {
    if (this.sitting) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const muyuHits = this.raycaster.intersectObject(this.hall.muyu, true);
    if (muyuHits.length) {
      this.strikeMuyu();
      return;
    }
    const floors = this.raycaster.intersectObjects(this.hall.floorMeshes, false);
    if (floors[0]) {
      this.controls.dest = floors[0].point.clone();
    }
  }

  private strikeMuyu() {
    this.audio.playMuyu();
    this.malletT = 1;
  }

  private toggleSit() {
    if (!this.room) return;
    if (this.sitting) {
      this.room.send("stand");
      return;
    }
    if (this.nearCushion < 0) {
      this.toast("请走近空着的蒲团再打坐");
      return;
    }
    this.room.send("sit", { cushionId: this.nearCushion });
  }

  private loop = () => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.updateLocal(dt);
    this.updateRemotes(dt);
    this.updateCamera(dt);
    this.smoke.update(dt);
    this.updateProximity();
    this.updateMallet(dt);
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  };

  private updateLocal(dt: number) {
    if (!this.localMonk) return;
    let moving = false;
    if (!this.sitting) {
      const intent = this.controls.moveIntent();
      // A/D (and joystick X): turn the character; camera follows behind.
      if (intent.turn !== 0) {
        this.localGroup.rotation.y += intent.turn * 2.15 * dt;
        this.controls.dest = null;
      }
      let vx = 0;
      let vz = 0;
      if (intent.walking) {
        const face = this.localGroup.rotation.y;
        vx = Math.sin(face) * intent.forward;
        vz = Math.cos(face) * intent.forward;
        this.controls.dest = null;
        // Recenter optional mouse-orbit so the camera returns behind the back.
        if (!this.drag) {
          this.camYawOff = lerpAngle(this.camYawOff, 0, Math.min(1, dt * 2.2));
        }
      } else if (this.controls.dest) {
        const dx = this.controls.dest.x - this.localGroup.position.x;
        const dz = this.controls.dest.z - this.localGroup.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.25) this.controls.dest = null;
        else {
          vx = dx / d;
          vz = dz / d;
          const face = Math.atan2(vx, vz);
          this.localGroup.rotation.y = lerpAngle(this.localGroup.rotation.y, face, Math.min(1, dt * 8));
        }
      }
      const mag = Math.hypot(vx, vz);
      if (mag > 0.05) {
        moving = true;
        const step = this.speed * dt;
        const rawX = this.localGroup.position.x + (vx / mag) * step;
        const rawZ = this.localGroup.position.z + (vz / mag) * step;
        const resolved = resolveMove(
          this.localGroup.position.x, this.localGroup.position.z,
          rawX, rawZ, this.hall.obstacles, PLAYER_RADIUS,
        );
        const c = clampToWalkable(resolved.x, resolved.z);
        this.localGroup.position.set(c.x, 0, c.z);
      }
    }
    this.localMonk.update(dt, moving, this.sitting);

    this.sendAcc += dt;
    if (this.sendAcc >= 1 / 15 && this.room) {
      this.sendAcc = 0;
      this.room.send("move", {
        x: this.localGroup.position.x,
        z: this.localGroup.position.z,
        rotY: this.localGroup.rotation.y,
      });
    }
  }

  private lookYaw(): number {
    const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, "YXZ");
    return e.y;
  }

  private updateRemotes(dt: number) {
    this.remotes.forEach((r) => {
      const gx = r.group.position.x;
      const gz = r.group.position.z;
      const k = 1 - Math.exp(-12 * dt);
      r.group.position.x += (r.tx - gx) * k;
      r.group.position.z += (r.tz - gz) * k;
      r.group.rotation.y = lerpAngle(r.group.rotation.y, r.trot, k);
      const dist = Math.hypot(r.tx - r.group.position.x, r.tz - r.group.position.z);
      r.moving = dist > 0.04 && !r.sitting;
      r.monk.update(dt, r.moving, r.sitting);
    });
  }

  private updateCamera(dt: number) {
    if (this.camFrozen) {
      this.camera.position.set(this.camFrozen.x, this.camFrozen.y, this.camFrozen.z);
      this.camera.lookAt(this.camFrozen.lx, this.camFrozen.ly, this.camFrozen.lz);
      return;
    }
    const p = this.localGroup.position;
    const face = this.localGroup.rotation.y + this.camYawOff;
    const dist = this.sitting ? this.camDist * 0.85 : this.camDist;
    const height = this.sitting ? 3.6 : 4.15;
    const desired = new THREE.Vector3(
      p.x - Math.sin(face) * dist,
      height,
      p.z - Math.cos(face) * dist,
    );
    const k = 1 - Math.exp(-6.5 * dt);
    this.camera.position.lerp(desired, k);
    this.camPivot.lerp(new THREE.Vector3(p.x, this.sitting ? 1.15 : 1.45, p.z), k);
    this.camera.lookAt(this.camPivot);
  }

  private updateProximity() {
    if (!this.localMonk) return;
    const x = this.localGroup.position.x;
    const z = this.localGroup.position.z;
    this.nearBurner = dist2(x, z, INCENSE_BURNER.x, INCENSE_BURNER.z) <= INCENSE_BURNER.radius ** 2;

    this.nearCushion = -1;
    if (!this.sitting) {
      let best = SIT_RANGE * SIT_RANGE;
      const st = this.room?.state;
      for (let i = 0; i < CUSHION_COUNT; i++) {
        if (st && st.cushions[i] && st.cushions[i] !== this.sessionId) continue;
        const pos = cushionPosition(i);
        const d = dist2(x, z, pos.x, pos.z);
        if (d < best) {
          best = d;
          this.nearCushion = i;
        }
      }
    }

    this.nearDoor = null;
    for (const d of this.hall.doors) {
      if (dist2(x, z, d.x, d.z) < 4.5 * 4.5) {
        this.nearDoor = d.name;
        break;
      }
    }
    const hint = document.getElementById("near-hint")!;
    if (this.nearDoor) {
      hint.hidden = false;
      hint.textContent = `${this.nearDoor}即将开放，敬请期待`;
    } else {
      hint.hidden = true;
    }
    this.updateActionButtons();
  }

  private updateActionButtons() {
    const sit = document.getElementById("btn-sit") as HTMLButtonElement;
    const inc = document.getElementById("btn-incense") as HTMLButtonElement;
    if (this.sitting) {
      sit.disabled = false;
      sit.textContent = "起身";
      sit.classList.add("ready");
    } else {
      sit.textContent = "打坐";
      sit.disabled = this.nearCushion < 0;
      sit.classList.toggle("ready", this.nearCushion >= 0);
    }
    inc.disabled = this.sitting || !this.nearBurner;
    inc.classList.toggle("ready", !inc.disabled);
  }

  private updateMallet(dt: number) {
    const mallet = this.hall.muyu.getObjectByName("mallet");
    if (!mallet) return;
    if (this.malletT > 0) {
      this.malletT = Math.max(0, this.malletT - dt * 4);
      const s = Math.sin((1 - this.malletT) * Math.PI);
      mallet.rotation.z = this.malletRest - s * 0.9;
    } else {
      mallet.rotation.z = this.malletRest;
    }
  }

  toast(text: string) {
    const el = document.getElementById("toast")!;
    el.hidden = false;
    el.textContent = text;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      el.hidden = true;
    }, 2600);
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.labelRenderer.setSize(w, h);
  }
}

interface PlayerView {
  id: string;
  name: string;
  x: number;
  z: number;
  rotY: number;
  sitting: boolean;
  cushionId: number;
  look: number;
  onChange: (cb: () => void) => void;
}

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
