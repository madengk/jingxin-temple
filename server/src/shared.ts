/** Shared constants and layout used by both server and client. */

export const CUSHION_COUNT = 50;
export const CUSHION_ROWS = 5;
export const CUSHION_COLS = 10;
export const CUSHION_SPACING_X = 2.15;
export const CUSHION_SPACING_Z = 2.2;
export const CUSHION_ORIGIN_Z = 7.2;
export const CUSHION_RADIUS = 0.55;

export const HALL_BOUNDS = {
  minX: -22,
  maxX: 22,
  minZ: -36,
  maxZ: 24.5,
};

/** Do not walk onto the Buddha dais. */
export const DAIS = { minX: -6.2, maxX: 6.2, minZ: 18.4, maxZ: 25.5 };

export const INCENSE_BURNER = { x: 0, z: 17.2, radius: 2.4 };
export const MAX_INCENSE = 24;
export const INCENSE_DURATION_MS = 90_000;
export const MAX_CLIENTS = 50;
export const MAX_MOVE_SPEED = 6.5;
export const SIT_RANGE = 1.55;
export const PLAYER_RADIUS = 0.45;

export const OTHER_HALLS = [
  { name: "观音殿", x: -20, z: -10, rotY: Math.PI / 2 },
  { name: "文殊殿", x: -20, z: -17, rotY: Math.PI / 2 },
  { name: "普贤殿", x: -20, z: -24, rotY: Math.PI / 2 },
  { name: "地藏殿", x: -20, z: -31, rotY: Math.PI / 2 },
  { name: "药师殿", x: 20, z: -10, rotY: -Math.PI / 2 },
  { name: "弥勒殿", x: 20, z: -17, rotY: -Math.PI / 2 },
  { name: "伽蓝殿", x: 20, z: -24, rotY: -Math.PI / 2 },
  { name: "文昌殿", x: 20, z: -31, rotY: -Math.PI / 2 },
  { name: "财神殿", x: -8, z: -35.5, rotY: 0 },
  { name: "月老殿", x: 8, z: -35.5, rotY: 0 },
] as const;

export function cushionPosition(i: number): { x: number; z: number } {
  const r = Math.floor(i / CUSHION_COLS);
  const c = i % CUSHION_COLS;
  const x = (c - (CUSHION_COLS - 1) / 2) * CUSHION_SPACING_X;
  const z = CUSHION_ORIGIN_Z + r * CUSHION_SPACING_Z;
  return { x, z };
}

export function allCushionPositions(): { x: number; z: number }[] {
  return Array.from({ length: CUSHION_COUNT }, (_, i) => cushionPosition(i));
}

export function clampToWalkable(x: number, z: number): { x: number; z: number } {
  let nx = Math.max(HALL_BOUNDS.minX, Math.min(HALL_BOUNDS.maxX, x));
  let nz = Math.max(HALL_BOUNDS.minZ, Math.min(HALL_BOUNDS.maxZ, z));
  // Keep off the Buddha dais
  if (nx > DAIS.minX && nx < DAIS.maxX && nz > DAIS.minZ && nz < DAIS.maxZ) {
    // Push toward the front edge (smaller z)
    nz = DAIS.minZ;
  }
  // Hall side walls (interior of main hall is narrower)
  if (nz > 0.6) {
    nx = Math.max(-14.6, Math.min(14.6, nx));
  }
  // Front wall of the hall, with a central doorway
  const OPEN = 4.2;
  if (nz > -0.4 && nz < 0.9 && Math.abs(nx) >= OPEN) {
    nz = nz < 0.25 ? -0.4 : 0.9;
  }
  return { x: nx, z: nz };
}

export function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}
