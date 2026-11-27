"""Turma 2.0 · mapa "Bosque do Acampamento": floresta com lago, no formato do editor.

Uso: python scripts/turma2-bosque.py   (depois do turma2-pes.py e do turma2-cidade.py)
Grava em src/lib/turma2/defaultMaps.json (dá para abrir e mexer no editor de mapas).

Lá fora: trilha que desce da Cidade das Flores, portal "Camping", trailer da guia, quiosque-cogumelo (loja),
clareira com fogueira (cozinhar), barracas e sacos de dormir, poço, balanço e churrasqueira,
lago com píer para pescar, peixes pulando, tronco boiando, patos, coelhos, corvos, folhas caindo,
cogumelos e pinhas para catar. Bastante espaço livre para vários jogadores juntos.
Dentro: o trailer (cama, baú e fogão).

Mistura o Modern Exteriors (camping, cogumelo) com o Modern Farm (árvores, poço, bichos) e o Interiors (móveis).
"""
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import turma2_export as X  # noqa: E402

random.seed(33)
T = 16
W, H = 50, 38
E = X.Map('bosque', 'Bosque do Acampamento', W, H)
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


FIRE = [0, -10, 90, '255,170,90']
LANTERN = [0, -14, 60, '255,205,130']
# ================================================================== chão
LAKE = (28, 19, 17, 10)  # x, y, w, h
PIER = [(x, y) for x in (35, 36) for y in range(LAKE[1], LAKE[1] + 5)]
CAMP = (8, 20, 18, 28)  # clareira da fogueira

path = set()
for y in range(0, 16):
    for x in (24, 25):
        path.add((x, y))  # da cidade até o meio do bosque
for x in range(6, 42):
    for y in (15, 16):
        path.add((x, y))  # trilha de oeste a leste
for y in range(10, 15):
    for x in (6, 7):
        path.add((x, y))  # do trailer até a trilha
for y in range(17, 19):
    for x in (35, 36):
        path.add((x, y))  # da trilha até o píer
for y in range(17, 21):
    for x in (12, 13):
        path.add((x, y))  # da trilha até a fogueira
E.paint('trilha', grid(lambda x, y: (x, y) in path))
# chão de terra batida na clareira (canto arredondado)
E.paint('terra', grid(lambda x, y: CAMP[0] <= x <= CAMP[2] and CAMP[1] <= y <= CAMP[3]
                      and not (x in (CAMP[0], CAMP[2]) and y in (CAMP[1], CAMP[3]))))
E.lake(*LAKE, kind='lago')

# ================================================================== entrada: portal "Camping"
put('camping', 'signboard_2', 25, 8, depth=1)
put('camping', 'sign_6', 27.8, 12, depth=1)
anim('camping_lantern_1', 21.5, 9, light=LANTERN, fps=5)
anim('camping_lantern_1', 28.5, 9, light=LANTERN, fps=6)

# ================================================================== trailer da guia (porta para dentro)
TX0, TFOOT = 4, 12  # canto esquerdo e pé do trailer
E.obj('camping', 'mobile_house_small_5', TX0 * T, TFOOT * T - 116, 0, light=[TX0 * T + 40, TFOOT * T - 40, 56, '255,214,150'])
E.door(6, 9, 'trailer', 10, 16)
E.door(7, 9, 'trailer', 10, 16)
put('camping', 'chair_3', 10, 11, depth=1)
put('camping', 'tiny_table_2', 11.5, 11, depth=1)
put('camping', 'backpack_3', 3, 13, depth=1)
put('camping', 'cut_wood_3', 2.5, 11, depth=1)

# ================================================================== quiosque-cogumelo (loja)
put('city_props', 'kiosk_mushroom_example', 17, 13, depth=3, light=[0, -40, 60, '255,190,170'])
put('city_props', 'kiosk_mushroom_props_3', 20.8, 13, depth=1)

# ================================================================== recanto do poço, balanço e churrasqueira (nordeste)
anim('fz_well', 32, 10, d=1, fps=6)
anim('park_swing_1', 39, 9, d=1, fps=6)
put('camping', 'benched_table_4', 35.5, 13, depth=1)
put('camping', 'benched_table_1', 42.5, 13, depth=1)
put('camping', 'barbecue_1', 45, 11, depth=1, at='cozinha')
anim('camping_lantern_3', 30, 13, light=LANTERN, fps=5)
put('garden', 'big_red_flower', 33.5, 7, depth=1)
put('garden', 'big_yellow_flower', 42.5, 7, depth=1)

# ================================================================== clareira: fogueira, barracas, sacos de dormir
anim('campfire_2', 13, 25, d=1, fps=8, light=FIRE)
put('camping', 'cut_wood_bench_1', 13, 23, depth=1)
put('camping', 'cut_wood_bench_2', 13, 27.2, depth=1)
put('camping', 'cut_wood_bench_1', 10.2, 25.2, depth=1)
put('camping', 'cut_wood_bench_2', 15.8, 25.2, depth=1)
put('camping', 'tent_1', 5.5, 23, depth=2)
put('camping', 'tent_2', 5.5, 29, depth=2)
put('camping', 'tent_3', 21.5, 22, depth=2)
put('camping', 'tent_5', 21.5, 29, depth=1)
put('camping', 'sleeping_bag_1', 8.5, 23, depth=1)
put('camping', 'sleeping_bag_5', 8.5, 29, depth=1)
put('camping', 'sleeping_bag_3', 19, 23, depth=1)
put('camping', 'backpack_7', 18.7, 29, depth=1)
put('camping', 'benched_table_4', 13, 31, depth=1)
put('camping', 'cut_wood_2', 3, 26, depth=1)
put('camping', 'basket_1', 16.5, 28.5, depth=1)
anim('camping_lantern_5', 9, 21, light=LANTERN, fps=5)
anim('camping_lantern_6', 17.5, 30, light=LANTERN, fps=6)

# ================================================================== lago: píer, peixes, tronco boiando
for x, y in PIER:
    name = 'pier_8' if y < LAKE[1] + 4 else ('pier_3' if x == 35 else 'pier_4')
    E.obj('camping', name, x * T, y * T, 0, chao=True)
put('camping', 'fish_bucket_1', 37.6, LAKE[1] + 2, depth=0, chao=True)
put('camping', 'life_buoy_2', 33.8, LAKE[1] + 1, chao=True)
anim('fishes_1', 31.5, LAKE[1] + 4, fps=6)
anim('fishes_1', 40.5, LAKE[1] + 7, fps=7)
anim('fishes_1', 34.5, LAKE[1] + 9, fps=5)
anim('floating_trunk', 41, LAKE[1] + 3, fps=4)
for tx, foot in [(27.5, 21), (27.5, 26), (45.5, 22), (45.5, 27), (30, 30), (43, 30)]:
    put('camping', random.choice(['rock_2', 'rock_3', 'rock_6', 'rock_8']), tx, foot, depth=1)
put('camping', 'tree_dead_stick_3', 44.5, 30, depth=1)

# ================================================================== floresta em volta e árvores soltas
big = ['tree_oak_green_big', 'tree_pine_green_big', 'tree_pine_dark_green_big', 'tree_birch_green_big', 'tree_oak_green_medium']
small = ['tree_pine_green_small', 'tree_oak_green_small', 'tree_birch_yellow_medium', 'tree_oak_brown_medium']
autumn = ['tree_37', 'tree_49', 'tree_19', 'tree_31', 'tree_4', 'tree_26', 'tree_121', 'tree_124', 'tree_127', 'tree_130']
for tx in range(1, W, 4):  # norte (menos na trilha)
    if 20 <= tx <= 28:
        continue
    put('fazenda_arvores', random.choice(big), tx + 0.5, 3, depth=2)
for tx in range(3, W, 4):
    if 20 <= tx <= 28 or 2 <= tx <= 12:
        continue
    put('fazenda_arvores', random.choice(small), tx + 0.5, 5, depth=2)
for ty in range(8, 36, 4):  # oeste e leste
    put('fazenda_arvores', random.choice(big), 1, ty, depth=2)
    if ty >= 16:
        put('fazenda_arvores', random.choice(big), W - 1, ty, depth=2)
for tx in range(2, W, 4):  # sul
    put('fazenda_arvores', random.choice(big), tx + 0.5, 38, depth=2)
for tx in range(4, W - 2, 5):
    put('camping', random.choice(autumn), tx + 0.5, 36, depth=2)
for tx, foot in [(22, 10), (29, 15), (46.5, 15), (3.5, 17), (25, 22), (24.5, 31), (26.5, 34), (11, 34), (19.5, 34), (47, 33)]:
    put('camping', random.choice(autumn), tx, foot, depth=2)

# enfeites do chão da floresta
for tx, foot in [(10, 18), (21, 18), (31, 17), (44, 18), (4, 33), (16, 34), (29, 33), (39, 33), (46, 31), (2.5, 20)]:
    put('camping', random.choice(['mushrooms_1', 'mushrooms_2', 'mushrooms_3', 'moss_1', 'sprout_2', 'stump_1']), tx, foot, depth=0)
for tx, foot in [(19, 7), (41.5, 16.5), (8, 33), (36, 34)]:
    put('garden', random.choice(['big_pink_flower', 'big_sunflower', 'big_red_flower']), tx, foot, depth=1)

# vida: folhas caindo, corvos
for tx, foot in [(9, 8), (30, 6), (44, 24), (20, 33), (3, 30)]:
    anim(random.choice(['fz_modern_farm_vfx_falling_leaves', 'fz_modern_farm_vfx_falling_leaves_yellow', 'fz_modern_farm_vfx_falling_leaves_brown']), tx, foot, fps=6)
anim('crow_idle_down', 23, 18, fps=4)
anim('crow_idle_left', 46, 18, fps=5)

# ================================================================== gente e bichos (espaço para vários jogadores andarem juntos)
E.npcs = [
    {'id': 'n1', 'x': 15, 'y': 21, 'c': {'corpo': 'body_04', 'olhos': 'eyes_02', 'cabelo': 'hairstyle_12_03', 'roupa': 'outfit_14_02'},
     'nome': 'Guia Lia', 'fala': 'Bem-vindo ao acampamento! Na fogueira dá para cozinhar. Só não deixa apagar!',
     'falaAmigo': 'Quando escurece, as lanternas acendem e o bosque fica lindo. Fica para ver!', 'gosta': ['tucunare', 'pao'], 'odeia': ['lixo'],
     'modo': 'passeia', 'raio': 3, 'rotina': [[7, 15, 21], [12, 33, 14], [17, 15, 21], [21, 7, 11, 1]]},
    {'id': 'n2', 'x': 36, 'y': 23, 'c': {'corpo': 'body_07', 'olhos': 'eyes_05', 'cabelo': 'hairstyle_03_04', 'roupa': 'outfit_05_01'},
     'nome': 'Seu Bento', 'fala': 'Shhh... os peixes do lago são desconfiados. Pesca da pontinha do píer que dá mais.',
     'falaAmigo': 'Hoje eu te conto onde mora o peixe grande. Mas é segredo, hein?', 'gosta': ['cafe', 'tucunare'], 'odeia': ['nabo'],
     'modo': 'parado', 'dir': 'down'},
    {'id': 'n3', 'x': 20, 'y': 14, 'c': {'corpo': 'body_05', 'olhos': 'eyes_06', 'cabelo': 'hairstyle_19_02', 'roupa': 'outfit_11_04'},
     'nome': 'Tia Nina', 'fala': 'O quiosque-cogumelo tem de tudo para o acampamento. Compro o que você catar no bosque também!',
     'falaAmigo': 'Guardei um cogumelo dourado para você. Mentira, é só pintado... mas é bonito!', 'gosta': ['morango', 'banana'], 'odeia': ['rabanete'],
     'modo': 'parado', 'dir': 'down'},
    {'id': 'n4', 'x': 33, 'y': 12, 'c': {'corpo': 'body_01', 'olhos': 'eyes_03', 'cabelo': 'hairstyle_07_01', 'roupa': 'outfit_09_02'},
     'nome': 'Théo', 'fala': 'Aposto que eu balanço mais alto que você!', 'falaAmigo': 'Bora apostar corrida até o lago?',
     'gosta': ['melancia', 'morango'], 'odeia': ['nabo'], 'modo': 'passeia', 'raio': 4},
]
bichos = [('duck_green_head', 30, 30), ('duckling_yellow', 31, 31), ('duck_brown', 42, 31), ('duckling_brown', 41, 32),
          ('rabbit_white', 8, 34), ('rabbit_spotted', 38, 35), ('rabbit_gray', 44, 8)]
for i, (b, x, y) in enumerate(bichos):
    E.npcs.append({'id': f'b{i}', 'x': x, 'y': y, 'bicho': b, 'modo': 'passeia', 'raio': 2})

E.items = [
    {'id': 'i1', 'tipo': 'moeda', 'x': 35, 'y': 23, 'valor': 6},  # na ponta do píer
    {'id': 'i2', 'tipo': 'moeda', 'x': 1, 'y': 35, 'valor': 5},  # no cantinho sudoeste
    {'id': 'i3', 'tipo': 'moeda', 'x': 46, 'y': 9, 'valor': 4},  # atrás da churrasqueira
    {'id': 'i4', 'tipo': 'objeto', 'src': 'pecas', 't': 'camping', 'n': 'mushrooms_5', 'x': 28, 'y': 32, 'nome': 'Cogumelo vermelho', 'valor': 4,
     'desc': 'Bonito, mas não é de comer. A Tia Nina compra.'},
    {'id': 'i5', 'tipo': 'objeto', 'src': 'pecas', 't': 'camping', 'n': 'pine_cone_1', 'x': 23, 'y': 9, 'nome': 'Pinha', 'valor': 2,
     'desc': 'Caiu de um pinheiro bem alto.'},
    {'id': 'i6', 'tipo': 'objeto', 'src': 'pecas', 't': 'camping', 'n': 'mushrooms_4', 'x': 46, 'y': 34, 'nome': 'Cogumelo marrom', 'valor': 3,
     'desc': 'Achado perto das pedras do lago.'},
]
E.spawn = [24, 2]
E.door(24, 0, 'cidade', 29, 42)  # trilha para a Cidade das Flores (norte)
E.door(25, 0, 'cidade', 30, 42)

# onde dá para andar: o automático, mais o trailer (corpo bloqueado, varanda livre) e o píer por cima do lago
rows = [list(r) for r in E.auto_walk()]
for y in range(TFOOT - 7, TFOOT - 2):
    for x in range(TX0, TX0 + 5):
        rows[y][x] = '#'
for x, y in PIER:
    rows[y][x] = '.'
E.save([''.join(r) for r in rows], sky='dia')


# ================================================================== dentro: o trailer da guia
# (sala grande, 20 x 18: enche a tela do computador e do celular sem borda preta; a câmera segue você)
R = X.Map('trailer', 'Trailer da Lia', 20, 18, base='madeira')
R.dentro = True
R.paint('parede_madeira', [[y < 2 for x in range(20)] for y in range(18)])
R.paint('tapete', [[8 <= x <= 12 and 6 <= y <= 9 for x in range(20)] for y in range(18)])
put('bedroom', '233', 3, 6, depth=1, at='cama', src='moveis', M=R)
put('bedroom', '431', 5.5, 4, depth=1, src='moveis', M=R)
put('living_room', '107', 10, 4, depth=1, light=[0, -14, 64, '255,150,80'], src='moveis', M=R)
put('kitchen', '96', 14, 3, depth=1, src='moveis', M=R)
put('kitchen', '148', 15, 3, depth=1, at='cozinha', src='moveis', M=R)
put('kitchen', '158', 16.5, 3, depth=1, src='moveis', M=R)
put('living_room', '55', 18.5, 4, depth=1, at='bau', src='moveis', M=R)
put('kitchen', '309', 15.5, 9, depth=1, src='moveis', M=R)
put('kitchen', '280', 13.6, 9, depth=1, src='moveis', M=R)
put('kitchen', '280', 17.4, 9, depth=1, src='moveis', M=R, flip=True)
put('fishing', '50', 6, 2, depth=0, src='moveis', M=R)
put('bedroom', '498', 3, 13, depth=1, src='moveis', M=R)
put('living_room', '87', 5, 13, depth=1, src='moveis', M=R)
put('bedroom', '383', 10, 13, depth=0, chao=True, src='moveis', M=R)
put('living_room', '18', 7.5, 4, depth=1, src='moveis', M=R)
put('living_room', '13', 1, 17, depth=1, src='moveis', M=R)
put('living_room', '13', 19, 17, depth=1, src='moveis', M=R)
put('living_room', '90', 12.8, 4, depth=1, src='moveis', M=R)
put('living_room', '39', 17, 14, depth=1, src='moveis', M=R)
put('living_room', '17', 18.7, 10, depth=1, src='moveis', M=R)
put('fishing', '22', 8, 13, depth=1, src='moveis', M=R)
put('fishing', '23', 12, 13, depth=1, src='moveis', M=R)
put('fishing', '66', 1.5, 10, depth=1, src='moveis', M=R)
R.light(4 * 16, 6 * 16, 80, '255,220,170')
R.light(15 * 16, 8 * 16, 80, '255,220,170')
R.door(10, 17, 'bosque', 6, 11)
R.spawn = [10, 16]
R.save(None)
