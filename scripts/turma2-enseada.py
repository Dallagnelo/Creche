"""Turma 2.0 · mapa "Enseada da Maré": vila na beira do mar, no formato do editor.

Uso: python scripts/turma2-enseada.py   (depois do turma2-pes.py)
Grava em src/lib/turma2/defaultMaps.json (dá para abrir e mexer no editor de mapas).

Lá fora: casinha com horta cercada e caixa de venda, cercado de bichos, praça com chafariz e barracas,
o Café da Maré, cemitério assombrado (fantasmas só de noite), praia com acampamento e fogueira,
píer para pescar no mar, farol que gira de noite e barcos passando.
Dentro: a casa, o café (loja e fogão) e o farol (coisas de pesca).

Só peças dos pacotes (Modern Farm, Exteriors e Interiors). Onde dá para andar: o automático do editor,
mais o píer (por cima do mar), que é liberado à mão.
"""
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import turma2_export as X  # noqa: E402

random.seed(11)
T = 16
W, H = 52, 40
E = X.Map('enseada', 'Enseada da Maré', W, H)
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


def anim(name, tx, foot, d=0, when='', light=None, fps=8, M=None):
    M = M or E
    r = X.LIB['anims'][name]
    x = int(round(tx * T - r[3] / 2))
    y = foot * T - r[4]
    lt = [x + r[3] / 2 + light[0], y + r[4] + light[1], light[2], light[3]] if light else None
    return M.anim(name, x, y, r[3], r[5], fps, d, when=when, light=lt)


def ring(x0, y0, x1, y1, gate=None):
    """contorno de um retângulo (para cerca); gate = (y, xa, xb) buraco da porteira"""
    def f(x, y):
        if not (x0 <= x <= x1 and y0 <= y <= y1 and (x in (x0, x1) or y in (y0, y1))):
            return False
        return not (gate and y == gate[0] and gate[1] <= x <= gate[2])
    return f


# ================================================================== chão
SEA_Y = 31  # a partir daqui é mar
HORTA = (3, 13, 9, 19)  # x0, y0, x1, y1 (terra para arar)
PEN = (15, 12, 22, 19)  # 4 de folga da horta: cerca a 3 ou menos de outra vira "porteira"  # cercado dos bichos
GRAVE = (40, 3, 49, 11)  # cemitério
SQUARE = (24, 11, 37, 19)  # praça

E.paint('areia_fz', grid(lambda x, y: y >= 27 or (y == 26 and (x * 7 + 3) % 11 > 2)))
path = set()
for y in range(11, 21):
    for x in (11, 12):
        path.add((x, y))  # da porta da casa até a estrada
for x in range(0, 43):
    for y in (21, 22):
        path.add((x, y))  # estrada de oeste a leste
for y in range(10, 11):
    path.add((33, y))  # porta do café até a praça
for y in range(19, 27):
    for x in (30, 31):
        path.add((x, y))  # da praça até a praia
for y in range(12, 21):
    for x in (44, 45):
        path.add((x, y))  # do cemitério até a estrada
for y in range(20, 27):
    for x in (41, 42):
        path.add((x, y))  # da estrada até a praia (acampamento)
for x in range(16, 24):
    path.add((x, 20))  # porteira do cercado
E.paint('trilha', grid(lambda x, y: (x, y) in path))
E.paint('calcada2', grid(lambda x, y: SQUARE[0] <= x <= SQUARE[2] and SQUARE[1] <= y <= SQUARE[3] and not (x in (SQUARE[0], SQUARE[2]) and y in (SQUARE[1], SQUARE[3]))))
E.paint('horta', grid(lambda x, y: HORTA[0] <= x <= HORTA[2] and HORTA[1] <= y <= HORTA[3]))
E.paint('terra_escura', grid(lambda x, y: GRAVE[0] + 1 <= x <= GRAVE[2] - 1 and GRAVE[1] + 1 <= y <= GRAVE[3] - 1))
E.paint('cerca', grid(ring(HORTA[0] - 1, HORTA[1] - 1, HORTA[2] + 1, HORTA[3] + 1, gate=(HORTA[1] - 1, 8, 9))))
E.paint('cerca', grid(ring(*PEN, gate=(PEN[3], 18, 19))))
E.paint('cerca', grid(ring(*GRAVE, gate=(GRAVE[3], 44, 45))))
E.lake(0, SEA_Y, W, H - SEA_Y, kind='mar')

# ================================================================== casa (com a caixa de venda)
house = E.obj('fazenda_construcoes', 'farmer_house_2', 4 * T, 11 * T - 144, 6, light=[11 * T + 8, 10 * T + 2, 46, '255,214,150'])
E.door(11, 10, 'enseada_casa', 12, 16)
put('fazenda_construcoes', 'box_load', 15, 11, depth=1, at='venda')
anim('camping_lantern_1', 13.5, 11, d=0, light=[0, -14, 56, '255,200,120'], fps=6)
put('fazenda_construcoes', 'scarecrow', 4, 19, depth=1)
put('fazenda_construcoes', 'sign_1', 5.5, 12, depth=1)
put('fazenda_construcoes', 'pumpkin_medium', 2.5, 21, depth=0)

# ================================================================== cercado dos bichos
put('fazenda_construcoes', 'henhouse', 19, 15, depth=2)
put('fazenda_construcoes', 'hay_fresh_pile', 16.5, 18, depth=1)
put('fazenda_construcoes', 'drinking_trough_small_full', 21.5, 18, depth=1)
put('fazenda_construcoes', 'chicken_sign', 17, 12, depth=0)

# ================================================================== praça: chafariz, barracas, bancos, postes
anim('garden_fountain_1', 31, 16, d=1, fps=6)
put('fazenda_construcoes', 'market_stand_yellow_example', 26.5, 15, depth=2, at='loja', light=[0, -20, 60, '255,220,150'])
# peixaria: barraca completa do pacote, com a placa de peixe e caixotes de peixe do lado
put('fazenda_construcoes', 'market_stand_yellow_small', 35, 15, depth=2, at='loja')
put('fazenda_construcoes', 'fish_sign_market_stand', 36.9, 13, depth=0)
put('camping', 'fish_crate_1', 37.4, 16, depth=1)
put('fazenda_construcoes', 'sign_1_market_stand', 33.2, 16, depth=1)
put('garden', 'big_bench_horizontal', 28.5, 19, depth=1)
put('garden', 'big_bench_horizontal', 33.5, 19, depth=1)
put('city_props', 'street_lamp_1', 25, 19, depth=1, light=[0, -42, 70, '255,226,160'])
put('city_props', 'street_lamp_1', 37, 19, depth=1, light=[0, -42, 70, '255,226,160'])
for fx, fy, fl in [(29, 14, 'big_sunflower_vase'), (33, 14, 'big_red_flower_vase'), (29, 18, 'big_pink_flower_vase'), (33, 18, 'big_yellow_flower_vase')]:
    put('garden', fl, fx + 0.5, fy, depth=1)

# ================================================================== Café da Maré (porta no meio da escadinha)
cafe = E.obj('additional_houses', '24_additional_houses_post_apocalyptic_house_1_16x16', 25 * T + 10, 10 * T - 145, 5,
             light=[33 * T + 8, 9 * T - 4, 50, '255,214,150'])
E.door(33, 9, 'cafe_mare', 12, 16)
put('fazenda_construcoes', 'sign_2', 31.5, 11, depth=0)

# ================================================================== cemitério (de noite aparecem fantasmas: coragem)
graves = ['small_grey_tombstone_2', 'small_grey_tombstone_4', 'wood_cross_1', 'marble_grey_tombstone_1', 'cross_pile_of_dirt',
          'long_tombstone_1', 'small_grey_tombstone_5', 'wood_cross_2', 'marble_grey_tombstone_2']
spots = [(42, 6), (44, 6), (46, 6), (42, 9), (47, 9), (44, 9), (46, 8)]
for (gx, gy), g in zip(spots, graves):
    put('graveyard', g, gx + 0.5, gy, depth=1)
put('graveyard', 'big_tree', 48, 7, depth=1)
put('graveyard', 'crow_left', 47.5, 5, depth=0)
put('graveyard', 'little_yellow_lights_pumpkin_1', 41.5, 10, depth=0, light=[0, -4, 26, '255,170,60'])
put('graveyard', 'little_yellow_lights_pumpkin_2', 48.5, 10, depth=0, light=[0, -4, 26, '255,170,60'])
put('graveyard', 'big_red_candle', 43.5, 5, depth=0, light=[0, -6, 22, '255,190,110'])
put('graveyard', 'big_red_candle', 45.5, 5, depth=0, light=[0, -6, 22, '255,190,110'])
anim('graveyard_ghosts_2', 43, 9, when='n', fps=5)
anim('graveyard_ghosts_2', 46.5, 7, when='n', fps=6)

# ================================================================== farol (gira de noite) e praia
E.obj('beach', 'example_lighthouse', 44 * T, 30 * T - 247, 3)
E.door(47, 29, 'farol', 10, 16)
E.light(44 * T + 56, 30 * T - 247 + 44, 90, '255,240,190', giro=True)
put('beach', 'direction_pole_small', 43, 30, depth=1)
# acampamento na areia: barraca, fogueira (cozinhar), bancos de tronco e lampião
put('camping', 'tent_1', 37, 27, depth=2)
put('camping', 'tent_4', 33.5, 26, depth=1)
anim('campfire', 38.5, 29, d=1, light=[0, -8, 64, '255,150,70'], fps=8)
put('camping', 'cut_wood_bench_1', 36.5, 29, depth=1)
put('camping', 'cut_wood_bench_2', 40.5, 29, depth=1)
put('camping', 'sleeping_bag_2', 35.5, 30, chao=True)
anim('camping_lantern_2', 39.5, 27, d=0, light=[0, -14, 50, '255,200,120'], fps=6)
# guarda-sóis, toalhas, conchas e estrelas-do-mar
put('beach', 'green_beach_umbrella_opened', 14, 29, depth=1)
put('beach', 'green_beach_towel_1', 15.5, 30, chao=True)
put('beach', 'blue_beach_umbrella_opened', 21, 28, depth=1)
put('beach', 'blue_beach_towel_1', 22.5, 29, chao=True)
for sx, sy, s in [(5, 29, 'blue_big_starfish'), (11, 30, 'gold_shell_3'), (25, 30, 'green_small_starfish'), (27, 28, 'brown_shell_3'), (48, 31, 'blue_small_starfish')]:
    if s in X.LIB['pecas']['beach']:
        put('beach', s, sx + 0.5, sy, chao=True)
put('beach', 'example_bucket_with_shovel', 9.5, 29, depth=0)
put('fazenda_arvores', 'fruit_tree_banana_ripe', 3.5, 28, depth=1)
put('fazenda_arvores', 'fruit_tree_banana_ripe', 18.5, 27, depth=1)
anim('beach_seagull_idle_down', 11.5, 28, fps=4)
anim('beach_seagull_idle_down', 26.5, 30, fps=5)

# ------------------------------------------------------------------ píer de madeira para pescar no mar
PIER = [(x, y) for x in (29, 30) for y in range(SEA_Y, SEA_Y + 6)]
for x, y in PIER:
    name = 'pier_8' if y < SEA_Y + 5 else ('pier_3' if x == 29 else 'pier_4')
    E.obj('camping', name, x * T, y * T, 0, chao=True)
put('camping', 'life_buoy_1', 31.5, SEA_Y + 2, chao=True, dx=-4)
anim('fishes_1', 27.5, SEA_Y + 4, fps=6)
anim('fishes_1', 32.5, SEA_Y + 6, fps=7)
anim('fishes_1', 12.5, SEA_Y + 3, fps=5)
anim('beach_water_buoy_1', 9, SEA_Y + 5, fps=4)
anim('beach_water_buoy_1', 40, SEA_Y + 6, fps=4)
E.boat('fishing_boat_left', (SEA_Y + 7) * T, -16, W * T + 40)
E.boat('boat_1_right_1', (SEA_Y + 8) * T + 8, 12, -200)

# ================================================================== frutíferas, árvores em volta e enfeites
put('fazenda_arvores', 'fruit_tree_apple_ripe', 21.5, 9, depth=1)
put('fazenda_arvores', 'fruit_tree_orange_ripe', 39.5, 18, depth=1)
put('fazenda_arvores', 'fruit_tree_peach_ripe', 23.5, 25, depth=1)
trees = ['tree_oak_green_big', 'tree_pine_green_big', 'tree_oak_green_medium', 'tree_pine_dark_green_medium', 'tree_birch_green_big']
for tx in range(1, 40, 4):
    if 23 <= tx <= 37:
        continue  # atrás do café fica só o telhado
    put('fazenda_arvores', random.choice(trees), tx + 0.5 + random.choice([-1, 0, 1]) * 0.5, 3, depth=2)
for tx in (24, 30, 36):
    put('fazenda_arvores', random.choice(['tree_pine_green_medium', 'tree_birch_green_medium']), tx + 0.5, 2, depth=2)
for ty in range(7, 26, 4):
    if 9 <= ty <= 21:
        put('fazenda_arvores', random.choice(trees), 0.5, ty + (1 if ty == 11 else 0), depth=2)
for ty in range(4, 21, 4):
    put('fazenda_arvores', random.choice(trees), 51, ty, depth=2)
put('fazenda_arvores', 'tree_pine_dark_green_big', 41, 2, depth=2)
put('fazenda_arvores', 'tree_pine_dark_green_big', 46, 2, depth=2)
put('fazenda_arvores', 'tree_oak_green_medium', 38.5, 8, depth=2)
put('fazenda_arvores', 'tree_birch_green_medium', 47.5, 15, depth=2)
put('fazenda_arvores', 'tree_oak_green_small', 49.5, 20, depth=2)
put('fazenda_construcoes', 'rock_medium', 24.5, 22, depth=1)
put('fazenda_construcoes', 'rock_big', 49.5, 25, depth=1)
taken = set(path)
for _ in range(60):
    x, y = random.randint(1, W - 2), random.randint(4, 25)
    bad = HORTA[0] - 1 <= x <= HORTA[2] + 1 and HORTA[1] - 1 <= y <= HORTA[3] + 1
    bad |= PEN[0] <= x <= PEN[2] and PEN[1] <= y <= PEN[3]
    bad |= GRAVE[0] <= x <= GRAVE[2] and GRAVE[1] <= y <= GRAVE[3]
    bad |= SQUARE[0] <= x <= SQUARE[2] and SQUARE[1] - 7 <= y <= SQUARE[3]
    bad |= 3 <= x <= 16 and y <= 11
    if bad or (x, y) in taken:
        continue
    taken.add((x, y))
    put('fazenda_construcoes', f'grass_tufts_flowers_{random.randint(1, 11)}', x + 0.5, y + 1, chao=True)

# ================================================================== gente e bichos
# rotina: [hora, x, y, some?] — a partir dessa hora vai até lá (some = entra e só volta na próxima parada)
E.npcs = [
    {'id': 'n1', 'x': 30, 'y': 35, 'c': {'corpo': 'body_03', 'olhos': 'eyes_02', 'cabelo': 'hairstyle_05_04', 'roupa': 'outfit_12_03'},
     'nome': 'Seu Bento', 'fala': 'Do píer dá para pescar no mar! E à noite o meu farol gira para os barcos acharem o caminho.',
     'falaAmigo': 'Você pesca melhor que eu na sua idade. Dizem que o peixe lendário aparece perto do farol...',
     'gosta': ['dourado', 'moqueca', 'cafe'], 'odeia': ['lixo'], 'modo': 'parado', 'dir': 'down',
     'rotina': [[6, 30, 35], [13, 46, 30], [15, 30, 35], [20, 47, 29, 1]]},
    {'id': 'n2', 'x': 24, 'y': 28, 'c': {'corpo': 'body_06', 'olhos': 'eyes_04', 'cabelo': 'hairstyle_14_02', 'roupa': 'outfit_05_02'},
     'nome': 'Marina', 'fala': 'Cuidado com as ondas! Quer dizer... aqui é calminho. Pega uma concha na areia!',
     'falaAmigo': 'Amigo da praia! Me traz uma melancia geladinha qualquer dia?', 'gosta': ['melancia', 'abacaxi', 'banana'], 'odeia': ['gosma'],
     'modo': 'passeia', 'raio': 4, 'rotina': [[7, 24, 28], [12, 31, 17], [16, 20, 29], [20, 33, 9, 1]]},
    {'id': 'n3', 'x': 31, 'y': 17, 'c': {'corpo': 'body_02', 'olhos': 'eyes_06', 'cabelo': 'hairstyle_20_01', 'roupa': 'outfit_18_04'},
     'nome': 'Lia', 'fala': 'Pega-pega em volta do chafariz! Você tá com ela!',
     'falaAmigo': 'Você é o meu melhor amigo da vila inteira! Toma, guardei esse segredo: tem moeda escondida atrás do farol.',
     'gosta': ['morango', 'maca', 'croissant'], 'odeia': ['rabanete'], 'modo': 'passeia', 'raio': 3,
     'rotina': [[8, 31, 17], [18, 11, 12, 1]]},
    {'id': 'n4', 'x': 37, 'y': 29, 'c': {'corpo': 'body_05', 'olhos': 'eyes_01', 'cabelo': 'hairstyle_09_05', 'roupa': 'outfit_27_01'},
     'nome': 'Caio', 'fala': 'Nada como um peixe assado na fogueira. Aperte E perto do fogo para cozinhar!',
     'falaAmigo': 'Hoje à noite vou contar a história dos fantasmas do cemitério... você vem?', 'gosta': ['peixe_assado', 'milho', 'banquete'],
     'odeia': ['salada'], 'modo': 'senta', 'dir': 'right'},
    {'id': 'n5', 'x': 13, 'y': 18, 'c': {'corpo': 'body_08', 'olhos': 'eyes_03', 'cabelo': 'hairstyle_02_06', 'roupa': 'outfit_09_05'},
     'nome': 'Dona Cida', 'fala': 'A horta cercada é sua! Are com a enxada, plante e regue todo dia. O feno das galinhas é de graça.',
     'falaAmigo': 'Que horta linda você tem! Me ensina a plantar abóbora desse tamanho?', 'gosta': ['abobora', 'ovo', 'leite'], 'odeia': ['lixo'],
     'modo': 'passeia', 'raio': 2, 'rotina': [[6, 13, 18], [11, 27, 17], [15, 13, 18], [19, 11, 11, 1]]},
    {'id': 'n6', 'x': 44, 'y': 13, 'c': {'corpo': 'body_04', 'olhos': 'eyes_07', 'cabelo': 'hairstyle_25_03', 'roupa': 'outfit_31_02'},
     'nome': 'Nina', 'fala': 'De noite os fantasmas saem no cemitério. Chegue perto e aperte E... se tiver coragem!',
     'falaAmigo': 'Você é a pessoa mais corajosa que eu conheço. Bora caçar fantasma hoje?', 'gosta': ['gosma', 'sopa', 'cafe'], 'odeia': ['alface'],
     'modo': 'passeia', 'raio': 2},
]
bichos = [('chicken_white', 16, 14), ('chicken_brown', 21, 14), ('rooster_golden', 18, 17), ('chick', 20, 17), ('goat_white', 17, 16),
          ('rabbit_white', 21, 16), ('duck_green_head', 6, 25), ('duckling_yellow', 7, 25), ('rabbit_brown', 38, 12)]
for i, (b, x, y) in enumerate(bichos):
    E.npcs.append({'id': f'b{i}', 'x': x, 'y': y, 'bicho': b, 'modo': 'passeia', 'raio': 2 if x < 23 else 3})

# moedas escondidas e conchas para catar
E.items = [
    {'id': 'i1', 'tipo': 'moeda', 'x': 30, 'y': 36, 'valor': 5},  # na ponta do píer
    {'id': 'i2', 'tipo': 'moeda', 'x': 50, 'y': 23, 'valor': 8},  # atrás do farol
    {'id': 'i3', 'tipo': 'moeda', 'x': 48, 'y': 4, 'valor': 6},  # no canto do cemitério
    {'id': 'i4', 'tipo': 'moeda', 'x': 36, 'y': 3, 'valor': 4},  # atrás do café
    {'id': 'i5', 'tipo': 'objeto', 'src': 'pecas', 't': 'beach', 'n': 'gold_shell_3', 'x': 6, 'y': 30, 'nome': 'Concha dourada', 'valor': 6,
     'desc': 'Brilha no sol. A loja paga bem.'},
    {'id': 'i6', 'tipo': 'objeto', 'src': 'pecas', 't': 'beach', 'n': 'blue_big_starfish', 'x': 46, 'y': 30, 'nome': 'Estrela-do-mar', 'valor': 4,
     'desc': 'Achada na areia, perto do farol.'},
]
E.spawn = [11, 11]
E.door(0, 21, 'cidade', 57, 13)  # estrada para a Cidade das Flores (oeste)
E.door(0, 22, 'cidade', 57, 14)

# onde dá para andar: o automático, mais o píer por cima do mar
walk = [''.join(r) for r in E.auto_walk()]
rows = [list(r) for r in walk]
for x, y in PIER:
    rows[y][x] = '.'
E.save([''.join(r) for r in rows], sky='dia')


# ================================================================== dentro: a casa da enseada
# (salas grandes, 24 x 18: enchem a tela do computador e do celular sem borda preta; a câmera segue você)
C = X.Map('enseada_casa', 'Casa da enseada', 24, 18, base='madeira')
C.dentro = True
C.paint('parede_madeira', [[y < 2 for x in range(24)] for y in range(18)])
C.paint('tapete', [[9 <= x <= 14 and 6 <= y <= 9 for x in range(24)] for y in range(18)])
# quarto (esquerda)
put('bedroom', '233', 3, 6, depth=1, at='cama', src='moveis', M=C)
put('bedroom', '431', 5.5, 4, depth=1, src='moveis', M=C)
put('bedroom', '524', 7, 4, depth=1, src='moveis', M=C)
put('bedroom', '383', 3.5, 10, depth=0, chao=True, src='moveis', M=C)
put('bedroom', '498', 3, 14, depth=1, src='moveis', M=C)
put('living_room', '87', 5, 14, depth=1, src='moveis', M=C)
put('fishing', '50', 4, 2, depth=0, src='moveis', M=C)
# sala (meio): lareira, plantas, estante
put('living_room', '107', 12, 4, depth=1, light=[0, -14, 64, '255,150,80'], src='moveis', M=C)
put('living_room', '18', 9.5, 4, depth=1, src='moveis', M=C)
put('living_room', '14', 14.5, 4, depth=1, src='moveis', M=C)
put('living_room', '37', 12, 14, depth=1, src='moveis', M=C)
put('living_room', '55', 9, 13, depth=1, at='bau', src='moveis', M=C)
# cozinha (direita)
put('kitchen', '96', 17.5, 3, depth=1, src='moveis', M=C)
put('kitchen', '148', 18.5, 3, depth=1, at='cozinha', src='moveis', M=C)
put('kitchen', '96', 19.5, 3, depth=1, src='moveis', M=C)
put('kitchen', '158', 21, 3, depth=1, src='moveis', M=C)
put('kitchen', '309', 19.5, 8, depth=1, src='moveis', M=C)
put('kitchen', '280', 17.6, 8, depth=1, src='moveis', M=C)
put('kitchen', '280', 21.4, 8, depth=1, src='moveis', M=C, flip=True)
put('fishing', '51', 16, 2, depth=0, src='moveis', M=C)
put('living_room', '13', 1, 17, depth=1, src='moveis', M=C)
put('living_room', '13', 23, 17, depth=1, src='moveis', M=C)
put('living_room', '16', 21.5, 14, depth=1, src='moveis', M=C)
put('living_room', '39', 15.5, 14, depth=1, src='moveis', M=C)
put('living_room', '39', 17.5, 14, depth=1, src='moveis', M=C)
put('living_room', '90', 19.8, 14, depth=1, src='moveis', M=C)
put('living_room', '17', 7.5, 10, depth=1, src='moveis', M=C)
put('living_room', '16', 16, 6, depth=1, src='moveis', M=C)
C.paint('tapete', [[(9 <= x <= 14 and 6 <= y <= 9) or (14 <= x <= 21 and 15 <= y <= 15) for x in range(24)] for y in range(18)])
C.light(4 * 16, 5 * 16, 80, '255,220,170')
C.light(19 * 16, 6 * 16, 80, '255,220,170')
C.light(12 * 16, 12 * 16, 80, '255,220,170')
C.door(12, 17, 'enseada', 11, 11)
C.spawn = [12, 16]
C.save(None)


# ================================================================== dentro: o Café da Maré (loja e fogão)
K = X.Map('cafe_mare', 'Café da Maré', 24, 18, base='taco')
K.dentro = True
K.paint('parede_creme', [[y < 2 for x in range(24)] for y in range(18)])
K.paint('tapete', [[12 <= x <= 21 and 8 <= y <= 9 for x in range(24)] for y in range(18)])
K.paint('tapete', [[(12 <= x <= 21 and 5 <= y <= 13) or (3 <= x <= 9 and 10 <= y <= 15) for x in range(24)] for y in range(18)])
for i, n in enumerate(['121', '122', '122', '121']):  # balcão de madeira
    put('kitchen', n, 3.4 + i * 1.8, 6, depth=1, src='moveis', M=K, at='loja' if i == 1 else None)
put('kitchen', '123', 10.5, 6, depth=1, src='moveis', M=K)
put('living_room', '16', 2, 6, depth=1, src='moveis', M=K)
put('living_room', '90', 11.5, 3, depth=1, src='moveis', M=K)
put('kitchen', '148', 2.5, 3, depth=1, at='cozinha', src='moveis', M=K)
put('kitchen', '96', 3.5, 3, depth=1, src='moveis', M=K)
put('kitchen', '158', 5, 3, depth=1, src='moveis', M=K)
put('kitchen', '186', 7, 3, depth=1, src='moveis', M=K)
put('kitchen', '96', 8.5, 3, depth=1, src='moveis', M=K)
put('kitchen', '204', 21.5, 4, depth=1, src='moveis', M=K)
for tx, ty in [(14, 6), (19, 6), (14, 12), (19, 12), (6, 12), (6, 15), (17, 15)]:  # mesinhas com cadeira dos dois lados
    put('kitchen', '310', tx, ty, depth=1, src='moveis', M=K)
    put('kitchen', '280', tx - 1.9, ty, depth=1, src='moveis', M=K)
    put('kitchen', '280', tx + 1.9, ty, depth=1, src='moveis', M=K, flip=True)
put('fishing', '51', 13, 2, depth=0, src='moveis', M=K)
put('fishing', '52', 17, 2, depth=0, src='moveis', M=K)
put('living_room', '18', 23, 4, depth=1, src='moveis', M=K)
put('living_room', '13', 1, 17, depth=1, src='moveis', M=K)
put('living_room', '13', 23, 17, depth=1, src='moveis', M=K)
put('living_room', '14', 9.8, 4, depth=1, src='moveis', M=K)
K.light(5 * 16, 5 * 16, 90, '255,220,170')
K.light(16 * 16, 7 * 16, 90, '255,220,170')
K.light(12 * 16, 13 * 16, 90, '255,220,170')
K.npcs = [
    {'id': 'n1', 'x': 6, 'y': 4, 'c': {'corpo': 'body_07', 'olhos': 'eyes_05', 'cabelo': 'hairstyle_11_04', 'roupa': 'outfit_20_03'},
     'nome': 'Dona Rosa', 'fala': 'Bem-vindo ao Café da Maré! O balcão compra e vende. O fogão é seu se quiser cozinhar.',
     'falaAmigo': 'Pra você o cafezinho é por conta da casa, viu?', 'gosta': ['cafe', 'pao', 'queijo'], 'odeia': ['lixo'],
     'modo': 'parado', 'dir': 'down'},
    {'id': 'n2', 'x': 21, 'y': 12, 'c': {'corpo': 'body_01', 'olhos': 'eyes_02', 'cabelo': 'hairstyle_17_02', 'roupa': 'outfit_14_01'},
     'nome': 'Téo', 'fala': 'Shh... tô vendo vídeo de pesca. Sabia que o dourado gosta de dia de sol?',
     'falaAmigo': 'Valeu pela companhia! Bora pescar no píer depois?', 'gosta': ['croissant', 'tucunare'], 'odeia': ['salada'],
     'modo': 'celular', 'dir': 'left'},
]
K.door(12, 17, 'enseada', 33, 10)
K.spawn = [12, 16]
K.save(None)


# ================================================================== dentro: o farol (coisas de pesca)
F = X.Map('farol', 'Farol do Seu Bento', 20, 18, base='madeira_escura')
F.dentro = True
F.paint('parede_tijolo', [[y < 2 for x in range(20)] for y in range(18)])
put('fishing', '64', 2, 4, depth=1, src='moveis', M=F)
put('fishing', '66', 4, 4, depth=1, src='moveis', M=F)
put('fishing', '53', 7.5, 3, depth=1, src='moveis', M=F)
put('fishing', '50', 11, 2, depth=0, src='moveis', M=F)
put('fishing', '51', 15, 2, depth=0, src='moveis', M=F)
put('fishing', '30', 17, 5, depth=1, src='moveis', M=F, at='bau')
for i, n in enumerate(['58', '59', '60']):  # vitrine de peixe
    put('fishing', n, 13.5 + i, 9, depth=1, src='moveis', M=F)
put('fishing', '63', 17.5, 9, depth=1, src='moveis', M=F)
put('fishing', '68', 10, 4, depth=1, src='moveis', M=F)
put('fishing', '65', 5.8, 4, depth=1, src='moveis', M=F)
put('fishing', '22', 8, 11, depth=1, src='moveis', M=F)
put('fishing', '23', 12, 11, depth=1, src='moveis', M=F)
put('fishing', '75', 6, 14, depth=1, src='moveis', M=F)
put('fishing', '27', 14.5, 15, depth=1, src='moveis', M=F)
put('fishing', '73', 18.5, 13, depth=1, src='moveis', M=F)
put('fishing', '15', 16, 6, depth=1, src='moveis', M=F)
put('fishing', '20', 3, 10, depth=1, src='moveis', M=F)
put('bedroom', '386', 10, 10, depth=0, chao=True, src='moveis', M=F)
put('bedroom', '63', 3, 14, depth=1, src='moveis', M=F)
put('bedroom', '498', 13, 4, depth=1, src='moveis', M=F)
put('living_room', '87', 15, 4, depth=1, src='moveis', M=F)
put('living_room', '13', 1, 17, depth=1, src='moveis', M=F)
put('living_room', '13', 19, 17, depth=1, src='moveis', M=F)
F.light(5 * 16, 5 * 16, 80, '255,220,170')
F.light(14 * 16, 11 * 16, 80, '255,220,170')
F.items = [{'id': 'i1', 'tipo': 'moeda', 'x': 17, 'y': 15, 'valor': 10}]
F.door(10, 17, 'enseada', 47, 30)
F.spawn = [10, 16]
F.save(None)
