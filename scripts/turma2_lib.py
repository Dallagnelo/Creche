"""Peças em comum dos scripts dos lugares ao ar livre da Turma 2.0 (Modern Exteriors do LimeZu):
recortar peças do índice, autotile (modelo Godot 3x3 mínimo) e misturar camadas."""
import json
from pathlib import Path

import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent.parent
ME = root / 'public/limezu/me'
OUT = root / 'public/limezu/t2'
T = 16
W = H = 0  # o script do lugar define com setup(w, h)


def setup(w, h):
    global W, H
    W, H = w, h


pecas = json.loads((ME / 'pecas/index.json').read_text())
anim_index = json.loads((ME / 'index.json').read_text())['animados']
_atlas = {}


def piece(theme, name):
    if theme not in _atlas:
        _atlas[theme] = Image.open(ME / pecas[theme]['file']).convert('RGBA')
    x, y, w, h = pecas[theme]['sprites'][name][:4]
    return _atlas[theme].crop((x, y, x + w, y + h))


# ------------------------------------------------------------------ autotile (modelo Godot 3x3 mínimo, 12x4 por terreno)
AT = np.array(Image.open(ME / 'terrenos/godot_autotiles.png').convert('RGBA')).astype(np.float32)
DIRS = {'n': (0, -1), 's': (0, 1), 'w': (-1, 0), 'e': (1, 0), 'nw': (-1, -1), 'ne': (1, -1), 'sw': (-1, 1), 'se': (1, 1)}
REG = {'n': (slice(0, 3), slice(6, 10)), 's': (slice(13, 16), slice(6, 10)), 'w': (slice(6, 10), slice(0, 3)), 'e': (slice(6, 10), slice(13, 16)),
       'nw': (slice(0, 3), slice(0, 3)), 'ne': (slice(0, 3), slice(13, 16)), 'sw': (slice(13, 16), slice(0, 3)), 'se': (slice(13, 16), slice(13, 16))}
KEYS = ['n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se']


def at_tile(block, i):
    r, c = divmod(i, 12)
    return AT[block * 64 + r * 16: block * 64 + r * 16 + 16, c * 16: c * 16 + 16]


def reduce(f):
    g = dict(f)
    for c, (a, b) in {'nw': ('n', 'w'), 'ne': ('n', 'e'), 'sw': ('s', 'w'), 'se': ('s', 'e')}.items():
        g[c] = g[c] and g[a] and g[b]
    return tuple(g[k] for k in KEYS)


def analyze(block):
    # descobre, olhando os pixels, qual quadradinho do modelo serve para cada vizinhança
    tiles = [at_tile(block, i) for i in range(48)]
    ref_in = np.median(np.array([t[6:10, 6:10].reshape(-1, 4).mean(0) for t in tiles]), 0)
    samples = np.array([t[ys, xs].reshape(-1, 4).mean(0) for t in tiles for ys, xs in REG.values()])
    dist = np.abs(samples - ref_in).sum(1)
    ref_out = samples[dist > np.percentile(dist, 85)].mean(0)
    table = {}
    for i, t in enumerate(tiles):
        if t[:, :, 3].max() == 0:
            continue
        flags = {}
        for k, (ys, xs) in REG.items():
            m = t[ys, xs].reshape(-1, 4).mean(0)
            flags[k] = np.abs(m - ref_in).sum() < np.abs(m - ref_out).sum()
        table.setdefault(reduce(flags), i)
    return table


def blend(dst, src):
    a = src[:, :, 3:4] / 255.0
    out = dst.copy()
    out[:, :, :3] = src[:, :, :3] * a + dst[:, :, :3] * (1 - a)
    out[:, :, 3:4] = np.maximum(dst[:, :, 3:4], src[:, :, 3:4])
    return out


def paint(canvas, grid, block, oob=True, only=None):
    table = analyze(block)
    full = reduce({k: True for k in KEYS})
    H, W = len(grid), len(grid[0])
    for y in range(H):
        for x in range(W):
            if not grid[y][x] or (only is not None and not only[y][x]):
                continue
            f = {}
            for k, (dx, dy) in DIRS.items():
                nx, ny = x + dx, y + dy
                f[k] = grid[ny][nx] if 0 <= nx < W and 0 <= ny < H else oob
            m = reduce(f)
            i = table.get(m)
            if i is None:  # sem o quadradinho exato: o mais parecido (conta primeiro os lados, depois os cantos)
                i = table[min(table, key=lambda k: sum((a != b) * (3 if j < 4 else 1) for j, (a, b) in enumerate(zip(k, m))))]
            canvas[y * T:(y + 1) * T, x * T:(x + 1) * T] = blend(canvas[y * T:(y + 1) * T, x * T:(x + 1) * T], at_tile(block, i))


