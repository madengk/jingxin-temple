import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { Client, Room } from "colyseus.js";
import { Monk } from "./scene/monk";
import { buildCourtyard, buildInterior, resolveMove, setCushionOccupied, type HallObjects } from "./scene/hall";
import { IncenseField } from "./scene/incenseViz";
import { makeNametag } from "./scene/fx";
import { MuyuPanel, BeadsPanel } from "./scene/tools";
import { Controls } from "./controls";
import { TempleAudio } from "./audio";
import {
  CUSHION_COUNT, PLAYER_RADIUS, SIT_RANGE,
  type HallId, ALL_HALLS, MAIN_HALL, SIDE_HALLS,
  clampToWalkable, cushionPosition, dist2, nearestBurner,
  courtyardDoorHit, interiorExitHit, courtyardSpawnFrom, hallById, hallByRoom,
} from "../../server/src/shared";

export function serverUrl(): string {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}`;
}

interface Remote {
  monk: Monk;
  group: THREE.Group;
  tx: number; tz: number; trot: number;
  sitting: boolean; moving: boolean;
}

interface PlayerView {
  name: string; x: number; z: number; rotY: number;
  sitting: boolean; cushionId: number; look: number;
}

export class Game {
  room!: Room;
  audio: TempleAudio;
  private client!: Client;
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  private clock = new THREE.Clock();
  private hall!: HallObjects;
  private incense = new IncenseField();
  private controls = new Controls();
  private muyuPanel: MuyuPanel;
  private beads: BeadsPanel;
  private localMonk: Monk | null = null;
  private localGroup = new THREE.Group();
  private remotes = new Map<string, Remote>();
  private sessionId = "";
  private sitting = false;
  private nearCushion = -1;
  private nearBurnerId: string | null = null;
  private nearDoor: { name: string; room: string; hallId: HallId } | null = null;
  private sendAcc = 0;
  private camYawOff = 0;
  private camDist = 4.6;
  private camPivot = new THREE.Vector3();
  private drag: { x: number; y: number; moving: boolean; id: number } | null = null;
  private toastTimer = 0;
  private running = false;
  private speed = 4.3;
  private myName = "";
  private myLook = 0;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private camFrozen: { x: number; y: number; z: number; lx: number; ly: number; lz: number } | null = null;
  private leaving = false;
  private doorCooldown = 0;
  private hallId: HallId = "courtyard";
  private sun!: THREE.DirectionalLight;
  private spot!: THREE.SpotLight;
  private fill!: THREE.DirectionalLight;

  constructor(audio: TempleAudio) {
    this.audio = audio;
    const canvas = document.getElementById("scene") as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    const labels = document.getElementById("labels")!;
    this.labelRenderer = new CSS2DRenderer({ element: labels });

    this.beads = new BeadsPanel(document.getElementById("beads-canvas") as HTMLCanvasElement);
    this.beads.onAdvance = (_c, round) => {
      this.audio.playBead();
      this.syncBeadUi();
      if (round) this.audio.playBowlSoft();
    };
    this.muyuPanel = new MuyuPanel(document.getElementById("muyu-canvas") as HTMLCanvasElement);
    this.muyuPanel.onStrike = () => this.audio.playMuyu();

    window.addEventListener("resize", () => this.resize());
    this.resize();
    this.bindInput();
    this.installHooks();
  }

  async connect(name: string): Promise<void> {
    this.client = new Client(serverUrl());
    this.myName = name;
    document.getElementById("my-name")!.textContent = name;

    await Promise.race([
      document.fonts.ready,
      new Promise<void>((r) => setTimeout(r, 1600)),
    ]);
    try {
      await document.fonts.load('bold 96px "Noto Serif SC"');
      await document.fonts.load('bold 96px "Noto Serif CJK SC"');
    } catch { /* fonts optional */ }

    this.setupLights();
    this.scene.add(this.localGroup);
    this.scene.add(this.incense.group);

    const startRoom = new URLSearchParams(location.search).get("hall") || "courtyard";
    await this.enterRoom(startRoom, { name });
    this.running = true;
    this.clock.getDelta();
    requestAnimationFrame(this.loop);

    const joy = document.getElementById("joystick")!;
    this.controls.attachJoystick(
      document.getElementById("joy-base")!,
      document.getElementById("joy-knob")!,
    );
    void joy;
  }

  private async enterRoom(
    roomName: string,
    options: { name: string; look?: number; x?: number; z?: number; rotY?: number },
  ) {
    this.leaving = true;
    const prev = this.room;
    const newRoom = await this.client.joinOrCreate(roomName, options);
    if (prev) {
      try { await prev.leave(); } catch { /* already left */ }
    }
    this.clearRemotes();
    this.unloadHall();
    this.room = newRoom;
    this.sessionId = newRoom.sessionId;
    this.leaving = false;
    this.doorCooldown = 0.8;

    this.hallId = roomName === "courtyard" ? "courtyard"
      : roomName === "main_hall" ? "main"
      : (hallByRoom(roomName)?.id ?? "courtyard");

    if (this.hallId === "courtyard") this.hall = buildCourtyard(this.scene);
    else {
      const def = hallById(this.hallId) ?? MAIN_HALL;
      this.hall = buildInterior(this.scene, def);
    }
    this.tuneLights();
    this.bindRoom();
  }

  private unloadHall() {
    if (!this.hall) return;
    this.scene.remove(this.hall.group);
    this.hall.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) mat?.dispose?.();
      }
    });
  }

  private clearRemotes() {
    this.remotes.forEach((r) => this.scene.remove(r.group));
    this.remotes.clear();
    // Keep local mesh; it will be recreated on bindRoom addPlayer for self
    if (this.localMonk) {
      this.localGroup.clear();
      this.localMonk = null;
    }
  }

  private setupLights() {
    const hemi = new THREE.HemisphereLight(0xffe0c0, 0x2a1810, 0.42);
    this.scene.add(hemi);
    this.scene.add(new THREE.AmbientLight(0x4a3020, 0.38));

    this.sun = new THREE.DirectionalLight(0xffd0a8, 0.75);
    this.sun.position.set(-10, 22, -18);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1536, 1536);
    this.sun.shadow.camera.left = -30;
    this.sun.shadow.camera.right = 30;
    this.sun.shadow.camera.top = 32;
    this.sun.shadow.camera.bottom = -18;
    this.sun.shadow.camera.near = 2;
    this.sun.shadow.camera.far = 80;
    this.sun.shadow.bias = -0.0007;
    this.scene.add(this.sun);

    this.spot = new THREE.SpotLight(0xffe8b0, 4.2, 40, 0.7, 0.45, 1.0);
    this.spot.position.set(0, 16, 12);
    this.spot.target.position.set(0, 6, 18);
    this.spot.castShadow = true;
    this.scene.add(this.spot, this.spot.target);

    this.fill = new THREE.DirectionalLight(0xffe8d0, 0.32);
    this.fill.position.set(4, 10, 6);
    this.scene.add(this.fill);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.42;
  }

  private tuneLights() {
    if (this.hallId === "courtyard") {
      this.spot.intensity = 0;
      this.sun.intensity = 0.85;
      this.sun.position.set(-10, 22, -18);
    } else {
      this.spot.intensity = 4.6;
      const targetZ = this.hallId === "main" ? 21.4 : 16.4;
      this.spot.position.set(0, this.hallId === "main" ? 18 : 13, targetZ - 7);
      this.spot.target.position.set(0, 6, targetZ);
      this.spot.target.updateMatrixWorld();
      this.sun.intensity = 0.45;
      this.sun.position.set(-8, 16, 4);
    }
  }

  private bindRoom() {
    const state = this.room.state as {
      hallId?: string;
      players: Map<string, PlayerView> & { onAdd?: Function; onRemove?: Function };
      cushions: string[];
      incenses: Map<string, { id: string; x: number; z: number; litAt: number; burnerId?: string }>;
    };

    const addPlayer = (p: PlayerView, id: string) => {
      if (id === this.sessionId) {
        this.myLook = p.look;
        this.localMonk = new Monk(p.look);
        this.localGroup.add(this.localMonk.group);
        this.localGroup.add(makeNametag(p.name, true));
        this.localGroup.position.set(p.x, 0, p.z);
        this.localGroup.rotation.y = p.rotY;
        this.sitting = p.sitting;
        this.audio.setSitting(this.sitting);
        return;
      }
      if (this.remotes.has(id)) return;
      const monk = new Monk(p.look);
      const group = new THREE.Group();
      group.add(monk.group, makeNametag(p.name, false));
      group.position.set(p.x, 0, p.z);
      group.rotation.y = p.rotY;
      this.scene.add(group);
      this.remotes.set(id, {
        monk, group, tx: p.x, tz: p.z, trot: p.rotY,
        sitting: p.sitting, moving: false,
      });
    };

    state.players.forEach((p, id) => addPlayer(p, id));
    state.players.onAdd?.((p: PlayerView, id: string) => addPlayer(p, id));
    state.players.onRemove?.((_p: PlayerView, id: string) => {
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
      this.audio.setSitting(true);
      const pos = cushionPosition(m.cushionId, this.hallId);
      this.localGroup.position.set(pos.x, 0, pos.z);
      this.localGroup.rotation.y = 0;
    });
    this.room.onMessage("stand_ok", () => {
      this.sitting = false;
      this.audio.setSitting(false);
    });
    this.room.onError((_c, msg) => this.toast(msg || "连接出现问题"));
    this.room.onLeave((code) => {
      if (!this.leaving && code !== 4000) this.toast("与寺中的连接已中断");
    });
    this.onState();
  }

  private onState() {
    const st = this.room?.state as {
      players: Map<string, PlayerView>;
      cushions: string[];
      incenses: Map<string, { id: string; x: number; z: number; litAt: number; burnerId?: string }>;
    };
    if (!st) return;
    document.getElementById("online")!.textContent = `在线 ${st.players?.size ?? 0}`;
    const inc: { id: string; x: number; z: number; litAt: number; burnerId?: string }[] = [];
    st.incenses?.forEach((v) => inc.push(v));
    this.incense.sync(inc);
    if (this.hall?.cushions && st.cushions) {
      for (let i = 0; i < st.cushions.length; i++) {
        setCushionOccupied(this.hall.cushions, i, !!st.cushions[i]);
      }
    }
    st.players?.forEach((p, id) => {
      if (id === this.sessionId) return;
      const r = this.remotes.get(id);
      if (!r) return;
      r.tx = p.x; r.tz = p.z; r.trot = p.rotY; r.sitting = p.sitting;
    });
  }

  private bindInput() {
    document.getElementById("btn-muyu")!.addEventListener("click", () => this.muyuPanel.strike());
    document.getElementById("btn-sit")!.addEventListener("click", () => this.toggleSit());
    document.getElementById("btn-incense")!.addEventListener("click", () => {
      this.room?.send("incense", { burnerId: this.nearBurnerId });
    });
    document.getElementById("btn-enter")?.addEventListener("click", () => this.tryEnterDoor());
    document.getElementById("mute-btn")!.addEventListener("click", () => {
      this.audio.toggleMute();
      this.syncAudioUi();
    });
    document.getElementById("vol-slider")!.addEventListener("input", (e) => {
      const v = Number((e.target as HTMLInputElement).value) / 100;
      this.audio.setVolume(v);
      if (v > 0 && this.audio.muted) this.audio.setMuted(false);
      this.syncAudioUi();
    });
    this.syncAudioUi();
    this.syncBeadUi();

    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        this.muyuPanel.strike();
      } else if (e.code === "KeyB") {
        e.preventDefault();
        this.beads.advance();
      } else if (e.code === "KeyE" || e.code === "Enter") {
        if (this.nearDoor) this.tryEnterDoor();
      }
    });

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
        this.camDist = Math.min(11, Math.max(2.8, this.camDist + dy * 0.01));
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
      this.camDist = Math.min(11, Math.max(2.8, this.camDist + Math.sign(e.deltaY) * 0.5));
    }, { passive: false });
  }

  private syncAudioUi() {
    const btn = document.getElementById("mute-btn")!;
    btn.classList.toggle("muted", this.audio.muted);
    btn.textContent = this.audio.muted ? "♫" : "♪";
    btn.title = this.audio.muted ? "取消静音" : "静音";
    (document.getElementById("vol-slider") as HTMLInputElement).value = String(Math.round(this.audio.volume * 100));
  }

  private syncBeadUi() {
    const el = document.getElementById("bead-count")!;
    const rounds = this.beads.rounds;
    el.textContent = rounds > 0
      ? `${this.beads.count} / 108 · 第 ${rounds} 轮`
      : `${this.beads.count} / 108`;
  }

  private tryTap(e: PointerEvent) {
    if (this.sitting) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const floors = this.raycaster.intersectObjects(this.hall.floorMeshes, false);
    if (floors[0]) this.controls.dest = floors[0].point.clone();
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

  private async tryEnterDoor() {
    if (!this.nearDoor || this.leaving || this.doorCooldown > 0) return;
    const dest = this.nearDoor;
    this.leaving = true;
    try {
      if (dest.room === "courtyard") {
        const def = hallById(this.hallId);
        const spawn = def ? courtyardSpawnFrom(def) : { x: 0, z: -4, rotY: Math.PI };
        await this.enterRoom("courtyard", {
          name: this.myName, look: this.myLook, x: spawn.x, z: spawn.z, rotY: spawn.rotY,
        });
      } else {
        await this.enterRoom(dest.room, { name: this.myName, look: this.myLook, z: 2.2, rotY: 0 });
      }
    } catch (err) {
      this.leaving = false;
      this.toast("未能入殿，请稍后再试");
      console.warn(err);
    }
  }

  private loop = () => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.updateLocal(dt);
    this.updateRemotes(dt);
    this.updateCamera(dt);
    this.incense.update(dt);
    this.muyuPanel.update(dt);
    this.beads.update(dt);
    this.updateProximity();
    if (this.doorCooldown > 0) this.doorCooldown = Math.max(0, this.doorCooldown - dt);
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    this.updateAutoDoor(dt);
  };

  private updateAutoDoor(_dt: number) {
    if (this.sitting || this.leaving || this.doorCooldown > 0) return;
    const x = this.localGroup.position.x;
    const z = this.localGroup.position.z;
    if (this.hallId === "courtyard") {
      const hit = courtyardDoorHit(x, z);
      if (hit) {
        this.nearDoor = { name: hit.name, room: hit.room, hallId: hit.id };
        void this.tryEnterDoor();
      }
    } else if (interiorExitHit(x, z, this.hallId)) {
      this.nearDoor = { name: "山门庭院", room: "courtyard", hallId: "courtyard" };
      void this.tryEnterDoor();
    }
  }

  private updateLocal(dt: number) {
    if (!this.localMonk) return;
    let moving = false;
    if (!this.sitting) {
      const intent = this.controls.moveIntent();
      if (intent.turn !== 0) {
        this.localGroup.rotation.y += intent.turn * 2.15 * dt;
        this.controls.dest = null;
      }
      let vx = 0;
      let vz = 0;
      if (intent.forward !== 0) {
        const face = this.localGroup.rotation.y;
        vx += Math.sin(face) * intent.forward;
        vz += Math.cos(face) * intent.forward;
      }
      if (this.controls.dest) {
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
        const c = clampToWalkable(resolved.x, resolved.z, this.hallId);
        this.localGroup.position.set(c.x, 0, c.z);
      }
    }
    this.localMonk.update(dt, moving, this.sitting);

    this.sendAcc += dt;
    if (this.sendAcc >= 1 / 15 && this.room && !this.leaving) {
      this.sendAcc = 0;
      this.room.send("move", {
        x: this.localGroup.position.x,
        z: this.localGroup.position.z,
        rotY: this.localGroup.rotation.y,
      });
    }
  }

  private updateRemotes(dt: number) {
    this.remotes.forEach((r) => {
      const k = 1 - Math.exp(-12 * dt);
      r.group.position.x += (r.tx - r.group.position.x) * k;
      r.group.position.z += (r.tz - r.group.position.z) * k;
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
    const height = this.sitting ? 1.85 : 2.15;
    const desired = new THREE.Vector3(
      p.x - Math.sin(face) * dist,
      height,
      p.z - Math.cos(face) * dist,
    );
    const k = 1 - Math.exp(-6.5 * dt);
    this.camera.position.lerp(desired, k);
    this.camPivot.lerp(new THREE.Vector3(p.x, this.sitting ? 0.85 : 1.0, p.z), k);
    this.camera.lookAt(this.camPivot);
  }

  private updateProximity() {
    if (!this.localMonk) return;
    const x = this.localGroup.position.x;
    const z = this.localGroup.position.z;

    const b = nearestBurner(x, z, this.hallId);
    this.nearBurnerId = b?.id ?? null;

    this.nearCushion = -1;
    if (!this.sitting && this.hallId !== "courtyard") {
      let best = SIT_RANGE * SIT_RANGE;
      const st = this.room?.state as { cushions?: string[] } | undefined;
      for (let i = 0; i < CUSHION_COUNT; i++) {
        if (st?.cushions?.[i] && st.cushions[i] !== this.sessionId) continue;
        const pos = cushionPosition(i, this.hallId);
        const d = dist2(x, z, pos.x, pos.z);
        if (d < best) { best = d; this.nearCushion = i; }
      }
    }

    // Hint only — no incense countdown, ever.
    const hint = document.getElementById("near-hint")!;
    if (this.nearBurnerId) {
      hint.hidden = false;
      hint.textContent = "走近香炉，可上香";
    } else if (this.nearCushion >= 0) {
      hint.hidden = false;
      hint.textContent = "走近蒲团，可打坐";
    } else if (this.hallId === "courtyard") {
      hint.hidden = false;
      hint.textContent = "走向殿门即可入内";
    } else {
      hint.hidden = true;
    }

    const inc = document.getElementById("btn-incense") as HTMLButtonElement;
    inc.disabled = this.sitting || !this.nearBurnerId;
    inc.classList.toggle("ready", !inc.disabled);
    const sit = document.getElementById("btn-sit") as HTMLButtonElement;
    sit.disabled = this.hallId === "courtyard" ? !this.sitting : (this.sitting ? false : this.nearCushion < 0);
    sit.textContent = this.sitting ? "起身" : "打坐";
    sit.classList.toggle("ready", !sit.disabled);
  }

  private toast(text: string) {
    const el = document.getElementById("toast")!;
    el.hidden = false;
    el.textContent = text;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => { el.hidden = true; }, 2800);
  }

  private resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.labelRenderer.setSize(w, h);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  private installHooks() {
    const w = window as unknown as {
      freezeCam: (x: number, y: number, z: number, lx: number, ly: number, lz: number) => void;
      unfreezeCam: () => void;
      teleport: (x: number, z: number, rotY?: number) => void;
      joinHall: (id: string) => Promise<void>;
      seedIncense: (n?: number, burnerId?: string) => void;
      hallId: () => string;
    };
    w.freezeCam = (x, y, z, lx, ly, lz) => {
      this.camFrozen = { x, y, z, lx, ly, lz };
      this.camera.position.set(x, y, z);
      this.camera.lookAt(lx, ly, lz);
    };
    w.unfreezeCam = () => { this.camFrozen = null; };
    w.teleport = (x, z, rotY = 0) => {
      const c = clampToWalkable(x, z, this.hallId);
      this.localGroup.position.set(c.x, 0, c.z);
      this.localGroup.rotation.y = rotY;
      this.room?.send("move", { x: c.x, z: c.z, rotY });
    };
    w.joinHall = async (id: string) => {
      const room = id === "courtyard" ? "courtyard"
        : id === "main" || id === "main_hall" ? "main_hall"
        : (hallById(id as HallId)?.room ?? SIDE_HALLS.find((h) => h.room === id)?.room);
      if (!room) return;
      if (room === "courtyard") {
        await this.enterRoom("courtyard", { name: this.myName, look: this.myLook, x: 0, z: -8, rotY: 0 });
      } else {
        await this.enterRoom(room, { name: this.myName, look: this.myLook, z: 6.5, rotY: 0 });
      }
    };
    w.seedIncense = (n = 48, burnerId?: string) => {
      this.room?.send("debug_seed_incense", { count: n, burnerId });
    };
    w.hallId = () => this.hallId;
  }
}

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

void ALL_HALLS;
