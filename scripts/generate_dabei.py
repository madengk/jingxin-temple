#!/usr/bin/env python3
"""
Synthesize an original, commercially usable recitation of 《大悲咒》
(千手千眼观世音菩萨广大圆满无碍大悲心陀罗尼).

The mantra *text* (Tang-dynasty transliteration attributed to 伽梵达摩) is
in the public domain. This recording is an original formant-synthesis
performance — not a copy of any commercial or temple recording.

License of the generated audio: original work, CC0-equivalent for use in
the 静心寺 project (commercial use allowed).
"""
from __future__ import annotations

import math
import os
import struct
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

# 84 phrases of the standard Chinese 大悲咒, with a compact romanization
# used only to drive formants (public-domain phonetic text).
LINES = [
    "南无喝啰怛那哆啰夜耶",
    "南无阿唎耶",
    "婆卢羯帝烁钵啰耶",
    "菩提萨埵婆耶",
    "摩诃萨埵婆耶",
    "摩诃迦卢尼迦耶",
    "唵",
    "萨皤啰罚曳",
    "数怛那怛写",
    "南无悉吉利埵伊蒙阿唎耶",
    "婆卢吉帝室佛啰楞驮婆",
    "南无那啰谨墀",
    "醯利摩诃皤哆沙咩",
    "萨婆阿他豆输朋",
    "阿逝孕",
    "萨婆萨哆那摩婆萨哆那摩婆伽",
    "摩罚特豆",
    "怛姪他",
    "唵阿婆卢醯",
    "卢迦帝",
    "迦罗帝",
    "夷醯唎",
    "摩诃菩提萨埵",
    "萨婆萨婆",
    "摩啰摩啰",
    "摩醯摩醯唎驮孕",
    "俱卢俱卢羯蒙",
    "度卢度卢罚阇耶帝",
    "摩诃罚阇耶帝",
    "陀啰陀啰",
    "地唎尼",
    "室佛啰耶",
    "遮啰遮啰",
    "么么罚摩啰",
    "穆帝隶",
    "伊醯伊醯",
    "室那室那",
    "阿啰嘇佛啰舍利",
    "罚沙罚嘇",
    "佛啰舍耶",
    "呼嚧呼嚧摩啰",
    "呼嚧呼嚧醯利",
    "娑啰娑啰",
    "悉唎悉唎",
    "苏嚧苏嚧",
    "菩提夜菩提夜",
    "菩驮夜菩驮夜",
    "弥帝唎夜",
    "那啰谨墀",
    "地利瑟尼那",
    "波夜摩那",
    "娑婆诃",
    "悉陀夜",
    "娑婆诃",
    "摩诃悉陀夜",
    "娑婆诃",
    "悉陀喻艺",
    "室皤啰耶",
    "娑婆诃",
    "那啰谨墀",
    "娑婆诃",
    "摩啰那啰",
    "娑婆诃",
    "悉啰僧阿穆佉耶",
    "娑婆诃",
    "娑婆摩诃阿悉陀夜",
    "娑婆诃",
    "者吉啰阿悉陀夜",
    "娑婆诃",
    "波陀摩羯悉陀夜",
    "娑婆诃",
    "那啰谨墀皤伽啰耶",
    "娑婆诃",
    "摩婆利胜羯啰夜",
    "娑婆诃",
    "南无喝啰怛那哆啰夜耶",
    "南无阿唎耶",
    "婆卢吉帝烁皤啰夜",
    "娑婆诃",
    "唵悉殿都",
    "漫多啰",
    "跋陀耶",
    "娑婆诃",
]

# Approximate nuclear vowel for each used character (enough for formants).
# Values: a o e i u ü ai ao ei ou an en ang eng ong er
VOWEL = {
    "南": "a", "无": "u", "喝": "e", "啰": "o", "怛": "a", "那": "a",
    "哆": "o", "夜": "e", "耶": "e", "阿": "a", "唎": "i", "婆": "o",
    "卢": "u", "羯": "e", "帝": "i", "烁": "o", "钵": "o", "菩": "u",
    "提": "i", "萨": "a", "埵": "o", "摩": "o", "诃": "o", "迦": "a",
    "尼": "i", "唵": "an", "皤": "o", "罚": "a", "曳": "e", "数": "u",
    "写": "e", "悉": "i", "吉": "i", "利": "i", "伊": "i", "蒙": "eng",
    "室": "i", "佛": "o", "楞": "eng", "驮": "o", "谨": "in", "墀": "i",
    "醯": "i", "沙": "a", "咩": "e", "他": "a", "豆": "ou", "输": "u",
    "朋": "eng", "逝": "i", "孕": "un", "伽": "a", "特": "e", "姪": "i",
    "罗": "o", "夷": "i", "俱": "u", "度": "u", "阇": "e", "陀": "o",
    "地": "i", "遮": "e", "么": "o", "穆": "u", "隶": "i", "嘇": "an",
    "舍": "e", "呼": "u", "嚧": "u", "娑": "o", "苏": "u", "弥": "i",
    "瑟": "e", "波": "o", "僧": "eng", "穆": "u", "佉": "e", "者": "e",
    "喻": "u", "艺": "i", "胜": "eng", "殿": "an", "都": "u", "漫": "an",
    "多": "o", "跋": "a",
}

FORMANTS = {
    "a":  [(730, 80, 1.0), (1090, 90, 0.85), (2440, 120, 0.35)],
    "o":  [(570, 80, 1.0), (840, 90, 0.8), (2410, 120, 0.28)],
    "e":  [(530, 70, 0.95), (1840, 100, 0.75), (2480, 130, 0.3)],
    "i":  [(270, 60, 0.9), (2290, 90, 1.0), (3010, 120, 0.32)],
    "u":  [(300, 60, 0.95), (870, 80, 0.75), (2240, 120, 0.22)],
    "ü":  [(270, 60, 0.9), (1900, 90, 0.85), (2500, 120, 0.3)],
    "ai": [(700, 80, 1.0), (1400, 100, 0.8), (2500, 120, 0.3)],
    "ao": [(650, 80, 1.0), (950, 90, 0.8), (2400, 120, 0.28)],
    "ei": [(400, 70, 0.9), (2000, 100, 0.85), (2600, 120, 0.3)],
    "ou": [(500, 70, 0.95), (900, 90, 0.8), (2300, 120, 0.25)],
    "an": [(680, 80, 0.9), (1200, 90, 0.7), (2300, 110, 0.25)],
    "en": [(530, 70, 0.9), (1600, 90, 0.7), (2400, 110, 0.25)],
    "in": [(300, 60, 0.9), (2100, 90, 0.8), (2700, 120, 0.28)],
    "un": [(350, 60, 0.9), (1000, 90, 0.7), (2300, 120, 0.25)],
    "ang":[(700, 90, 0.85), (1150, 100, 0.6), (2200, 120, 0.2)],
    "eng":[(580, 80, 0.85), (1400, 100, 0.6), (2300, 120, 0.22)],
    "ong":[(500, 80, 0.9), (850, 90, 0.65), (2200, 120, 0.2)],
    "er": [(500, 80, 0.9), (1400, 150, 0.6), (2000, 150, 0.25)],
}

SR = 22050
F0 = 138.0  # calm male reciting pitch (C#3-ish)


def glottal(n: int, f0: np.ndarray) -> np.ndarray:
    """Band-limited pulse train with a slight glottal tilt."""
    phase = np.cumsum(f0 / SR) * 2 * np.pi
    sig = np.zeros(n, dtype=np.float64)
    # 28 harmonics, -6 dB/oct, plus a little 2nd-harmonic warmth
    n_harm = 28
    for h in range(1, n_harm + 1):
        amp = (1.0 / h) ** 1.15
        if h == 2:
            amp *= 1.25
        sig += amp * np.sin(phase * h)
    # soft glottal closing noise
    rng = np.random.default_rng(7)
    noise = rng.normal(0, 1, n)
    # highpass-ish noise gated by a residual
    sig += noise * 0.015
    return sig


def formant_filter(sig: np.ndarray, sr: int, f: float, bw: float, gain: float) -> np.ndarray:
    """One resonant two-pole IIR (biquad bandpass, RBJ)."""
    w0 = 2 * math.pi * f / sr
    q = max(f / (2 * bw), 0.5)
    alpha = math.sin(w0) / (2 * q)
    b0 = alpha
    b1 = 0
    b2 = -alpha
    a0 = 1 + alpha
    a1 = -2 * math.cos(w0)
    a2 = 1 - alpha
    b0, b1, b2, a1, a2 = b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0
    y = np.zeros_like(sig)
    x1 = x2 = y1 = y2 = 0.0
    for i, x in enumerate(sig):
        yi = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        y[i] = yi
        x2, x1 = x1, x
        y2, y1 = y1, yi
    return y * gain


def apply_formants(sig: np.ndarray, vowel: str) -> np.ndarray:
    specs = FORMANTS.get(vowel, FORMANTS["a"])
    out = np.zeros_like(sig)
    for f, bw, g in specs:
        out += formant_filter(sig, SR, f, bw, g)
    # mild lowpass
    # 1-pole
    a = 0.18
    y = np.zeros_like(out)
    acc = 0.0
    for i, x in enumerate(out):
        acc = acc + a * (x - acc)
        y[i] = acc
    return y


def envelope(n: int, att=0.035, rel=0.07) -> np.ndarray:
    t = np.arange(n) / SR
    dur = n / SR
    a = 1 - np.exp(-t / att)
    r = 1 - np.exp(-(dur - t) / rel)
    r = np.clip(r, 0, 1)
    env = a * r
    m = env.max() or 1
    return env / m


def f0_contour(n: int, phrase_pos: float, is_last: bool, is_om: bool) -> np.ndarray:
    t = np.linspace(0, 1, n)
    base = F0
    if is_om:
        # longer, slightly falling 唵
        return np.full(n, base * 0.96) + 4 * np.sin(2 * math.pi * t * 0.5)
    # slight rise then settle; last syllable falls
    rise = 6 * np.sin(math.pi * np.clip(t * 1.1, 0, 1))
    fall = -14 * t ** 1.6 if is_last else -3 * t
    vib = 1.4 * np.sin(2 * math.pi * 4.6 * t * (n / SR))
    # phrase-level: early phrases a touch higher
    phrase = 3 * math.sin(phrase_pos * math.pi)
    return (base + rise + fall + vib + phrase).astype(np.float64)


def syllable(vowel: str, dur: float, phrase_pos: float, is_last: bool, is_om: bool) -> np.ndarray:
    n = int(SR * dur)
    f0 = f0_contour(n, phrase_pos, is_last, is_om)
    src = glottal(n, f0)
    # nasal vowels: add a low nasal formant and damp highs
    voiced = apply_formants(src, vowel)
    if vowel in ("an", "en", "in", "un", "ang", "eng", "ong"):
        nasal = formant_filter(src, SR, 250, 60, 0.7)
        voiced = voiced * 0.75 + nasal
    env = envelope(n, att=0.028, rel=0.055 if not is_last else 0.11)
    # onset consonant dip (aspiration-ish)
    onset = int(0.018 * SR)
    env[:onset] *= np.linspace(0.15, 1, onset)
    return voiced * env


def drone(n: int) -> np.ndarray:
    t = np.arange(n) / SR
    sig = (
        0.10 * np.sin(2 * math.pi * 73.4 * t)
        + 0.07 * np.sin(2 * math.pi * 73.9 * t + 0.4)
        + 0.06 * np.sin(2 * math.pi * 110.0 * t + 0.2)
        + 0.04 * np.sin(2 * math.pi * 146.8 * t + 1.1)
        + 0.025 * np.sin(2 * math.pi * 220.0 * t)
    )
    # very slow amplitude breath
    sig *= 0.85 + 0.15 * np.sin(2 * math.pi * 0.05 * t)
    rng = np.random.default_rng(3)
    # brown room tone
    noise = rng.normal(0, 1, n)
    acc = 0.0
    brown = np.zeros(n)
    for i, x in enumerate(noise):
        acc = acc * 0.98 + x
        brown[i] = acc
    brown /= np.max(np.abs(brown)) or 1
    sig = sig + brown * 0.03
    return sig


def bowl(dur: float, fund: float) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n) / SR
    ratios = [1, 2.76, 5.4, 8.93]
    amps = [0.55, 0.32, 0.16, 0.07]
    decays = [0.45, 0.65, 0.9, 1.3]
    s = np.zeros(n)
    for r, a, d in zip(ratios, amps, decays):
        s += a * np.sin(2 * math.pi * fund * r * t) * np.exp(-d * t)
    s *= 1 - np.exp(-t * 24)
    return s * 0.22


def synthesize() -> np.ndarray:
    parts: list[np.ndarray] = []
    # opening drone + bowl, for a seamless loop tail match
    intro = 2.2
    parts.append(np.zeros(int(SR * intro)))  # voice silence; drone added later
    events_bowl: list[tuple[int, np.ndarray]] = []

    cursor = int(SR * intro)
    n_lines = len(LINES)
    for li, line in enumerate(LINES):
        chars = [ch for ch in line if not ch.isspace()]
        nch = len(chars)
        for ci, ch in enumerate(chars):
            vowel = VOWEL.get(ch, "a")
            is_om = ch == "唵" and nch == 1
            is_last = ci == nch - 1
            if is_om:
                dur = 1.55
            elif line == "娑婆诃" and ch == "诃":
                dur = 0.72
            elif line == "娑婆诃":
                dur = 0.46
            else:
                dur = 0.40 + (0.04 if is_last else 0)
            pos = li / max(n_lines - 1, 1)
            syl = syllable(vowel, dur, pos, is_last, is_om)
            # small gap between syllables (legato chant: very short)
            gap = int(SR * (0.045 if not is_last else 0.08))
            parts.append(syl)
            parts.append(np.zeros(gap))
            cursor += len(syl) + gap
        # phrase gap
        pg = 0.38 if line != "娑婆诃" else 0.48
        if line == "唵":
            pg = 0.55
        parts.append(np.zeros(int(SR * pg)))
        cursor += int(SR * pg)
        # bowl every several phrases
        if li % 6 == 0:
            events_bowl.append((cursor, bowl(5.5, 164 + (li % 5) * 12)))

    # closing drone pad so loop is seamless (same length as intro)
    parts.append(np.zeros(int(SR * intro)))
    voice = np.concatenate(parts)

    # mix drone across the whole file at constant level (loop-safe)
    dr = drone(len(voice))
    # fade the very first/last 40ms of the WHOLE file identically so a
    # hard loop click is impossible, but keep drone continuous by matching
    # — actually a tiny equal fade would dip. Instead equalize first/last
    # 2048 samples to the same (crossfade the buffer onto itself).
    out = dr * 0.85 + voice * 0.0
    # voice is currently only in `voice` which is zeros + syllables; add it
    out = dr * 0.9 + voice * 1.0

    # sprinkle bowls
    for pos, b in events_bowl:
        end = min(len(out), pos + len(b))
        out[pos:end] += b[: end - pos]
    # opening & closing bowls at the same relative phase for the loop
    b0 = bowl(6.0, 196.0)
    out[: len(b0)] += b0 * 0.8
    # closing bowl starts at the same offset from the end as opening is
    # from the start, so the looped join sounds like one bowl? Skip — two
    # bowls at the seam would double. Leave only the opening bowl.

    # self-crossfade 0.8s for a seamless loop
    xf = int(SR * 0.8)
    fade = np.linspace(0, 1, xf)
    head = out[:xf].copy()
    tail = out[-xf:].copy()
    # overlap: new tail = tail*(1-f) + head*f, new head stays; when looped
    # tail joins head. After this, crop the duplicated head from the end?
    # Standard: out[-xf:] = tail*(1-f)+head*f, keep full length. On loop,
    # last xf blends toward the start, then jumps to start (which equals
    # the end of the blend). Good if out[-1] ≈ out[0].
    out[-xf:] = tail * (1 - fade) + head * fade
    # force exact equality of endpoints
    out[-1] = out[0]

    # normalize
    peak = np.max(np.abs(out)) or 1
    out = out / peak * 0.78
    return out.astype(np.float32)


def write_wav(path: Path, audio: np.ndarray) -> None:
    pcm = np.clip(audio * 32767, -32768, 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    out_dir = root / "client" / "public" / "audio"
    out_dir.mkdir(parents=True, exist_ok=True)
    wav_path = out_dir / "dabei-zhou.wav"
    ogg_path = out_dir / "dabei-zhou.ogg"
    print("synthesizing 大悲咒 …", flush=True)
    audio = synthesize()
    dur = len(audio) / SR
    print(f"duration {dur:.1f}s, writing wav", flush=True)
    write_wav(wav_path, audio)
    # ogg vorbis ~80-96k
    cmd = [
        "ffmpeg", "-y", "-i", str(wav_path),
        "-c:a", "libvorbis", "-q:a", "3",
        "-ar", "22050", "-ac", "1",
        str(ogg_path),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr, file=sys.stderr)
        return r.returncode
    print("ogg", ogg_path, "bytes", ogg_path.stat().st_size, flush=True)
    # keep wav out of git (large); ogg is the shipped asset
    wav_path.unlink(missing_ok=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
