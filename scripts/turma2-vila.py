"""Turma 2.0 · mapa de teste "Vila Primavera" (pegada Stardew Valley), no formato do editor.

Uso: python scripts/turma2-vila.py   (depois do turma2-fazenda.py)
Grava em src/lib/turma2/defaultMaps.json (dá para abrir e mexer no editor de mapas).

Casa com caixa de venda, horta grande para arar e plantar, praça com barraca (loja) e forno (cozinhar),
celeiro com cercado de bichos, lago para pescar e árvores em volta.
"""
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import turma2_export as X  # noqa: E402

random.seed(5)
W, H = 46, 34
T = 16
E = X.Map('vila', 'Vila Primavera', W, H)
LIB = X.LIB['pecas']
grid = lambda f: [[bool(f(x, y)) for x in range(W)] for y in range(H)]  # noqa: E731


def put(theme, name, tx, foot, depth=None, light=None, chao=False, at=None, dx=0, src='pecas', M=None):
    """peça com o pé (fundo) na fileira "foot" e o meio em tx (em quadradinhos)"""
    M = M or E
    r = X.LIB[src][theme][name]
    x = int(tx * T - r[2] / 2) + dx
    y = foot * T - r[3]
    d = depth if depth is not None else (1 if r[3] <= 32 else 2)
    lt = [x + r[2] / 2 + light[0], y + r[3] + light[1], light[2], light[3]] if light else None
    o = M.obj(theme, name, x, y, d, light=lt, chao=chao, src=src)
    if at:
        o['at'] = at
    return o


# ------------------------------------------------------------------ chão
FIELD = (4, 15, 17, 22)  # x0, y0, x1, y1 (horta)
PEN = (32, 18, 44, 28)  # cercado dos bichos
LAKE = (4, 25, 15, 31)
path = set()
for y in range(12, 15):
    for x in range(6, 9):
        path.add((x, y))  # da porta da casa até o caminho
for x in range(6, 31):
    for y in (13, 14):
        path.add((x, y))  # caminho de leste a oeste
for y in range(5, 33):
    for x in (29, 30):
        path.add((x, y))  # caminho de norte a sul
for x in range(30, 41):
    for y in (12, 13):
        path.add((x, y))  # até o celeiro
for x in range(26, 36):
    for y in range(8, 12):
        path.add((x, y))  # praça
E.paint('trilha', grid(lambda x, y: (x, y) in path))
E.paint('horta', grid(lambda x, y: FIELD[0] <= x <= FIELD[2] and FIELD[1] <= y <= FIELD[3]))
pen_edge = lambda x, y: PEN[0] <= x <= PEN[2] and PEN[1] <= y <= PEN[3] and (x in (PEN[0], PEN[2]) or y in (PEN[1], PEN[3]))  # noqa: E731
E.paint('cerca', grid(lambda x, y: pen_edge(x, y) and not (y == PEN[1] and x in (36, 37))))  # porteira aberta no alto
E.lake(LAKE[0], LAKE[1], LAKE[2] - LAKE[0] + 1, LAKE[3] - LAKE[1] + 1)

# ------------------------------------------------------------------ casa, caixa de venda e o forno
put('fazenda_construcoes', 'farmer_house_1', 7, 12, depth=6, light=[0, -6, 46, '255,214,150'])
put('fazenda_construcoes', 'box_load', 12, 12, depth=1, at='venda')
put('camping', 'lantern_1', 10, 12, depth=1, light=[0, -10, 54, '255,200,120'])
put('fazenda_construcoes', 'stone_oven_1', 21, 11, depth=2, at='cozinha', light=[0, -18, 40, '255,150,80'])
put('fazenda_construcoes', 'wooden_shovel_1_stone_oven', 23.6, 11, depth=0)

# ------------------------------------------------------------------ praça: barraca (loja), poço, bancos
put('fazenda_construcoes', 'market_stand_yellow_example', 32, 9, depth=2, at='loja', light=[0, -20, 60, '255,220,150'])
put('fazenda_construcoes', 'market_stand_green_big', 26.5, 9, depth=1)
put('fazenda_construcoes', 'well_usable', 34.5, 15, depth=1)
put('city_props', 'street_lamp_1', 25, 12, depth=1, light=[0, -42, 70, '255,226,160'])
put('city_props', 'street_lamp_1', 36, 12, depth=1, light=[0, -42, 70, '255,226,160'])
put('city_props', 'street_lamp_1', 31.5, 20, depth=1, light=[0, -42, 70, '255,226,160'])

# ------------------------------------------------------------------ celeiro e cercado
put('fazenda_construcoes', 'barn_small', 41, 12, depth=6, light=[0, -10, 50, '255,214,150'])
put('fazenda_construcoes', 'henhouse', 42, 21, depth=2)
put('fazenda_construcoes', 'hay_fresh_pile', 34.5, 22, depth=1)
put('fazenda_construcoes', 'drinking_trough_horizontal_full', 38, 26, depth=1)
put('fazenda_construcoes', 'scarecrow', 19, 19, depth=1)

# ------------------------------------------------------------------ árvores em volta (e frutíferas perto da casa)
trees = ['tree_oak_green_big', 'tree_pine_green_big', 'tree_oak_green_medium', 'tree_pine_dark_green_medium', 'tree_birch_green_big']
for tx in range(2, 46, 4):
    if 26 <= tx <= 34:
        continue
    put('fazenda_arvores', random.choice(trees), tx + random.uniform(-0.6, 0.6), 4, depth=2)
for ty in range(8, 33, 4):
    put('fazenda_arvores', random.choice(trees), 1, ty, depth=2)
for ty in range(16, 33, 5):
    if ty > 30:
        continue
    put('fazenda_arvores', random.choice(trees), 45.5, ty, depth=2)
for tx in range(18, 46, 5):
    if 27 <= tx <= 32:
        continue
    put('fazenda_arvores', random.choice(trees), tx + random.uniform(-0.5, 0.5), 34, depth=2)
put('fazenda_arvores', 'fruit_tree_apple_ripe', 15, 10, depth=1)
put('fazenda_arvores', 'fruit_tree_peach_ripe', 24.5, 22, depth=1)
put('fazenda_arvores', 'fruit_tree_orange_ripe', 22, 30, depth=1)
put('fazenda_arvores', 'fruit_tree_lemon_ripe', 38.5, 31, depth=1)

# enfeites: flores e pedras (no chão)
taken = set(path)
for _ in range(40):
    x, y = random.randint(2, W - 3), random.randint(6, H - 3)
    inside = FIELD[0] - 1 <= x <= FIELD[2] + 1 and FIELD[1] - 1 <= y <= FIELD[3] + 1
    inside |= LAKE[0] - 1 <= x <= LAKE[2] + 1 and LAKE[1] - 1 <= y <= LAKE[3] + 1
    inside |= PEN[0] <= x <= PEN[2] and PEN[1] <= y <= PEN[3]
    if inside or (x, y) in taken:
        continue
    taken.add((x, y))
    put('fazenda_construcoes', f'grass_tufts_flowers_{random.randint(1, 11)}', x + 0.5, y + 1, chao=True)
put('fazenda_construcoes', 'rock_medium', 18, 27, depth=1)
put('fazenda_construcoes', 'pumpkin_medium', 3.5, 13, depth=0)

# ------------------------------------------------------------------ gente e bichos
# rotina: [hora, x, y, some?] — a partir dessa hora vai até lá (some = entra e só volta na próxima parada)
E.npcs = [
    {'id': 'n1', 'x': 32, 'y': 10, 'c': {'corpo': 'body_05', 'olhos': 'eyes_03', 'cabelo': 'hairstyle_07_03', 'roupa': 'outfit_22_04'},
     'nome': 'Seu Joaquim', 'fala': 'Bom dia! Sementes fresquinhas aqui na barraca. Aperte E para ver.',
     'falaAmigo': 'Ô, meu amigo! Guardei as sementes mais bonitas para você.', 'gosta': ['queijo', 'pao', 'cafe'], 'odeia': ['lixo'],
     'modo': 'parado', 'dir': 'down', 'rotina': [[7, 32, 10], [18, 26, 16], [21, 41, 13, 1]]},
    {'id': 'n2', 'x': 24, 'y': 15, 'c': {'corpo': 'body_02', 'olhos': 'eyes_05', 'cabelo': 'hairstyle_12_02', 'roupa': 'outfit_09_02'},
     'nome': 'Ana', 'fala': 'Dica: are a terra com a enxada, plante e regue todo dia. A caixa ao lado da casa vende tudo de manhã!',
     'falaAmigo': 'Você virou o melhor fazendeiro da vila! Me conta o segredo dos seus morangos?', 'gosta': ['morango', 'croissant', 'pessego'], 'odeia': ['rabanete'],
     'modo': 'passeia', 'raio': 3, 'rotina': [[6, 24, 15], [11, 34, 16], [15, 20, 23], [19, 24, 15], [22, 41, 13, 1]]},
    {'id': 'n3', 'x': 16, 'y': 27, 'c': {'corpo': 'body_04', 'olhos': 'eyes_01', 'cabelo': 'hairstyle_03_05', 'roupa': 'outfit_16_01'},
     'nome': 'Tonho', 'fala': 'O lago tá cheio de peixe hoje. Segura o botão para a barrinha subir!',
     'falaAmigo': 'Parceiro de pescaria! Hoje o dourado aparece, tenho certeza.', 'gosta': ['dourado', 'tucunare', 'moqueca'], 'odeia': ['salada'],
     'modo': 'parado', 'dir': 'left', 'rotina': [[5, 16, 27], [12, 23, 26], [17, 16, 27], [21, 41, 13, 1]]},
]
bichos = [('cow', 35, 24), ('cow_caramel', 40, 24), ('chicken_white', 41, 23), ('chicken_brown', 39, 22), ('chick', 38, 23),
          ('pig_pink', 34, 26), ('sheep_2_white', 36, 21), ('duck_white', 17, 25), ('duck_brown', 16, 31)]
for i, (b, x, y) in enumerate(bichos):
    E.npcs.append({'id': f'b{i}', 'x': x, 'y': y, 'bicho': b, 'modo': 'passeia', 'raio': 3})

E.spawn = [8, 13]
E.door(8, 11, 'casa', 6, 8)  # porta da casa da fazenda

# onde dá para andar: o automático do editor (sem ajustes)
E.save(None, sky='dia')


# ------------------------------------------------------------------ dentro da casa (cama, baú, lareira)
C = X.Map('casa', 'Casa da fazenda', 12, 10, base='madeira')
C.dentro = True
C.paint('parede_madeira', [[y < 2 for x in range(12)] for y in range(10)])
C.paint('tapete', [[4 <= x <= 7 and 5 <= y <= 7 for x in range(12)] for y in range(10)])
put('bedroom', '63', 2.2, 5, depth=1, at='cama', src='moveis', M=C)
put('living_room', '55', 10, 3, depth=1, at='bau', src='moveis', M=C)
put('living_room', '107', 6, 3, depth=1, light=[0, -14, 64, '255,150,80'], src='moveis', M=C)
put('living_room', '37', 8.3, 3, depth=1, src='moveis', M=C)
put('living_room', '13', 1, 9, depth=1, src='moveis', M=C)
put('living_room', '13', 11, 9, depth=1, src='moveis', M=C)
put('living_room', '29', 9, 7, depth=1, src='moveis', M=C)
C.light(3 * 16, 3 * 16, 70, '255,220,170')
C.light(9 * 16, 6 * 16, 70, '255,220,170')
C.door(6, 9, 'vila', 8, 12)
C.spawn = [6, 8]
C.save(None)
