import colyseus from "colyseus";
import type { Client } from "colyseus";
const { Room, ServerError } = colyseus;
import { HallState, Player, Incense, BurnerQueue } from "./schema";
import { validateName } from "../profanity";
import {
  CUSHION_COUNT,
  INCENSE_DURATION_MS,
  MAX_CLIENTS,
  MAX_INCENSE_PER_BURNER,
  MAX_MOVE_SPEED,
  SIT_RANGE,
  type HallId,
  BURNERS,
  BUILD_VERSION,
  QUEUE_LEAVE_DISTANCE,
  RITUAL_PHASE,
  clampToWalkable,
  cushionPosition,
  dist2,
  hallByRoom,
  interiorSpawn,
  nearestBurner,
  inQueueApproach,
  nearestQueueBurner,
  queueSlotPose,
  ritualFinished,
  ritualPhaseAt,
  ritualPlantAtMs,
} from "../shared";

const LOOK_COUNT = 8;
const MOVE_GRACE = 0.4;
const INCENSE_COOLDOWN_MS = 2000;
const ARRIVE_RANGE = 0.55;

function hallIdOf(roomName: string): HallId {
  if (roomName === "courtyard") return "courtyard";
  if (roomName === "main_hall") return "main";
  const def = hallByRoom(roomName);
  return def?.id ?? "courtyard";
}

export class HallRoom extends Room<HallState> {
  maxClients = MAX_CLIENTS;
  patchRate = 50;
  private hallId: HallId = "courtyard";
  private lastIncense = new Map<string, number>();
  /** Clicked 上香 as the front of an empty queue: auto-start on arrival. */
  private wantOffer = new Map<string, boolean>();
  private ritualPlanted = new Set<string>();

  onCreate() {
    this.hallId = hallIdOf(this.roomName);
    this.autoDispose = true;
    // Do not allowReconnection: a dropped socket must vanish immediately so
    // no ghost monk is left sitting after a tab close or a crashed test client.
    const state = new HallState();
    state.hallId = this.hallId;
    state.buildVersion = BUILD_VERSION;
    this.setState(state);
    if (this.hallId !== "courtyard") {
      for (let i = 0; i < CUSHION_COUNT; i++) this.state.cushions.push("");
    } else {
      for (const b of BURNERS) {
        const q = new BurnerQueue();
        q.burnerId = b.id;
        this.state.queues.set(b.id, q);
      }
    }

    this.onMessage("move", (client, data) => this.handleMove(client, data));
    this.onMessage("sit", (client, data) => this.handleSit(client, data));
    this.onMessage("stand", (client) => this.handleStand(client));
    this.onMessage("incense", (client, data) => this.handleIncense(client, data));
    this.onMessage("queue_join", (client, data) => this.handleQueueJoin(client, data, false));
    this.onMessage("queue_leave", (client) => this.leaveQueue(client.sessionId));
    this.onMessage("debug_seed_incense", (client, data) => this.handleSeed(client, data));
    this.onMessage("debug_teleport", (client, data) => this.handleDebugTeleport(client, data));

    this.setSimulationInterval(() => {
      this.expireIncense();
      this.tickQueues();
    }, 100);
  }

  onJoin(client: Client, options: { name?: unknown; look?: unknown; x?: unknown; z?: unknown; rotY?: unknown }) {
    const result = validateName(options?.name);
    if (!result.ok) throw new ServerError(400, result.reason);

    const taken = [...this.state.players.values()].some(
      (p) =>
        p.name.localeCompare(result.name, "zh", { sensitivity: "accent" }) === 0 ||
        p.name.toLowerCase() === result.name.toLowerCase(),
    );
    if (taken) throw new ServerError(409, "此法号已有人使用，请另取");

    const p = new Player();
    p.id = client.sessionId;
    p.name = result.name;
    const look = Number(options?.look);
    p.look = Number.isInteger(look) && look >= 0 ? look % LOOK_COUNT : Math.floor(Math.random() * LOOK_COUNT);

    if (this.hallId === "courtyard") {
      const sx = Number(options?.x);
      const sz = Number(options?.z);
      const sr = Number(options?.rotY);
      if (Number.isFinite(sx) && Number.isFinite(sz)) {
        const c = clampToWalkable(sx, sz, "courtyard");
        p.x = c.x;
        p.z = c.z;
        p.rotY = Number.isFinite(sr) ? sr : 0;
      } else {
        p.x = (Math.random() - 0.5) * 6;
        p.z = -22 + Math.random() * 3;
        p.rotY = 0;
      }
    } else {
      const spawn = interiorSpawn(this.hallId);
      const sx = Number(options?.x);
      const sz = Number(options?.z);
      p.x = Number.isFinite(sx) ? sx : spawn.x;
      p.z = Number.isFinite(sz) ? sz : spawn.z;
      p.rotY = Number.isFinite(Number(options?.rotY)) ? Number(options.rotY) : spawn.rotY;
      const c = clampToWalkable(p.x, p.z, this.hallId);
      p.x = c.x;
      p.z = c.z;
    }
    p.y = 0;
    p.sitting = false;
    p.cushionId = -1;
    this.state.players.set(client.sessionId, p);
    client.send("hello", { version: BUILD_VERSION });
  }

  onLeave(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (p) {
      if (p.cushionId >= 0 && this.state.cushions[p.cushionId] === client.sessionId) {
        this.state.cushions[p.cushionId] = "";
      }
      this.leaveQueue(client.sessionId);
      this.state.players.delete(client.sessionId);
    }
    this.lastIncense.delete(client.sessionId);
  }

  private handleMove(client: Client, data: { x?: unknown; z?: unknown; rotY?: unknown }) {
    const p = this.state.players.get(client.sessionId);
    if (!p || p.sitting) return;
    // Ritual locks the monk in place (client also ignores input).
    if (p.ritualPhase > 0 && p.ritualPhase < RITUAL_PHASE.DONE) {
      const burner = BURNERS.find((b) => b.id === p.queueBurner);
      if (burner) {
        const pose = queueSlotPose(burner, 0);
        p.x = pose.x;
        p.z = pose.z;
        p.rotY = pose.rotY;
      }
      return;
    }
    const x = Number(data?.x);
    const z = Number(data?.z);
    const rotY = Number(data?.rotY);
    if (![x, z, rotY].every(Number.isFinite)) return;

    let nx = x;
    let nz = z;
    const d = Math.hypot(x - p.x, z - p.z);
    const maxD = MAX_MOVE_SPEED * MOVE_GRACE;
    if (d > maxD && d > 0) {
      const t = maxD / d;
      nx = p.x + (x - p.x) * t;
      nz = p.z + (z - p.z) * t;
    }
    const c = clampToWalkable(nx, nz, this.hallId);
    p.x = c.x;
    p.z = c.z;
    p.rotY = rotY;

    if (p.queueSlot >= 0 && p.queueBurner) {
      const burner = BURNERS.find((b) => b.id === p.queueBurner);
      if (burner) {
        const pose = queueSlotPose(burner, p.queueSlot);
        if (dist2(p.x, p.z, pose.x, pose.z) > QUEUE_LEAVE_DISTANCE * QUEUE_LEAVE_DISTANCE) {
          this.leaveQueue(client.sessionId);
          client.send("notice", { text: "已离开上香队列" });
        }
      }
    }
  }

  private handleSit(client: Client, data: { cushionId?: unknown }) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    if (this.hallId === "courtyard") {
      client.send("notice", { text: "请入殿后，再找蒲团打坐" });
      return;
    }
    if (p.sitting) {
      client.send("sit_ok", { cushionId: p.cushionId });
      return;
    }
    const id = Number(data?.cushionId);
    if (!Number.isInteger(id) || id < 0 || id >= CUSHION_COUNT) {
      client.send("notice", { text: "蒲团无效" });
      return;
    }
    const occupant = this.state.cushions[id];
    if (occupant && occupant !== client.sessionId) {
      client.send("notice", { text: "此蒲团已有人" });
      return;
    }
    const pos = cushionPosition(id, this.hallId);
    if (dist2(p.x, p.z, pos.x, pos.z) > SIT_RANGE * SIT_RANGE) {
      client.send("notice", { text: "请走近蒲团再打坐" });
      return;
    }
    p.x = pos.x;
    p.z = pos.z;
    p.rotY = 0;
    p.sitting = true;
    p.cushionId = id;
    this.state.cushions[id] = client.sessionId;
    client.send("sit_ok", { cushionId: id });
  }

  private handleStand(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (!p || !p.sitting) return;
    if (p.cushionId >= 0 && this.state.cushions[p.cushionId] === client.sessionId) {
      this.state.cushions[p.cushionId] = "";
    }
    p.sitting = false;
    p.cushionId = -1;
    client.send("stand_ok", {});
  }

  /**
   * 上香 button. Near a burner and not in a queue → join (auto-start ritual
   * once at the offering spot if you joined as the front). Already at the
   * front → start the ritual. Waiting behind others → a quiet reminder.
   */
  private handleIncense(client: Client, data: { burnerId?: unknown } | undefined) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    if (p.sitting) {
      client.send("notice", { text: "打坐时请先起身，再去上香" });
      return;
    }
    if (p.ritualPhase > 0 && p.ritualPhase < RITUAL_PHASE.DONE) return;

    if (p.queueSlot === 0 && p.queueBurner) {
      const burner = BURNERS.find((b) => b.id === p.queueBurner);
      if (burner) this.tryStartRitual(client.sessionId, burner, true);
      return;
    }
    if (p.queueSlot > 0) {
      client.send("notice", { text: `请排队等候，前面还有 ${p.queueSlot} 位` });
      return;
    }
    this.handleQueueJoin(client, data, true);
  }

  private handleQueueJoin(
    client: Client,
    data: { burnerId?: unknown } | undefined,
    offer: boolean,
  ) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    if (this.hallId !== "courtyard") {
      client.send("notice", { text: "请在殿门口的香炉上香" });
      return;
    }
    if (p.sitting) {
      client.send("notice", { text: "打坐时请先起身，再去上香" });
      return;
    }
    if (p.ritualPhase > 0 && p.ritualPhase < RITUAL_PHASE.DONE) return;

    const lineupLen = (id: string) => this.state.queues.get(id)?.lineup.length ?? 0;
    let burner = nearestQueueBurner(p.x, p.z, this.hallId, lineupLen);
    const asked = typeof data?.burnerId === "string" ? data.burnerId : "";
    if (asked) {
      const b = BURNERS.find((x) => x.id === asked);
      if (b && inQueueApproach(p.x, p.z, b, lineupLen(b.id))) burner = b;
    }
    if (!burner) {
      client.send("notice", { text: "请走近香炉再上香" });
      return;
    }

    // Already in this queue: just report the slot.
    if (p.queueBurner === burner.id && p.queueSlot >= 0) {
      client.send("queue_ok", { burnerId: burner.id, slot: p.queueSlot, ahead: p.queueSlot });
      if (offer && p.queueSlot === 0) this.tryStartRitual(client.sessionId, burner, true);
      return;
    }

    if (p.queueBurner) this.leaveQueue(client.sessionId);

    const q = this.state.queues.get(burner.id);
    if (!q) return;
    q.lineup.push(client.sessionId);
    this.reassign(q);
    const slot = q.lineup.indexOf(client.sessionId);
    if (offer && slot === 0) this.wantOffer.set(client.sessionId, true);
    client.send("queue_ok", { burnerId: burner.id, slot, ahead: slot });
  }

  private tryStartRitual(sid: string, burner: ReturnType<typeof nearestBurner> & object, snap: boolean) {
    if (!burner) return;
    const p = this.state.players.get(sid);
    const q = this.state.queues.get(burner.id);
    if (!p || !q) return;
    if (q.lineup[0] !== sid) return;
    if (q.ritualSid && q.ritualSid !== sid) return;
    if (p.ritualPhase > 0 && p.ritualPhase < RITUAL_PHASE.DONE) return;

    const now = Date.now();
    const last = this.lastIncense.get(sid) ?? 0;
    if (now - last < INCENSE_COOLDOWN_MS) {
      const client = this.clients.find((c) => c.sessionId === sid);
      client?.send("notice", { text: "心诚则灵，稍候再上" });
      return;
    }

    const pose = queueSlotPose(burner, 0);
    if (!snap && dist2(p.x, p.z, pose.x, pose.z) > ARRIVE_RANGE * ARRIVE_RANGE) {
      this.wantOffer.set(sid, true);
      p.x = pose.x;
      p.z = pose.z;
      p.rotY = pose.rotY;
      return;
    }
    p.x = pose.x;
    p.z = pose.z;
    p.rotY = pose.rotY;
    p.ritualPhase = RITUAL_PHASE.RAISE;
    p.ritualStartedAt = now;
    q.ritualSid = sid;
    this.wantOffer.delete(sid);
    this.ritualPlanted.delete(sid);
    this.lastIncense.set(sid, now);
    this.broadcast("ritual_start", {
      sessionId: sid,
      burnerId: burner.id,
      startedAt: now,
    });
  }

  private leaveQueue(sid: string) {
    const p = this.state.players.get(sid);
    const burnerId = p?.queueBurner ?? "";
    if (p) {
      p.queueBurner = "";
      p.queueSlot = -1;
      p.ritualPhase = 0;
      p.ritualStartedAt = 0;
    }
    this.wantOffer.delete(sid);
    this.ritualPlanted.delete(sid);
    this.state.queues.forEach((q) => {
      if (q.ritualSid === sid) q.ritualSid = "";
      const idx = q.lineup.indexOf(sid);
      if (idx >= 0) {
        q.lineup.splice(idx, 1);
        this.reassign(q);
      }
    });
    void burnerId;
  }

  private reassign(q: BurnerQueue) {
    const burner = BURNERS.find((b) => b.id === q.burnerId);
    if (!burner) return;
    // Drop ids that have already left the room.
    for (let i = q.lineup.length - 1; i >= 0; i--) {
      const sid: string | undefined = q.lineup[i];
      if (!sid || !this.state.players.has(sid)) q.lineup.splice(i, 1);
    }
    q.lineup.forEach((sid, i) => {
      const p = this.state.players.get(sid);
      if (!p) return;
      p.queueBurner = q.burnerId;
      p.queueSlot = i;
      if (p.ritualPhase === 0) {
        const pose = queueSlotPose(burner, i);
        p.x = pose.x;
        p.z = pose.z;
        p.rotY = pose.rotY;
      }
    });
  }

  private tickQueues() {
    if (this.hallId !== "courtyard") return;
    const now = Date.now();
    this.state.queues.forEach((q) => {
      const burner = BURNERS.find((b) => b.id === q.burnerId);
      if (!burner) return;

      // Auto-start ritual for a front member who already asked to offer and has arrived.
      if (!q.ritualSid && q.lineup.length > 0) {
        const front: string | undefined = q.lineup[0];
        if (front && this.wantOffer.get(front)) {
          const p = this.state.players.get(front);
          if (p) {
            const pose = queueSlotPose(burner, 0);
            if (dist2(p.x, p.z, pose.x, pose.z) <= ARRIVE_RANGE * ARRIVE_RANGE) {
              this.tryStartRitual(front, burner, true);
            } else {
              // Keep them on the offering spot so they arrive even if the client is idle.
              p.x = pose.x;
              p.z = pose.z;
              p.rotY = pose.rotY;
            }
          }
        }
      }

      if (!q.ritualSid) return;
      const p = this.state.players.get(q.ritualSid);
      if (!p) {
        q.ritualSid = "";
        this.reassign(q);
        return;
      }
      const elapsed = now - p.ritualStartedAt;
      const phase = ritualPhaseAt(elapsed);
      p.ritualPhase = phase;
      const pose = queueSlotPose(burner, 0);
      p.x = pose.x;
      p.z = pose.z;
      p.rotY = pose.rotY;

      if (elapsed >= ritualPlantAtMs() && !this.ritualPlanted.has(q.ritualSid)) {
        this.ritualPlanted.add(q.ritualSid);
        this.addStick(burner.id, burner.x, burner.z, p.name, now);
        this.broadcast("notice", { text: `${p.name} 上了一炷香` });
      }

      if (ritualFinished(elapsed)) {
        const sid = q.ritualSid;
        const hallId = burner.hallId;
        const client = this.clients.find((c) => c.sessionId === sid);
        this.leaveQueue(sid);
        client?.send("ritual_done", { hallId });
      }
    });
  }

  /** Preview/screenshot helper: snap a player, bypassing the move-speed cap. */
  private handleDebugTeleport(client: Client, data: { x?: unknown; z?: unknown; rotY?: unknown } | undefined) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    if (p.ritualPhase > 0 && p.ritualPhase < RITUAL_PHASE.DONE) return;
    const x = Number(data?.x);
    const z = Number(data?.z);
    const rotY = Number(data?.rotY);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const c = clampToWalkable(x, z, this.hallId);
    p.x = c.x;
    p.z = c.z;
    if (Number.isFinite(rotY)) p.rotY = rotY;
  }

  /** Preview/screenshot helper: plant many sticks on a burner with staggered ages. No countdown is shown. */
  private handleSeed(client: Client, data: { burnerId?: unknown; count?: unknown } | undefined) {
    if (this.hallId !== "courtyard") return;
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    const burner =
      BURNERS.find((b) => b.id === data?.burnerId) ?? nearestBurner(p.x, p.z, this.hallId) ?? BURNERS[0];
    if (!burner) return;
    const n = Math.max(1, Math.min(80, Number(data?.count) || 40));
    const now = Date.now();
    for (let i = 0; i < n; i++) {
      // Stagger litAt so the cluster shows a range of remaining lengths (still all < 10 min).
      const age = Math.floor((i / n) * (INCENSE_DURATION_MS * 0.75));
      this.addStick(burner.id, burner.x, burner.z, p.name, now - age);
    }
  }

  private addStick(burnerId: string, bx: number, bz: number, by: string, litAt: number) {
    const mine: string[] = [];
    this.state.incenses.forEach((inc, id) => {
      if (inc.burnerId === burnerId) mine.push(id);
    });
    // Retire oldest on this burner first if at the cap (they "burn down" early).
    if (mine.length >= MAX_INCENSE_PER_BURNER) {
      let oldestId = "";
      let oldest = Infinity;
      for (const id of mine) {
        const inc = this.state.incenses.get(id);
        if (inc && inc.litAt < oldest) {
          oldest = inc.litAt;
          oldestId = id;
        }
      }
      if (oldestId) this.state.incenses.delete(oldestId);
    }
    const inc = new Incense();
    inc.id = `${burnerId}-${litAt}-${Math.random().toString(36).slice(2, 7)}`;
    inc.by = by;
    inc.burnerId = burnerId;
    // Cluster in the ash bowl.
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.38;
    inc.x = bx + Math.cos(a) * r;
    inc.z = bz + Math.sin(a) * r * 0.72;
    inc.litAt = litAt;
    this.state.incenses.set(inc.id, inc);
  }

  private expireIncense() {
    const now = Date.now();
    const dead: string[] = [];
    this.state.incenses.forEach((inc, id) => {
      if (now - inc.litAt >= INCENSE_DURATION_MS) dead.push(id);
    });
    for (const id of dead) this.state.incenses.delete(id);
  }
}

/** Back-compat export so older imports still resolve. */
export { HallRoom as MainHallRoom };
