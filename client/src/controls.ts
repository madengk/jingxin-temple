import * as THREE from "three";

export class Controls {
  keys = new Set<string>();
  joy = { x: 0, y: 0, active: false };
  dest: THREE.Vector3 | null = null;
  private joyBase: HTMLElement | null = null;
  private joyKnob: HTMLElement | null = null;
  private joyTouch: number | null = null;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(k)) {
        e.preventDefault();
        this.dest = null;
      }
    };
    this.onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  attachJoystick(base: HTMLElement, knob: HTMLElement) {
    this.joyBase = base;
    this.joyKnob = knob;
    const start = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      base.setPointerCapture(e.pointerId);
      this.joyTouch = e.pointerId;
      this.joy.active = true;
      this.dest = null;
      this.updateJoy(e);
    };
    const move = (e: PointerEvent) => {
      if (this.joyTouch !== e.pointerId) return;
      this.updateJoy(e);
    };
    const end = (e: PointerEvent) => {
      if (this.joyTouch !== e.pointerId) return;
      this.joyTouch = null;
      this.joy.active = false;
      this.joy.x = 0;
      this.joy.y = 0;
      knob.style.left = "36px";
      knob.style.top = "36px";
    };
    base.addEventListener("pointerdown", start);
    base.addEventListener("pointermove", move);
    base.addEventListener("pointerup", end);
    base.addEventListener("pointercancel", end);
  }

  private updateJoy(e: PointerEvent) {
    if (!this.joyBase || !this.joyKnob) return;
    const r = this.joyBase.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const max = r.width * 0.38;
    const d = Math.hypot(dx, dy);
    if (d > max) {
      dx = (dx / d) * max;
      dy = (dy / d) * max;
    }
    this.joy.x = dx / max;
    this.joy.y = dy / max;
    this.joyKnob.style.left = `${36 + dx}px`;
    this.joyKnob.style.top = `${36 + dy}px`;
  }

  /** Camera-relative XZ movement request, length 0..1. */
  moveAxis(camYaw: number): { x: number; z: number; moving: boolean } {
    let ix = 0;
    let iz = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) iz += 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) iz -= 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) ix -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) ix += 1;
    if (this.joy.active) {
      ix += this.joy.x;
      iz += -this.joy.y;
    }
    const len = Math.hypot(ix, iz);
    if (len > 1) {
      ix /= len;
      iz /= len;
    }
    if (len < 0.08 && !this.dest) return { x: 0, z: 0, moving: false };
    if (len >= 0.08) {
      const c = Math.cos(camYaw);
      const s = Math.sin(camYaw);
      // forward is -Z of camera yaw? Camera looks at player from behind.
      // If camYaw is the yaw of the camera looking direction (towards +Z default 0),
      // forward world = (sin(yaw), cos(yaw)) when yaw 0 looks +Z.
      const fx = s * iz + c * ix;
      const fz = c * iz - s * ix;
      return { x: fx, z: fz, moving: true };
    }
    return { x: 0, z: 0, moving: false };
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}
