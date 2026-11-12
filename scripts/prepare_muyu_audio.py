#!/usr/bin/env python3
"""Trim the CC0 Kōyasan mokugyo preview into game assets + a 4-tap preview.

Source (CC0 1.0, jonopodmore): https://freesound.org/people/jonopodmore/sounds/607215/
Public HQ preview (no login): docs/sources/audio/mokugyo-jonopodmore-607215-hq.mp3
"""
from __future__ import annotations
import json, math, struct, subprocess, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs/sources/audio/mokugyo-jonopodmore-607215-hq.mp3"
OUT = ROOT / "client/public/audio"
PREV = ROOT / "screenshots/round12-muyu-preview.m4a"
WORK = Path("/tmp/muyu-src")
WORK.mkdir(parents=True, exist_ok=True)

def run(cmd: list[str]) -> None:
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def write_wav(path: Path, sr: int, samples: list[float]) -> None:
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b"".join(
            struct.pack("<h", max(-32767, min(32767, int(round(x * 32767)))))
            for x in samples
        ))

def main() -> None:
    raw = WORK / "mokugyo-mono.wav"
    run(["ffmpeg", "-y", "-i", str(SRC), "-ac", "1", "-ar", "44100", str(raw)])
    w = wave.open(str(raw))
    n, sr = w.getnframes(), w.getframerate()
    xs = [s / 32768.0 for s in struct.unpack("<" + "h" * n, w.readframes(n))]
    w.close()
    thr = 10 ** (-48 / 20)
    start = next((i for i, x in enumerate(xs) if abs(x) >= thr), 0)
    end = min(n, start + int(sr * 0.55))
    out = xs[start:end]
    fade = int(sr * 0.08)
    for i in range(fade):
        out[len(out) - fade + i] *= (fade - i) / fade
    peak = max(abs(x) for x in out)
    gain = (10 ** (-3.0 / 20.0)) / peak
    out = [max(-0.999, min(0.999, x * gain)) for x in out]
    trimmed = WORK / "muyu-strike.wav"
    write_wav(trimmed, sr, out)
    run(["ffmpeg", "-y", "-i", str(trimmed), "-c:a", "libvorbis", "-q:a", "4", str(OUT / "muyu.ogg")])
    run(["ffmpeg", "-y", "-i", str(trimmed), "-c:a", "aac", "-b:a", "96k", str(OUT / "muyu.m4a")])
    vols, rates, delays = [0.92, 1.00, 0.88, 0.96], [0.985, 1.0, 1.025, 0.992], [150, 850, 1550, 2250]
    cmd: list[str] = ["ffmpeg", "-y"]
    for _ in range(4):
        cmd += ["-i", str(trimmed)]
    filters, parts = [], []
    for i, (vol, rate, delay) in enumerate(zip(vols, rates, delays)):
        filters.append(f"[{i}]asetrate={int(sr * rate)},aresample={sr},volume={vol},adelay={delay}|{delay}[s{i}]")
        parts.append(f"[s{i}]")
    cmd += ["-filter_complex", ";".join(filters) + ";" + "".join(parts) +
            "amix=inputs=4:duration=longest:normalize=0,apad=whole_dur=3.1,alimiter=limit=0.99",
            "-t", "3.1", "-c:a", "pcm_s16le", str(WORK / "muyu-preview.wav")]
    run(cmd)
    run(["ffmpeg", "-y", "-i", str(WORK / "muyu-preview.wav"), "-c:a", "aac", "-b:a", "128k", str(PREV)])
    print("wrote", OUT / "muyu.ogg", OUT / "muyu.m4a", PREV)

if __name__ == "__main__":
    main()
