"""Turma 2.0 · "Orla da Turma": um lugar de teste montado só com sprites do Modern Exteriors (LimeZu).

Uso: python scripts/turma2-orla.py      (lê public/limezu/me, que já está no projeto)

Monta, de cima para baixo: rua com prédios e carros passando, praça com chafariz e quiosques,
praia com guarda-sóis, vôlei, bar, farol e um palco com DJ e laser, e o mar animado com barquinhos.
Gera:
  public/limezu/t2/orla_chao.png   chão (calçada, asfalto, grama, praça de tijolo, areia, palco)
  public/limezu/t2/orla_obj.png    objetos parados + carros e barcos (recortados do pacote)
  public/limezu/t2/orla_mar.png    o mar: 8 quadros, um embaixo do outro
  e acrescenta a sala "orla" em src/lib/turma2Rooms.json (onde andar, objetos, animados, luzes da noite)
"""
import json
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

root = Path(__file__).resolve().parent.parent
ME = root / 'public/limezu/me'
OUT = root / 'public/limezu/t2'
T = 16
W, H = 50, 44  # quadradinhos
random.seed(7)
sys.path.insert(0, str(Path(__file__).resolve().parent))
import turma2_export as X  # noqa: E402

E = X.Map('orla', 'Orla da Turma', W, H)

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
    for y in range(H):
        for x in range(W):
            if not grid[y][x] or (only is not None and not only[y][x]):
                continue
            f = {}
            for k, (dx, dy) in DIRS.items():
                nx, ny = x + dx, y + dy
                f[k] = grid[ny][nx] if 0 <= nx < W and 0 <= ny < H else oob
            i = table.get(reduce(f), table[full])
            canvas[y * T:(y + 1) * T, x * T:(x + 1) * T] = blend(canvas[y * T:(y + 1) * T, x * T:(x + 1) * T], at_tile(block, i))


# ------------------------------------------------------------------ o chão
ROAD = range(11, 15)   # 4 fileiras de asfalto
PARK = (17, 28)        # grama e praça
SEA = 38               # primeira fileira do mar
canvas = np.zeros((H * T, W * T, 4), np.float32)
grass_fill = at_tile(13, analyze(13)[reduce({k: True for k in KEYS})])  # grama lisa
for y in range(H):
    for x in range(W):
        canvas[y * T:(y + 1) * T, x * T:(x + 1) * T] = grass_fill

# calçada (bloco 18: calçada clara sobre asfalto), só na parte da cidade
city = [[y < PARK[0] for x in range(W)] for y in range(H)]
sidewalk = [[y < PARK[0] and y not in ROAD for x in range(W)] for y in range(H)]
# asfalto liso (variações 16 a 23 do pacote) e a faixa tracejada do meio (variação 14)
asphalt = [np.array(piece('city_terrains', f'asphalt_1_variation_{k}')).astype(np.float32) for k in range(16, 24)]
dash = np.array(piece('city_terrains', 'asphalt_1_variation_14')).astype(np.float32)
for y in ROAD:
    for x in range(W):
        tile = dash if (y == 13 and x % 3 != 2) else random.choice(asphalt)
        canvas[y * T:(y + 1) * T, x * T:(x + 1) * T] = tile
E.paint('asfalto', [[y in ROAD for x in range(W)] for y in range(H)])
E.paint('faixa', [[y == 13 and x % 3 != 2 for x in range(W)] for y in range(H)])
E.paint('calcada', sidewalk)
side_grid = [[sidewalk[y][x] or y >= PARK[0] for x in range(W)] for y in range(H)]
paint(canvas, side_grid, 18, only=city)

# praça de tijolo no meio do parque (bloco 10: tijolo sobre grama)
plaza = [[PARK[0] + 1 <= y <= PARK[1] - 2 and 11 <= x <= 38 for x in range(W)] for y in range(H)]
paint(canvas, plaza, 10)
E.paint('tijolo', plaza)

# areia (bloco 6: areia sobre grama), com a beirada meio torta
beach_top = [28 + (1 if (x % 9) in (3, 4, 5) else 0) - (1 if (x % 13) in (7, 8) else 0) for x in range(W)]
sand = [[y >= beach_top[x] for x in range(W)] for y in range(H)]
paint(canvas, sand, 6)
E.paint('areia', sand)

# ------------------------------------------------------------------ objetos
objects = []   # (img, x, y, depth_rows, light)
lights = []    # luzes da noite: [x, y, raio, cor]


def place(theme, name, cx, foot, depth=None, flip=False, light=None):
    img = piece(theme, name)
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    x, y = int(cx - img.width / 2), int(foot - img.height)
    rows = depth if depth is not None else (1 if img.height <= 32 else 2 if img.height <= 64 else 3)
    objects.append((img, x, y, rows))
    if light:
        lights.append([int(cx + light[0]), int(foot + light[1]), light[2], light[3]])
    E.obj(theme, name, x, y, rows, flip, lights[-1] if light else None, size=img.size)
    return x, y, img


def decal(theme, name, x, y):
    # coisas chatas no chão (toalha, estrela-do-mar, palco): vão direto para a imagem do chão
    img = np.array(piece(theme, name)).astype(np.float32)
    h, w = img.shape[:2]
    canvas[y:y + h, x:x + w] = blend(canvas[y:y + h, x:x + w], img)
    E.obj(theme, name, x, y, 0, chao=True, size=(w, h))


# rua: prédios encostados no topo, de frente para a calçada
foot_city = 10 * T + 6
for theme, name, cx in [('generic_building', 'hardware_store_example', 70), ('generic_building', 'condo_example', 182), ('generic_building', 'condo_9_example', 280),
                        ('generic_building', 'condo_6_example', 440), ('generic_building', 'condo_7_example_2', 575), ('generic_building', 'condo_7_example_3', 625),
                        ('generic_building', 'condo_example', 700), ('generic_building', 'condo_7_example_1', 772)]:
    place(theme, name, cx, foot_city, depth=4)
for cx in range(56, W * T, 128):  # postes de um lado e do outro da rua
    place('city_props', 'street_lamp_1', cx, 11 * T - 2, depth=1, light=(-6, -52, 70, '255,214,140'))
    place('city_props', 'street_lamp_2', cx + 64, 17 * T - 2, depth=1, light=(6, -52, 70, '255,214,140'))
place('city_props', 'phone_booth_1', 150, 17 * T - 2, depth=1, light=(0, -40, 34, '255,120,120'))
place('city_props', 'hydrant_1', 250, 17 * T - 2)
place('city_props', 'mailbox_1', 330, 17 * T - 2)
place('city_props', 'atm_1', 690, 17 * T - 2, light=(0, -28, 30, '140,220,255'))

# parque e praça
place('city_props', 'kiosk_icecream_example', 250, 25 * T, depth=3, light=(0, -60, 90, '255,190,230'))
place('city_props', 'kiosk_coffee_cup_example', 560, 24 * T + 8, depth=3, light=(0, -50, 80, '255,210,150'))
place('city_props', 'kiosk_mushroom_example', 95, 24 * T, depth=3, light=(0, -50, 80, '255,150,150'))
place('villas', 'lemonade_stand_1', 690, 22 * T, depth=1)
place('city_props', 'billboard_3', 760, 23 * T, depth=1, light=(0, -60, 60, '255,255,255'))
for cx, foot in [(330, 26 * T + 4), (470, 26 * T + 4)]:
    place('city_props', 'bench_2', cx, foot, depth=1)
for cx, foot, nm in [(150, 27 * T + 6, 'tree_2'), (660, 27 * T + 4, 'tree_3'), (770, 27 * T + 8, 'tree_1')]:
    place('villas', nm, cx, foot, depth=1)
for cx in (190, 300, 500, 610):
    place('city_props', 'flower_bush_4', cx, 19 * T)
place('garden', 'grass_arch_1', 400, 28 * T, depth=1)  # portal da praia
for cx in (360, 440):
    place('city_props', 'street_lamp_5', cx, 20 * T, depth=1, light=(0, -54, 60, '255,230,170'))

# praia
decal('beach', 'example_big_stage_1_sand', 560, 30 * T)  # palco (dá para subir e dançar)
place('beach', 'big_loudspeaker_sand', 548, 33 * T + 4, depth=1)
place('beach', 'big_loudspeaker_sand', 760, 33 * T + 4, depth=1)
place('beach', 'example_lighthouse', 50, 39 * T - 4, depth=3)
BEACON = [50, 39 * T - 4 - 247 + 72]  # a luz lá em cima do farol
lights.append([*BEACON, 110, '255,240,180'])
E.light(*BEACON, 110, '255,240,180', giro=True)
place('beach', 'ship_bar', 175, 36 * T, depth=2, light=(0, -40, 80, '255,180,90'))
for cx, foot, nm in [(20, 31 * T, 'palm_tree'), (300, 31 * T + 4, 'palm_tree'), (520, 35 * T, 'palm_tree'), (790, 30 * T, 'palm_tree')]:
    place('beach', nm, cx, foot, depth=1)
for cx, foot, col in [(260, 35 * T, 'blue'), (330, 37 * T, 'yellow'), (420, 35 * T + 8, 'green'), (480, 37 * T + 4, 'lightblue')]:
    decal('beach', f'{col}_beach_towel_1' if col != 'lightblue' else 'multicolor_beach_towel_1', cx - 4, foot - 20)
    place('beach', f'{col}_beach_umbrella_opened', cx - 18, foot - 6, depth=1)
# rede de vôlei
place('beach', 'beach_volley_net_left', 360, 32 * T, depth=1)
for i in range(4):
    place('beach', 'beach_volley_net_middle_modular', 384 + i * 16, 32 * T - 2, depth=1)
place('beach', 'beach_volley_net_right', 456, 32 * T, depth=1)
place('beach', 'sand_castle_1_vers_1', 610, 37 * T + 4)
place('beach', 'beach_sign', 470, 30 * T - 2, depth=1)
for x, y, nm in [(240, 33 * T, 'yellow_big_starfish'), (440, 36 * T, 'purple_big_starfish'), (700, 37 * T, 'blue_big_starfish')]:
    decal('beach', nm, x, y)

# ------------------------------------------------------------------ animados (quadros lado a lado)
anims = []   # [x, y, arquivo, largura do quadro, altura, quadros, quadros por segundo, depth]


def anim(name, cx, foot, fw, frames, fps=10, depth=1, light=None):
    info = anim_index[name]
    fh = info['h']
    anims.append([int(cx - fw / 2), int(foot - fh), info['file'], fw, fh, frames, fps, depth])
    if light:
        lights.append([int(cx + light[0]), int(foot + light[1]), light[2], light[3]])
    assert fh == E.anim_h(name), name
    E.anim(name, int(cx - fw / 2), int(foot - fh), fw, frames, fps, depth, '', lights[-1] if light else None)


anim('garden_fountain_3', 400, 24 * T, 48, 6, 8, depth=2, light=(0, -40, 70, '150,220,255'))
anim('pigeon', 350, 24 * T + 8, 16, 6, 6)
anim('pigeon_2', 445, 25 * T, 16, 6, 5)
anim('pigeon', 520, 22 * T, 16, 6, 7)
anim('beach_stage_laser_machine', 652, 31 * T + 6, 128, 20, 12, depth=1, light=(0, -60, 130, '255,90,220'))
anim('beach_concert_dj', 652, 32 * T + 14, 48, 12, 10, depth=1)
anim('beach_concert_singer', 610, 33 * T + 6, 16, 6, 8)
anim('beach_concert_singer_2', 700, 33 * T + 6, 16, 6, 8)
anim('beach_seagull_idle_left', 560, 37 * T + 10, 32, 6, 6)
anim('beach_seagull_idle_right', 230, 38 * T - 2, 32, 6, 5)
anim('floating_flamingo_1', 300, 41 * T, 32, 6, 6)
anim('floating_donut_1', 470, 42 * T + 4, 32, 6, 5)
anim('beach_water_buoy_1', 120, 41 * T + 8, 32, 8, 6)
anim('beach_water_buoy_2', 720, 41 * T, 32, 8, 6)
anim('fishes_1', 620, 42 * T, 16, 12, 10)
anim('fishes_2', 210, 43 * T + 6, 16, 12, 10)
anim('bubbles', 560, 43 * T, 16, 8, 8)

# ------------------------------------------------------------------ o que anda sozinho: carros na rua e barcos no mar
movers = []  # [nome no atlas, y do pé, velocidade px/s (negativa = para a esquerda), x inicial]
vehicle_imgs = {}
for color in ['red', 'blue', 'green', 'orange', 'grey']:
    sheet = Image.open(ME / f'veiculos/cars/car_classic_{color}_complete.png').convert('RGBA')
    vehicle_imgs[f'car_{color}_r'] = sheet.crop((3, 27, 64, 64))
    vehicle_imgs[f'car_{color}_l'] = sheet.crop((96, 26, 157, 63))
sheet = Image.open(ME / 'veiculos/cars/car_2_complete_1.png').convert('RGBA')
vehicle_imgs['car_teal_r'] = sheet.crop((2, 12, 79, 48))
vehicle_imgs['car_teal_l'] = sheet.crop((113, 12, 190, 48))
lane_r, lane_l = 13 * T - 2, 15 * T - 2
for i, (c, speed) in enumerate([('red', 70), ('teal', 52), ('orange', 64)]):
    movers.append([f'car_{c}_r', lane_r, speed, i * 290])
for i, (c, speed) in enumerate([('blue', -58), ('green', -74), ('grey', -50)]):
    movers.append([f'car_{c}_l', lane_l, speed, 120 + i * 300])
# no editor os carros são peças do tema Veículos (car_right_N / car_left_N)
for i, (k, speed) in enumerate([(1, 70), (14, 52), (7, 64)]):
    E.car('vehicles', f'car_right_{k}', lane_r, speed, i * 290)
for i, (k, speed) in enumerate([(21, -58), (3, -74), (10, -50)]):
    E.car('vehicles', f'car_left_{k}', lane_l, speed, 120 + i * 300)
boat_anims = [['boat_1_right_1', 40 * T + 6, 22, 64, 8, 100], ['boat_1_left_1', 43 * T + 4, -16, 64, 8, 520], ['fishing_boat_right', 42 * T - 2, 12, 80, 8, 300]]
boats = []
for name, foot, speed, fw, frames, x0 in boat_anims:
    info = anim_index[name]
    boats.append([info['file'], foot, speed, fw, info['h'], frames, x0])
    E.boat(name, foot, speed, x0, fw, frames)

# ------------------------------------------------------------------ atlas de objetos + quem fica na frente de quem
items = [(img, x, y, rows) for img, x, y, rows in objects]
named = list(vehicle_imgs.items())
blocks = [(img, None) for img, *_ in items] + [(img, name) for name, img in named]
blocks_sorted = sorted(range(len(blocks)), key=lambda i: -blocks[i][0].height)
AW, x, y, shelf = 1024, 0, 0, 0
pos = {}
for i in blocks_sorted:
    img = blocks[i][0]
    if x + img.width > AW:
        x, y, shelf = 0, y + shelf + 1, 0
    pos[i] = (x, y)
    x += img.width + 1
    shelf = max(shelf, img.height)
atlas = Image.new('RGBA', (AW, y + shelf + 1))
for i, (img, _) in enumerate(blocks):
    atlas.paste(img, pos[i])

objs_json = []
for i, (img, ox, oy, rows) in enumerate(items):
    sx, sy = pos[i]
    objs_json.append([ox, oy, img.width, img.height, sx, sy])
objs_json.sort(key=lambda o: o[1] + o[3])
sprites_json = {}
for k, (name, img) in enumerate(named):
    sx, sy = pos[len(items) + k]
    sprites_json[name] = [sx, sy, img.width, img.height]

# ------------------------------------------------------------------ mar animado (8 quadros)
seasheet = Image.open(ME / 'terrenos/sea_water_tileset_basic.png').convert('RGBA')
sea_rows = H - SEA
frames = Image.new('RGBA', (W * T, sea_rows * T * 8))
for f in range(8):
    for r in range(sea_rows):
        for c in range(W):
            tr = 0 if r == 0 else 1 + (r % 2)
            tc = 1 + (c % 2)
            tile = seasheet.crop((f * 64 + tc * 16, tr * 16, f * 64 + tc * 16 + 16, tr * 16 + 16))
            frames.paste(tile, (c * T, f * sea_rows * T + r * T))
E.lake(0, SEA, W, sea_rows, 'mar')

floor = Image.fromarray(canvas.clip(0, 255).astype(np.uint8))

# ------------------------------------------------------------------ onde dá para andar
walk = [['.'] * W for _ in range(H)]
for yy in range(H):
    for xx in range(W):
        if yy >= SEA:
            walk[yy][xx] = '#'           # mar
        elif yy < 10:
            walk[yy][xx] = '#'           # fundo dos prédios
base = np.zeros((H * T, W * T), bool)
for img, ox, oy, rows in items:
    a = np.array(img)[:, :, 3] > 160
    top = max(0, img.height - rows * T)
    part = a[top:]
    y0, x0 = oy + top, ox
    ys, xs = slice(max(0, y0), min(H * T, y0 + part.shape[0])), slice(max(0, x0), min(W * T, x0 + part.shape[1]))
    base[ys, xs] |= part[ys.start - y0: ys.stop - y0, xs.start - x0: xs.stop - x0]
for a in anims:
    ax, ay, _, fw, fh, _, _, rows = a
    if rows and 'fountain' in a[2]:
        base[ay + fh - rows * T: ay + fh, ax + 8: ax + fw - 8] = True
for yy in range(H):
    for xx in range(W):
        if base[yy * T:(yy + 1) * T, xx * T:(xx + 1) * T].mean() >= 0.3:
            walk[yy][xx] = '#'
walk = [''.join(r) for r in walk]

# ------------------------------------------------------------------ grava no formato do editor (src/lib/turma2/defaultMaps.json)
E.spawn = [25, 26]
E.save(walk)
