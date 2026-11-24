"""Turma 2.0: prepara as salas prontas do pacote Modern Interiors (LimeZu) para o jogo.

Uso (Python 3 + Pillow + numpy + scipy), apontando para a pasta raiz do pacote (descompactado):
    python scripts/turma2-import.py "C:/caminho/moderninteriors-win"

Para cada sala de 6_Home_Designs (por enquanto, o museu), o pacote traz duas camadas prontas:
  layer_1 = chão e paredes (fica sempre por baixo dos bonecos)
  layer_2 = móveis e objetos (cada um precisa ficar na frente OU atrás do boneco, conforme a altura)
O script:
  - copia a layer_1 como está:            public/limezu/t2/<sala>_chao.png
  - separa a layer_2 em objetos soltos (cada mancha de pixels) e junta numa imagem só:
                                           public/limezu/t2/<sala>_obj.png
  - descobre onde dá para andar: quadradinho de chão (não é parede do Room Builder)
    e sem objeto cobrindo boa parte dele
  - escreve tudo em src/lib/turma2Rooms.json (tamanho, onde andar, objetos e onde o boneco nasce)
Também recorta o boneco pronto (parado e andando, 4 direções): public/limezu/t2/boneco_<n>.png
Nada do pacote vai para fora de public/limezu (licença: repositório privado, nunca redistribuir).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOMS = [
    # (o museu saiu da lista por enquanto; para voltar, é só pôr as linhas de Museum_Designs de novo)
    ('Japanese_Interiors_Home_Designs/16x16/Japanese_Home_1', 'casa_japonesa', 'Casa japonesa'),
]
# lugares que não aparecem nas abas: só se chega pela porta (e por onde se sai)
HIDDEN = {'casa_japonesa': {'spawn': [6, 10], 'doors': [{'x': 5, 'y': 12, 'to': 'acampamento', 'spawn': [40, 17]}, {'x': 6, 'y': 12, 'to': 'acampamento', 'spawn': [40, 17]}]}}


def layer(base, n):
    # o pacote escreve de vários jeitos: "_layer_1", "_Layer_1_16x16", "_Layer_2_"
    folder, stem = base.parent, base.name
    for f in sorted(folder.glob('*.png')):
        low = f.stem.lower().replace('_16x16', '').rstrip('_')
        if low == f'{stem.lower()}_layer_{n}':
            return f
    raise FileNotFoundError(f'{base}_layer_{n}')
# ajustes feitos à mão (x, y em quadradinhos): passagens que a detecção automática não acha
FIXES = {
    'museu_arte': {'free': [(15, 8), (16, 8), (15, 9), (16, 9), (15, 10), (16, 10)]},
    'museu_entrada': {'free': [(8, 11), (9, 11), (8, 12), (9, 12), (8, 13), (9, 13), (8, 14), (9, 14)], 'block': [(7, 11)]},
}
CHARACTER = 3  # Premade_Character_03 (16x16)
T = 16

root = Path(__file__).resolve().parent.parent
pack = Path(sys.argv[1])
out = root / 'public/limezu/t2'
out.mkdir(parents=True, exist_ok=True)
rb = pack / '1_Interiors/16x16/Room_Builder_subfiles'


def opaque_tiles(path):
    a = np.array(Image.open(path).convert('RGBA')).astype(np.int16)
    tiles = []
    for y in range(0, a.shape[0] - T + 1, T):
        for x in range(0, a.shape[1] - T + 1, T):
            t = a[y:y + T, x:x + T]
            if (t[:, :, 3] == 255).all():
                tiles.append(t[:, :, :3].reshape(-1))
    return tiles


# paredes do Room Builder: um quadradinho do mapa que (quase) bate com uma delas não é chão
walls = []
for name in ['Room_Builder_Walls_16x16.png', 'Room_Builder_3d_walls_16x16.png']:
    walls += opaque_tiles(rb / name)
walls = np.stack(walls)
floors = np.stack(opaque_tiles(rb / 'Room_Builder_Floors_16x16.png'))


def likeness(tiles, tile):
    # fração de pixels iguais (com folga de 3) ao quadradinho mais parecido da lista
    return (np.abs(tiles - tile) <= 3).reshape(len(tiles), T * T, 3).all(2).mean(1).max()


def walk_grid(floor, base):
    rows, cols = floor.shape[0] // T, floor.shape[1] // T
    grid = []
    for ty in range(rows):
        line = ''
        for tx in range(cols):
            t = floor[ty * T:(ty + 1) * T, tx * T:(tx + 1) * T].astype(np.int16)
            if not (t[:, :, 3] == 255).all():
                line += '#'
                continue
            tile = t[:, :, :3].reshape(-1)
            wall = likeness(walls, tile)
            if wall >= 0.55 and wall > likeness(floors, tile):
                line += '#'  # parede (mais parecido com parede do que com chão)
                continue
            cover = base[ty * T:(ty + 1) * T, tx * T:(tx + 1) * T].mean()
            line += '#' if cover >= 0.3 else '.'
        grid.append(line)
    # portas: uma faixa de 1 quadradinho de parede com chão em cima e embaixo (borda de cima da porta)
    for ty in range(1, rows - 1):
        for tx in range(cols):
            if grid[ty][tx] == '#' and grid[ty - 1][tx] == '.' and grid[ty + 1][tx] == '.':
                cover = base[ty * T:(ty + 1) * T, tx * T:(tx + 1) * T].mean()
                if cover < 0.3:
                    grid[ty] = grid[ty][:tx] + '.' + grid[ty][tx + 1:]
    return grid


def spawn_of(grid):
    # o maior pedaço andável; dele, o quadradinho mais perto do centro (com espaço em volta)
    free = np.array([[c == '.' for c in line] for line in grid])
    labels, n = ndimage.label(free)
    if not n:
        return [0, 0]
    biggest = 1 + int(np.argmax(ndimage.sum(free, labels, range(1, n + 1))))
    area = labels == biggest
    room_free = ndimage.uniform_filter(area.astype(float), size=3) * 9  # vizinhos livres
    cy, cx = np.argwhere(area).mean(0)
    ys, xs = np.where(area)
    best = max(zip(ys, xs), key=lambda p: (room_free[p] >= 8, -abs(p[0] - cy) - abs(p[1] - cx)))
    return [int(best[1]), int(best[0])]


rooms = []
for src, code, label in ROOMS:
    base = pack / '6_Home_Designs' / src
    floor = np.array(Image.open(layer(base, 1)).convert('RGBA'))
    objs = np.array(Image.open(layer(base, 2)).convert('RGBA'))
    Image.fromarray(floor).save(out / f'{code}_chao.png', optimize=True)
    # objetos: cada mancha de pixels vira um pedaço com a sua "linha do chão" (o pé do objeto)
    labels, n = ndimage.label(objs[:, :, 3] > 0)
    pieces = []
    for i, sl in enumerate(ndimage.find_objects(labels), start=1):
        ys, xs = sl
        crop = objs[ys, xs].copy()
        crop[labels[ys, xs] != i] = 0
        pieces.append({'img': crop, 'x': xs.start, 'y': ys.start, 'w': xs.stop - xs.start, 'h': ys.stop - ys.start})
    # junta tudo numa imagem (prateleiras de 512 px)
    pieces.sort(key=lambda p: -p['h'])
    W, x, y, shelf = 512, 0, 0, 0
    for p in pieces:
        if x + p['w'] > W:
            x, y, shelf = 0, y + shelf + 1, 0
        p['sx'], p['sy'] = x, y
        x += p['w'] + 1
        shelf = max(shelf, p['h'])
    atlas = np.zeros((y + shelf + 1, W, 4), np.uint8)
    for p in pieces:
        region = atlas[p['sy']:p['sy'] + p['h'], p['sx']:p['sx'] + p['w']]
        mask = p['img'][:, :, 3] > 0
        region[mask] = p['img'][mask]
    Image.fromarray(atlas).save(out / f'{code}_obj.png', optimize=True)
    # o que ocupa o chão é só a parte de baixo de cada objeto (o "pé"); o alto dele fica na frente
    # do que está atrás, sem bloquear (tudo menos a fileira de cima, no mínimo 1 quadradinho)
    base = np.zeros(objs.shape[:2], bool)
    for i, sl in enumerate(ndimage.find_objects(labels), start=1):
        ys, xs = sl
        depth = max(1, int(np.ceil((ys.stop - ys.start) / T)) - 1) * T
        top = max(ys.start, ys.stop - depth)
        part = (labels[top:ys.stop, xs] == i) & (objs[top:ys.stop, xs, 3] > 160)
        base[top:ys.stop, xs] |= part
    grid = walk_grid(floor, base)
    for key, char in (('free', '.'), ('block', '#')):
        for x, y in FIXES.get(code, {}).get(key, []):
            grid[y] = grid[y][:x] + char + grid[y][x + 1:]
    rooms.append({
        'code': code,
        'label': label,
        'w': floor.shape[1],
        'h': floor.shape[0],
        'walk': grid,
        'spawn': spawn_of(grid),
        # [x, y, w, h, x no atlas, y no atlas] — o pé do objeto é y + h
        'objects': [[p['x'], p['y'], p['w'], p['h'], p['sx'], p['sy']] for p in sorted(pieces, key=lambda p: p['y'] + p['h'])],
    })
    if code in HIDDEN:
        rooms[-1].update({'hidden': True, **HIDDEN[code]})
        # a porta de saída (e o caminho até ela, no hall dos sapatos) precisa ser andável
        for x, y in [(d['x'], d['y']) for d in HIDDEN[code]['doors']] + [(5, 11), (6, 11)]:
            row = rooms[-1]['walk'][y]
            rooms[-1]['walk'][y] = row[:x] + '.' + row[x + 1:]
    print(code, f"{floor.shape[1]}x{floor.shape[0]}", len(pieces), 'objetos')

# boneco: linha 1 = parado, linha 2 = andando; 6 quadros por direção (direita, costas, esquerda, frente)
sheet = Image.open(pack / f'2_Characters/Character_Generator/0_Premade_Characters/16x16/Premade_Character_{CHARACTER:02d}.png')
sheet.crop((0, 32, 384, 96)).save(out / f'boneco_{CHARACTER:02d}.png', optimize=True)

# os lugares ao ar livre (gerados por outros scripts) continuam na lista, na frente
path = root / 'src/lib/turma2Rooms.json'
keep = []
if path.exists():
    keep = [r for r in json.loads(path.read_text())['rooms'] if r.get('outdoor')]
path.write_text(json.dumps({'character': f'boneco_{CHARACTER:02d}', 'rooms': keep + rooms}, ensure_ascii=False, separators=(',', ':')))
print('ok')
