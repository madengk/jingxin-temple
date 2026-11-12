import colyseus from "colyseus";
import type { Client } from "colyseus";
const { Room, ServerError } = colyseus;
import { MainHallState, Player, Incense } from "./schema";
import { validateName } from "../profanity";
import {
  CUSHION_COUNT,
  INCENSE_BURNER,
  INCENSE_DURATION_MS,
  MAX_CLIENTS,
  MAX_INCENSE,
  MAX_MOVE_SPEED,
  SIT_RANGE,
  clampToWalkable,
  cushionPosition,
  dist2,
} from "../shared";

const LOOK_COUNT = 8;
const MOVE_GRACE = 0.4; // seconds of travel allowed per packet

export class MainHallRoom extends Room<MainHallState> {
  maxClients = MAX_CLIENTS;
  patchRate = 50;

  private lastIncense = new Map<string, number>();

  onCreate() {
    this.setState(new MainHallState());
    for (let i = 0; i < CUSHION_COUNT; i++) this.state.cushions.push("");

    this.onMessage("move", (client, data) => this.handleMove(client, data));
    this.onMessage("sit", (client, data) => this.handleSit(client, data));
    this.onMessage("stand", (client) => this.handleStand(client));
    this.onMessage("incense", (client) => this.handleIncense(client));

    this.setSimulationInterval(() => this.expireIncense(), 1000);
  }

  onJoin(client: Client, options: { name?: unknown }) {
    const result = validateName(options?.name);
    if (!result.ok) throw new ServerError(400, result.reason);

    const taken = [...this.state.players.values()].some(
      (p) => p.name.localeCompare(result.name, "zh", { sensitivity: "accent" }) === 0
        || p.name.toLowerCase() === result.name.toLowerCase(),
    );
    if (taken) throw new ServerError(409, "此法号已有人使用，请另取");

    const p = new Player();
    p.id = client.sessionId;
    p.name = result.name;
    p.look = Math.floor(Math.random() * LOOK_COUNT);
    p.x = (Math.random() - 0.5) * 6;
    p.y = 0;
    p.z = -22 + Math.random() * 3;
    p.rotY = 0;
    p.sitting = false;
    p.cushionId = -1;
    this.state.players.set(client.sessionId, p);
  }

  onLeave(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (p) {
      if (p.cushionId >= 0 && this.state.cushions[p.cushionId] === client.sessionId) {
        this.state.cushions[p.cushionId] = "";
      }
      this.state.players.delete(client.sessionId);
    }
    this.lastIncense.delete(client.sessionId);
  }

  private handleMove(client: Client, data: { x?: unknown; z?: unknown; rotY?: unknown }) {
    const p = this.state.players.get(client.sessionId);
    if (!p || p.sitting) return;
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
    const c = clampToWalkable(nx, nz);
    p.x = c.x;
    p.z = c.z;
    p.rotY = rotY;
  }

  private handleSit(client: Client, data: { cushionId?: unknown }) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
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
    const pos = cushionPosition(id);
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

  private handleIncense(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    if (p.sitting) {
      client.send("notice", { text: "打坐时请先起身，再去上香" });
      return;
    }
    if (dist2(p.x, p.z, INCENSE_BURNER.x, INCENSE_BURNER.z) > INCENSE_BURNER.radius ** 2) {
      client.send("notice", { text: "请走近香炉再上香" });
      return;
    }
    const now = Date.now();
    const last = this.lastIncense.get(client.sessionId) ?? 0;
    if (now - last < 2500) {
      client.send("notice", { text: "心诚则灵，稍候再上" });
      return;
    }
    this.lastIncense.set(client.sessionId, now);

    while (this.state.incenses.size >= MAX_INCENSE) {
      let oldestId = "";
      let oldest = Infinity;
      this.state.incenses.forEach((inc, id) => {
        if (inc.litAt < oldest) {
          oldest = inc.litAt;
          oldestId = id;
        }
      });
      if (oldestId) this.state.incenses.delete(oldestId);
      else break;
    }

    const inc = new Incense();
    inc.id = `${client.sessionId}-${now}`;
    inc.by = p.name;
    inc.x = INCENSE_BURNER.x + (Math.random() - 0.5) * 0.5;
    inc.z = INCENSE_BURNER.z + (Math.random() - 0.5) * 0.32;
    inc.litAt = now;
    this.state.incenses.set(inc.id, inc);
    this.broadcast("notice", { text: `${p.name} 上了一炷香` });
  }

  private expireIncense() {
    const now = Date.now();
    const dead: string[] = [];
    this.state.incenses.forEach((inc, id) => {
      if (now - inc.litAt > INCENSE_DURATION_MS) dead.push(id);
    });
    for (const id of dead) this.state.incenses.delete(id);
  }
}
