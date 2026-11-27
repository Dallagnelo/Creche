"""Turma 2.0 · mapa "Centro": o centro urbano grande, ao oeste da Cidade das Flores (só a parte de fora por enquanto).

Uso: python scripts/turma2-centro.py   (depois do turma2-pes.py)
Grava em src/lib/turma2/defaultMaps.json (dá para abrir e mexer no editor de mapas).

Em cima, de frente para a avenida: escritório, padaria, loja de música, o Cine Planeta (com telão e cartazes),
o Shopping e a academia. Avenida de mão dupla com carros, ônibus e táxi; faixas de pedestre.
Embaixo, a Praça Central: chafariz grande, canteiros com árvores, bancos, quiosque de informações,
outdoors, carrinho de pipoca, músico de rua e pombos.

As fachadas são "chão" (ficam por baixo de quem passa, para as placas e o telão aparecerem por cima delas);
o retângulo de cada prédio é bloqueado à mão no "onde dá para andar".
"""
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import turma2_export as X  # noqa: E402

random.seed(33)
T = 16
W, H = 72, 46
E = X.Map('centro', 'Centro', W, H)
grid = lambda f: [[bool(f(x, y)) for x in range(W)] for y in range(H)]  # noqa: E731
BLOCKED = []  # retângulos (x0, y0, x1, y1) dos prédios


def put(theme, name, tx, foot, depth=None, light=None, chao=False, at=None, dx=0, src='pecas', flip=False, M=None):
    """peça com o pé (fundo) na fileira "foot" e o meio em tx (em quadradinhos)"""
    M = M or E
    r = X.LIB[src][theme][name]
    x = int(round(tx * T - r[2] / 2)) + dx
    y = int(round(foot * T - r[3]))
    d = depth if depth is not None else (1 if r[3] <= 32 else 2)
    lt = [x + r[2] / 2 + light[0], y + r[3] + light[1], light[2], light[3]] if light else None
    o = M.obj(theme, name, x, y, d, light=lt, chao=chao, src=src, flip=flip)
    if at:
        o['at'] = at
    return o


def facade(theme, name, px, py):
    """pedaço de prédio (canto de cima em px), por baixo de placas e telões"""
    o = E.obj(theme, name, px, py, 0, chao=True)
    o['at'] = 'nada'  # a fachada não é loja (o shopping tem a loja na porta)
    return X.LIB['pecas'][theme][name]


def block(x0, y0, x1, y1):
    BLOCKED.append((x0, y0, x1, y1))


def anim(name, tx, foot, d=0, when='', light=None, fps=8):
    r = X.LIB['anims'][name]
    x = int(round(tx * T - r[3] / 2))
    y = foot * T - r[4]
    lt = [x + r[3] / 2 + light[0], y + r[4] + light[1], light[2], light[3]] if light else None
    return E.anim(name, x, y, r[3], r[5], fps, d, when=when, light=lt)


def stack(x0, foot, ground, middles, roof):
    """prédio modular de 7 quadradinhos: térreo (com a placa), andares do meio e telhado"""
    fm = 'floor_modular_building'
    px, base = x0 * T, foot * T
    g = X.LIB['pecas'][fm][ground]
    y = base - 48  # o corpo do térreo tem 3 quadradinhos; a placa sobe por cima do andar de cima
    for m in middles:
        y -= 64
        facade(fm, m, px, y)
    rf = X.LIB['pecas'][fm][roof]
    facade(fm, roof, px, y - rf[3])
    facade(fm, ground, px, base - g[3])
    block(x0, foot - 3 - 4 * len(middles), x0 + 6, foot - 1)
    E.light(px + 56, base - 12, 46, '255,214,150')  # vitrine acesa à noite


LAMP = [0, -42, 72, '255,226,160']
FOOT = 18  # pé dos prédios de cima
# ================================================================== chão
E.paint('calcada5', grid(lambda x, y: y <= 17))  # entre os prédios: lajota escura (beco), nada de grama
E.paint('calcada', grid(lambda x, y: 18 <= y <= 19 or 25 <= y <= 26))
E.paint('asfalto', grid(lambda x, y: 20 <= y <= 24))
CROSS = [(35, 37), (53, 55)]  # faixas de pedestre (colunas)
in_cross = lambda x: any(a <= x <= b for a, b in CROSS)  # noqa: E731
E.paint('faixa', grid(lambda x, y: y == 22 and x % 4 < 2 and not any(a - 1 <= x <= b + 1 for a, b in CROSS)))
E.paint('faixa_v', grid(lambda x, y: 20 <= y <= 24 and x in (35, 37, 53, 55)))
# Praça Central: lajota, com um desenho de lajota escura em volta do chafariz e quatro canteiros
PLAZA = (1, 27, 70, 41)
E.paint('calcada4', grid(lambda x, y: PLAZA[0] <= x <= PLAZA[2] and PLAZA[1] <= y <= PLAZA[3]))
E.paint('calcada5', grid(lambda x, y: 31 <= x <= 41 and 30 <= y <= 38))
beds = [(3, 29, 8, 33), (4, 36, 13, 39), (21, 29, 27, 33), (45, 29, 51, 33), (59, 29, 67, 33), (59, 36, 67, 39), (21, 36, 27, 39), (45, 36, 51, 39)]
E.paint('canteiro', grid(lambda x, y: any(a <= x <= c and b <= y <= d for a, b, c, d in beds) or y >= 42))

# ================================================================== prédios de cima (pé na fileira 18)
# escritório (Lime Corp) na esquina
facade('office', 'example_1', 1 * T, FOOT * T - 296)
block(1, 0, 12, FOOT - 1)
E.light(7 * T, FOOT * T - 10, 52, '230,240,255')
# padaria e loja de música (prédios modulares de 3 andares)
stack(13, FOOT, 'ground_floor_bakery_1', ['middle_floor_2', 'middle_floor_1'], 'roof_8')
stack(20, FOOT, 'ground_floor_music_store_1', ['middle_floor_11', 'middle_floor_10'], 'roof_1')

# --- Cine Planeta: prédio clássico com telão animado, letreiro e cartazes dos filmes
CX = 28  # coluna da esquerda (17 quadradinhos de largura: 28 a 44)
hm = 'hotel_and_hospital'
facade(hm, 'hotel_modular_3', CX * T, FOOT * T - 144 - 64 - 112)
facade(hm, 'hotel_modular_2', CX * T, FOOT * T - 144 - 64)
facade(hm, 'hotel_modular_1', CX * T, FOOT * T - 144)
block(CX, 0, CX + 16, FOOT - 1)
put('shopping_center_and_markets', 'mall_signboard_3', 36.5, FOOT - 4.1, depth=0, at='nada')  # letreiro PLANET em cima da porta
anim('billboard_1', 36.5, FOOT - 9, fps=4, light=[0, -30, 70, '200,220,255'])  # telão passando os trailers
for tx in (31.5, 41.5):  # cartazes dos filmes nas portas do lado
    put('shopping_center_and_markets', 'mall_props_1', tx, FOOT - 3.2, depth=0, at='nada')
for tx in (30, 43):
    put('shopping_center_and_markets', 'mall_props_3', tx, FOOT + 0.1, depth=1, at='nada')
E.light(36.5 * T, FOOT * T - 20, 90, '255,200,240')
E.light(31.5 * T, FOOT * T - 20, 50, '255,230,200')
E.light(41.5 * T, FOOT * T - 20, 50, '255,230,200')
# fila do cinema: postes de corda (pecas de shopping) e carrinho de pipoca
put('city_props', 'candies_cart_1', 33, FOOT + 1.9, depth=1, at='loja')

# --- Shopping (com telhados dos prédios de trás para não ficar grama em cima)
MX = 46
facade('floor_modular_building', 'roof_3', (MX) * T, (FOOT - 11) * T - 96 + 4)
facade('floor_modular_building', 'roof_5', (MX + 7) * T, (FOOT - 11) * T - 96 + 4)
facade('floor_modular_building', 'roof_modular_1', (MX + 14) * T, (FOOT - 11) * T - 96 + 4) if 'roof_modular_1' in X.LIB['pecas']['floor_modular_building'] else None
facade('shopping_center_and_markets', 'mall_1', MX * T, FOOT * T - 179)
block(MX, 0, MX + 17, FOOT - 1)
put('shopping_center_and_markets', 'mall_signboard_1', MX + 7.5, FOOT - 6.4, depth=0, at='nada')
put('shopping_center_and_markets', 'mall_signboard_2', MX + 12.6, FOOT - 6.4, depth=0, at='nada')
for tx in (MX + 3, MX + 15.5):  # placa de liquidação na porta: é a loja do shopping
    put('shopping_center_and_markets', 'mall_props_4', tx, FOOT + 0.1, depth=1, at='loja' if tx == MX + 3 else 'nada')
E.light((MX + 10) * T, FOOT * T - 16, 90, '255,235,210')
E.light((MX + 4) * T, FOOT * T - 16, 60, '255,235,210')
# academia na esquina leste
stack(64, FOOT, 'ground_floor_gym_1', ['middle_floor_13', 'middle_floor_16'], 'roof_5')

# calçada de cima: postes, árvores em vaso, lixeiras, caixa eletrônico, hidrante
for tx in (4, 14, 24, 47, 58, 69):
    put('city_props', 'street_lamp_1', tx, 19, depth=1, light=LAMP)
put('city_props', 'atm_1', 11, 18, depth=1)
put('city_props', 'hydrant_1', 26.5, 19, depth=1)
put('city_props', 'trashbin_1', 45, 19, depth=1)
put('city_props', 'trashbin_1', 18, 19, depth=1)
put('city_props', 'traffic_light_1', 34, 19, depth=1)
put('city_props', 'traffic_light_1', 52, 19, depth=1)

# ================================================================== avenida: carros, ônibus e táxi nos dois sentidos
right = ['car_right_2', 'car_right_9', 'car_right_16', 'car_right_22']
left = ['car_left_5', 'car_left_12', 'car_left_19', 'car_left_24']
for i, n in enumerate(right):
    E.car('vehicles', n, 22 * T - 2, 54, i * 300 - 100)
for i, n in enumerate(left):
    E.car('vehicles', n, 25 * T - 2, -52, W * T - i * 320 + 60)
E.car('vehicles', 'bus_right_3', 22 * T - 2, 40, -1000)
E.car('vehicles', 'bus_left_2', 25 * T - 2, -38, W * T + 800)

# calçada de baixo
for tx in (4, 14, 24, 47, 58, 69):
    put('city_props', 'street_lamp_1', tx, 27, depth=1, light=LAMP)
put('vehicles', 'bus_stop_1', 63.5, 27, depth=1)
put('city_props', 'phone_booth_1', 9, 27, depth=1)
put('city_props', 'traffic_light_1', 38.5, 27, depth=1, flip=True)
put('city_props', 'traffic_light_1', 56.5, 27, depth=1, flip=True)
put('city_props', 'bench_2', 29, 27, depth=1)
put('city_props', 'bench_2', 44, 27, depth=1)

# ================================================================== Praça Central
anim('garden_fountain_5', 36, 35.5, d=2, fps=7)
for tx, ty in [(33, 32), (40, 32), (33, 38), (40, 38)]:
    put('city_props', 'street_lamp_5', tx, ty, depth=1, light=[0, -26, 60, '255,226,160'])
# canteiros: árvores, flores e bancos virados para o caminho
for a, b, c, d in beds:
    put('city_props', random.choice(['tree_1', 'tree_2', 'tree_11', 'tree_12']), (a + c + 1) / 2, d, depth=2)
    for fx in (a + 1, c):
        put('city_props', 'flower_bush_1', fx + 0.5, b + 1, depth=0, chao=True)
for tx, ty in [(17, 31), (55, 31)]:
    put('garden', 'big_bench_horizontal', tx, ty, depth=1)
# quiosques
put('city_props', 'kiosk_infopoint_2', 12, 33, depth=2, at='nada')
# outdoors
for tx, n in [(27, 'billboard_5'), (46, 'billboard_2'), (64, 'billboard_8')]:
    put('city_props', n, tx, 42.7, depth=1)
put('city_props', 'billboard_6', 3.5, 42.7, depth=1)
put('garden', 'statue_angel_1', 69, 41.5, depth=2)
put('vehicles', 'hot_dog_cart_1', 49.5, 34.5, depth=2, light=[0, -20, 54, '255,190,120'])
anim('subway_busker_2', 24, 34.6, d=1, fps=8)
anim('pigeon', 30, 30, fps=6)
anim('pigeon_2', 42, 37, fps=5)
anim('pigeon', 47, 40, fps=7)
# fundo: árvores fechando a praça (lá embaixo)
trees = ['tree_oak_green_big', 'tree_pine_green_big', 'tree_birch_green_big', 'tree_oak_green_medium']
for tx in range(1, W, 4):
    put('fazenda_arvores', random.choice(trees), tx + 0.5, 46, depth=2)
for tx in range(3, W, 4):
    put('fazenda_arvores', random.choice(['tree_oak_green_small', 'tree_pine_green_small']), tx + 0.5, 47.5, depth=2)

# ================================================================== gente
E.npcs = [
    {'id': 'n1', 'x': 34, 'y': 19, 'c': {'corpo': 'body_04', 'olhos': 'eyes_02', 'cabelo': 'hairstyle_12_03', 'roupa': 'outfit_14_02'},
     'nome': 'Pipoqueiro Beto', 'fala': 'Pipoca quentinha para o filme! Hoje passa aventura no Cine Planeta.',
     'falaAmigo': 'Pra você vai com manteiga extra!', 'gosta': ['milho', 'queijo'], 'odeia': ['gosma'], 'modo': 'parado', 'dir': 'down'},
    {'id': 'n2', 'x': 36, 'y': 28, 'c': {'corpo': 'body_02', 'olhos': 'eyes_05', 'cabelo': 'hairstyle_20_01', 'roupa': 'outfit_09_04'},
     'nome': 'Nina', 'fala': 'Vim ver o chafariz acender. À noite ele fica lindo!',
     'falaAmigo': 'Vamos ao cinema juntos qualquer dia?', 'gosta': ['morango', 'cafe'], 'odeia': ['nabo'],
     'modo': 'passeia', 'raio': 4, 'rotina': [[9, 36, 28], [14, 54, 19], [18, 36, 28], [21, 40, 19, 1]]},
    {'id': 'n3', 'x': 12, 'y': 34, 'c': {'corpo': 'body_06', 'olhos': 'eyes_01', 'cabelo': 'hairstyle_05_04', 'roupa': 'outfit_22_01'},
     'nome': 'Guia Sônia', 'fala': 'Bem-vindo ao Centro! O shopping e o cinema ficam do outro lado da avenida. A Cidade das Flores é à direita.',
     'falaAmigo': 'Você já conhece o Centro melhor que eu!', 'gosta': ['pao', 'laranja'], 'odeia': ['lixo'], 'modo': 'parado', 'dir': 'down'},
    {'id': 'n4', 'x': 55, 'y': 19, 'c': {'corpo': 'body_08', 'olhos': 'eyes_04', 'cabelo': 'hairstyle_25_02', 'roupa': 'outfit_17_03'},
     'nome': 'Malu', 'fala': 'Saindo do shopping cheia de sacolas! Tem liquidação hoje.',
     'falaAmigo': 'Te guardei um desconto na minha loja favorita.', 'gosta': ['melancia', 'leite'], 'odeia': ['rabanete'], 'modo': 'celular', 'dir': 'down'},
    {'id': 'n5', 'x': 49, 'y': 36, 'c': {'corpo': 'body_05', 'olhos': 'eyes_03', 'cabelo': 'hairstyle_09_01', 'roupa': 'outfit_25_04'},
     'nome': 'Seu Ivo', 'fala': 'Cachorro-quente do centro! Pode usar a chapa para cozinhar.',
     'falaAmigo': 'Freguês amigo come de graça!', 'gosta': ['tomate', 'milho'], 'odeia': ['salada'], 'modo': 'parado', 'dir': 'left'},
    {'id': 'n6', 'x': 63, 'y': 28, 'c': {'corpo': 'body_03', 'olhos': 'eyes_06', 'cabelo': 'hairstyle_17_05', 'roupa': 'outfit_05_02'},
     'nome': 'Caio', 'fala': 'Esperando o ônibus para a Cidade das Flores. Ou vou a pé mesmo, é logo ali!',
     'falaAmigo': 'Depois do treino na academia, bora tomar um café?', 'gosta': ['banana', 'cafe'], 'odeia': ['gosma'], 'modo': 'passeia', 'raio': 3},
]
E.items = [
    {'id': 'i1', 'tipo': 'moeda', 'x': 36, 'y': 39, 'valor': 6},
    {'id': 'i2', 'tipo': 'moeda', 'x': 2, 'y': 34, 'valor': 5},
    {'id': 'i3', 'tipo': 'moeda', 'x': 45, 'y': 19, 'valor': 4},
]
E.spawn = [69, 19]
E.door(36, 17, 'cine_planeta', 14, 16)  # porta do meio do Cine Planeta
E.door(37, 17, 'cine_planeta', 15, 16)
E.door(71, 18, 'cidade', 1, 13)  # calçada leste: volta para a Cidade das Flores
E.door(71, 19, 'cidade', 1, 14)

block(0, 0, W - 1, FOOT - 1)  # nada de andar atrás/entre os prédios
walk = E.auto_walk()
for x0, y0, x1, y1 in BLOCKED:
    for y in range(max(0, y0), y1 + 1):
        for x in range(max(0, x0), min(W - 1, x1) + 1):
            walk[y][x] = '#'
E.save([''.join(r) for r in walk], sky='dia')


# ================================================================== dentro: o Cine Planeta (com a cara do Cine turma)
# Parede vermelha listrada com o telão no meio (o vídeo do YouTube aparece em cima dele, para todo mundo ao mesmo tempo),
# quadros e arandelas na parede, caixas de som dos lados, carpete vermelho, 4 fileiras de poltronas
# com o corredor de tapete no meio, pipoqueira e bilheteria, bancos e plantas, e o projetor (cabine do telão) lá atrás.
# 30 x 18: no computador a sala inteira cabe na tela, com o telão sempre à vista.
CW, CH = 30, 18
C = X.Map('cine_planeta', 'Cine Planeta', CW, CH, base='carpete')
C.dentro = True
C.paint('parede_cinema', [[y < 6 for x in range(CW)] for y in range(CH)])
C.telao = [15 * T - 72, 20, 144, 81]  # x, y, largura, altura (px): 144 x 81 (16:9), inteiro na parede
mv = 'moveis'
# na parede: quadros (cartazes) e arandelas
for tx, n in [(5, '95'), (25, '101'), (2.5, '98'), (27.5, '104')]:
    put('museum', n, tx, 4.2, depth=0, src=mv, M=C)
for tx in (8.5, 21.5):
    put('bedroom', '541', tx, 3, depth=0, src=mv, M=C)
# caixas de som dos lados do telão
for tx in (9, 21):
    put('music_and_sport', '184', tx, 8, depth=1, src=mv, M=C)
# tapete vermelho do corredor (da frente do telão até a porta)
for y in range(7, CH):
    for tx in (14.5, 15.5):
        put('conference_hall', '61', tx, y + 1, depth=0, src=mv, M=C, chao=True, at='nada')
# poltronas: 4 fileiras de 5 + 5 (o encosto fica por cima de quem senta)
SEAT_ROWS = (9, 11, 13, 15)
for y in SEAT_ROWS:
    for x in list(range(9, 14)) + list(range(16, 21)):
        put('conference_hall', '39', x + 0.5, y + 1, depth=0, src=mv, M=C, at='poltrona')
# pipoqueira (em cima, à esquerda) e bilheteria
put('city_props', 'candies_cart_1', 3.5, 8.4, depth=1, M=C, at='pipoca')
put('museum', '1', 4, 12.6, depth=1, src=mv, M=C, at='nada')
# tapete e plantas embaixo à esquerda; bancos à direita
put('bedroom', '381', 4, 16, depth=0, src=mv, M=C, chao=True)
for tx, ty in [(1.5, 17.8), (7, 17.8), (1.5, 7.8), (28.5, 7.8), (24.5, 17.8)]:
    put('living_room', '18', tx, ty, depth=1, src=mv, M=C)
for ty in (10, 14):
    put('museum', '36', 26, ty, depth=1, src=mv, M=C)
# cabine do telão: o projetor fica lá atrás, apontado para o telão
put('television_and_film_studio', '5', 12, 17.6, depth=1, src=mv, M=C, at='telao')
C.light(15 * T, 3 * T, 120, '220,230,255')
C.light(3.5 * T, 7 * T, 60, '255,220,160')
C.light(12 * T, 16.5 * T, 46, '200,230,255')
C.npcs = [{'id': 'n1', 'x': 7, 'y': 13, 'c': {'corpo': 'body_07', 'olhos': 'eyes_03', 'cabelo': 'hairstyle_22_04', 'roupa': 'outfit_09_02'},
           'nome': 'Lia da bilheteria', 'fala': 'Pega um balde de pipoca, senta numa poltrona e joga nos amigos! No projetor lá atrás você escolhe o filme.',
           'falaAmigo': 'Guardei a melhor poltrona para você!', 'gosta': ['milho', 'morango'], 'odeia': ['gosma'], 'modo': 'parado', 'dir': 'down'}]
C.door(14, 17, 'centro', 36, 18)
C.door(15, 17, 'centro', 37, 18)
C.spawn = [15, 16]
C.save(None)
