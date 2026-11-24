"""Turma 2.0 · "Acampamento do Outono": lugar de teste montado só com sprites do Modern Exteriors (LimeZu).

Uso: python scripts/turma2-acampamento.py     (lê public/limezu/me, que já está no projeto)

Uma clareira no meio de uma floresta de outono: fogueira com tendas e lampiões, lago animado com
barco de pesca, trailers com roupa no varal, plantação de abóboras, uma casa japonesa em que dá para
ENTRAR (a porta leva para a "casa_japonesa") e um cemitério cercado com capela e árvore que ri.
À noite os fantasmas saem das covas (e dão susto em quem chega perto).
Gera public/limezu/t2/acampamento_{chao,obj,lago}.png e acrescenta a sala em src/lib/turma2Rooms.json.
"""
import json
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import turma2_lib as L  # noqa: E402

T = 16
W, H = 52, 46
L.setup(W, H)
random.seed(11)
ME, OUT, root = L.ME, L.OUT, L.root
anim_index = json.loads((ME / 'index.json').read_text())['animados']
FULL = L.reduce({k: True for k in L.KEYS})


def grid(fn):
    return [[bool(fn(x, y)) for x in range(W)] for y in range(H)]


# ------------------------------------------------------------------ chão
canvas = np.zeros((H * T, W * T, 4), np.float32)
grass = L.at_tile(13, L.analyze(13)[FULL])
for y in range(H):
    for x in range(W):
        canvas[y * T:(y + 1) * T, x * T:(x + 1) * T] = grass

LAKE = (4, 4, 19, 14)          # x0, y0, x1, y1 (inclusive)
YARD = (3, 30, 20, 42)         # cemitério (com a cerca na borda)
HOUSE = (35, 16)               # casa japonesa: x do canto esquerdo e a fileira de baixo
DOOR = (40, 16)


def in_rect(x, y, r):
    return r[0] <= x <= r[2] and r[1] <= y <= r[3]


# caminhos de terra (bloco 0: terra sobre grama)
def path(x, y):
    clearing = (x - 26) ** 2 / 46 + (y - 25) ** 2 / 18 <= 1          # clareira da fogueira
    main = 25 <= x <= 26 and 28 <= y <= 45                             # entrada lá embaixo
    to_house = (39 <= x <= 40 and 17 <= y <= 23) or (31 <= x <= 40 and 22 <= y <= 23)
    to_lake = (11 <= x <= 24 and 16 <= y <= 17) or (22 <= x <= 23 and 16 <= y <= 22)
    to_yard = (11 <= x <= 13 and 27 <= y <= 30) or (11 <= x <= 21 and 26 <= y <= 27)
    to_farm = (26 <= x <= 41 and 36 <= y <= 37)
    return clearing or main or to_house or to_lake or to_yard or to_farm


L.paint(canvas, grid(path), 0)
# chão do cemitério (bloco 3: terra cinza) e a cerca em volta (bloco 16), com o portão aberto em cima
yard_in = grid(lambda x, y: in_rect(x, y, (YARD[0] + 1, YARD[1] + 1, YARD[2] - 1, YARD[3] - 1)))
L.paint(canvas, yard_in, 3)
GATE = range(11, 14)
fence = grid(lambda x, y: in_rect(x, y, YARD) and not in_rect(x, y, (YARD[0] + 1, YARD[1] + 1, YARD[2] - 1, YARD[3] - 1)) and not (y == YARD[1] and x in GATE))
L.paint(canvas, fence, 16, oob=False)

# ------------------------------------------------------------------ objetos
objects, lights, anims = [], [], []


def place(theme, name, cx, foot, depth=None, light=None, flip=False):
    img = L.piece(theme, name)
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    x, y = int(cx - img.width / 2), int(foot - img.height)
    rows = depth if depth is not None else (1 if img.height <= 32 else 2 if img.height <= 64 else 3)
    objects.append((img, x, y, rows))
    if light:
        lights.append([int(cx + light[0]), int(foot + light[1]), light[2], light[3]])


def anim(name, cx, foot, fw, frames, fps=8, depth=1, when='', light=None):
    info = anim_index[name]
    anims.append([int(cx - fw / 2), int(foot - info['h']), info['file'], fw, info['h'], frames, fps, depth, when])
    if light:
        lights.append([int(cx + light[0]), int(foot + light[1]), light[2], light[3]])


def decal(theme, name, x, y):
    img = np.array(L.piece(theme, name)).astype(np.float32)
    h, w = img.shape[:2]
    canvas[y:y + h, x:x + w] = L.blend(canvas[y:y + h, x:x + w], img)


# floresta de outono em volta de tudo (deixa a entrada lá embaixo aberta)
autumn = [5, 10, 20, 40, 60, 80, 1, 100, 150]
taken = set()


def tree_at(tx, ty):
    if (tx, ty) in taken:
        return
    taken.add((tx, ty))
    name = f'tree_{random.choice(autumn)}'
    place('camping', name, tx * T + 8 + random.randint(-5, 5), (ty + 1) * T + random.randint(-3, 3), depth=1)


for tx in range(0, W, 3):
    tree_at(tx, 1 + (tx % 2))
    if not 22 <= tx <= 29:
        tree_at(tx, H - 2 - (tx % 2))
for ty in range(4, H - 3, 3):
    tree_at(1 + (ty % 2), ty)
    tree_at(W - 2 - (ty % 2), ty)
for tx, ty in [(27, 8), (31, 12), (24, 5), (45, 22), (48, 30), (30, 31), (35, 33), (21, 36), (8, 22), (4, 18), (17, 23), (46, 41)]:
    tree_at(tx, ty)

# casa japonesa (dá para entrar pela porta)
place('additional_houses', '24_additional_houses_japanese_house_16x16', HOUSE[0] * T + 120, (HOUSE[1] + 1) * T, depth=6, light=(-10, -50, 70, '255,220,150'))
for cx, nm in [(HOUSE[0] * T + 30, '24_additional_houses_japanese_house_pot_2_16x16'), (HOUSE[0] * T + 210, '24_additional_houses_japanese_house_pot_1_16x16')]:
    place('additional_houses', nm, cx, (HOUSE[1] + 1) * T + 6)
place('additional_houses', '24_additional_houses_japanese_house_shelf_16x16', HOUSE[0] * T + 190, (HOUSE[1] + 1) * T + 10)

# fogueira e acampamento
CX, CY = 26 * T + 8, 25 * T + 4
anim('campfire_2', CX, CY, 48, 6, 10, light=(0, -10, 120, '255,150,60'))
for dx, dy, flip in [(-40, -4, False), (40, -4, True), (-26, 24, False), (26, 24, True)]:
    place('camping', 'cut_wood_bench_1', CX + dx, CY + dy, flip=flip)
place('camping', 'tent_1', 19 * T, 23 * T)
place('camping', 'tent_2', 33 * T + 8, 22 * T)
place('camping', 'tent_3', 20 * T, 29 * T + 4)
place('camping', 'tent_5', 32 * T, 29 * T + 6)
for x, y in [(21 * T, 24 * T + 8), (35 * T, 23 * T + 6)]:
    decal('camping', 'sleeping_bag_1', x, y)
place('camping', 'hanging_cooking_pot_1', 29 * T + 8, 22 * T + 6)
place('camping', 'benched_table_1', 17 * T, 26 * T + 8)
place('camping', 'barbecue_1', 36 * T, 26 * T)
place('camping', 'signboard_1', 28 * T + 4, 33 * T + 4, depth=1)
for cx, cy in [(22 * T, 21 * T), (31 * T, 20 * T + 8), (23 * T + 4, 31 * T), (30 * T, 31 * T + 4)]:
    anim('camping_lantern_1', cx, cy, 48, 4, 6, light=(0, -24, 60, '255,210,120'))

# lago animado, com píer de pesca, tronco boiando e peixes; um barquinho vai e volta
LX0, LY0, LX1, LY1 = LAKE
place('camping', 'fishing_spot_1', 12 * T, (LY1 + 2) * T + 4, depth=1)
anim('floating_trunk', 9 * T, 8 * T, 48, 8, 6)
anim('fishes_1', 15 * T, 11 * T, 16, 12, 10)
anim('fishes_2', 7 * T, 12 * T, 16, 12, 9)
anim('bubbles', 17 * T, 7 * T, 16, 8, 8)
for x, y in [(5, 16), (18, 16), (20, 10)]:
    place('camping', 'rock_2', x * T, y * T)

# trailers com varal e a plantação de abóboras
place('camping', 'mobile_house_big_1', 44 * T, 30 * T, depth=3, light=(0, -30, 70, '255,220,150'))
place('camping', 'mobile_house_medium_1', 44 * T, 36 * T, depth=3, light=(0, -30, 60, '255,220,150'))
anim('clothes_hanging_1', 37 * T, 33 * T, 64, 6, 5)
for i, (x, y) in enumerate([(36, 40), (38, 41), (40, 40), (42, 41), (36, 42), (39, 43), (42, 43)]):
    nm = ['big_yellow_lights_pumpkin_1', 'medium_pumpkin_1', 'long_yellow_lights_pumpkin_1', 'little_pumpkin_1', 'medium_yellow_lights_pumpkin_1', 'big_pumpkin_1', 'little_yellow_lights_pumpkin_1'][i]
    place('graveyard', nm, x * T, y * T, depth=1, light=(0, -8, 30, '255,170,60') if 'lights' in nm else None)
place('graveyard', 'tree_trunk_pumpkin', 46 * T, 42 * T, light=(0, -14, 40, '255,150,50'))

# cemitério: portão, capela, covas, cruzes, velas e a árvore que ri
place('graveyard', 'big_gate', 12 * T + 8, (YARD[1] + 1) * T, depth=1)
place('graveyard', 'grace_chapel_with_gate', 16 * T, 37 * T, depth=4, light=(0, -40, 60, '190,120,255'))
anim('graveyard_haunted_tree_laugh', 6 * T, 35 * T, 64, 4, 3, depth=2, light=(0, -30, 50, '255,120,40'))
graves = ['marble_grey_tombstone_1', 'small_grey_tombstone_2', 'long_tombstone_1', 'black_cross_1', 'wood_large_cross_1', 'small_black_tombstone_1', 'marble_brown_tombstone_1', 'brown_cross_1']
spots = [(5, 38), (7, 38), (9, 38), (5, 41), (7, 41), (9, 41), (11, 41), (13, 41), (8, 34), (10, 34), (18, 40), (18, 33)]
for i, (x, y) in enumerate(spots):
    place('graveyard', graves[i % len(graves)], x * T + 8, y * T + 12, depth=1)
place('graveyard', 'dirt_ditch_2_red_coffin', 12 * T, 37 * T + 10, depth=1)
place('graveyard', 'skeleton', 14 * T, 39 * T + 6)
place('graveyard', 'big_tree_pumpkins', 18 * T, 36 * T, depth=1, light=(0, -10, 40, '255,150,50'))
for x, y in [(4, 32), (19, 32), (4, 42), (19, 42)]:
    anim('graveyard_candle_standing', x * T + 8, y * T + 12, 16, 4, 6, light=(0, -30, 46, '255,180,90'))
anim('crow_idle_left', 10 * T, 33 * T, 32, 6, 4, when='d')
anim('crow_idle_left', 37 * T, 39 * T, 32, 6, 3, when='d')
# fantasmas: só à noite, saindo das covas (e quem chegar perto leva um susto)
for x, y, nm, fw, fr in [(7, 38, 'graveyard_ghosts_2', 32, 17), (11, 41, 'graveyard_ghosts_3', 32, 17), (9, 34, 'graveyard_ghosts_2', 32, 17), (5, 41, 'graveyard_ghosts_3', 32, 17)]:
    anim(nm, x * T + 8, y * T + 4, fw, fr, 7, depth=0, when='n', light=(0, -30, 40, '120,255,220'))

# ------------------------------------------------------------------ lago animado (8 quadros, 9 pedaços de 16x16)
water = Image.open(ME / 'terrenos/water_tileset.png').convert('RGBA')
lw, lh = LX1 - LX0 + 1, LY1 - LY0 + 1
lake = Image.new('RGBA', (lw * T, lh * T * 8))
for f in range(8):
    for r in range(lh):
        for c in range(lw):
            tr = 0 if r == 0 else 2 if r == lh - 1 else 1
            tc = 0 if c == 0 else 2 if c == lw - 1 else 1
            tile = water.crop((f * 48 + tc * 16, tr * 16, f * 48 + tc * 16 + 16, tr * 16 + 16))
            lake.paste(tile, (c * T, f * lh * T + r * T))
lake.save(OUT / 'acampamento_lago.png', optimize=True)

# barco de pesca indo e voltando no lago
boat_r, boat_l = anim_index['fishing_boat_right'], anim_index['fishing_boat_left']
patrols = [[boat_r['file'], boat_l['file'], 80, 32, 8, (LX0 + 1) * T, (LX1 - 4) * T, 10 * T + 6, 14]]

# porta aberta da casa (aparece quando alguém chega perto)
door_img = L.piece('additional_houses', '24_additional_houses_japanese_house_door_open_16x16')

# ------------------------------------------------------------------ atlas + quem fica na frente
blocks = [img for img, *_ in objects] + [door_img]
order = sorted(range(len(blocks)), key=lambda i: -blocks[i].height)
AW, x, y, shelf = 1024, 0, 0, 0
pos = {}
for i in order:
    img = blocks[i]
    if x + img.width > AW:
        x, y, shelf = 0, y + shelf + 1, 0
    pos[i] = (x, y)
    x += img.width + 1
    shelf = max(shelf, img.height)
atlas = Image.new('RGBA', (AW, y + shelf + 1))
for i, img in enumerate(blocks):
    atlas.paste(img, pos[i])
atlas.save(OUT / 'acampamento_obj.png', optimize=True)
objs_json = sorted([[ox, oy, img.width, img.height, *pos[i]] for i, (img, ox, oy, rows) in enumerate(objects)], key=lambda o: o[1] + o[3])
dsx, dsy = pos[len(objects)]
house_x = HOUSE[0] * T
door_sprite = {'sx': dsx, 'sy': dsy, 'w': door_img.width, 'h': door_img.height, 'x': house_x + 64, 'y': (HOUSE[1] + 1) * T - door_img.height, 'near': [DOOR[0], DOOR[1] + 1]}

Image.fromarray(canvas.clip(0, 255).astype(np.uint8)).save(OUT / 'acampamento_chao.png', optimize=True)

# ------------------------------------------------------------------ onde dá para andar
walk = [['.'] * W for _ in range(H)]
for yy in range(H):
    for xx in range(W):
        if in_rect(xx, yy, LAKE) or fence[yy][xx]:
            walk[yy][xx] = '#'
base = np.zeros((H * T, W * T), bool)
for img, ox, oy, rows in objects:
    a = np.array(img)[:, :, 3] > 160
    top = max(0, img.height - rows * T)
    part = a[top:]
    y0 = oy + top
    ys = slice(max(0, y0), min(H * T, y0 + part.shape[0]))
    xs = slice(max(0, ox), min(W * T, ox + part.shape[1]))
    base[ys, xs] |= part[ys.start - y0: ys.stop - y0, xs.start - ox: xs.stop - ox]
for a in anims:
    ax, ay, f, fw, fh, _, _, rows, _ = a
    if rows and ('campfire' in f or 'haunted_tree' in f):
        base[ay + fh - rows * T + 4: ay + fh, ax + 4: ax + fw - 4] = True
for yy in range(H):
    for xx in range(W):
        if base[yy * T:(yy + 1) * T, xx * T:(xx + 1) * T].mean() >= 0.3:
            walk[yy][xx] = '#'
walk[DOOR[1]][DOOR[0]] = '.'            # a porta: pisou, entrou
for xx in GATE:                         # o portão do cemitério fica aberto
    walk[YARD[1]][xx] = '.'
walk = [''.join(r) for r in walk]

room = {
    'code': 'acampamento',
    'label': 'Acampamento do Outono',
    'w': W * T,
    'h': H * T,
    'walk': walk,
    'spawn': [25, 41],
    'objects': objs_json,
    'atlas': 'acampamento_obj',
    'sprites': {},
    'anims': anims,
    'water': [{'x': LX0 * T, 'y': LY0 * T, 'w': lw * T, 'h': lh * T, 'frames': 8, 'fps': 5, 'file': 'acampamento_lago'}],
    'patrols': patrols,
    'lights': lights,
    'doors': [{'x': DOOR[0], 'y': DOOR[1], 'to': 'casa_japonesa', 'spawn': [6, 10]}],
    'doorSprites': [door_sprite],
    'outdoor': True,
    'spooky': True,
}
data_path = root / 'src/lib/turma2Rooms.json'
data = json.loads(data_path.read_text())
rest = [r for r in data['rooms'] if r['code'] != 'acampamento']
data['rooms'] = [room] + rest
data_path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
print('ok', len(objs_json), 'objetos,', len(anims), 'animados,', len(lights), 'luzes')
