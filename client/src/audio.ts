/**
 * Audio for 静心寺.
 *
 * - BGM: 《大悲咒（经典版）》 provided by the project owner (Henry), looped
 *   after the first user gesture. Prefers /audio/dabei-zhou.ogg and falls
 *   back to .m4a / .mp3 for iOS Safari. See docs/LICENSES.md.
 * - During meditation the 大悲咒 continues (slightly calmer); no substitute chant.
 * - Wooden fish: a real recorded mokugyo strike (CC0, Kōyasan). Bead clicks
 *   remain a short original WebAudio one-shot.
 */

const VOL_KEY = "jingxin_volume";
const MUTE_KEY = "jingxin_muted";

function loadVol(): number {
  const v = Number(localStorage.getItem(VOL_KEY));
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.7;
}

export class TempleAudio {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private bgmGain!: GainNode;
  private chantGain!: GainNode;
  private sfxGain!: GainNode;
  private muyuBuf: AudioBuffer | null = null;
  private clickBuf: AudioBuffer | null = null;
  private bowlBuf: AudioBuffer | null = null;
  private bgmTimer = 0;
  private chantNodes: AudioNode[] = [];
  private bgmNodes: AudioNode[] = [];
  private dabeiBuf: AudioBuffer | null = null;
  private dabeiSrc: AudioBufferSourceNode | null = null;
  private started = false;
  private startingBgm = false;
  sitting = false;
  muted = localStorage.getItem(MUTE_KEY) === "1";
  volume = loadVol();

  async unlock(): Promise<void> {
    if (!this.ctx) this.init();
    if (this.ctx!.state !== "running") {
      // resume() may never resolve if the browser blocks autoplay (no user gesture)
      await Promise.race([
        this.ctx!.resume(),
        new Promise<void>((r) => setTimeout(r, 400)),
      ]);
    }
    this.tryStartBgm();
    this.applyMute();
  }

  private tryStartBgm() {
    if (!this.ctx || this.started || this.startingBgm) return;
    if (this.ctx.state !== "running") return;
    this.startingBgm = true;
    void this.startBgm().finally(() => {
      this.started = true;
      this.startingBgm = false;
    });
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    localStorage.setItem(VOL_KEY, String(this.volume));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
    this.applyMute();
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setSitting(v: boolean) {
    this.sitting = v;
    if (!this.ctx || !this.started) return;
    const t = this.ctx.currentTime;
    this.bgmGain.gain.cancelScheduledValues(t);
    // Keep 大悲咒 throughout meditation; just settle a little quieter.
    this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, t);
    this.bgmGain.gain.linearRampToValueAtTime(v ? 0.82 : 1, t + 1.4);
  }

  playMuyu() {
    // New BufferSource each tap so rapid hits overlap instead of cutting off.
    // Slight pitch/volume jitter keeps a run of strikes from sounding identical.
    const amp = 0.82 + Math.random() * 0.2;
    const rate = 1 + (Math.random() - 0.5) * 0.06;
    this.playBuf(this.muyuBuf, amp, rate);
  }

  playBead() {
    this.playBuf(this.clickBuf, 0.45, 1 + (Math.random() - 0.5) * 0.06);
  }

  playBowlSoft() {
    this.playBuf(this.bowlBuf, 0.35, 0.95 + Math.random() * 0.08);
  }

  private applyMute() {
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.04);
  }

  private init() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(ctx.destination);

    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.value = 1;
    this.bgmGain.connect(this.master);

    this.chantGain = ctx.createGain();
    this.chantGain.gain.value = 0;
    this.chantGain.connect(this.master);

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);

    this.muyuBuf = makeWoodenFish(ctx); // fallback until the recorded strike loads
    this.clickBuf = makeBeadClick(ctx);
    this.bowlBuf = makeSingingBowl(ctx, 196, 5.5);
    ctx.onstatechange = () => this.tryStartBgm();
    void this.loadMuyu(ctx);
  }

  private async loadMuyu(ctx: AudioContext) {
    try {
      const arr = await fetchFirstAudio(["/audio/muyu.ogg", "/audio/muyu.m4a", "/audio/muyu.mp3"]);
      this.muyuBuf = await ctx.decodeAudioData(arr.slice(0));
    } catch (err) {
      console.warn("木鱼录音未能加载，暂用合成回退", err);
    }
  }

  private async startBgm() {
    const ctx = this.ctx!;
    // Quiet drone bed under the recitation (also a fallback if the file fails).
    this.startSoftDrone(0.28);
    try {
      const arr = await fetchDabeiBytes();
      this.dabeiBuf = await ctx.decodeAudioData(arr.slice(0));
    } catch (err) {
      console.warn("大悲咒 audio unavailable, using drone only", err);
      this.startLegacyPhrases();
      return;
    }
    this.playDabeiLoop();
  }

  private playDabeiLoop() {
    if (!this.ctx || !this.dabeiBuf) return;
    if (this.dabeiSrc) {
      try { this.dabeiSrc.stop(); this.dabeiSrc.disconnect(); } catch { /* already stopped */ }
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.dabeiBuf;
    src.loop = true;
    src.loopStart = 0;
    src.loopEnd = this.dabeiBuf.duration;
    const g = this.ctx.createGain();
    g.gain.value = 0.95;
    src.connect(g);
    g.connect(this.bgmGain);
    src.start();
    this.dabeiSrc = src;
    this.bgmNodes.push(src, g);
  }

  private startSoftDrone(scale: number) {
    const ctx = this.ctx!;
    const dest = this.bgmGain;
    const droneFreqs = [73.4, 73.9, 110.0, 110.6, 146.8, 220.0];
    const droneGains = [0.12, 0.1, 0.09, 0.07, 0.045, 0.03].map((v) => v * scale);
    droneFreqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = droneGains[i];
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.06 + i * 0.017;
      const lfoG = ctx.createGain();
      lfoG.gain.value = droneGains[i] * 0.35;
      lfo.connect(lfoG);
      lfoG.connect(g.gain);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 700;
      osc.connect(g);
      g.connect(lp);
      lp.connect(dest);
      osc.start();
      lfo.start();
      this.bgmNodes.push(osc, lfo, g, lp);
    });
    const noise = makeNoiseSource(ctx, 2);
    const ng = ctx.createGain();
    ng.gain.value = 0.02 * scale;
    const nlp = ctx.createBiquadFilter();
    nlp.type = "lowpass";
    nlp.frequency.value = 480;
    noise.connect(nlp);
    nlp.connect(ng);
    ng.connect(dest);
    noise.start();
    this.bgmNodes.push(noise, ng, nlp);
  }

  private startLegacyPhrases() {
    const tick = () => {
      if (!this.ctx || !this.started) return;
      const roll = Math.random();
      if (roll < 0.45) this.scheduleBowl();
      else if (roll < 0.72) this.scheduleGuqinPhrase();
      else this.scheduleFlutePhrase();
      const wait = 7000 + Math.random() * 9000;
      this.bgmTimer = window.setTimeout(tick, wait);
    };
    this.bgmTimer = window.setTimeout(tick, 2500);
  }

  private scheduleBowl() {
    if (!this.ctx || !this.bowlBuf) return;
    const fund = 164 + Math.random() * 80;
    const buf = makeSingingBowl(this.ctx, fund, 6 + Math.random() * 2);
    this.playBuf(buf, 0.22 + Math.random() * 0.12, 1, this.bgmGain);
  }

  private scheduleGuqinPhrase() {
    const ctx = this.ctx!;
    // 宫商角徵羽 around D3–A4, just intonation-ish
    const scale = [146.8, 165.0, 196.0, 220.0, 261.6, 293.7, 329.6];
    const n = 2 + Math.floor(Math.random() * 3);
    let t = ctx.currentTime + 0.05;
    let idx = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const f = scale[Math.max(0, Math.min(scale.length - 1, idx))];
      this.pluckGuqin(f, t, 0.09);
      t += 0.55 + Math.random() * 0.45;
      idx += Math.random() < 0.5 ? 1 : -1;
    }
  }

  private pluckGuqin(freq: number, when: number, amp: number) {
    const ctx = this.ctx!;
    const dest = this.bgmGain;
    const dur = 2.8;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq * 1.01, when);
    osc.frequency.exponentialRampToValueAtTime(freq, when + 0.04);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(amp, when + 0.018);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1800, when);
    lp.frequency.exponentialRampToValueAtTime(600, when + 1.2);
    // second harmonic, quieter, shorter
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = freq * 2;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, when);
    g2.gain.linearRampToValueAtTime(amp * 0.22, when + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.001, when + 1.1);
    osc.connect(g);
    g.connect(lp);
    lp.connect(dest);
    o2.connect(g2);
    g2.connect(dest);
    osc.start(when);
    o2.start(when);
    osc.stop(when + dur);
    o2.stop(when + 1.3);
  }

  private scheduleFlutePhrase() {
    const ctx = this.ctx!;
    const scale = [392.0, 440.0, 493.9, 523.3, 587.3];
    const n = 2 + Math.floor(Math.random() * 2);
    let t = ctx.currentTime + 0.05;
    let idx = Math.floor(Math.random() * scale.length);
    for (let i = 0; i < n; i++) {
      const f = scale[Math.max(0, Math.min(scale.length - 1, idx))];
      this.fluteNote(f, t, 1.1 + Math.random() * 0.5, 0.045);
      t += 1.15 + Math.random() * 0.4;
      idx += Math.random() < 0.55 ? 1 : -1;
    }
  }

  private fluteNote(freq: number, when: number, dur: number, amp: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const vib = ctx.createOscillator();
    vib.type = "sine";
    vib.frequency.value = 4.8;
    const vibG = ctx.createGain();
    vibG.gain.value = 3.2;
    vib.connect(vibG);
    vibG.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(amp, when + 0.18);
    g.gain.setValueAtTime(amp, when + dur - 0.25);
    g.gain.linearRampToValueAtTime(0, when + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2000;
    osc.connect(g);
    g.connect(lp);
    lp.connect(this.bgmGain);
    osc.start(when);
    vib.start(when);
    osc.stop(when + dur + 0.05);
    vib.stop(when + dur + 0.05);
  }

  private startChant() {
    if (this.chantNodes.length) return;
    const ctx = this.ctx!;
    const dest = this.chantGain;
    const fund = 123.5;

    const makeVoice = (f: number, amp: number, formants: number[]) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      const vib = ctx.createOscillator();
      vib.frequency.value = 0.22 + Math.random() * 0.08;
      const vibG = ctx.createGain();
      vibG.gain.value = 1.6;
      vib.connect(vibG);
      vibG.connect(osc.frequency);

      let node: AudioNode = osc;
      for (const ff of formants) {
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = ff;
        bp.Q.value = 7;
        node.connect(bp);
        node = bp;
        this.chantNodes.push(bp);
      }
      const g = ctx.createGain();
      g.gain.value = amp;
      const breath = ctx.createOscillator();
      breath.frequency.value = 0.12;
      const bg = ctx.createGain();
      bg.gain.value = amp * 0.25;
      breath.connect(bg);
      bg.connect(g.gain);
      node.connect(g);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1600;
      g.connect(lp);
      lp.connect(dest);
      osc.start();
      vib.start();
      breath.start();
      this.chantNodes.push(osc, vib, g, lp, breath);
    };

    // "Om"-like formants (approx. /o/ then a hint of /m/)
    makeVoice(fund, 0.045, [560, 920, 2400]);
    makeVoice(fund * 1.005, 0.032, [540, 980, 2300]);
    makeVoice(fund * 0.5, 0.04, [280, 600]);

    // Soft periodic qing
    const qing = () => {
      if (!this.sitting || !this.ctx) return;
      this.playBuf(makeSingingBowl(this.ctx, 392, 4.2), 0.18, 1, this.chantGain);
    };
    const id = window.setInterval(qing, 11000);
    this.chantNodes.push({ disconnect() { clearInterval(id); } } as unknown as AudioNode);
    window.setTimeout(qing, 900);
  }

  private stopChant() {
    for (const n of this.chantNodes) {
      try {
        if ("stop" in n && typeof (n as OscillatorNode).stop === "function") {
          (n as OscillatorNode).stop();
        }
        n.disconnect();
      } catch { /* already stopped */ }
    }
    this.chantNodes = [];
  }

  private playBuf(buf: AudioBuffer | null, amp: number, rate = 1, dest?: GainNode) {
    if (!this.ctx || !buf) return;
    if (this.ctx.state !== "running") void this.ctx.resume();
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = amp;
    src.connect(g);
    g.connect(dest ?? this.sfxGain);
    src.start();
  }
}


async function fetchDabeiBytes(): Promise<ArrayBuffer> {
  return fetchFirstAudio(["/audio/dabei-zhou.ogg", "/audio/dabei-zhou.m4a", "/audio/dabei-zhou.mp3"]);
}

async function fetchFirstAudio(paths: string[]): Promise<ArrayBuffer> {
  let last = "no candidates";
  for (const path of paths) {
    try {
      const res = await fetch(path);
      if (!res.ok) { last = path + " http " + res.status; continue; }
      return await res.arrayBuffer();
    } catch (err) {
      last = path + " " + String(err);
    }
  }
  throw new Error("audio fetch failed: " + last);
}

function makeNoiseSource(ctx: AudioContext, seconds: number): AudioBufferSourceNode {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    last = last * 0.96 + w * 0.04;
    d[i] = last;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

function makeWoodenFish(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 0.2);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const freqs = [680, 910, 1180, 1620, 2140, 2680];
  const decays = [26, 32, 44, 58, 74, 96];
  const amps = [0.55, 0.7, 0.45, 0.32, 0.2, 0.12];
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let s = 0;
    for (let k = 0; k < freqs.length; k++) {
      const f = freqs[k] * (1 - t * 0.55);
      s += Math.sin(2 * Math.PI * f * t) * Math.exp(-decays[k] * t) * amps[k];
    }
    s += (Math.random() * 2 - 1) * Math.exp(-110 * t) * 0.4;
    // slight hollow body
    s *= 1 + 0.15 * Math.sin(2 * Math.PI * 420 * t);
    d[i] = Math.tanh(s * 0.9) * 0.85;
  }
  return buf;
}

function makeBeadClick(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 0.07);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const s =
      Math.sin(2 * Math.PI * 2100 * t) * Math.exp(-70 * t) * 0.5 +
      Math.sin(2 * Math.PI * 3400 * t) * Math.exp(-90 * t) * 0.28 +
      (Math.random() * 2 - 1) * Math.exp(-140 * t) * 0.35;
    d[i] = s * 0.7;
  }
  return buf;
}

/** Tibetan-bowl-like inharmonic partials, original synthesis. */
function makeSingingBowl(ctx: AudioContext, fund: number, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const ratios = [1, 2.76, 5.4, 8.93, 12.3];
  const amps = [0.55, 0.35, 0.2, 0.1, 0.05];
  const decays = [0.55, 0.7, 0.95, 1.35, 1.8];
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let s = 0;
    for (let k = 0; k < ratios.length; k++) {
      const a = amps[k] * Math.exp(-decays[k] * t);
      s += Math.sin(2 * Math.PI * fund * ratios[k] * t) * a;
    }
    const attack = 1 - Math.exp(-t * 28);
    d[i] = s * attack * 0.45;
  }
  return buf;
}
