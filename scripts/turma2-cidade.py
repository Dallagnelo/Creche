"""Turma 2.0 · mapa "Cidade das Flores": centro da cidade, no formato do editor.

Uso: python scripts/turma2-cidade.py   (depois do turma2-pes.py)
Grava em src/lib/turma2/defaultMaps.json (dá para abrir e mexer no editor de mapas).

Lá fora: avenida com carros e ônibus indo e voltando (eles param e buzinam se você está na frente),
faixa de pedestre, lojas, mercado, sorveteria, torre do relógio, correio, delegacia, parque com chafariz,
quiosques de sorvete e café, carrinho de cachorro-quente (cozinhar), músico de rua, pombos e casas.
Dentro: o Mercadinho (caixa vende e compra) e a Sorveteria (balcão).

Mistura o Modern Exteriors (cidade) com o Modern Farm (árvores) e o Interiors (móveis).
"""
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import turma2_export as X  # noqa: E402

random.seed(21)
T = 16
W, H = 60, 44
E = X.Map('cidade', 'Cidade das Flores', W, H)
grid = lambda f: [[bool(f(x, y)) for x in range(W)] for y in range(H)]  # noqa: E731


def put(theme, name, tx, foot, depth=None, light=None, chao=False, at=None, dx=0, src='pecas', M=None, flip=False):
    """peça com o pé (fundo) na fileira "foot" e o meio em tx (em quadradinhos)"""
    M = M or E
    r = X.LIB[src][theme][name]
    x = int(round(tx * T - r[2] / 2)) + dx
    y = foot * T - r[3]
    d = depth if depth is not None else (1 if r[3] <= 32 else 2)
    lt = [x + r[2] / 2 + light[0], y + r[3] + light[1], light[2], light[3]] if light else None
    o = M.obj(theme, name, x, y, d, light=lt, chao=chao, src=src, flip=flip)
    if at:
        o['at'] = at
    return o


def building(theme, name, x0, foot, light=None):
    """prédio alinhado à grade: canto esquerdo na coluna x0; bloqueia o desenho inteiro"""
    r = X.LIB['pecas'][theme][name]
    rows = -(-r[3] // T)
    return E.obj(theme, name, x0 * T, foot * T - r[3], rows, light=light)


def anim(name, tx, foot, d=0, when='', light=None, fps=8, M=None, fw=None, frames=None):
    M = M or E
    r = X.LIB['anims'][name]
    w = fw or r[3]
    x = int(round(tx * T - w / 2))
    y = foot * T - r[4]
    lt = [x + w / 2 + light[0], y + r[4] + light[1], light[2], light[3]] if light else None
    return M.anim(name, x, y, w, frames or r[5], fps, d, when=when, light=lt)


LAMP = [0, -42, 72, '255,226,160']
# ================================================================== chão
ROAD = (15, 19)  # avenida (fileiras)
PARK = (18, 22, 42, 35)  # x0, y0, x1, y1
E.paint('calcada', grid(lambda x, y: 13 <= y <= 14 or 20 <= y <= 21))
E.paint('asfalto', grid(lambda x, y: ROAD[0] <= y <= ROAD[1]))
E.paint('faixa', grid(lambda x, y: y == 17 and x % 4 < 2 and not 28 <= x <= 32))
E.paint('faixa_v', grid(lambda x, y: ROAD[0] <= y <= ROAD[1] and x in (29, 31)))  # faixa de pedestre
E.paint('canteiro', grid(lambda x, y: PARK[0] <= x <= PARK[2] and PARK[1] <= y <= PARK[3]))
park_path = lambda x, y: (29 <= x <= 31 and PARK[1] <= y <= PARK[3]) or (PARK[0] <= x <= PARK[2] and 28 <= y <= 29) or (26 <= x <= 34 and 25 <= y <= 32)  # noqa: E731
E.paint('calcada3', grid(lambda x, y: park_path(x, y) and PARK[0] <= x <= PARK[2] and PARK[1] <= y <= PARK[3]))
E.paint('calcada2', grid(lambda x, y: (y == 35 and not PARK[0] <= x <= PARK[2]) or (x in (8, 9, 51, 52) and 22 <= y <= 35)))
E.paint('cerca_viva', grid(lambda x, y: y == 36 and x not in (8, 9, 29, 30, 31, 51, 52)))
E.paint('trilha', grid(lambda x, y: x in (29, 30) and y >= 36))  # trilha para o Bosque

# ================================================================== quarteirão de cima: lojas e prédios (pé na fileira 13)
building('generic_building', 'hardware_store_example', 1, 13)
building('shopping_center_and_markets', 'market_big_1', 10, 13, light=[13 * T + 8, 12 * T, 50, '255,220,160'])
E.door(13, 12, 'mercado', 12, 16)
building('shopping_center_and_markets', 'market_small_1', 18, 13, light=[20 * T + 8, 12 * T, 44, '255,200,220'])
E.door(20, 12, 'sorveteria', 12, 16)
building('shopping_center_and_markets', 'market_small_5', 23, 13)
building('school', 'clock_tower_1', 29, 13)
building('post_office', 'building_1', 38, 13)
building('police_station', 'police_station_small_1', 47, 13)
building('generic_building', 'condo_7_example_1', 55, 13)
# o que fica entre os prédios: árvores
for tx in (9, 17.5, 28.5, 37, 46.5, 54.5, 58.5):
    put('villas', random.choice(['tree_1', 'tree_2']), tx, 12, depth=1)

# calçada de cima: postes, orelhão, caixa eletrônico, hidrante, lixeiras
for tx in (4, 16, 27, 34, 44, 57):
    put('city_props', 'street_lamp_1', tx, 14, depth=1, light=LAMP)
put('city_props', 'atm_1', 15, 13, depth=1)
put('city_props', 'hydrant_1', 36.5, 14, depth=1)
put('city_props', 'trashbin_1', 22.5, 14, depth=1)
put('city_props', 'trashbin_1', 46.5, 14, depth=1)
put('post_office', 'red_mailbox_1_front', 41.5, 14, depth=1)
put('city_props', 'traffic_light_1', 28, 14, depth=1)
put('city_props', 'traffic_light_1', 32.5, 22, depth=1, flip=True)

# ================================================================== avenida: carros e ônibus nos dois sentidos
right = ['car_right_1', 'car_right_7', 'car_right_14']
left = ['car_left_3', 'car_left_10', 'car_left_21']
for i, n in enumerate(right):
    E.car('vehicles', n, 17 * T - 2, 52, i * 330 - 120)
for i, n in enumerate(left):
    E.car('vehicles', n, 20 * T - 2, -50, W * T - i * 340 + 60)
E.car('vehicles', 'bus_right_1', 17 * T - 2, 40, -900)
E.car('vehicles', 'bus_left_1', 20 * T - 2, -38, W * T + 700)

# calçada de baixo: ponto de ônibus, postes, bancos
put('vehicles', 'bus_stop_1', 12.5, 22, depth=1)
put('city_props', 'phone_booth_1', 8.5, 22, depth=1)
for tx in (4, 16, 27, 34, 44, 57):
    put('city_props', 'street_lamp_1', tx, 22, depth=1, light=LAMP)
put('city_props', 'bench_2', 47.5, 22, depth=1)
put('city_props', 'trashbin_1', 38.5, 22, depth=1)

# ================================================================== parque com chafariz
anim('fountain', 30, 30, d=1, fps=8)
for tx, ty in [(27, 27), (33.5, 27), (27, 33), (33.5, 33)]:
    put('garden', 'big_bench_horizontal', tx, ty, depth=1)
for tx, ty, n in [(20.5, 25, 'tree_4'), (39.5, 25, 'tree_3'), (35, 29, 'tree_1')]:
    put('villas', n, tx, ty, depth=1)
for tx, ty in [(19.5, 23), (41.5, 23), (19.5, 35), (41.5, 35), (25.5, 24), (35.5, 24)]:
    put('city_props', 'flower_bush_1', tx, ty, depth=0, chao=True)
for tx, ty in [(23, 27), (37, 27), (26, 35), (34, 35), (28.5, 25)]:
    put('garden', random.choice(['big_red_flower', 'big_yellow_flower', 'big_pink_flower', 'big_sunflower']), tx + 0.5, int(ty), depth=1)
put('city_props', 'kiosk_icecream_example', 22.5, 34, depth=3, at='loja', light=[0, -30, 60, '255,210,230'])
put('city_props', 'kiosk_coffee_cup_example', 38, 34, depth=3, light=[0, -30, 56, '255,220,170'])
put('vehicles', 'hot_dog_cart_1', 35.5, 25, depth=2, light=[0, -20, 54, '255,190,120'])
put('city_props', 'candies_cart_1', 27.5, 25, depth=1)
anim('subway_busker_1', 32, 25.5, d=1, fps=8)
anim('pigeon', 28, 34, fps=6)
anim('pigeon_2', 32.5, 23, fps=5)
anim('pigeon', 41, 30, fps=7)

# ================================================================== casas dos lados (embaixo)
for x0, villa in [(1, 'villa_1'), (10, 'villa_3')]:
    building('villas', villa, x0 - 1 if x0 == 10 else x0, 35)
building('villas', 'villa_5', 43, 35)
building('villas', 'villa_2', 50, 35)
for tx in (7.5, 15.5, 49.5, 58):
    put('post_office', 'red_mailbox_1_front', tx, 35, depth=1)
# fundo: árvores atrás da cerca viva
trees = ['tree_oak_green_big', 'tree_pine_green_big', 'tree_birch_green_big', 'tree_oak_green_medium']
for tx in range(1, W, 4):
    t = random.choice(trees)
    if not 27 < tx < 33:  # deixa livre a trilha para o Bosque
        put('fazenda_arvores', t, tx + 0.5, 42, depth=2)
for tx in range(3, W, 4):
    t = random.choice(['tree_oak_green_small', 'tree_pine_green_small'])
    if not 26 < tx < 33:
        put('fazenda_arvores', t, tx + 0.5, 44, depth=2)
put('camping', 'sign_6', 32, 39, depth=1)

# ================================================================== gente
E.npcs = [
    {'id': 'n1', 'x': 30, 'y': 14, 'c': {'corpo': 'body_03', 'olhos': 'eyes_01', 'cabelo': 'hairstyle_04_02', 'roupa': 'outfit_30_02'},
     'nome': 'Guarda Rita', 'fala': 'Atravesse na faixa! Os carros param quando você está na frente, mas buzinam.',
     'falaAmigo': 'Cidade segura é cidade com gente boa como você.', 'gosta': ['cafe', 'pao'], 'odeia': ['lixo'], 'modo': 'parado', 'dir': 'down',
     'rotina': [[7, 30, 14], [18, 50, 12, 1]]},
    {'id': 'n2', 'x': 28, 'y': 31, 'c': {'corpo': 'body_02', 'olhos': 'eyes_04', 'cabelo': 'hairstyle_22_01', 'roupa': 'outfit_08_03'},
     'nome': 'Duda', 'fala': 'O sorvete do quiosque é o melhor da cidade. Já experimentou?',
     'falaAmigo': 'Bora dar uma volta no parque? Te mostro onde os pombos se escondem.', 'gosta': ['morango', 'melancia'], 'odeia': ['nabo'],
     'modo': 'passeia', 'raio': 4, 'rotina': [[8, 28, 31], [13, 20, 14], [16, 28, 31], [20, 9, 34, 1]]},
    {'id': 'n3', 'x': 34, 'y': 33, 'c': {'corpo': 'body_09', 'olhos': 'eyes_03', 'cabelo': 'hairstyle_01_06', 'roupa': 'outfit_03_05'},
     'nome': 'Vó Lurdes', 'fala': 'Sento aqui todo dia para ver o chafariz. Me traz um pão quentinho?',
     'falaAmigo': 'Você me lembra o meu neto. Sempre tão educado!', 'gosta': ['pao', 'sopa', 'croissant'], 'odeia': ['gosma'], 'modo': 'senta', 'dir': 'left'},
    {'id': 'n4', 'x': 35, 'y': 25, 'c': {'corpo': 'body_05', 'olhos': 'eyes_02', 'cabelo': 'hairstyle_10_03', 'roupa': 'outfit_25_02'},
     'nome': 'Seu Zé', 'fala': 'Cachorro-quente saindo! Se quiser, usa a minha chapa para cozinhar.',
     'falaAmigo': 'Pra você é por conta da casa, freguês!', 'gosta': ['milho', 'tomate', 'queijo'], 'odeia': ['salada'], 'modo': 'parado', 'dir': 'left'},
    {'id': 'n5', 'x': 40, 'y': 14, 'c': {'corpo': 'body_07', 'olhos': 'eyes_05', 'cabelo': 'hairstyle_16_04', 'roupa': 'outfit_19_01'},
     'nome': 'Carteira Ana', 'fala': 'O correio tem entregas para fazer. Pega uma ali na porta!',
     'falaAmigo': 'Você é o entregador mais rápido da cidade!', 'gosta': ['cafe', 'laranja'], 'odeia': ['lixo'], 'modo': 'passeia', 'raio': 3},
    {'id': 'n6', 'x': 12, 'y': 21, 'c': {'corpo': 'body_04', 'olhos': 'eyes_06', 'cabelo': 'hairstyle_27_02', 'roupa': 'outfit_11_04'},
     'nome': 'Léo', 'fala': 'Esperando o ônibus para a praia da Enseada... a estrada fica no fim da calçada, à direita!',
     'falaAmigo': 'Um dia a gente pega esse ônibus junto!', 'gosta': ['tucunare', 'banana'], 'odeia': ['rabanete'], 'modo': 'celular', 'dir': 'down'},
]
E.items = [
    {'id': 'i1', 'tipo': 'moeda', 'x': 30, 'y': 34, 'valor': 5},
    {'id': 'i2', 'tipo': 'moeda', 'x': 1, 'y': 37, 'valor': 6},
    {'id': 'i3', 'tipo': 'moeda', 'x': 58, 'y': 21, 'valor': 4},
]
E.spawn = [57, 14]
E.door(59, 13, 'enseada', 2, 21)  # calçada leste: estrada para a Enseada da Maré
E.door(59, 14, 'enseada', 2, 22)
E.door(29, 43, 'bosque', 24, 2)  # trilha sul: Bosque do Acampamento
E.door(30, 43, 'bosque', 25, 2)
E.save(None, sky='dia')


# ================================================================== dentro: o Mercadinho
# (salas grandes, 24 x 18: enchem a tela do computador e do celular sem borda preta; a câmera segue você)
M = X.Map('mercado', 'Mercadinho', 24, 18, base='taco')
M.dentro = True
M.paint('parede_creme', [[y < 2 for x in range(24)] for y in range(18)])
for i, n in enumerate(['60', '62', '65', '68', '60', '62']):  # geladeiras na parede
    put('grocery_store', n, 2.5 + i * 2.8, 3, depth=1, src='moveis', M=M)
put('grocery_store', '201', 21.5, 4, depth=1, src='moveis', M=M)
shelves = ['98', '100', '102', '105']
for ax, foot in [(3, 8), (10, 8), (3, 13), (10, 13)]:  # corredores de prateleira
    for i, n in enumerate(shelves):
        put('grocery_store', n, ax + i, foot, depth=1, src='moveis', M=M)
put('grocery_store', '113', 16, 9, depth=1, src='moveis', M=M)
put('grocery_store', '115', 18, 9, depth=1, src='moveis', M=M)
put('grocery_store', '160', 19, 14, depth=1, at='loja', src='moveis', M=M)
put('grocery_store', '113', 15, 13, depth=1, src='moveis', M=M)
put('grocery_store', '115', 16.5, 13, depth=1, src='moveis', M=M)
put('grocery_store', '120', 4, 16, depth=1, src='moveis', M=M)
put('grocery_store', '120', 6, 16, depth=1, src='moveis', M=M)
put('living_room', '18', 1, 6, depth=1, src='moveis', M=M)
put('grocery_store', '10', 2, 16, depth=1, src='moveis', M=M)
put('living_room', '13', 23, 17, depth=1, src='moveis', M=M)
M.light(6 * 16, 5 * 16, 100, '255,240,220')
M.light(17 * 16, 6 * 16, 100, '255,240,220')
M.light(8 * 16, 12 * 16, 100, '255,240,220')
M.light(19 * 16, 13 * 16, 90, '255,240,220')
M.npcs = [{'id': 'n1', 'x': 21, 'y': 13, 'c': {'corpo': 'body_06', 'olhos': 'eyes_07', 'cabelo': 'hairstyle_08_05', 'roupa': 'outfit_21_03'},
           'nome': 'Seu Tadeu', 'fala': 'Bem-vindo ao Mercadinho! No caixa eu compro e vendo de tudo.',
           'falaAmigo': 'Cliente fiel tem desconto no coração!', 'gosta': ['queijo', 'leite', 'ovo'], 'odeia': ['lixo'], 'modo': 'parado', 'dir': 'left'}]
M.door(12, 17, 'cidade', 13, 13)
M.spawn = [12, 16]
M.save(None)


# ================================================================== dentro: a Sorveteria
# Em cima o balcão comprido de sorvetes (com cardápios na parede); embaixo as mesinhas em fileiras.
S = X.Map('sorveteria', 'Sorveteria Gelato', 24, 18, base='xadrez')
S.dentro = True
S.paint('parede_creme', [[y < 2 for x in range(24)] for y in range(18)])
for i, n in enumerate(['29', '33', '38', '45', '49', '52']):  # vitrine dos sorvetes (balcão)
    put('ice_cream_shop', n, 3 + i, 5, depth=1, src='moveis', M=S, at='loja' if i == 2 else None)
put('ice_cream_shop', '2', 10, 5, depth=1, src='moveis', M=S)
put('ice_cream_shop', '12', 4, 2, depth=0, src='moveis', M=S)
put('ice_cream_shop', '13', 7, 2, depth=0, src='moveis', M=S)
put('ice_cream_shop', '101', 14, 4, depth=1, src='moveis', M=S)
put('ice_cream_shop', '102', 17, 4, depth=1, src='moveis', M=S)
put('ice_cream_shop', '14', 14, 1.7, depth=0, src='moveis', M=S)
put('ice_cream_shop', '15', 17, 1.7, depth=0, src='moveis', M=S)
put('living_room', '18', 20, 4, depth=1, src='moveis', M=S)
put('living_room', '18', 22.6, 4, depth=1, src='moveis', M=S)
put('ice_cream_shop', '16', 1.2, 4, depth=1, src='moveis', M=S)
for tx, ty in [(4, 9), (9, 9), (15, 9), (20, 9), (4, 13), (8, 13), (16, 13), (20, 13)]:
    put('ice_cream_shop', random.choice(['80', '84', '88', '92']), tx, ty, depth=1, src='moveis', M=S)
    put('ice_cream_shop', '76', tx - 1, ty, depth=1, src='moveis', M=S)
    put('ice_cream_shop', '76', tx + 1, ty, depth=1, src='moveis', M=S, flip=True)
put('ice_cream_shop', '18', 2, 16.6, depth=1, src='moveis', M=S)
put('ice_cream_shop', '19', 22, 16.6, depth=1, src='moveis', M=S)
put('ice_cream_shop', '74', 10, 16.5, depth=1, src='moveis', M=S)
put('living_room', '13', 12, 10, depth=1, src='moveis', M=S)
S.light(6 * 16, 5 * 16, 90, '255,220,235')
S.light(16 * 16, 5 * 16, 90, '255,220,235')
S.light(6 * 16, 12 * 16, 90, '255,220,235')
S.light(18 * 16, 12 * 16, 90, '255,220,235')
S.npcs = [{'id': 'n1', 'x': 5, 'y': 3, 'c': {'corpo': 'body_02', 'olhos': 'eyes_02', 'cabelo': 'hairstyle_13_03', 'roupa': 'outfit_06_01'},
           'nome': 'Bia', 'fala': 'Sorvete de morango é o campeão de vendas! No balcão dá para comprar e vender.',
           'falaAmigo': 'Inventei um sabor novo e você vai ser o primeiro a provar!', 'gosta': ['morango', 'melancia', 'leite'], 'odeia': ['rabanete'],
           'modo': 'parado', 'dir': 'down'}]
S.door(12, 17, 'cidade', 20, 13)
S.spawn = [12, 16]
S.save(None)
