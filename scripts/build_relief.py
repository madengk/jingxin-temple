#!/usr/bin/env python3
"""
Build web-friendly relief GLBs from the CC0 statue photographs.

For each cleaned cutout:
  * Depth-Anything V2 Small (ONNX, CPU) estimates a depth map
  * A displaced front surface is meshed from the alpha silhouette,
    with edge wrap, real thickness, painted sides and a gilt back
  * Photo → albedo, depth → normal + packed ORM (AO / roughness / metalness)

Run:  /tmp/jx-venv/bin/python scripts/build_relief.py
"""
from __future__ import annotations

import io
import json
import struct
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path("/workspace/jingxin-temple")
PUB = ROOT / "client/public/statues"
TMP = Path("/tmp/jx-relief")
CUT = Path("/tmp/jx-cutouts")
FULL = Path("/tmp/jx-full")
ONNX = Path("/tmp/jx-depth/depth_anything_v2_vits.onnx")
TMP.mkdir(parents=True, exist_ok=True)

# World units: mesh height = 1, Y up, front faces −Z (worshippers).
PARAMS = {
    "buddha":     dict(relief=0.26, thickness=0.13, wrap=0.09, metal="gold",     grid=168),
    "king-east":  dict(relief=0.36, thickness=0.20, wrap=0.07, metal="painted",  grid=160),
    "king-south": dict(relief=0.36, thickness=0.20, wrap=0.07, metal="painted",  grid=160),
    "king-west":  dict(relief=0.38, thickness=0.22, wrap=0.07, metal="painted",  grid=160),
    "king-north": dict(relief=0.34, thickness=0.18, wrap=0.06, metal="painted",  grid=168),
    "weituo":     dict(relief=0.24, thickness=0.15, wrap=0.07, metal="gilt_wood", grid=160),
}

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], np.float32)


# ---------------------------------------------------------------------------
# Image helpers
# ---------------------------------------------------------------------------
def load_rgba(path: Path) -> np.ndarray:
    return np.array(Image.open(path).convert("RGBA"))


def save_preview(rgba: np.ndarray, path: Path, max_side=900) -> None:
    im = Image.fromarray(rgba)
    bg = Image.new("RGB", im.size, (36, 36, 36))
    cell = 18
    px = bg.load()
    w, h = im.size
    for y in range(0, h, cell):
        for x in range(0, w, cell):
            if ((x // cell) + (y // cell)) % 2 == 0:
                for yy in range(y, min(y + cell, h)):
                    for xx in range(x, min(x + cell, w)):
                        px[xx, yy] = (70, 70, 70)
    bg.paste(im, mask=im.split()[-1])
    bg.thumbnail((max_side, int(max_side * 1.4)))
    path.parent.mkdir(parents=True, exist_ok=True)
    bg.save(path, "JPEG", quality=90)


def largest_component(mask: np.ndarray, min_frac=0.02) -> np.ndarray:
    lab, n = ndimage.label(mask)
    if n == 0:
        return mask
    sizes = ndimage.sum(mask, lab, index=range(1, n + 1))
    keep = np.zeros(n + 1, dtype=bool)
    total = mask.sum()
    for i, s in enumerate(sizes, 1):
        if s >= total * min_frac or s == max(sizes):
            keep[i] = True
    # always keep the largest
    keep[int(np.argmax(sizes)) + 1] = True
    return keep[lab]


def fill_small_holes(mask: np.ndarray, max_hole: int) -> np.ndarray:
    filled = ndimage.binary_fill_holes(mask)
    holes = filled & ~mask
    lab, n = ndimage.label(holes)
    out = mask.copy()
    for i in range(1, n + 1):
        if (lab == i).sum() <= max_hole:
            out[lab == i] = True
    return out


def nearest_inpaint(rgb: np.ndarray, hole: np.ndarray, valid: np.ndarray) -> np.ndarray:
    if not hole.any():
        return rgb
    inv = ~valid
    _, idx = ndimage.distance_transform_edt(inv, return_indices=True)
    out = rgb.copy()
    out[hole] = rgb[idx[0][hole], idx[1][hole]]
    return out


def drop_crumbs(rgba: np.ndarray, min_frac=0.008) -> np.ndarray:
    a = rgba[..., 3] > 40
    keep = largest_component(a, min_frac=min_frac)
    out = rgba.copy()
    out[..., 3] = np.where(keep, rgba[..., 3], 0)
    return out


def smooth_silhouette(rgba: np.ndarray, sigma=0.9) -> np.ndarray:
    a = rgba[..., 3].astype(np.float32)
    sm = ndimage.gaussian_filter(a, sigma)
    out = rgba.copy()
    out[..., 3] = np.clip(sm, 0, 255).astype(np.uint8)
    return out


# ---------------------------------------------------------------------------
# Per-statue cleaning
# ---------------------------------------------------------------------------
def rembg_cut(rgb: Image.Image, model="isnet-general-use") -> np.ndarray:
    from rembg import new_session, remove
    session = new_session(model)
    out = remove(rgb, session=session)
    return np.array(out.convert("RGBA"))


def clean_west() -> np.ndarray:
    """Recrop 广目 with the full left boot and complete right knee; rembg; tidy.

    The pale cream form on the right is the raised knee and drapery (part of
    the statue), not a wall — keep it. Only strip the dark wooden rail under
    the boot.
    """
    cache = Path("/tmp/jx-relief/west_rembg_raw.png")
    if cache.exists():
        print("  west rembg cache", cache)
        rgba = np.array(Image.open(cache).convert("RGBA"))
    else:
        im = Image.open(FULL / "king_west_haichuang.jpg")
        box = (420, 240, 3648, 4180)
        crop = im.crop(box)
        print("  west recrop", crop.size, "running rembg…")
        rgba = rembg_cut(crop, "isnet-general-use")
        cache.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(rgba).save(cache)
    # Stricter alpha; only punch the thin dark rail at the very bottom
    # (not gold armour, not the cream knee).
    a = rgba[..., 3] > 80
    rgb = rgba[..., :3].astype(np.float32)
    h, w = a.shape
    y = np.linspace(0, 1, h)[:, None]
    val = rgb.mean(-1)
    r, g, bch = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    gold = (r > 110) & (g > 75) & (r > bch + 10)
    rail = (val < 65) & (y > 0.94) & (~gold) & (g < 90) & a
    out = rgba.copy()
    # Drop semi-transparent ghosts (rail shadows, drips) and keep the solid figure.
    alpha = np.where(a & ~rail, rgba[..., 3], 0)
    out[..., 3] = np.where(alpha < 128, 0, alpha)
    out = drop_crumbs(out, 0.02)
    out = tight_crop(out, pad=8)
    out = fill_and_inpaint(out, max_hole=2500)
    out = smooth_silhouette(out, 0.7)
    return out


def tight_crop(rgba: np.ndarray, pad=6) -> np.ndarray:
    a = rgba[..., 3] > 20
    ys, xs = np.where(a)
    if len(xs) == 0:
        return rgba
    y0, y1 = ys.min(), ys.max() + 1
    x0, x1 = xs.min(), xs.max() + 1
    y0 = max(0, y0 - pad)
    x0 = max(0, x0 - pad)
    y1 = min(rgba.shape[0], y1 + pad)
    x1 = min(rgba.shape[1], x1 + pad)
    return rgba[y0:y1, x0:x1]


def fill_and_inpaint(rgba: np.ndarray, max_hole=1800) -> np.ndarray:
    a = rgba[..., 3] > 40
    filled = fill_small_holes(a, max_hole)
    holes = filled & ~a
    rgb = nearest_inpaint(rgba[..., :3], holes, a)
    out = rgba.copy()
    out[..., :3] = rgb
    out[..., 3] = np.where(filled, np.maximum(rgba[..., 3], 255 * holes), 0).astype(np.uint8)
    return out


def clean_generic(src: Path, max_hole=1800, min_frac=0.008) -> np.ndarray:
    rgba = load_rgba(src)
    rgba = drop_crumbs(rgba, min_frac)
    rgba = fill_and_inpaint(rgba, max_hole)
    rgba = tight_crop(rgba, pad=6)
    rgba = smooth_silhouette(rgba, 0.7)
    return rgba


def clean_north() -> np.ndarray:
    """Fill sash holes; tidy the messy canopy tip."""
    rgba = load_rgba(CUT / "king-north.png")
    rgba = drop_crumbs(rgba, 0.01)
    # Fill moderate holes (ribbon gaps)
    rgba = fill_and_inpaint(rgba, max_hole=6000)
    a = rgba[..., 3] > 40
    h, w = a.shape
    # Canopy tip: the ragged red/brown flap in the top ~6%. Smooth the
    # outline there and drop isolated red fragments not attached through
    # a reasonable neck of pixels.
    top = np.zeros_like(a)
    top[: int(h * 0.08)] = True
    # erode-dilate the top band only
    top_mask = a & top
    struct = ndimage.generate_binary_structure(2, 1)
    cleaned_top = ndimage.binary_opening(top_mask, structure=struct, iterations=2)
    cleaned_top = ndimage.binary_closing(cleaned_top, structure=struct, iterations=3)
    # re-attach to body: keep cleaned_top only if close to the lower canopy
    new_a = a.copy()
    new_a[top] = cleaned_top[top]
    new_a = largest_component(new_a, 0.02)
    # inpaint any new solid pixels in the tip
    added = new_a & ~a
    rgb = nearest_inpaint(rgba[..., :3], added, a)
    out = rgba.copy()
    out[..., :3] = rgb
    out[..., 3] = np.where(new_a, np.maximum(rgba[..., 3], 255 * added), 0).astype(np.uint8)
    out = tight_crop(out, pad=6)
    out = smooth_silhouette(out, 0.8)
    return out


def clean_east() -> np.ndarray:
    rgba = clean_generic(CUT / "king-east.png", max_hole=2000, min_frac=0.006)
    return rgba


def clean_south() -> np.ndarray:
    # The floating red fragment near the crown is a small component or a thin
    # leftover — drop_crumbs + a gentle opening on isolated top bits.
    rgba = load_rgba(CUT / "king-south.png")
    rgba = drop_crumbs(rgba, 0.006)
    a = rgba[..., 3] > 40
    h, w = a.shape
    # Remove tiny islands and thin wisps above mid-crown (top 18%)
    top = a.copy()
    top[int(h * 0.18) :] = False
    opened = ndimage.binary_opening(top, iterations=1)
    new_a = a.copy()
    new_a[: int(h * 0.18)] = opened[: int(h * 0.18)]
    new_a = largest_component(new_a, 0.02)
    rgba[..., 3] = np.where(new_a, rgba[..., 3], 0)
    rgba = fill_and_inpaint(rgba, 2000)
    rgba = tight_crop(rgba, pad=6)
    rgba = smooth_silhouette(rgba, 0.7)
    return rgba


def clean_buddha() -> np.ndarray:
    rgba = load_rgba(CUT / "buddha.png")
    rgba = drop_crumbs(rgba, 0.02)
    # Bottom-right trash (red/green compressed artefacts)
    a = rgba[..., 3] > 40
    h, w = a.shape
    rgb = rgba[..., :3].astype(np.float32)
    # isolated colourful noise near the lower-right corner
    corner = np.zeros_like(a)
    corner[int(h * 0.88) :, int(w * 0.78) :] = True
    # low-coherence pixels: high chroma but tiny support
    mx, mn = rgb.max(-1), rgb.min(-1)
    noisy = corner & a & ((mx - mn) > 40) & (rgb.max(-1) < 160)
    # also any small blobs in that corner
    lab, n = ndimage.label(a & corner)
    for i in range(1, n + 1):
        sl = lab == i
        # if this blob is not connected to the main body outside the corner
        # it is already handled by drop_crumbs; here just punch obvious junk
        if sl.sum() < 400:
            noisy |= sl
    rgba[..., 3] = np.where(noisy, 0, rgba[..., 3])
    rgba = drop_crumbs(rgba, 0.05)
    rgba = fill_and_inpaint(rgba, 1500)
    rgba = tight_crop(rgba, pad=4)
    rgba = smooth_silhouette(rgba, 0.6)
    return rgba


def clean_weituo() -> np.ndarray:
    return clean_generic(CUT / "weituo.png", max_hole=1200, min_frac=0.01)


CLEANERS = {
    "buddha": clean_buddha,
    "king-east": clean_east,
    "king-south": clean_south,
    "king-west": clean_west,
    "king-north": clean_north,
    "weituo": clean_weituo,
}


# ---------------------------------------------------------------------------
# Depth
# ---------------------------------------------------------------------------
_SESSION = None


def depth_session():
    global _SESSION
    if _SESSION is None:
        _SESSION = ort.InferenceSession(str(ONNX), providers=["CPUExecutionProvider"])
    return _SESSION


def estimate_depth(rgb: np.ndarray, mask: np.ndarray, size=518) -> np.ndarray:
    """Relative depth, higher = closer. Masked, inpainted at edges, 0–1 inside the figure."""
    sess = depth_session()
    iname = sess.get_inputs()[0].name
    h, w = rgb.shape[:2]
    scale = size / max(h, w)
    nh, nw = int(round(h * scale)), int(round(w * scale))
    im = Image.fromarray(rgb).resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = np.full((size, size, 3), 114, np.uint8)
    top, left = (size - nh) // 2, (size - nw) // 2
    canvas[top : top + nh, left : left + nw] = np.array(im)
    x = canvas.astype(np.float32) / 255.0
    x = ((x - IMAGENET_MEAN) / IMAGENET_STD).transpose(2, 0, 1)[None].astype(np.float32)
    out = sess.run(None, {iname: x})[0][0]
    out = out[top : top + nh, left : left + nw]
    d = np.array(Image.fromarray(out).resize((w, h), Image.Resampling.BILINEAR)).astype(np.float32)
    # Inpaint depth outside / near the mask so edges don't collapse
    valid = mask & np.isfinite(d)
    if valid.any():
        d = nearest_inpaint(d[..., None], (~valid) & ndimage.binary_dilation(mask, iterations=3), valid)[..., 0]
        vals = d[mask]
        lo, hi = np.percentile(vals, 2), np.percentile(vals, 98)
        d = np.clip((d - lo) / (hi - lo + 1e-6), 0, 1)
        # slight contrast so the figure pops
        d = np.power(d, 0.85)
    else:
        d = np.zeros((h, w), np.float32)
    # Smooth in-mask to avoid meshing ripples, keep edges
    sm = ndimage.gaussian_filter(d, 1.4)
    d = np.where(mask, sm, d)
    return d.astype(np.float32)


# ---------------------------------------------------------------------------
# PBR maps
# ---------------------------------------------------------------------------
def normal_from_depth(depth: np.ndarray, mask: np.ndarray, strength=1.8) -> np.ndarray:
    gy = ndimage.sobel(depth, axis=0)
    gx = ndimage.sobel(depth, axis=1)
    # depth higher = closer (−Z). A positive gx (depth increases to the right)
    # means the surface tilts, normal X points left? n = normalize(-gx, -gy, 1)
    nx = -gx * strength
    ny = -gy * strength  # image y grows down; we'll flip when packing
    nz = np.ones_like(depth)
    n = np.stack([nx, -ny, nz], -1)  # -ny so +Y in tangent space is up
    n /= np.linalg.norm(n, axis=-1, keepdims=True) + 1e-8
    enc = ((n * 0.5 + 0.5) * 255).astype(np.uint8)
    enc[~mask] = (128, 128, 255)
    return enc


def ao_from_depth(depth: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Cheap SSAO-like: darker in local valleys (depth below its blur)."""
    blur = ndimage.gaussian_filter(depth, 4.0)
    valley = np.clip(blur - depth, 0, 1)  # positive where we're behind the neighbourhood
    ao = 1.0 - np.clip(valley * 2.4, 0, 0.55)
    ao = ndimage.gaussian_filter(ao, 1.0)
    ao = np.where(mask, ao, 1.0)
    return ao.astype(np.float32)


def metal_rough(rgb: np.ndarray, mask: np.ndarray, kind: str, ao: np.ndarray):
    """Return roughness, metalness in 0–1."""
    c = rgb.astype(np.float32) / 255.0
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    mx, mn = c.max(-1), c.min(-1)
    sat = np.where(mx > 0, (mx - mn) / (mx + 1e-6), 0)
    val = mx
    # gold-ish: yellow-orange hue, mid-high sat, mid-high value
    # hue ~ 30°: r high, g mid, b low
    gold = (r > 0.4) & (r > b * 1.15) & (g > b * 1.05) & (sat > 0.18) & (val > 0.28)
    gold_f = ndimage.gaussian_filter(gold.astype(np.float32), 1.2)

    if kind == "gold":
        metal = 0.62 + 0.30 * gold_f + 0.08 * np.clip(val, 0, 1)
        metal = np.clip(metal, 0.58, 0.94)
        rough = 0.30 + 0.18 * (1 - gold_f) + 0.15 * (1 - ao)
        rough = np.clip(rough, 0.26, 0.55)
    elif kind == "gilt_wood":
        metal = 0.18 + 0.50 * gold_f
        metal = np.clip(metal, 0.12, 0.72)
        rough = 0.40 + 0.16 * (1 - gold_f) + 0.12 * (1 - ao)
        rough = np.clip(rough, 0.32, 0.65)
    else:  # painted temple sculpture: gold armor metallic, flesh/cloth dielectric
        metal = 0.05 + 0.70 * gold_f
        metal = np.clip(metal, 0.04, 0.82)
        rough = 0.42 + 0.16 * (1 - gold_f) + 0.12 * (1 - ao)
        rough = np.clip(rough, 0.32, 0.68)
    metal = np.where(mask, metal, 0)
    rough = np.where(mask, rough, 0.8)
    return rough.astype(np.float32), metal.astype(np.float32)


def pack_orm(ao, rough, metal) -> np.ndarray:
    return np.stack(
        [
            (np.clip(ao, 0, 1) * 255).astype(np.uint8),
            (np.clip(rough, 0, 1) * 255).astype(np.uint8),
            (np.clip(metal, 0, 1) * 255).astype(np.uint8),
        ],
        -1,
    )


# ---------------------------------------------------------------------------
# Mesh
# ---------------------------------------------------------------------------
def build_relief_mesh(depth, mask, rgb, relief=0.3, thickness=0.16, wrap=0.08, grid=150):
    """
    Returns dict of numpy arrays for front / sides / back.
    Height = 1, bottom at y=0, X centred, front at −Z.
    """
    h, w = mask.shape
    long = max(h, w)
    # grid resolution along the long side
    gy = grid if h >= w else max(32, int(round(grid * h / w)))
    gx = grid if w >= h else max(32, int(round(grid * w / h)))
    # Occupancy at cell centers (gy x gx cells → gy+1, gx+1 verts)
    # Sample depth / mask on a (gy+1, gx+1) vertex grid
    ys = np.linspace(0, h - 1, gy + 1)
    xs = np.linspace(0, w - 1, gx + 1)
    # bilinear sample helpers
    def sample(arr, ys, xs):
        # arr: HxW or HxWxC
        iy0 = np.clip(np.floor(ys).astype(int), 0, h - 1)
        iy1 = np.clip(iy0 + 1, 0, h - 1)
        ix0 = np.clip(np.floor(xs).astype(int), 0, w - 1)
        ix1 = np.clip(ix0 + 1, 0, w - 1)
        ty = (ys - iy0)[:, None]
        tx = (xs - ix0)[None, :]
        if arr.ndim == 2:
            v00 = arr[iy0[:, None], ix0[None, :]]
            v01 = arr[iy0[:, None], ix1[None, :]]
            v10 = arr[iy1[:, None], ix0[None, :]]
            v11 = arr[iy1[:, None], ix1[None, :]]
            return (v00 * (1 - ty) * (1 - tx) + v01 * (1 - ty) * tx + v10 * ty * (1 - tx) + v11 * ty * tx)
        else:
            v00 = arr[iy0[:, None], ix0[None, :]]
            v01 = arr[iy0[:, None], ix1[None, :]]
            v10 = arr[iy1[:, None], ix0[None, :]]
            v11 = arr[iy1[:, None], ix1[None, :]]
            ty3, tx3 = ty[..., None], tx[..., None]
            return (v00 * (1 - ty3) * (1 - tx3) + v01 * (1 - ty3) * tx3 + v10 * ty3 * (1 - tx3) + v11 * ty3 * tx3)

    # cell solid if the 2x2 of corresponding image region is mostly solid
    # Use vertex-level mask: a vertex is solid if nearby pixels are
    vmask = sample(mask.astype(np.float32), ys, xs) > 0.45
    vdepth = sample(depth, ys, xs)
    # Distance-to-edge on the vertex grid (in height units)
    edt = ndimage.distance_transform_edt(vmask)
    # cell size in height units
    cell_h = 1.0 / gy
    dist = edt * cell_h
    wrap_w = max(wrap, cell_h * 3)
    # smoothstep wrap 0 at edge → 1 inside
    t = np.clip(dist / wrap_w, 0, 1)
    wrap_f = t * t * (3 - 2 * t)

    aspect = w / h  # width / height
    # Vertex X, Y
    # j=0 is top of image (y = 1), j=gy is bottom (y = 0)
    VX = (np.linspace(-0.5, 0.5, gx + 1) * aspect)[None, :].repeat(gy + 1, 0)
    VY = np.linspace(1.0, 0.0, gy + 1)[:, None].repeat(gx + 1, 1)
    # Front Z: closer (depth=1) further toward −Z. Edge wrap pulls outline back.
    z_front = -(thickness * 0.45 + relief * vdepth * wrap_f)
    # Back Z: slightly convex so the rear isn't a flat card
    # Convex bump based on distance from centre, scaled by mask edt
    nx = VX / (aspect * 0.5 + 1e-6)
    ny = (VY - 0.5) / 0.5
    rad = np.clip(1.0 - 0.5 * (nx * nx + ny * ny), 0, 1)
    z_back = thickness * (0.45 + 0.25 * rad * wrap_f)

    # Cells: solid if all 4 verts solid (keeps a tight silhouette)
    # or at least 3 for slightly smoother edges — use 4 for cleanliness.
    cell = vmask[:-1, :-1] & vmask[:-1, 1:] & vmask[1:, :-1] & vmask[1:, 1:]
    # 4 solid corners for a clean silhouette (3-of-4 produced spikes).
    cy = (ys[:-1] + ys[1:]) * 0.5
    cx = (xs[:-1] + xs[1:]) * 0.5
    cmask = sample(mask.astype(np.float32), cy, cx) > 0.45
    cell &= cmask

    # --- Front / back indexed mesh ---
    # We'll emit only used vertices.
    def emit_surface(zarr, front=True):
        used = np.zeros((gy + 1, gx + 1), dtype=bool)
        used[:-1, :-1] |= cell
        used[:-1, 1:] |= cell
        used[1:, :-1] |= cell
        used[1:, 1:] |= cell
        index = -np.ones((gy + 1, gx + 1), dtype=np.int32)
        ys_u, xs_u = np.where(used)
        index[used] = np.arange(len(ys_u), dtype=np.int32)
        pos = np.stack([VX[used], VY[used], zarr[used]], -1).astype(np.float32)
        # UVs: image u = x/(w), v = 1-y_img (glTF v=0 at bottom? glTF UV origin is top-left
        # in some tools, but the spec says (0,0) is top-left and Three.js follows:
        # actually glTF: UV (0,0) is top-left of the image. Three.js flips Y on load
        # for most formats. Standard: u = col/gx, v = row/gy with v=0 at TOP of image
        # and flipV handled by the loader (it sets texture.flipY=false for glTF).
        # So v=0 at top: v = j / gy
        u = (xs_u / gx).astype(np.float32)
        v = (ys_u / gy).astype(np.float32)
        uv = np.stack([u, v], -1)
        # faces
        faces = []
        jj, ii = np.where(cell)
        # verts of cell (j,i): (j,i), (j,i+1), (j+1,i+1), (j+1,i)
        # j increases downward (image). Y decreases as j increases.
        a = index[jj, ii]
        b = index[jj, ii + 1]
        c = index[jj + 1, ii + 1]
        d = index[jj + 1, ii]
        if front:
            # Want normal −Z (toward worshippers). A=top-left (high Y),
            # B=top-right, C=bottom-right (low Y), D=bottom-left.
            # (B-A)×(C-A) ≈ (dx,0,0)×(dx,-dy,0) = (0,0,-dx*dy) = −Z.
            tris = np.stack([np.stack([a, b, c], 1), np.stack([a, c, d], 1)], 0)
        else:
            # opposite winding, normal +Z
            tris = np.stack([np.stack([a, d, c], 1), np.stack([a, c, b], 1)], 0)
        faces = tris.reshape(-1, 3)
        # drop degenerates (a vertex may be -1 if 3-of-4 cell used a missing corner)
        ok = (faces >= 0).all(1) & (faces[:, 0] != faces[:, 1]) & (faces[:, 1] != faces[:, 2]) & (faces[:, 0] != faces[:, 2])
        faces = faces[ok]
        nrm = compute_normals(pos, faces)
        return pos, nrm, uv, faces.astype(np.uint32), index, used

    fpos, fnrm, fuv, ffaces, findex, fused = emit_surface(z_front, front=True)
    bpos, bnrm, buv, bfaces, bindex, bused = emit_surface(z_back, front=False)

    # --- Sides: boundary edges of solid cells ---
    # For each solid cell, each of 4 edges, if the neighbouring cell is not solid, emit a side quad.
    # Neighbors: left (i-1), right (i+1), up (j-1), down (j+1)
    side_pos = []
    side_col = []
    side_faces = []

    def vert_color(j, i):
        # sample rgb at this vertex
        yy = int(np.clip(ys[j], 0, h - 1))
        xx = int(np.clip(xs[i], 0, w - 1))
        col = rgb[yy, xx].astype(np.float32) / 255.0
        # slightly darker for a carved-side look
        return (col * 0.62).clip(0, 1)

    def add_side(j0, i0, j1, i1):
        # front edge (j0,i0)→(j1,i1), then back, as a quad
        # Need front and back positions. Use the same XYZ as surfaces.
        def P(j, i, front):
            return (
                VX[j, i],
                VY[j, i],
                (z_front if front else z_back)[j, i],
            )

        p0f, p1f = P(j0, i0, True), P(j1, i1, True)
        p0b, p1b = P(j0, i0, False), P(j1, i1, False)
        c0, c1 = vert_color(j0, i0), vert_color(j1, i1)
        base = len(side_pos)
        # 4 verts: f0, f1, b1, b0
        side_pos.extend([p0f, p1f, p1b, p0b])
        side_col.extend([c0, c1, c1, c0])
        # outward winding: we want the side normal pointing outward.
        # Walking the silhouette CCW (as seen from the front, −Z), the outward
        # side is to the right. Front winding of the edge f0→f1 should follow
        # the solid cell's boundary CCW from the front.
        # Quad f0, f1, b1, b0  — if f0→f1 is CCW around the figure, this faces out
        # (normal points out). We'll emit (f0,f1,b1) and (f0,b1,b0).
        side_faces.extend([[base, base + 1, base + 2], [base, base + 2, base + 3]])

    jj, ii = np.where(cell)
    # up neighbor missing (j-1)
    for j, i in zip(jj, ii):
        if j == 0 or not cell[j - 1, i]:
            # top edge of cell, image-up: verts (j,i+1)→(j,i)  (right to left, CCW)
            add_side(j, i + 1, j, i)
        if j == cell.shape[0] - 1 or not cell[j + 1, i]:
            # bottom edge: (j+1,i)→(j+1,i+1)
            add_side(j + 1, i, j + 1, i + 1)
        if i == 0 or not cell[j, i - 1]:
            # left edge: (j,i)→(j+1,i)
            add_side(j, i, j + 1, i)
        if i == cell.shape[1] - 1 or not cell[j, i + 1]:
            # right edge: (j+1,i+1)→(j,i+1)
            add_side(j + 1, i + 1, j, i + 1)

    spos = np.array(side_pos, np.float32)
    scol = np.array(side_col, np.float32)
    sfaces = np.array(side_faces, np.uint32)
    snrm = compute_normals(spos, sfaces) if len(sfaces) else np.zeros((0, 3), np.float32)

    return {
        "front": (fpos, fnrm, fuv, ffaces),
        "back": (bpos, bnrm, buv, bfaces),
        "sides": (spos, snrm, scol, sfaces),
        "aspect": aspect,
        "grid": (gx, gy),
    }


def compute_normals(pos, faces):
    n = np.zeros_like(pos)
    if len(faces) == 0:
        n[:, 2] = 1
        return n
    v0, v1, v2 = pos[faces[:, 0]], pos[faces[:, 1]], pos[faces[:, 2]]
    fn = np.cross(v1 - v0, v2 - v0)
    for k in range(3):
        np.add.at(n, faces[:, k], fn)
    lens = np.linalg.norm(n, axis=1, keepdims=True) + 1e-8
    n /= lens
    return n.astype(np.float32)


# ---------------------------------------------------------------------------
# GLB writer
# ---------------------------------------------------------------------------
def _pad4(b: bytes) -> bytes:
    return b + b"\x00" * ((4 - len(b) % 4) % 4)


def _img_bytes(arr: np.ndarray, kind: str, quality=90) -> tuple[bytes, str]:
    im = Image.fromarray(arr)
    buf = io.BytesIO()
    if kind == "jpeg":
        if im.mode != "RGB":
            im = im.convert("RGB")
        im.save(buf, "JPEG", quality=quality, optimize=True)
        return buf.getvalue(), "image/jpeg"
    im.save(buf, "PNG", optimize=True)
    return buf.getvalue(), "image/png"


def write_glb(path: Path, mesh, albedo_rgb, normal_rgb, orm_rgb, metal_kind: str):
    """Embed front PBR textures + three primitives (front, sides, back)."""
    # Resize textures web-friendly
    def fit(arr, max_side, kind, q):
        im = Image.fromarray(arr)
        im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        return _img_bytes(np.array(im), kind, q)

    alb_b, alb_mime = fit(albedo_rgb, 1280, "jpeg", 90)
    nrm_b, nrm_mime = fit(normal_rgb, 1024, "jpeg", 88)
    orm_b, orm_mime = fit(orm_rgb, 1024, "jpeg", 88)

    fpos, fnrm, fuv, ffaces = mesh["front"]
    bpos, bnrm, buv, bfaces = mesh["back"]
    spos, snrm, scol, sfaces = mesh["sides"]

    # Build BIN: concatenation of all buffers, 4-aligned
    chunks = []
    views = []  # (offset, length, target) target 34962 ARRAY, 34963 ELEMENT

    def add(arr, target=34962):
        raw = np.ascontiguousarray(arr).tobytes()
        off = sum(c[1] for c in chunks)
        # pad inside the running stream
        pad = (4 - (off % 4)) % 4
        if pad:
            chunks.append((b"\x00" * pad, pad))
            off += pad
        chunks.append((raw, len(raw)))
        views.append({"buffer": 0, "byteOffset": off, "byteLength": len(raw), "target": target})
        return len(views) - 1

    # accessors
    accessors = []

    def acc_vec(arr, ty, target=34962):
        bv = add(arr, target)
        amin = arr.min(0).tolist() if arr.size else [0]
        amax = arr.max(0).tolist() if arr.size else [0]
        if np.isscalar(arr.min(0)) or (hasattr(arr.min(0), "ndim") and arr.min(0).ndim == 0):
            amin = [float(arr.min())]
            amax = [float(arr.max())]
        else:
            amin = [float(x) for x in arr.min(0)]
            amax = [float(x) for x in arr.max(0)]
        ctype = {1: "SCALAR", 2: "VEC2", 3: "VEC3", 4: "VEC4"}[arr.shape[-1] if arr.ndim > 1 else 1]
        accessors.append(
            {
                "bufferView": bv,
                "componentType": 5126 if arr.dtype == np.float32 else 5125,
                "count": int(arr.shape[0]),
                "type": ctype,
                "min": amin,
                "max": amax,
            }
        )
        return len(accessors) - 1

    def acc_idx(arr):
        arr = np.ascontiguousarray(arr.reshape(-1), dtype=np.uint32)
        bv = add(arr, 34963)
        accessors.append(
            {
                "bufferView": bv,
                "componentType": 5125,
                "count": int(arr.shape[0]),
                "type": "SCALAR",
            }
        )
        return len(accessors) - 1

    a_fpos = acc_vec(fpos, 3)
    a_fnrm = acc_vec(fnrm, 3)
    a_fuv = acc_vec(fuv, 2)
    a_fidx = acc_idx(ffaces)

    a_spos = acc_vec(spos, 3) if len(spos) else None
    a_snrm = acc_vec(snrm, 3) if len(spos) else None
    a_scol = acc_vec(scol, 3) if len(spos) else None
    a_sidx = acc_idx(sfaces) if len(sfaces) else None

    a_bpos = acc_vec(bpos, 3)
    a_bnrm = acc_vec(bnrm, 3)
    a_bidx = acc_idx(bfaces)

    # images at the end of the BIN
    def add_image(data):
        off = sum(c[1] for c in chunks)
        pad = (4 - (off % 4)) % 4
        if pad:
            chunks.append((b"\x00" * pad, pad))
            off += pad
        chunks.append((data, len(data)))
        views.append({"buffer": 0, "byteOffset": off, "byteLength": len(data)})
        return len(views) - 1

    bv_alb = add_image(alb_b)
    bv_nrm = add_image(nrm_b)
    bv_orm = add_image(orm_b)

    bin_blob = b"".join(c[0] for c in chunks)
    assert sum(c[1] for c in chunks) == len(bin_blob)

    # material factors
    if metal_kind == "gold":
        side_col_f = [0.32, 0.22, 0.08, 1]
        side_met, side_r = 0.62, 0.42
        back_col = [0.22, 0.15, 0.06, 1]
        back_met, back_r = 0.72, 0.40
    elif metal_kind == "gilt_wood":
        side_col_f = [0.28, 0.18, 0.08, 1]
        side_met, side_r = 0.45, 0.50
        back_col = [0.18, 0.12, 0.06, 1]
        back_met, back_r = 0.55, 0.48
    else:
        side_col_f = [0.30, 0.18, 0.08, 1]
        side_met, side_r = 0.35, 0.52
        back_col = [0.16, 0.10, 0.05, 1]
        back_met, back_r = 0.50, 0.50

    primitives = [
        {
            "attributes": {"POSITION": a_fpos, "NORMAL": a_fnrm, "TEXCOORD_0": a_fuv},
            "indices": a_fidx,
            "material": 0,
        }
    ]
    if a_spos is not None:
        primitives.append(
            {
                "attributes": {"POSITION": a_spos, "NORMAL": a_snrm, "COLOR_0": a_scol},
                "indices": a_sidx,
                "material": 1,
            }
        )
    primitives.append(
        {
            "attributes": {"POSITION": a_bpos, "NORMAL": a_bnrm},
            "indices": a_bidx,
            "material": 2,
        }
    )

    gltf = {
        "asset": {"version": "2.0", "generator": "jingxin-temple-relief"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": path.stem}],
        "meshes": [{"name": path.stem, "primitives": primitives}],
        "materials": [
            {
                "name": "front",
                "pbrMetallicRoughness": {
                    "baseColorTexture": {"index": 0},
                    "metallicRoughnessTexture": {"index": 1},
                    "metallicFactor": 1.0,
                    "roughnessFactor": 1.0,
                },
                "normalTexture": {"index": 2, "scale": 1.15},
                "occlusionTexture": {"index": 1},
                "doubleSided": False,
            },
            {
                "name": "sides",
                "pbrMetallicRoughness": {
                    "baseColorFactor": side_col_f,
                    "metallicFactor": side_met,
                    "roughnessFactor": side_r,
                },
                "doubleSided": False,
            },
            {
                "name": "back",
                "pbrMetallicRoughness": {
                    "baseColorFactor": back_col,
                    "metallicFactor": back_met,
                    "roughnessFactor": back_r,
                },
                "doubleSided": False,
            },
        ],
        "textures": [
            {"sampler": 0, "source": 0},
            {"sampler": 0, "source": 1},
            {"sampler": 0, "source": 2},
        ],
        "images": [
            {"bufferView": bv_alb, "mimeType": alb_mime},
            {"bufferView": bv_orm, "mimeType": orm_mime},
            {"bufferView": bv_nrm, "mimeType": nrm_mime},
        ],
        "samplers": [
            {"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}
        ],
        "accessors": accessors,
        "bufferViews": views,
        "buffers": [{"byteLength": len(bin_blob)}],
    }

    json_blob = _pad4(json.dumps(gltf, separators=(",", ":")).encode("utf-8"))
    # JSON chunk must be padded with spaces (0x20), not NULs
    if json_blob.endswith(b"\x00"):
        json_blob = json_blob.rstrip(b"\x00")
        json_blob = json_blob + b" " * ((4 - len(json_blob) % 4) % 4)
    bin_blob = _pad4(bin_blob)

    header = struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(json_blob) + 8 + len(bin_blob))
    jchunk = struct.pack("<I4s", len(json_blob), b"JSON") + json_blob
    bchunk = struct.pack("<I4s", len(bin_blob), b"BIN\x00") + bin_blob
    path.write_bytes(header + jchunk + bchunk)
    return path.stat().st_size


# ---------------------------------------------------------------------------
# Simple 3/4 point-splat preview (QA, not shipped)
# ---------------------------------------------------------------------------
def preview_views(mesh, albedo, path_front: Path, path_tq: Path):
    fpos, fnrm, fuv, ffaces = mesh["front"]
    spos = mesh["sides"][0]
    bpos = mesh["back"][0]
    # sample albedo at uvs
    h, w = albedo.shape[:2]
    u = np.clip((fuv[:, 0] * (w - 1)).astype(int), 0, w - 1)
    v = np.clip((fuv[:, 1] * (h - 1)).astype(int), 0, h - 1)
    cols = albedo[v, u]

    def render(yaw_deg, pitch_deg, out, size=800):
        yaw = np.deg2rad(yaw_deg)
        pitch = np.deg2rad(pitch_deg)
        cy, sy = np.cos(yaw), np.sin(yaw)
        cp, sp = np.cos(pitch), np.sin(pitch)
        # yaw around Y, then pitch around X
        def xf(p):
            x, y, z = p[:, 0], p[:, 1], p[:, 2]
            # yaw (around Y): x,z
            xz = x * cy + z * sy
            zz = -x * sy + z * cy
            # pitch (around X): y,z
            yy = y * cp - zz * sp
            zz = y * sp + zz * cp
            return np.stack([xz, yy, zz], -1)

        pts = xf(fpos)
        # camera looks toward −Z_view after transform, orthographic
        aspect = mesh["aspect"]
        span = max(aspect, 1.0) * 0.62
        img = np.full((size, size, 3), 40, np.uint8)
        zbuf = np.full((size, size), -1e9, np.float32)
        # painter: project x,y
        def splat(p, c, r=2):
            sx = ((p[:, 0] / span) * 0.48 + 0.5) * (size - 1)
            sy = ((1.0 - (p[:, 1] - 0.5) / span) * 0.48 + 0.0) * (size - 1)
            # center vertically
            sy = ((0.92 - p[:, 1]) / 1.15) * (size - 1)
            sx = sx.astype(np.int32)
            sy = sy.astype(np.int32)
            zz = p[:, 2]
            for i in range(len(p)):
                x, y = int(sx[i]), int(sy[i])
                if 0 <= x < size - r and 0 <= y < size - r:
                    if zz[i] >= zbuf[y, x]:
                        zbuf[max(0, y - r) : y + r + 1, max(0, x - r) : x + r + 1] = zz[i]
                        img[max(0, y - r) : y + r + 1, max(0, x - r) : x + r + 1] = c[i]

        splat(pts, cols, 2)
        # sides in darker vertex colors, help show thickness
        if len(spos):
            sp = xf(spos)
            sc = (mesh["sides"][2] * 255).astype(np.uint8)
            splat(sp, sc, 1)
        Image.fromarray(img).save(out, "JPEG", quality=90)

    render(0, 0, path_front)
    render(48, 8, path_tq)


# ---------------------------------------------------------------------------
# Albedo: composite on black (geometry is the silhouette; JPEG has no alpha)
# ---------------------------------------------------------------------------
def albedo_jpeg_rgb(rgba: np.ndarray) -> np.ndarray:
    a = rgba[..., 3:4].astype(np.float32) / 255.0
    # premultiply onto a dark gilt so any slight bleed is not white-haloing
    bg = np.array([28, 18, 8], np.float32)
    rgb = rgba[..., :3].astype(np.float32) * a + bg * (1 - a)
    # Gentle midtone lift — source photos are taken in dim temple light.
    rgb = 255.0 * np.power(np.clip(rgb / 255.0, 0, 1), 0.88)
    return np.clip(rgb, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def process(name: str):
    print(f"\n=== {name} ===")
    rgba = CLEANERS[name]()
    print(f"  cleaned {rgba.shape} alpha={(rgba[...,3]>40).mean():.3f}")
    save_preview(rgba, TMP / f"{name}_clean.jpg")
    # also write cleaned webp fallback (keep <800KB)
    im = Image.fromarray(rgba)
    # cap long side at 1400
    im.thumbnail((1400, 1600), Image.Resampling.LANCZOS)
    rgba = np.array(im.convert("RGBA"))
    webp = PUB / f"{name}.webp"
    im = Image.fromarray(rgba)
    for q in (90, 86, 82, 78):
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=q, method=6)
        if buf.tell() < 800_000:
            webp.write_bytes(buf.getvalue())
            break
    else:
        im.save(webp, "WEBP", quality=74, method=6)
    print(f"  webp {webp.stat().st_size} {im.size}")

    mask = rgba[..., 3] > 40
    # For depth: composite over mid-gray (or use the cleaned RGB)
    rgb_g = albedo_jpeg_rgb(rgba)
    # mid-gray composite for the network
    a = rgba[..., 3:4].astype(np.float32) / 255.0
    comp = (rgba[..., :3].astype(np.float32) * a + 120 * (1 - a)).astype(np.uint8)
    depth = estimate_depth(comp, mask)
    # vis
    dn = (depth * 255).astype(np.uint8)
    vis = np.stack([dn, (depth * 180).astype(np.uint8), ((1 - depth) * 255).astype(np.uint8)], -1)
    vis[~mask] = 20
    Image.fromarray(vis).save(TMP / f"{name}_depth.jpg", quality=90)

    prm = PARAMS[name]
    ao = ao_from_depth(depth, mask)
    rough, metal = metal_rough(rgba[..., :3], mask, prm["metal"], ao)
    normal = normal_from_depth(depth, mask, strength=2.0 if name != "buddha" else 1.6)
    orm = pack_orm(ao, rough, metal)
    Image.fromarray(normal).save(TMP / f"{name}_normal.jpg", quality=90)
    Image.fromarray(orm).save(TMP / f"{name}_orm.jpg", quality=90)

    mesh = build_relief_mesh(
        depth, mask, rgba[..., :3],
        relief=prm["relief"], thickness=prm["thickness"], wrap=prm["wrap"], grid=prm["grid"],
    )
    fv = mesh["front"][0].shape[0]
    ff = mesh["front"][3].shape[0]
    sv = mesh["sides"][0].shape[0]
    print(f"  mesh front V={fv} F={ff} sides V={sv} aspect={mesh['aspect']:.3f} grid={mesh['grid']}")

    preview_views(mesh, rgb_g, TMP / f"{name}_prev_front.jpg", TMP / f"{name}_prev_tq.jpg")

    glb = PUB / f"{name}.glb"
    sz = write_glb(glb, mesh, rgb_g, normal, orm, prm["metal"])
    print(f"  glb {sz} bytes ({sz/1024:.1f} KB)")
    return glb


def main():
    names = sys.argv[1:] or list(CLEANERS)
    for n in names:
        process(n)
    print("\nDone.")
    for p in sorted(PUB.glob("*.glb")):
        print(f"  {p.name:20s} {p.stat().st_size/1024:7.1f} KB")


if __name__ == "__main__":
    main()
