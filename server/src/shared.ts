/** Shared constants and temple layout — used by both server and client. */

export const CUSHION_COUNT = 50;
export const CUSHION_ROWS = 5;
export const CUSHION_COLS = 10;
/** Side-hall cushion spacing (slightly tighter than the main hall). */
export const CUSHION_SPACING_X = 1.55;
export const CUSHION_SPACING_Z = 1.65;
export const CUSHION_ORIGIN_Z = 3.2;
export const CUSHION_RADIUS = 0.48; // half-width of the square mat (visual)

/** Main-hall cushions: wider nave. */
export const MAIN_CUSHION_SPACING_X = 2.15;
export const MAIN_CUSHION_SPACING_Z = 2.2;
export const MAIN_CUSHION_ORIGIN_Z = 5.6;

/** Each stick burns exactly this long, then the server removes it. No HUD / labels. */
export const INCENSE_DURATION_MS = 10 * 60 * 1000;
/** Soft cap per burner: oldest stick is retired early if this is exceeded. */
export const MAX_INCENSE_PER_BURNER = 200;
export const MAX_CLIENTS = 50;
export const MAX_MOVE_SPEED = 6.5;
export const SIT_RANGE = 1.55;
export const PLAYER_RADIUS = 0.45;
export const INCENSE_RANGE = 2.4;

/**
 * Hall catalogue, ordered by Chinese Buddhist then folk-religious history
 * (see docs/HALLS.md). Courtyard positions: west row x=−20 faces +X,
 * east row x=+20 faces −X, south pair near the mountain gate faces +Z.
 */
export type HallId =
  | "courtyard"
  | "main"
  | "guanyin"
  | "wenshu"
  | "puxian"
  | "dizang"
  | "yaoshi"
  | "mile"
  | "qielan"
  | "wenchang"
  | "caishen"
  | "yuelao";

export type DeityKind =
  | "buddha"
  | "guanyin"
  | "wenshu"
  | "puxian"
  | "dizang"
  | "yaoshi"
  | "mile"
  | "guanyu"
  | "wenchang"
  | "caishen"
  | "yuelao";

export interface HallDef {
  id: HallId;
  room: string;
  name: string;
  deity: string;
  deityTitle: string;
  kind: DeityKind;
  /** Courtyard building centre. */
  x: number;
  z: number;
  /** Facade facing (yaw). */
  rotY: number;
  /** Historical / mythological note (short). */
  lore: string;
}

export const MAIN_HALL: HallDef = {
  id: "main",
  room: "main_hall",
  name: "大雄宝殿",
  deity: "释迦牟尼佛",
  deityTitle: "如来佛祖",
  kind: "buddha",
  x: 0,
  z: 0.6,
  rotY: Math.PI, // facade faces the courtyard (−Z)
  lore: "释迦牟尼，佛教教主，大雄宝殿为汉传寺院中轴主殿。",
};

export const SIDE_HALLS: HallDef[] = [
  {
    id: "guanyin", room: "hall_guanyin", name: "观音殿",
    deity: "观世音菩萨", deityTitle: "大慈大悲", kind: "guanyin",
    x: -20, z: -10, rotY: Math.PI / 2,
    lore: "观世音菩萨，东汉至两晋经典传入中土，是汉地最广为崇奉的菩萨。",
  },
  {
    id: "wenshu", room: "hall_wenshu", name: "文殊殿",
    deity: "文殊菩萨", deityTitle: "大智", kind: "wenshu",
    x: -20, z: -17, rotY: Math.PI / 2,
    lore: "文殊师利，大智，五台山道场；大乘早期经典中的智慧菩萨，常侍佛左。",
  },
  {
    id: "puxian", room: "hall_puxian", name: "普贤殿",
    deity: "普贤菩萨", deityTitle: "大行", kind: "puxian",
    x: -20, z: -24, rotY: Math.PI / 2,
    lore: "普贤菩萨，大行，峨眉道场；与文殊成对，表行愿。",
  },
  {
    id: "dizang", room: "hall_dizang", name: "地藏殿",
    deity: "地藏王菩萨", deityTitle: "地狱不空誓不成佛", kind: "dizang",
    x: -20, z: -31, rotY: Math.PI / 2,
    lore: "地藏菩萨，唐代金地藏驻九华后在汉地广为崇奉，誓度众生。",
  },
  {
    id: "yaoshi", room: "hall_yaoshi", name: "药师殿",
    deity: "药师佛", deityTitle: "药师琉璃光如来", kind: "yaoshi",
    x: 20, z: -10, rotY: -Math.PI / 2,
    lore: "药师琉璃光如来，东方净琉璃世界教主，大乘三世佛之一，主消灾延寿。",
  },
  {
    id: "mile", room: "hall_mile", name: "弥勒殿",
    deity: "弥勒佛", deityTitle: "当来下生", kind: "mile",
    x: 20, z: -17, rotY: -Math.PI / 2,
    lore: "弥勒，未来佛；汉地寺院常以弥勒为香客所见第一尊，此设专殿。",
  },
  {
    id: "qielan", room: "hall_qielan", name: "伽蓝殿",
    deity: "伽蓝菩萨（关公）", deityTitle: "护法伽蓝", kind: "guanyu",
    x: 20, z: -24, rotY: -Math.PI / 2,
    lore: "关羽（卒于公元 220 年），后世奉为伽蓝菩萨，是本寺民间诸殿中史实最早者。",
  },
  {
    id: "wenchang", room: "hall_wenchang", name: "文昌殿",
    deity: "文昌帝君", deityTitle: "司禄文衡", kind: "wenchang",
    x: 20, z: -31, rotY: -Math.PI / 2,
    lore: "文昌帝君，源自梓潼神，元仁宗封号后主科举文运，儒家与寺院常并祀。",
  },
  {
    id: "caishen", room: "hall_caishen", name: "财神殿",
    deity: "财神赵公明", deityTitle: "金龙如意正一玄坛真君", kind: "caishen",
    x: -8, z: -35.5, rotY: 0,
    lore: "赵公明等财神信仰盛于明代，是较晚近的民间崇祀。",
  },
  {
    id: "yuelao", room: "hall_yuelao", name: "月老殿",
    deity: "月下老人", deityTitle: "姻缘司命", kind: "yuelao",
    x: 8, z: -35.5, rotY: 0,
    lore: "月老，唐代李复言《续玄怪录·定婚店》首见其形象，专职殿祀更晚。",
  },
];

export const ALL_HALLS: HallDef[] = [MAIN_HALL, ...SIDE_HALLS];

export function hallByRoom(room: string): HallDef | undefined {
  if (room === "courtyard") return undefined;
  return ALL_HALLS.find((h) => h.room === room);
}

export function hallById(id: HallId): HallDef | undefined {
  if (id === "courtyard") return undefined;
  return ALL_HALLS.find((h) => h.id === id);
}

/** Bronze incense burner at a hall entrance (courtyard). */
export interface BurnerDef {
  id: string;
  hallId: HallId;
  x: number;
  z: number;
  radius: number;
}

/** Courtyard-side distance from a hall's centre to its façade plane. */
export function hallFrontDistance(h: HallDef): number {
  if (h.id === "main") return 0.48; // visual façade at world z≈0.12
  return Math.abs(h.x) > 15 ? 2.7 : 2.1;
}

function burnerInFront(h: HallDef): BurnerDef {
  // Stand in the courtyard, clearly in front of the door (not in the opening).
  // rotY = 0 faces +Z, π/2 faces +X, −π/2 faces −X, π faces −Z.
  const fx = Math.sin(h.rotY);
  const fz = Math.cos(h.rotY);
  // Main hall: z≈−2.0. Side halls: ~2.8 units past the façade so the burner
  // no longer sits in the doorway and blocks entry.
  const dist = h.id === "main" ? 2.6 : hallFrontDistance(h) + 2.8;
  return {
    id: `burner_${h.id}`,
    hallId: h.id,
    x: h.x + fx * dist,
    z: h.z + fz * dist,
    radius: INCENSE_RANGE,
  };
}

export const BURNERS: BurnerDef[] = ALL_HALLS.map(burnerInFront);

export const COURTYARD_BOUNDS = {
  minX: -22,
  maxX: 22,
  minZ: -36,
  maxZ: 0.4,
};

/** Local interior frame: door at z≈0, deity on +Z. */
export const INTERIOR_BOUNDS = {
  minX: -8.6,
  maxX: 8.6,
  minZ: -0.2,
  maxZ: 18.4,
};
export const INTERIOR_DAIS = { minX: -5.4, maxX: 5.4, minZ: 14.6, maxZ: 19.0 };

export const MAIN_INTERIOR_BOUNDS = {
  minX: -14.6,
  maxX: 14.6,
  minZ: -0.2,
  maxZ: 24.5,
};
export const MAIN_DAIS = { minX: -6.4, maxX: 6.4, minZ: 17.6, maxZ: 25.2 };

export function cushionPosition(i: number, hallId: HallId = "main"): { x: number; z: number } {
  const main = hallId === "main";
  const sx = main ? MAIN_CUSHION_SPACING_X : CUSHION_SPACING_X;
  const sz = main ? MAIN_CUSHION_SPACING_Z : CUSHION_SPACING_Z;
  const oz = main ? MAIN_CUSHION_ORIGIN_Z : CUSHION_ORIGIN_Z;
  const r = Math.floor(i / CUSHION_COLS);
  const c = i % CUSHION_COLS;
  const x = (c - (CUSHION_COLS - 1) / 2) * sx;
  const z = oz + r * sz;
  return { x, z };
}

export function allCushionPositions(hallId: HallId = "main"): { x: number; z: number }[] {
  return Array.from({ length: CUSHION_COUNT }, (_, i) => cushionPosition(i, hallId));
}

function inBox(x: number, z: number, b: { minX: number; maxX: number; minZ: number; maxZ: number }) {
  return x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
}

/** Push a courtyard position out of a side-hall building, leaving the doorway open. */
function pushOutOfBuilding(x: number, z: number, h: HallDef): { x: number; z: number } {
  const fx = Math.sin(h.rotY);
  const fz = Math.cos(h.rotY);
  const dx = x - h.x;
  const dz = z - h.z;
  const forward = dx * fx + dz * fz; // positive = courtyard side
  const side = dx * (-fz) + dz * fx;
  const front = hallFrontDistance(h);
  const back = -front;
  const halfW = 3.15;
  const doorHalf = 1.4;
  // Opening on the courtyard face stays walkable; walls are solid.
  const inDoor = Math.abs(side) < doorHalf && forward > front - 1.2 && forward < front + 2.2;
  if (inDoor) return { x, z };
  const inFoot = Math.abs(side) < halfW && forward < front + 0.35 && forward > back - 0.25;
  if (!inFoot) return { x, z };
  const push = (front + 0.4) - forward;
  return { x: x + fx * push, z: z + fz * push };
}

export function clampToWalkable(x: number, z: number, hallId: HallId = "courtyard"): { x: number; z: number } {
  if (hallId === "courtyard") {
    let nx = Math.max(COURTYARD_BOUNDS.minX, Math.min(COURTYARD_BOUNDS.maxX, x));
    let nz = Math.max(COURTYARD_BOUNDS.minZ, Math.min(COURTYARD_BOUNDS.maxZ, z));
    // Main hall façade at z≈0, opening |x|<4.0 — crossing it is a room transition,
    // but don't walk through the solid walls.
    const OPEN = 4.0;
    if (nz > -0.15) {
      if (Math.abs(nx) >= OPEN) nz = -0.15;
    }
    for (const h of SIDE_HALLS) {
      const p = pushOutOfBuilding(nx, nz, h);
      nx = p.x;
      nz = p.z;
    }
    return { x: nx, z: nz };
  }
  if (hallId === "main") {
    let nx = Math.max(MAIN_INTERIOR_BOUNDS.minX, Math.min(MAIN_INTERIOR_BOUNDS.maxX, x));
    let nz = Math.max(MAIN_INTERIOR_BOUNDS.minZ, Math.min(MAIN_INTERIOR_BOUNDS.maxZ, z));
    if (inBox(nx, nz, MAIN_DAIS)) nz = MAIN_DAIS.minZ;
    // front wall, opening |x|<4
    if (nz < 0.35 && Math.abs(nx) >= 4.0) nz = 0.35;
    return { x: nx, z: nz };
  }
  // Side-hall interiors
  let nx = Math.max(INTERIOR_BOUNDS.minX, Math.min(INTERIOR_BOUNDS.maxX, x));
  let nz = Math.max(INTERIOR_BOUNDS.minZ, Math.min(INTERIOR_BOUNDS.maxZ, z));
  if (inBox(nx, nz, INTERIOR_DAIS)) nz = INTERIOR_DAIS.minZ;
  if (nz < 0.35 && Math.abs(nx) >= 2.2) nz = 0.35;
  return { x: nx, z: nz };
}

/** Spawn just inside a hall door, facing the deity (+Z), clear of the exit trigger. */
export function interiorSpawn(_hallId: HallId): { x: number; z: number; rotY: number } {
  return { x: 0, z: 2.6, rotY: 0 };
}

/** Spawn in the courtyard after leaving a hall, past the door trigger and burner, facing the yard. */
export function courtyardSpawnFrom(h: HallDef): { x: number; z: number; rotY: number } {
  const fx = Math.sin(h.rotY);
  const fz = Math.cos(h.rotY);
  const dist = hallFrontDistance(h) + 4.6;
  return {
    x: h.x + fx * dist,
    z: h.z + fz * dist,
    rotY: h.rotY, // face into the courtyard (same as the facade facing)
  };
}

export function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function nearestBurner(
  x: number,
  z: number,
  hallId: HallId,
): BurnerDef | undefined {
  // Entrance burners live in the courtyard. Interiors have none (Henry: at each entrance).
  if (hallId !== "courtyard") return undefined;
  let best: BurnerDef | undefined;
  let bestD = Infinity;
  for (const b of BURNERS) {
    const d = dist2(x, z, b.x, b.z);
    if (d < b.radius * b.radius && d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

/** @deprecated use BURNERS; kept so older call sites that only know the main hall still typecheck during the swap. */
export const INCENSE_BURNER = BURNERS.find((b) => b.hallId === "main") ?? { x: 0, z: -2.6, radius: INCENSE_RANGE };

/**
 * Door approach: a generous zone in front of each façade, reached before any
 * wall collider. Walking into this zone starts the room transition.
 */
export function courtyardDoorHit(x: number, z: number): HallDef | undefined {
  // Main hall: on the steps, after the entrance burner at z≈−2, before the wall at z≈0.12.
  if (z > -1.8 && z < 0.8 && Math.abs(x) < 3.8) return MAIN_HALL;
  for (const h of SIDE_HALLS) {
    const fx = Math.sin(h.rotY);
    const fz = Math.cos(h.rotY);
    const dx = x - h.x;
    const dz = z - h.z;
    const forward = dx * fx + dz * fz;
    const side = dx * (-fz) + dz * fx;
    const front = hallFrontDistance(h);
    if (Math.abs(side) < 1.5 && forward < front + 1.55 && forward > front - 0.35) return h;
  }
  return undefined;
}

/** Leaving an interior through the entrance (local z toward the door). */
export function interiorExitHit(x: number, z: number, hallId: HallId): boolean {
  const open = hallId === "main" ? 4.0 : 2.2;
  return z < 0.95 && Math.abs(x) < open;
}

// Back-compat alias used by courtyard enclosure / older facades.
export const OTHER_HALLS = SIDE_HALLS;
export const HALL_BOUNDS = COURTYARD_BOUNDS;
export const DAIS = MAIN_DAIS;
export const CUSHION_ORIGIN_Z_MAIN = MAIN_CUSHION_ORIGIN_Z;
export const MAX_INCENSE = MAX_INCENSE_PER_BURNER;

/** Current client/server build id — must match <html data-version>. */
export const BUILD_VERSION = "round15-incense-queue-20261113";

/** Distance from burner centre to the offering (front-of-queue) stand point, into the courtyard. */
export const OFFER_DISTANCE = 1.45;
/** Spacing between queued monks, single-file, further into the courtyard. */
export const QUEUE_SLOT_SPACING = 1.2;
/** Walk this far from your assigned slot and you leave the queue. */
export const QUEUE_LEAVE_DISTANCE = 5.5;

export const RITUAL_PHASE = {
  NONE: 0,
  RAISE: 1,
  BOW1: 2,
  BOW2: 3,
  BOW3: 4,
  PLANT: 5,
  DONE: 6,
} as const;

/** Duration of each ritual phase, indexed by RITUAL_PHASE value. NONE is 0. */
export const RITUAL_PHASE_MS = [0, 500, 900, 900, 900, 1200, 500] as const;

export function ritualPlantAtMs(): number {
  // Stick is planted at the end of the PLANT phase.
  return (
    RITUAL_PHASE_MS[RITUAL_PHASE.RAISE] +
    RITUAL_PHASE_MS[RITUAL_PHASE.BOW1] +
    RITUAL_PHASE_MS[RITUAL_PHASE.BOW2] +
    RITUAL_PHASE_MS[RITUAL_PHASE.BOW3] +
    RITUAL_PHASE_MS[RITUAL_PHASE.PLANT]
  );
}

export function ritualDoneAtMs(): number {
  return ritualPlantAtMs() + RITUAL_PHASE_MS[RITUAL_PHASE.DONE];
}

/** Discrete ritual phase for an elapsed time since ritual start. 0 if not started / already finished. */
export function ritualPhaseAt(elapsedMs: number): number {
  if (elapsedMs < 0) return RITUAL_PHASE.NONE;
  let t = 0;
  for (let p = RITUAL_PHASE.RAISE; p <= RITUAL_PHASE.DONE; p++) {
    t += RITUAL_PHASE_MS[p];
    if (elapsedMs < t) return p;
  }
  return RITUAL_PHASE.DONE;
}

export function ritualFinished(elapsedMs: number): boolean {
  return elapsedMs >= ritualDoneAtMs();
}

/** Courtyard-ward unit vector from a burner (away from its hall) and the yaw to face the hall. */
export function burnerQueueAxis(b: BurnerDef): { ox: number; oz: number; rotY: number } {
  const h = hallById(b.hallId);
  if (!h) return { ox: 0, oz: -1, rotY: 0 };
  const ox = Math.sin(h.rotY);
  const oz = Math.cos(h.rotY);
  return { ox, oz, rotY: h.rotY + Math.PI };
}

/** World pose for lineup slot 0 (offering) … n, standing in a column behind the burner. */
export function queueSlotPose(
  burner: BurnerDef,
  slot: number,
): { x: number; z: number; rotY: number } {
  const { ox, oz, rotY } = burnerQueueAxis(burner);
  const dist = OFFER_DISTANCE + Math.max(0, slot) * QUEUE_SLOT_SPACING;
  return {
    x: burner.x + ox * dist,
    z: burner.z + oz * dist,
    rotY,
  };
}

/** How many people stand in front of this slot index. */
export function queueAhead(slot: number): number {
  return Math.max(0, slot);
}

/** Half-width of the queue corridor, perpendicular to the lineup. */
export const QUEUE_JOIN_HALF_WIDTH = 1.6;
/** Extra length past the next free slot where a newcomer may still join. */
export const QUEUE_JOIN_EXTRA = 2.2;

/** True if (x,z) is in this burner's queue corridor (or classic incense range). */
export function inQueueApproach(x: number, z: number, burner: BurnerDef, lineupLen = 0): boolean {
  const { ox, oz } = burnerQueueAxis(burner);
  const dx = x - burner.x;
  const dz = z - burner.z;
  const along = dx * ox + dz * oz;
  const side = dx * (-oz) + dz * ox;
  const maxAlong = OFFER_DISTANCE + Math.max(0, lineupLen) * QUEUE_SLOT_SPACING + QUEUE_JOIN_EXTRA;
  if (Math.abs(side) <= QUEUE_JOIN_HALF_WIDTH && along >= -0.8 && along <= maxAlong) return true;
  return dist2(x, z, burner.x, burner.z) <= (burner.radius + 0.4) * (burner.radius + 0.4);
}

/** Nearest courtyard burner whose queue corridor contains this point. */
export function nearestQueueBurner(
  x: number,
  z: number,
  hallId: HallId,
  lineupLen: (id: string) => number = () => 0,
): BurnerDef | undefined {
  if (hallId !== "courtyard") return undefined;
  let best: BurnerDef | undefined;
  let bestD = Infinity;
  for (const b of BURNERS) {
    if (!inQueueApproach(x, z, b, lineupLen(b.id))) continue;
    const d = dist2(x, z, b.x, b.z);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}
