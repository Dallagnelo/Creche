"""Turma 2.0 · "Centro da Cidade": montado só com sprites do Modern Exteriors (LimeZu).

Uso: python scripts/turma2-centro.py      (lê public/limezu/me, que já está no projeto)

De cima para baixo:
  prédios do centro (supermercado, mercadinho, escritório, torre do relógio, edifício residencial)
  avenida principal com carros, ônibus, ambulância e viatura
  quarteirão do meio: delegacia e correio | praça central com chafariz, quiosques e carrinhos | posto de gasolina
  segunda avenida
  rua das casas (vilas e sobrados com quintal, caixas de correio e varal)
Gera public/limezu/t2/centro_chao.png e centro_obj.png e acrescenta a sala "centro" em src/lib/turma2Rooms.json
(com personagens que conversam e moedas para pegar).
"""
import json
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import turma2_lib as L  # noqa: E402
import turma2_export as X  # noqa: E402

root = L.root
OUT = L.OUT
T = 16
W, H = 72, 88
L.setup(W, H)
random.seed(21)
E = X.Map('centro', 'Centro da Cidade', W, H)
piece = L.piece
full = L.reduce({k: True for k in L.KEYS})

# ------------------------------------------------------------------ faixas (em quadradinhos)
NORTH_FOOT = 18          # pé dos prédios de cima
AV1 = range(20, 24)      # avenida principal
AV2 = range(44, 48)      # segunda avenida
MID = (26, 41)           # quarteirão do meio
PLAZA = (19, 52, 27, 40)  # praça: colunas x0..x1, fileiras y0..y1
HOUSE_FOOT = 68          # pé das casas (quintal curto atrás, jardim e caminho na frente)
WALKWAY = (71, 72)       # caminho de pedra na frente das casas
ACCESS = range(33, 37)   # rua de acesso: desce da segunda avenida até o fim do mapa
LAKES = [(3, 75, 30, 84), (39, 75, 68, 84)]  # um lago de cada lado da rua: x0, y0, x1, y1
roads = set(AV1) | set(AV2)


def is_road(x, y):
    return y in roads or (y > AV2[-1] and x in ACCESS)

# ------------------------------------------------------------------ chão
canvas = np.zeros((H * T, W * T, 4), np.float32)
grass = L.at_tile(13, L.analyze(13)[full])
for y in range(H):
    for x in range(W):
        canvas[y * T:(y + 1) * T, x * T:(x + 1) * T] = grass

asphalt = [np.array(piece('city_terrains', f'asphalt_1_variation_{k}')).astype(np.float32) for k in range(16, 24)]
dash = np.array(piece('city_terrains', 'asphalt_1_variation_14')).astype(np.float32)
for road in (AV1, AV2):
    for y in road:
        for x in range(W):
            tile = dash if (y == road[2] and x % 3 != 2) and not (road is AV2 and x in ACCESS and y == road[2]) else random.choice(asphalt)
            canvas[y * T:(y + 1) * T, x * T:(x + 1) * T] = tile
E.paint('asfalto', [[is_road(x, y) or (y in (18, 19) and 1 <= x < 8) for x in range(W)] for y in range(H)])
E.paint('faixa', [[any(y == road[2] and x % 3 != 2 and not (road is AV2 and x in ACCESS) for road in (AV1, AV2)) for x in range(W)] for y in range(H)])
E.paint('faixa_v', [[y > AV2[-1] and x == ACCESS[1] and y % 3 != 2 for x in range(W)] for y in range(H)])
E.paint('vaga', [[y in (18, 19) and 1 <= x < 8 and x % 3 == 1 for x in range(W)] for y in range(H)])
vdash = np.array(piece('city_terrains', 'asphalt_1_variation_15')).astype(np.float32)
for y in range(AV2[-1] + 1, H):
    for x in ACCESS:
        tile = vdash if (x == ACCESS[1] and y % 3 != 2) else random.choice(asphalt)
        canvas[y * T:(y + 1) * T, x * T:(x + 1) * T] = tile

# calçada (bloco 18): tudo da parte urbana que não é rua; a guia aparece sozinha encostada no asfalto
urban = [[not is_road(x, y) and (y < 50 or x in (ACCESS[0] - 1, ACCESS[-1] + 1)) for x in range(W)] for y in range(H)]
not_road = [[not is_road(x, y) for x in range(W)] for y in range(H)]
L.paint(canvas, not_road, 18, only=urban)
E.paint('calcada', [[urban[y][x] and not (y in (18, 19) and 1 <= x < 8) for x in range(W)] for y in range(H)])

# estacionamento do supermercado: vagas com faixas (variação 4 = linha vertical)
park_line = np.array(piece('city_terrains', 'asphalt_1_variation_4')).astype(np.float32)
for y in (18, 19):
    for x in range(1, 8):
        tile = park_line if x % 3 == 1 else random.choice(asphalt)
        canvas[y * T:(y + 1) * T, x * T:(x + 1) * T] = tile

# praça: grama com meio-fio (bloco 13) e caminhos de tijolo (bloco 10) em cruz com o miolo
px0, px1, py0, py1 = PLAZA
plaza = [[px0 <= x <= px1 and py0 <= y <= py1 for x in range(W)] for y in range(H)]
L.paint(canvas, plaza, 13)
E.paint('canteiro', plaza)
cx_t, cy_t = (px0 + px1) // 2, (py0 + py1) // 2
brick = [[plaza[y][x] and (abs(y - cy_t) <= 1 or abs(x - cx_t) <= 1 or (abs(x - cx_t) <= 6 and abs(y - cy_t) <= 4)) for x in range(W)] for y in range(H)]
L.paint(canvas, brick, 10)
E.paint('tijolo', brick)

# rua das casas: grama, e na frente um caminho de pedra (bloco 3) com trilhas até cada porta
yard_path = [[y in WALKWAY and not (ACCESS[0] - 1 <= x <= ACCESS[-1] + 1) for x in range(W)] for y in range(H)]
doors_x = [5, 18, 44, 55, 66]  # colunas das portas (trilha da porta até o caminho)
for dx in doors_x:
    for y in range(HOUSE_FOOT - 1, WALKWAY[0]):
        yard_path[y][dx] = True
L.paint(canvas, yard_path, 3)
E.paint('pedra', yard_path)
# horta (dá para plantar): um canteiro no quintal, perto da rua de acesso
E.paint('horta', [[26 <= x <= 31 and 52 <= y <= 53 for x in range(W)] for y in range(H)])
# passagem da calçada de cima até a rua das casas (pelos lados)

# ------------------------------------------------------------------ objetos
objects = []   # (img, x, y, linhas que bloqueiam)
lights = []


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
    return img


def decal(theme, name, x, y):
    img = np.array(piece(theme, name)).astype(np.float32)
    h, w = img.shape[:2]
    canvas[y:y + h, x:x + w] = L.blend(canvas[y:y + h, x:x + w], img)
    E.obj(theme, name, x, y, 0, chao=True, size=(w, h))


WARM = '255,214,140'
nf = NORTH_FOOT * T
# prédios de cima (bloqueiam inteiros)
place('shopping_center_and_markets', 'mall_1', 152, nf, depth=99, light=(30, -30, 70, '255,240,200'))
place('shopping_center_and_markets', 'market_big_1', 358, nf, depth=99, light=(0, -30, 70, '255,220,170'))
place('office', 'example_2', 578, nf, depth=99, light=(0, -30, 90, '190,220,255'))
place('school', 'clock_tower_1', 800, nf, depth=99, light=(0, -150, 60, '255,240,190'))
place('generic_building', 'condo_4_38', 1004, nf, depth=99, light=(0, -40, 90, WARM))
# estacionamento: carros parados e carrinhos do mercado
for i, cx in enumerate((32, 80)):
    place('vehicles', f'car_down_{(i * 5) % 26 + 1}', cx, 20 * T - 4, depth=2)
place('shopping_center_and_markets', 'shopping_carts_1', 186, nf + 30, depth=1)
place('vehicles', 'fruit_flowers_cart_1', 268, nf + 26, depth=1)

# postes ao longo das avenidas (luz à noite)
for cx in range(312, W * T, 160):
    place('city_props', 'street_lamp_1', cx, 20 * T - 2, depth=1, light=(-6, -52, 72, WARM))
for cx in range(40, W * T, 160):
    place('city_props', 'street_lamp_2', cx, 26 * T - 2, depth=1, light=(6, -52, 72, WARM))
    place('city_props', 'street_lamp_1', cx + 80, 44 * T - 2, depth=1, light=(-6, -52, 72, WARM))
    place('city_props', 'street_lamp_2', cx + 40, 50 * T - 2, depth=1, light=(6, -52, 72, WARM))

# ponto de ônibus em frente à praça, hidrante, orelhão, lixeiras
place('vehicles', 'bus_stop_1', 480, 26 * T - 2, depth=1, light=(0, -30, 44, '200,230,255'))
place('vehicles', 'bus_stop_sign_1', 530, 26 * T - 2, depth=1)
place('city_props', 'hydrant_1', 420, 26 * T - 2)
place('vehicles', 'public_phone_1', 690, 26 * T - 2, depth=1, light=(0, -30, 30, '255,140,140'))
place('city_props', 'trashbin_1', 640, 26 * T - 2)
place('city_props', 'atm_1', 300, nf + 30, light=(0, -26, 22, '140,220,255'))
place('city_props', 'mailbox_1', 860, nf + 28)
place('city_props', 'trashbin_1', 930, nf + 28)

# quarteirão do meio, à esquerda: delegacia e correio
mf = (MID[1] + 1) * T
place('police_station', 'police_station_small_1', 72, mf, depth=99, light=(0, -60, 90, '150,190,255'))
place('post_office', 'building_1', 216, mf, depth=99, light=(0, -40, 80, WARM))
place('police_station', 'police_car_1', 70, 28 * T, depth=2)
place('post_office', 'big_blue_mailbox', 286, mf + 2, depth=1)

# praça central
pcx, pcy = cx_t * T + T // 2, cy_t * T + T // 2
place('city_props', 'kiosk_coffee_cup_example', px0 * T + 70, 33 * T, depth=3, light=(0, -50, 80, '255,210,150'))
place('city_props', 'kiosk_icecream_example', px1 * T - 60, 34 * T, depth=3, light=(0, -60, 90, '255,190,230'))
place('vehicles', 'hot_dog_cart_1', px0 * T + 80, 40 * T + 4, depth=2, light=(0, -30, 60, '255,200,120'))
place('vehicles', 'fruit_flowers_cart_4', px1 * T - 50, 40 * T + 4, depth=1)
for dx in (-60, 60):  # bancos virados para o chafariz
    place('city_props', 'bench_2', pcx + dx, pcy - 30, depth=1)
    place('city_props', 'bench_2', pcx + dx, pcy + 48, depth=1)
for cx, foot, nm in [(px0 * T + 30, 29 * T, 'tree_2'), (px1 * T - 10, 29 * T, 'tree_1'), (px0 * T + 150, 29 * T, 'tree_3'),
                     (px1 * T - 140, 29 * T, 'tree_2'), (px0 * T + 160, 40 * T, 'tree_1'), (px1 * T - 150, 40 * T, 'tree_3')]:
    place('villas', nm, cx, foot, depth=1)
for cx, foot in [(pcx - 110, pcy - 40), (pcx + 110, pcy - 40), (pcx - 110, pcy + 60), (pcx + 110, pcy + 60)]:
    place('city_props', 'flower_bush_4', cx, foot)
for cx, foot in [(pcx - 120, pcy + 8), (pcx + 120, pcy + 8)]:
    place('city_props', 'street_lamp_5', cx, foot, depth=1, light=(0, -54, 64, '255,230,170'))
place('garden', 'grass_statue_5', px0 * T + 30, 37 * T, depth=1)
place('garden', 'grass_statue_6', px1 * T - 10, 37 * T, depth=1)
place('city_props', 'info_sign_4', pcx + 40, py1 * T + 10)
place('city_props', 'trashbin_10', pcx - 40, py1 * T + 12)

# quarteirão do meio, à direita: posto de gasolina
place('vehicles', 'gas_station_2', 1008, mf, depth=99, light=(0, -60, 80, '255,250,220'))
place('vehicles', 'gas_station_price_signboard_1', 900, 31 * T, depth=1, light=(0, -60, 40, '255,90,90'))
place('city_props', 'ev_charging_station_2', 1130, 31 * T, depth=1)
place('vehicles', 'car_right_9', 960, 32 * T - 2, depth=2)

# rua das casas (bloqueiam inteiras); no meio passa a rua de acesso
hf = HOUSE_FOOT * T
for nm, theme, cx in [('villa_1', 'villas', 90), ('24_additional_houses_one_story_house_16x16', 'additional_houses', 300),
                      ('villa_3', 'villas', 714), ('24_additional_houses_terraced_house_4_16x16', 'additional_houses', 884), ('villa_5', 'villas', 1072)]:
    place(theme, nm, cx, hf, depth=99, light=(0, -60, 70, WARM))
for cx in (468, 640, 790, 980):  # árvores entre as casas e na beira da rua de acesso
    place('villas', 'tree_2' if cx % 2 else 'tree_1', cx, hf - 4, depth=1)
for cx in (40, 250, 660, 840, 1020):
    place('post_office', 'red_mailbox_1_front', cx, hf + 30, depth=1)
for cx in (130, 360, 760, 930, 1110):
    place('villas', 'villa_yard_flowers_10', cx, hf + 34)
for cy in range(54, H - 1, 9):  # postes nas calçadas da rua de acesso
    place('city_props', 'street_lamp_1', (ACCESS[0] - 1) * T + 8, cy * T, depth=1, light=(6, -52, 64, WARM))
    place('city_props', 'street_lamp_2', (ACCESS[-1] + 1) * T + 8, (cy + 4) * T, depth=1, light=(-6, -52, 64, WARM))
place('vehicles', 'car_down_5', (ACCESS[0]) * T + 14, 60 * T, depth=2)  # carro estacionado na rua de acesso
place('vehicles', 'bus_stop_sign_2', (ACCESS[-1] + 1) * T + 8, 66 * T, depth=1)

# quintais (curtos, atrás das casas): cerca viva, brinquedos, piquenique, churrasqueira, varal
for cx in range(16, W * T, 32):
    if 150 <= cx <= 186 or (ACCESS[0] - 2) * T <= cx <= (ACCESS[-1] + 2) * T:
        continue  # passagem e rua de acesso
    place('garden', 'bush_14' if (cx // 32) % 2 else 'bush_15', cx, 50 * T + 14, depth=1)
place('villas', 'villa_yard_toy_sand_box_1', 64, 53 * T + 8, depth=1)
place('villas', 'villa_yard_toy_rocking_1', 132, 53 * T + 4, depth=1)
place('villas', 'picnic_5', 236, 53 * T + 8, depth=1)
place('camping', 'barbecue_1', 296, 53 * T + 6, depth=1, light=(0, -10, 26, '255,140,60'))
place('villas', 'villa_yard_basketball_net_1', 396, 53 * T + 8, depth=1)
place('garden', 'blue_big_bird_house', 656, 53 * T + 8, depth=1)
place('villas', 'villa_yard_flowers_11', 840, 53 * T)
place('villas', 'picnic_1', 1040, 53 * T + 8, depth=1)
place('garden', 'bush_19', 1120, 53 * T + 8, depth=1)

# na frente das casas: gramado, bancos e árvores na beira do lago
for cx in (60, 250, 440, 700, 900, 1100):
    place('villas', 'tree_1' if cx % 3 else 'tree_2', cx, 74 * T + 4, depth=1)
for cx in (150, 340, 800, 1000):
    place('city_props', 'bench_2', cx, 74 * T, depth=1)
for cx in (470, 640, 960):
    place('city_props', 'street_lamp_5', cx, 74 * T, depth=1, light=(0, -54, 70, '255,230,170'))

# lagos: pedras e arbustos na margem e a mata fechando o mapa lá embaixo (menos onde a rua passa)
for x, y in [(2, 77), (2, 83), (69, 78), (69, 84), (20, 86), (52, 86)]:
    place('camping', 'rock_2' if (x + y) % 2 else 'rock_3', x * T + 8, y * T + 12)
for cx in range(8, W * T, 48):
    tx = cx + (cx * 7) % 20
    if (ACCESS[0] - 2) * T <= tx <= (ACCESS[-1] + 2) * T:
        continue
    place('villas', ['tree_1', 'tree_2', 'tree_3'][(cx // 48) % 3], tx, (H - 1) * T + 6, depth=1)
for x in (0, 1, 70, 71):
    for y in (76, 80, 84):
        place('garden', 'bush_18', x * T + 8, y * T + 14, depth=1)

# deque de pesca completo (peças do pacote, no chão: dá para andar por cima)
flats = []


def flat(theme, name, x, y):
    img = piece(theme, name)
    objects.append((img, x, y, 0))
    flats.append(len(objects) - 1)
    E.obj(theme, name, x, y, 0, chao=True, size=img.size)
    return img


DX = 20 * T  # o deque desce da margem do lago da esquerda
DY = LAKES[0][1] * T - 8
for i, nm in enumerate(('pier_7', 'pier_8')):
    for r in range(3):
        flat('camping', nm, DX + i * 16, DY + r * 16)
flat('camping', 'pier_19', DX - 8, DY + 48)          # plataforma larga no fim
flat('camping', 'pier_16', DX - 8, DY + 96 - 2)      # beirada da plataforma
place('camping', 'pier_barrel_1', DX + 30, DY + 70, depth=0)
place('camping', 'pier_crates_1', DX - 2, DY + 66, depth=0)
DECK = [(20, r) for r in range(LAKES[0][1], LAKES[0][1] + 6)] + [(21, r) for r in range(LAKES[0][1], LAKES[0][1] + 6)] + [(19, LAKES[0][1] + 4), (19, LAKES[0][1] + 5)]

# ------------------------------------------------------------------ animados
anims = []


def anim(name, cx, foot, fw, frames, fps=10, depth=1, light=None, when=None):
    info = L.anim_index[name]
    a = [int(cx - fw / 2), int(foot - info['h']), info['file'], fw, info['h'], frames, fps, depth]
    if when:
        a.append(when)
    anims.append(a)
    if light:
        lights.append([int(cx + light[0]), int(foot + light[1]), light[2], light[3]])
    assert info['h'] == E.anim_h(name), name
    E.anim(name, a[0], a[1], fw, frames, fps, depth, when or '', lights[-1] if light else None)


anim('garden_fountain_3', pcx, pcy + 30, 48, 6, 8, depth=2, light=(0, -40, 80, '150,220,255'))
for cx, foot, nm, fps in [(pcx - 50, pcy + 70, 'pigeon', 6), (pcx + 70, pcy - 10, 'pigeon_2', 5), (pcx + 20, pcy + 80, 'pigeon', 7),
                          (330, 25 * T + 6, 'pigeon_2', 6), (1060, 49 * T, 'pigeon', 5), (420, 73 * T, 'pigeon', 6)]:
    anim(nm, cx, foot, 16, 6, fps)
anim('clothes_hanging_1', 720, 53 * T + 6, 64, 6, 5, depth=1)
anim('park_swing_1', 920, 53 * T + 6, 48, 8, 6, depth=1)
# lagos
anim('floating_trunk', 54 * T, 80 * T, 48, 8, 6)
for x, y, nm, fps in [(10, 80, 'fishes_1', 10), (26, 82, 'fishes_2', 9), (58, 78, 'fishes_1', 8), (46, 83, 'fishes_2', 10)]:
    anim(nm, x * T, y * T, 16, 12, fps)
for x, y in [(14, 83), (50, 78), (63, 82)]:
    anim('bubbles', x * T, y * T, 16, 8, 8)

# ------------------------------------------------------------------ carros, ônibus, ambulância e viatura
movers = []
vehicle_imgs = {}


vehicle_src = {}


def vehicle(name, theme, piece_name):
    vehicle_imgs[name] = piece(theme, piece_name)
    vehicle_src[name] = (theme, piece_name)


for k in (1, 7, 14, 21, 3, 10, 17, 24):
    vehicle(f'car{k}_r', 'vehicles', f'car_right_{k}')
    vehicle(f'car{k}_l', 'vehicles', f'car_left_{k}')
vehicle('bus_r', 'vehicles', 'bus_right_1')
vehicle('bus_l', 'vehicles', 'bus_left_1')
vehicle('amb_r', 'vehicles', 'ambulance_right_1')
vehicle('pol_l', 'police_station', 'police_car_2')
lanes = {'a1r': 22 * T - 2, 'a1l': 24 * T - 2, 'a2r': 46 * T - 2, 'a2l': 48 * T - 2}
for i, (nm, sp) in enumerate([('bus_r', 46), ('car1_r', 66), ('car7_r', 58), ('car14_r', 72)]):
    movers.append([nm, lanes['a1r'], sp, i * 300])
for i, (nm, sp) in enumerate([('car21_l', -62), ('pol_l', -76), ('car3_l', -54), ('car10_l', -68)]):
    movers.append([nm, lanes['a1l'], sp, 140 + i * 290])
for i, (nm, sp) in enumerate([('car17_r', 56), ('amb_r', 74), ('car24_r', 60)]):
    movers.append([nm, lanes['a2r'], sp, 60 + i * 380])
for i, (nm, sp) in enumerate([('bus_l', -44), ('car10_l', -64), ('car1_l', -58)]):
    movers.append([nm, lanes['a2l'], sp, 200 + i * 380])

for nm, fy, sp, x0 in movers:
    E.car(*vehicle_src[nm], fy, sp, x0)

# ------------------------------------------------------------------ atlas
items = objects
named = list(vehicle_imgs.items())
blocks = [(img, None) for img, *_ in items] + [(img, name) for name, img in named]
order = sorted(range(len(blocks)), key=lambda i: -blocks[i][0].height)
AW, x, y, shelf = 1024, 0, 0, 0
pos = {}
for i in order:
    img = blocks[i][0]
    if x + img.width > AW:
        x, y, shelf = 0, y + shelf + 1, 0
    pos[i] = (x, y)
    x += img.width + 1
    shelf = max(shelf, img.height)
atlas = Image.new('RGBA', (AW, y + shelf + 1))
for i, (img, _) in enumerate(blocks):
    atlas.paste(img, pos[i])
flat_set = set(flats)
objs_json = sorted(([ox, oy, img.width, img.height, *pos[i]] + ([None, 0, 1] if i in flat_set else []) for i, (img, ox, oy, _) in enumerate(items)),
                   key=lambda o: o[1] if len(o) > 8 else o[1] + o[3])
sprites_json = {name: [*pos[len(items) + k], img.width, img.height] for k, (name, img) in enumerate(named)}

floor = Image.fromarray(canvas.clip(0, 255).astype(np.uint8))

# lagos animados (8 quadros, margem em volta)
water = Image.open(L.ME / 'terrenos/water_tileset.png').convert('RGBA')
water_json = []
for k, (LX0, LY0, LX1, LY1) in enumerate(LAKES):
    lw, lh = LX1 - LX0 + 1, LY1 - LY0 + 1
    lake = Image.new('RGBA', (lw * T, lh * T * 8))
    for f in range(8):
        for r in range(lh):
            for c in range(lw):
                tr = 0 if r == 0 else 2 if r == lh - 1 else 1
                tc = 0 if c == 0 else 2 if c == lw - 1 else 1
                lake.paste(water.crop((f * 48 + tc * 16, tr * 16, f * 48 + tc * 16 + 16, tr * 16 + 16)), (c * T, f * lh * T + r * T))
    E.lake(LX0, LY0, lw, lh)
    water_json.append({'x': LX0 * T, 'y': LY0 * T, 'w': lw * T, 'h': lh * T, 'frames': 8, 'fps': 5, 'file': f'centro_lago_{k + 1}'})
boat_r, boat_l = L.anim_index['fishing_boat_right'], L.anim_index['fishing_boat_left']
patrols = [[boat_r['file'], boat_l['file'], 80, 32, 8, (LAKES[1][0] + 2) * T, (LAKES[1][2] - 6) * T, 82 * T, 16]]
E.patrol('fishing_boat_right', 'fishing_boat_left', (LAKES[1][0] + 2) * T, (LAKES[1][2] - 6) * T, 82 * T, 16)

# ------------------------------------------------------------------ onde dá para andar
walk = [['.'] * W for _ in range(H)]
for yy in range(NORTH_FOOT - 1):
    for xx in range(W):
        walk[yy][xx] = '#'
for LX0, LY0, LX1, LY1 in LAKES:  # água
    for yy in range(LY0, LY1 + 1):
        for xx in range(LX0, LX1 + 1):
            walk[yy][xx] = '#'
for xx in range(W):
    if xx not in ACCESS:
        walk[H - 1][xx] = '#'  # a mata no fim do mapa (a rua segue)
base = np.zeros((H * T, W * T), bool)
for img, ox, oy, rows in items:
    a = np.array(img)[:, :, 3] > 160
    top = max(0, img.height - rows * T)
    part = a[top:]
    y0 = oy + top
    ys, xs = slice(max(0, y0), min(H * T, y0 + part.shape[0])), slice(max(0, ox), min(W * T, ox + part.shape[1]))
    base[ys, xs] |= part[ys.start - y0: ys.stop - y0, xs.start - ox: xs.stop - ox]
fx, fy = pcx - 24, pcy + 30 - 40
base[fy:fy + 40, fx + 6:fx + 42] = True  # chafariz
for yy in range(H):
    for xx in range(W):
        if base[yy * T:(yy + 1) * T, xx * T:(xx + 1) * T].mean() >= 0.3:
            walk[yy][xx] = '#'
# portas das casas e da frente dos prédios: sempre livres para chegar perto
for dx in doors_x:
    walk[HOUSE_FOOT][dx] = '.'
# passagens entre as casas, da calçada até o caminho da frente
for yy in range(49, WALKWAY[1] + 1):
    walk[yy][10] = '.'
for x, y in DECK:  # o deque
    walk[y][x] = '.'
walk = [''.join(r) for r in walk]

# ------------------------------------------------------------------ personagens (NPCs) e moedas
def ch(corpo, olhos, roupa, cabelo, acessorio=None):
    return {'corpo': corpo, 'olhos': olhos, 'roupa': roupa, 'cabelo': cabelo, 'acessorio': acessorio}


npcs = [
    {'id': 'joaquim', 'x': 15, 'y': 19, 'modo': 'parado', 'dir': 'down', 'nome': 'Seu Joaquim',
     'fala': 'Promoção no Supermercado! Melancia pela metade do preço, só hoje!', 'c': ch('body_04', 'eyes_01', 'outfit_10_03', 'hairstyle_12_01', 'accessory_12_mustache_01')},
    {'id': 'guarda', 'x': 4, 'y': 42, 'modo': 'parado', 'dir': 'down', 'nome': 'Guarda Rita',
     'fala': 'Tudo tranquilo no centro hoje. Atravesse a avenida com cuidado, os carros não param!', 'c': ch('body_01', 'eyes_05', 'outfit_19_01', 'hairstyle_25_03', 'accessory_06_policeman_hat_01')},
    {'id': 'carteiro', 'x': 15, 'y': 42, 'modo': 'parado', 'dir': 'down', 'nome': 'Carteiro Beto',
     'fala': 'Hoje não tem carta para você... mas amanhã quem sabe!', 'c': ch('body_03', 'eyes_02', 'outfit_04_02', 'hairstyle_08_03', 'accessory_04_snapback_02')},
    {'id': 'corredora', 'x': 23, 'y': 30, 'modo': 'passeia', 'raio': 4, 'nome': 'Lu',
     'fala': 'Mais uma volta na praça e eu paro... juro!', 'c': ch('body_07', 'eyes_03', 'outfit_25_01', 'hairstyle_20_01')},
    {'id': 'vovo', 'x': cx_t - 4, 'y': cy_t - 2, 'modo': 'senta', 'dir': 'right', 'nome': 'Vó Zélia',
     'fala': 'No meu tempo essa praça era só mato. Agora tem até sorvete!', 'c': ch('body_02', 'eyes_06', 'outfit_18_01', 'hairstyle_05_02', 'accessory_15_glasses_03')},
    {'id': 'gamer', 'x': cx_t + 5, 'y': cy_t + 3, 'modo': 'celular', 'nome': 'Duda',
     'fala': 'Só mais um vídeo e eu vou pra casa...', 'c': ch('body_03', 'eyes_07', 'outfit_21_03', 'hairstyle_28_05', 'accessory_11_beanie_02')},
    {'id': 'sorvete', 'x': px1 - 4, 'y': 35, 'modo': 'parado', 'dir': 'up', 'nome': 'Pedrinho',
     'fala': 'Eu quero de chocolate com granulado!', 'c': ch('body_02', 'eyes_04', 'outfit_24_01', 'hairstyle_15_02')},
    {'id': 'frentista', 'x': 58, 'y': 42, 'modo': 'parado', 'dir': 'down', 'nome': 'Frentista Edu',
     'fala': 'Completa? Hoje a gasolina tá pela hora da morte!', 'c': ch('body_04', 'eyes_02', 'outfit_16_01', 'hairstyle_03_04', 'accessory_04_snapback_01')},
    {'id': 'onibus', 'x': 31, 'y': 25, 'modo': 'parado', 'dir': 'up', 'nome': 'Seu Carlos',
     'fala': 'Esse ônibus sempre atrasa... já passei três vezes aqui!', 'c': ch('body_01', 'eyes_01', 'outfit_02_01', 'hairstyle_02_01', 'accessory_08_detective_hat_01')},
    {'id': 'vizinha', 'x': 25, 'y': 71, 'modo': 'passeia', 'raio': 6, 'nome': 'Dona Marta',
     'fala': 'Bem-vindo ao bairro! Se precisar de açúcar, é só bater na porta.', 'c': ch('body_02', 'eyes_03', 'outfit_09_01', 'hairstyle_18_02')},
    {'id': 'pai', 'x': 20, 'y': 53, 'modo': 'parado', 'dir': 'left', 'nome': 'Seu Lauro',
     'fala': 'Domingo tem churrasco aqui no quintal. Traz a farofa!', 'c': ch('body_03', 'eyes_01', 'outfit_23_01', 'hairstyle_02_01', 'accessory_13_beard_01')},
    {'id': 'crianca', 'x': 7, 'y': 53, 'modo': 'passeia', 'raio': 2, 'nome': 'Tetê',
     'fala': 'Tô construindo um castelo de areia gigante!', 'c': ch('body_07', 'eyes_04', 'outfit_24_04', 'hairstyle_15_02')},
    {'id': 'pescador', 'x': 21, 'y': 80, 'modo': 'parado', 'dir': 'down', 'nome': 'Seu Tonho',
     'fala': 'Silêncio... os peixes tão quase mordendo. Ontem peguei um deste tamanho!', 'c': ch('body_04', 'eyes_02', 'outfit_22_04', 'hairstyle_12_01', 'accessory_11_beanie_03')},
    {'id': 'namorados', 'x': 9, 'y': 73, 'modo': 'senta', 'dir': 'right', 'nome': 'Bia',
     'fala': 'O pôr do sol daqui do lago é o mais bonito da cidade.', 'c': ch('body_02', 'eyes_07', 'outfit_09_01', 'hairstyle_28_05')},
    {'id': 'chef', 'x': px0 + 4, 'y': 34, 'modo': 'parado', 'dir': 'right', 'nome': 'Chef Tom',
     'fala': 'O cachorro-quente do carrinho é receita minha. Pode confiar!', 'c': ch('body_04', 'eyes_06', 'outfit_12_01', 'hairstyle_25_03', 'accessory_18_chef_01')},
]
# moedas espalhadas (cada um pega uma vez)
coins = [(px0 + 2, py0 + 1), (px1 - 1, py0 + 1), (cx_t, py1 - 1), (12, 27), (69, 28), (10, 56), (60, 73), (40, 49), (2, 86), (69, 86), (24, 52), (19, 79)]
items_json = [{'id': f'm{i}', 'tipo': 'moeda', 'x': x, 'y': y, 'valor': 1} for i, (x, y) in enumerate(coins)]
for n in npcs:
    walk_row = list(walk[n['y']])
    walk_row[n['x']] = '.'
    walk[n['y']] = ''.join(walk_row)
for it in items_json:
    row = list(walk[it['y']])
    row[it['x']] = '.'
    walk[it['y']] = ''.join(row)

# ------------------------------------------------------------------ grava no formato do editor (src/lib/turma2/defaultMaps.json)
E.npcs = npcs
E.items = items_json
E.spawn = [cx_t, py1 + 1]
E.save(walk)
