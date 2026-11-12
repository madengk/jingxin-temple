/** 108-bead digital 佛珠: tap or swipe to advance, with a local counter. */

export class Beads {
  count = 0;
  rounds = 0;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dragging = false;
  private lastAng = 0;
  private acc = 0;
  onAdvance: (count: number, completedRound: boolean) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    const start = (e: PointerEvent) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      this.dragging = true;
      this.lastAng = this.angle(e);
      this.acc = 0;
    };
    const move = (e: PointerEvent) => {
      if (!this.dragging) return;
      const a = this.angle(e);
      let d = a - this.lastAng;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      this.lastAng = a;
      this.acc += Math.abs(d);
      const step = 0.12;
      while (this.acc >= step) {
        this.acc -= step;
        this.advance();
      }
    };
    const end = (e: PointerEvent) => {
      if (!this.dragging) return;
      const wasDrag = this.acc > 0.02;
      this.dragging = false;
      if (!wasDrag && this.acc < 0.02) this.advance();
    };
    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    this.draw();
  }

  private angle(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    return Math.atan2(y, x);
  }

  advance() {
    this.count += 1;
    let round = false;
    if (this.count >= 108) {
      this.count = 0;
      this.rounds += 1;
      round = true;
    }
    this.draw();
    this.onAdvance(this.count, round);
  }

  draw() {
    const c = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = w * 0.38;
    c.clearRect(0, 0, w, h);
    // outer ring
    c.beginPath();
    c.arc(cx, cy, r + 16, 0, Math.PI * 2);
    c.strokeStyle = "rgba(212,179,106,0.25)";
    c.lineWidth = 2;
    c.stroke();
    for (let i = 0; i < 108; i++) {
      const a = -Math.PI / 2 + (i / 108) * Math.PI * 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      const isGuru = i === 0;
      const done = this.count > 0 && i > 0 && i <= this.count;
      const cur = i === this.count || (this.count === 0 && i === 0);
      c.beginPath();
      c.arc(x, y, isGuru ? 7 : cur ? 6.2 : 4.2, 0, Math.PI * 2);
      if (isGuru) c.fillStyle = "#e8d5a3";
      else if (cur) c.fillStyle = "#f0d9a0";
      else if (done) c.fillStyle = "#c9a84c";
      else c.fillStyle = "rgba(200,180,140,0.35)";
      c.fill();
      if (cur) {
        c.strokeStyle = "#fff6d8";
        c.lineWidth = 1.5;
        c.stroke();
      }
    }
  }
}
