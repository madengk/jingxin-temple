/**
 * Shared-world placement: interiors and the courtyard share a door-aligned
 * frame so looking through an open door shows the other side, and walking
 * across only changes the collision / network hall — not the view.
 *
 * Main hall: door pose is the identity, so courtyard and 大雄宝殿 occupy
 * the same coordinates (façade and interior door both at z≈0).
 * Side halls are "bigger on the inside": when you are in one, the courtyard
 * is inverse-transformed so its façade door sits on the interior door, and
 * the player / camera are remapped in the same frame (visually continuous).
 */
import type { HallDef, HallId } from "../../../server/src/shared";
import { hallById, hallFrontDistance } from "../../../server/src/shared";

export interface DoorPose {
  x: number;
  z: number;
  /** Yaw that takes interior-local +Z (toward the deity) into courtyard world. */
  inwardYaw: number;
}

export function defFor(id: HallId): HallDef | null {
  if (id === "courtyard") return null;
  return hallById(id) ?? null;
}

/** Courtyard-world pose of an interior's door plane. Main hall is identity. */
export function doorPose(h: HallDef): DoorPose {
  if (h.id === "main") return { x: 0, z: 0, inwardYaw: 0 };
  const front = hallFrontDistance(h);
  const fx = Math.sin(h.rotY);
  const fz = Math.cos(h.rotY);
  return {
    x: h.x + fx * front,
    z: h.z + fz * front,
    inwardYaw: h.rotY + Math.PI,
  };
}

function ry(yaw: number, x: number, z: number): { x: number; z: number } {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return { x: x * c + z * s, z: -x * s + z * c };
}

/** Interior-local point → courtyard world. Courtyard is a no-op. */
export function localToWorld(
  id: HallId, lx: number, lz: number,
): { x: number; z: number } {
  const h = defFor(id);
  if (!h) return { x: lx, z: lz };
  const d = doorPose(h);
  const r = ry(d.inwardYaw, lx, lz);
  return { x: d.x + r.x, z: d.z + r.z };
}

/** Courtyard world → interior-local. */
export function worldToLocal(
  id: HallId, wx: number, wz: number,
): { x: number; z: number } {
  const h = defFor(id);
  if (!h) return { x: wx, z: wz };
  const d = doorPose(h);
  return ry(-d.inwardYaw, wx - d.x, wz - d.z);
}

export function localRotToWorld(id: HallId, rotY: number): number {
  const h = defFor(id);
  return h ? rotY + doorPose(h).inwardYaw : rotY;
}

export function worldRotToLocal(id: HallId, rotY: number): number {
  const h = defFor(id);
  return h ? rotY - doorPose(h).inwardYaw : rotY;
}

export function localToWorldPoint(
  id: HallId, x: number, y: number, z: number,
): { x: number; y: number; z: number } {
  const p = localToWorld(id, x, z);
  return { x: p.x, y, z: p.z };
}

export function worldToLocalPoint(
  id: HallId, x: number, y: number, z: number,
): { x: number; y: number; z: number } {
  const p = worldToLocal(id, x, z);
  return { x: p.x, y, z: p.z };
}

/**
 * Pose of the courtyard group when the scene is in hall `id`'s local frame.
 * Identity when the scene is the courtyard (or the main hall, whose door
 * pose is the identity).
 */
export function courtyardTransformIn(id: HallId): { x: number; z: number; rotY: number } {
  const h = defFor(id);
  if (!h) return { x: 0, z: 0, rotY: 0 };
  const d = doorPose(h);
  if (d.inwardYaw === 0 && d.x === 0 && d.z === 0) return { x: 0, z: 0, rotY: 0 };
  // p_local = R(-yaw) * (p_world - door)
  const inv = ry(-d.inwardYaw, -d.x, -d.z);
  return { x: inv.x, z: inv.z, rotY: -d.inwardYaw };
}

/** Remap a point from hall `from`'s local frame into hall `to`'s. */
export function transferPoint(
  from: HallId, to: HallId, x: number, y: number, z: number,
): { x: number; y: number; z: number } {
  const w = localToWorldPoint(from, x, y, z);
  return worldToLocalPoint(to, w.x, w.y, w.z);
}

export function transferRot(from: HallId, to: HallId, rotY: number): number {
  return worldRotToLocal(to, localRotToWorld(from, rotY));
}

/** Facing into a hall from the courtyard (world yaw). */
export function inwardYaw(id: HallId): number {
  const h = defFor(id);
  return h ? doorPose(h).inwardYaw : 0;
}
