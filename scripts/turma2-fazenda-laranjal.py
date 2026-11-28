"""Turma 2.0 · mapa "Fazenda Laranjal": feira, pomar de laranjas, celeiro vermelho e pasto, no formato do editor.

Uso: python scripts/turma2-fazenda-laranjal.py   (depois do turma2-enseada.py)
Grava em src/lib/turma2/defaultMaps.json (dá para abrir e mexer no editor de mapas).

Montado igual à cena de exemplo do pacote Modern Farm (LimeZu):
à esquerda o pomar de laranjeiras com caixotes e a feira com barracas listradas; no meio a trilha de terra,
árvores de outono e a casinha do cachorro; à direita o celeiro vermelho grande com o silo e o cercado das vacas;
embaixo o pasto cercado com cocho, manjedoura, vacas, bezerro, pato e burro.
A trilha de baixo desce para a Enseada da Maré.
Só peças do Modern Farm (e as barracas dele).
"""
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import turma2_export as X  # noqa: E402

random.seed(51)
T = 16
W, H = 46, 34
E = X.Map('fazenda', 'Fazenda Laranjal', W, H)
grid = lambda f: [[bool(f(x, y)) for x in range(W)] for y in range(H)]  # noqa: E731
FZ, FA = 'fazenda_construcoes', 'fazenda_arvores'
solid = set()  # quadradinhos bloqueados à mão (barracas "chão", celeiro)


def put(theme, name, tx, foot, depth=None, light=None, chao=False, at=None, dx=0, src='pecas', flip=False):
    """peça com o pé (fundo) na fileira "foot" e o meio em tx (em quadradinhos)"""
    r = X.LIB[src][theme][name]
    x = int(round(tx * T - r[2] / 2)) + dx
    y = int(round(foot * T)) - r[3]
    d = depth if depth is not None else (1 if r[3] <= 32 else 2)
    lt = [x + r[2] / 2 + light[0], y + r[3] + light[1], light[2], light[3]] if light else None
    o = E.obj(theme, name, x, y, d, light=lt, chao=chao, src=src, flip=flip)
    if at:
        o['at'] = at
    return o


def block(x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            solid.add((x, y))


def ring(x0, y0, x1, y1, gate=None):
    """contorno de um retângulo (para cerca); gate = (y, xa, xb) buraco da porteira"""
    def f(x, y):
        if not (x0 <= x <= x1 and y0 <= y <= y1 and (x in (x0, x1) or y in (y0, y1))):
            return False
        return not (gate and y == gate[0] and gate[1] <= x <= gate[2])
    return f


# ================================================================== chão: trilha de terra
path = set()
for y in range(0, H):
    for x in (14, 15):
        path.add((x, y))  # trilha principal, de cima até a Enseada
for x in range(1, 14):
    for y in (14, 15):
        path.add((x, y))  # rua de cima da feira (na frente dos caixotes)
for x in range(1, 14):
    for y in (20, 21):
        path.add((x, y))  # rua da feira (para a esquerda)
for x in range(16, 39):
    for y in (21, 22):
        path.add((x, y))  # para a direita, na frente do celeiro, até o cercado das vacas
for x in range(28, 32):
    for y in (19, 20):
        path.add((x, y))  # porta do celeiro (a de cima fica embaixo da parede)
E.paint('trilha', grid(lambda x, y: (x, y) in path))

# cercas: fileira do pomar, cercado das vacas (à direita) e o pasto de baixo
PEN_R = (37, 11, 45, 23)
PASTO = (16, 24, 36, 31)
E.paint('cerca', grid(lambda x, y: y == 12 and 1 <= x <= 9))
pen = ring(*PEN_R)
E.paint('cerca', grid(lambda x, y: pen(x, y) and not (x == PEN_R[0] and y in (21, 22))))  # porteira do lado da rua
E.paint('cerca', grid(ring(*PASTO, gate=(PASTO[1], 25, 26))))
E.paint('cerca', grid(lambda x, y: x == 13 and 1 <= y <= 6))  # mourões do lado da trilha

# ================================================================== pomar de laranjas (em cima, à esquerda)
put(FA, 'fruit_tree_orange_ripe_big', 4, 6, depth=1)
put(FA, 'fruit_tree_orange_ripe', 10.5, 10.5, depth=1)
put(FA, 'tree_oak_green_medium', 2.5, 11.4, depth=2)
put(FA, 'tree_oak_green_small', 7, 3.2, depth=2)
put(FA, 'tree_oak_green_small', 11.5, 3, depth=2)
put(FA, 'example_fruit_tree_stairs', 5.6, 6.6, depth=1)
put(FA, 'crate_brown_oranges', 9, 4.2, depth=1)
put(FA, 'crate_dark_brown_oranges', 9.6, 5.6, depth=1)
put(FA, 'basket_orange', 11.2, 5.2, depth=1)
put(FA, 'tree_trunk_orange', 12, 4.4, depth=1)
put(FA, 'fruit_sign_orange', 7.6, 6.4, depth=0)
# na frente da cerca do pomar: caixotes de fruta e cestos
put(FZ, 'basket_empty', 1.5, 13.2, depth=1)
put(FA, 'crate_brown_apples', 3.2, 13.4, depth=1)
put(FA, 'crate_dark_brown_peaches', 5, 13.4, depth=1)
put(FA, 'crate_brown_lemons', 6.8, 13.4, depth=1)
put(FA, 'basket_apple', 8.4, 13.2, depth=1)

# ================================================================== feira (barracas listradas)
# barraca de cima (com caixa e balança): é a loja da feira
put(FZ, 'market_stand_yellow_example', 11.5, 14.4, depth=1, at='loja', light=[0, -24, 60, '255,220,150'])


def stall(tx, foot, color, items):
    """barraca grande: o balcão amarelo do pacote + o toldo da cor por cima e as coisas no balcão"""
    put(FZ, 'market_stand_yellow_big', tx, foot, chao=True, at='nada')
    if color != 'yellow':
        put(FZ, f'market_stand_{color}_big', tx, foot - 2, depth=0, at='nada')
    for name, dx in items:
        put(FZ if name in X.LIB['pecas'][FZ] else FA, name, tx + dx, foot - 1.2, depth=0, at='nada')
    x0 = int(tx - 2.5)
    block(x0, int(foot) - 2, x0 + 4, int(foot) - 1)


stall(3.5, 20, 'green', [('register_market_stand', -1.4), ('basket_peach', -0.3), ('milk_can_1', 0.8), ('box_single', 1.7)])
stall(3.5, 26.6, 'yellow', [('register_market_stand', -1.4), ('egg_box', 0), ('milk_can_2', 1.6)])
stall(9.2, 26.6, 'yellow', [('scale_market_stand', -1.4), ('cheese_1', -0.2), ('cheese_2', 0.7), ('cheese_3', 1.6)])
put(FZ, 'sign_1_market_stand', 6.7, 19.6, depth=1)
put(FA, 'crate_brown_oranges', 8.4, 19.2, depth=1)
put(FA, 'crate_dark_brown_apples', 10.3, 19.2, depth=1)
put(FZ, 'sign_2_market_stand', 0.9, 27.2, depth=1)
put(FZ, 'bucket_load', 12.6, 27, depth=1)
put(FZ, 'stool_wood_1', 6.4, 27.4, depth=0)
put(FZ, 'basket_empty', 1, 19.8, depth=1)

# ================================================================== meio: árvores de outono e a casinha do cachorro
put(FA, 'tree_oak_brown_huge', 18.5, 7.5, depth=2)
put(FA, 'tree_birch_yellow_big', 21.2, 5, depth=2)
put(FA, 'tree_oak_green_big', 18, 12.5, depth=2)
put(FA, 'tree_oak_brown_big', 17.5, 17.3, depth=2)
put(FZ, 'wood_board_load', 20.4, 16, depth=1)
put(FZ, 'doghouse_bone', 20.2, 19.6, depth=1)
put(FZ, 'dog_bowl_red_full', 18.6, 20.2, depth=0)
E.anims.append({'id': E._id('a'), 'n': 'fz_modern_farm_vfx_falling_leaves_brown', 'x': 17 * T, 'y': 4 * T, 'fps': 8, 'd': 0, 'w': ''})

# ================================================================== celeiro vermelho grande e o silo
BX = 29.5  # meio do celeiro (15 de largura)
BF = 20  # pé da frente
put(FZ, 'front_hayloft_red', BX, BF, depth=0, at='nada')
for i in range(3):
    put(FZ, 'roof_hayloft_middle_modular', BX, BF - 7 - 2 * i, depth=0, at='nada')
put(FZ, 'roof_hayloft_top', BX, BF - 13, depth=0, at='nada')
block(22, 1, 36, BF - 1)
put(FZ, 'silos_1', 41.5, 9.6, depth=2)
put(FZ, 'rock_medium', 38, 10.2, depth=1)
put(FZ, 'raw_bale_big', 44, 10, depth=1)
put(FA, 'tree_oak_green_medium', 44.5, 7, depth=2)
put(FZ, 'cow_sign', 37.4, 11.6, depth=0)

# ================================================================== cercado das vacas (direita) e pasto (embaixo)
put(FZ, 'hay_fresh_pile', 42, 14, depth=1)
put(FZ, 'drinking_trough_vertical_full', 44, 19, depth=1)
put(FA, 'tree_oak_green_small', 43.5, 22.2, depth=2)
put(FZ, 'drinking_trough_horizontal_full', 22.5, 25, depth=1)
put(FZ, 'hay_manger_horizontal_full', 29, 25, depth=1)
put(FZ, 'rock_small', 33.5, 25, depth=1)
put(FZ, 'hay_fresh_pile', 19, 30, depth=1)
put(FA, 'tree_trunk_oak_medium', 35, 29.6, depth=1)
put(FZ, 'donkey_sign', 27.5, 24.4, depth=0)

# ================================================================== bordas: árvores em volta (deixa a trilha livre)
greens = ['tree_oak_green_big', 'tree_oak_green_medium', 'tree_pine_green_medium', 'tree_oak_blue_green_medium']
autumn = ['tree_oak_brown_medium', 'tree_birch_yellow_medium', 'tree_birch_brown_medium']
for ty in range(28, 35, 3):
    put(FA, random.choice(greens), 1, ty, depth=2)
for tx, ty in [(5, 30.5), (9.5, 31.5), (4, 33.5), (11.5, 34.2), (39.5, 27), (43.5, 26), (41.5, 31), (44.5, 33.5), (38.5, 34)]:
    put(FA, random.choice(greens + autumn), tx, ty, depth=2)
for tx, ty in [(19, 34.2), (24, 34.5), (29.5, 34.4), (34, 34.6)]:
    put(FA, random.choice(autumn + greens), tx, ty, depth=2)
for i in range(8):
    x, y = random.choice([(12, 17), (12, 29), (9, 17), (38, 25), (42, 29), (12, 31), (17, 33)])
    put(FZ, f'grass_tufts_flowers_{random.randint(1, 11)}', x + 0.5, y + 1, depth=0, chao=True, at='nada')

# ================================================================== gente e bichos
E.npcs = [
    {'id': 'n1', 'x': 10, 'y': 4, 'c': {'corpo': 'body_04', 'olhos': 'eyes_02', 'cabelo': 'hairstyle_09_06', 'roupa': 'outfit_09_03'},
     'nome': 'Vô Tonico', 'fala': 'Essas laranjeiras eram do meu avô! Chacoalha a árvore com E e leva as laranjas.',
     'falaAmigo': 'Guardei o caixote das mais doces para você.', 'gosta': ['laranja', 'cafe'], 'odeia': ['lixo'], 'modo': 'parado', 'dir': 'down'},
    {'id': 'n2', 'x': 14, 'y': 14, 'c': {'corpo': 'body_02', 'olhos': 'eyes_05', 'cabelo': 'hairstyle_14_03', 'roupa': 'outfit_12_02'},
     'nome': 'Rosa da feira', 'fala': 'Feira fresquinha! Vende o que você colheu e leva o que precisar.',
     'falaAmigo': 'Para você o desconto de amigo, viu?', 'gosta': ['morango', 'ovo'], 'odeia': ['gosma'], 'modo': 'parado', 'dir': 'left'},
    {'id': 'n3', 'x': 6, 'y': 28, 'c': {'corpo': 'body_06', 'olhos': 'eyes_03', 'cabelo': 'hairstyle_20_04', 'roupa': 'outfit_18_02'},
     'nome': 'Juca do queijo', 'fala': 'Queijo da fazenda, feito com o leite das vacas ali do pasto!',
     'falaAmigo': 'Prova esse aqui, é o meu melhor.', 'gosta': ['leite', 'queijo'], 'odeia': ['rabanete'], 'modo': 'parado', 'dir': 'down'},
    {'id': 'n4', 'x': 40, 'y': 10, 'c': {'corpo': 'body_08', 'olhos': 'eyes_01', 'cabelo': 'hairstyle_02_03', 'roupa': 'outfit_27_04'},
     'nome': 'Dona Zefa', 'fala': 'O silo está cheio de milho. Me ajuda a dar feno para as vacas?',
     'falaAmigo': 'Com você aqui a fazenda anda que é uma beleza!', 'gosta': ['milho', 'leite'], 'odeia': ['lixo'], 'modo': 'passeia', 'raio': 2},
]
bichos = [('cow', 40, 14), ('cow_big_white', 42, 18), ('cow', 19, 27), ('cow_baby', 22, 28), ('duck_green_head', 30, 28),
          ('donkey_grey', 33, 28), ('cow_caramel', 26, 29), ('duckling_yellow', 31, 29)]
for i, (b, x, y) in enumerate(bichos):
    E.npcs.append({'id': f'b{i}', 'x': x, 'y': y, 'bicho': b, 'modo': 'passeia', 'raio': 2})

E.items = [
    {'id': 'i1', 'tipo': 'moeda', 'x': 21, 'y': 2, 'valor': 5},  # atrás das árvores de outono
    {'id': 'i2', 'tipo': 'moeda', 'x': 44, 'y': 24, 'valor': 6},  # canto do cercado
]
E.spawn = [15, 31]
E.door(14, 33, 'enseada', 27, 1)  # trilha para a Enseada da Maré (sul)
E.door(15, 33, 'enseada', 28, 1)
walk = [list(r) for r in E.auto_walk()]
for x, y in solid:
    if 0 <= x < W and 0 <= y < H:
        walk[y][x] = '#'
for x, y in path:  # a trilha fica sempre livre (menos onde tem prédio)
    if (x, y) not in solid and walk[y][x] == '#':
        walk[y][x] = '.'
# enfeites na grama vazia (tufos, trevos, florzinhas, pedrinhas): a grama deixa de ser um tapete liso
DECOR = [('fazenda_construcoes', f'grass_tufts_flowers_{i}') for i in range(1, 12)] + [
    ('graveyard', n) for n in ('grass_tufts', 'grass_tufts', 'group_four_leaf_clover_1', 'group_leaf_clover_1', 'pebbles_1', 'pebbles_2', 'blue_flowers', 'multicolor_flowers')]
print('enfeites na grama:', E.scatter(DECOR, 0.22, 46))
E.save([''.join(r) for r in walk], sky='dia')
