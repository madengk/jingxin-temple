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

  /**
   * Third-person tank-style intent:
   * W/S (or up/down, joystick vertical) = forward / back along facing;
   * A/D (or left/right, joystick horizontal) = turn in place.
   * Returns forward and turn in -1..1.
   */
  moveIntent(): { forward: number; turn: number; walking: boolean } {
    let forward = 0;
    let turn = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) forward += 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) forward -= 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) turn += 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) turn -= 1;
    if (this.joy.active) {
      forward += -this.joy.y;
      turn += -this.joy.x;
    }
    if (Math.abs(forward) < 0.08) forward = 0;
    if (Math.abs(turn) < 0.08) turn = 0;
    if (Math.abs(forward) > 1) forward = Math.sign(forward);
    if (Math.abs(turn) > 1) turn = Math.sign(turn);
    return { forward, turn, walking: forward !== 0 };
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}
