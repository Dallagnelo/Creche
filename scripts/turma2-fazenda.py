"""Turma 2.0 · põe o pacote Modern Farm (LimeZu) na biblioteca do editor de mapas.

Uso: python scripts/turma2-fazenda.py   (depois do turma2-biblioteca.py; pode rodar quantas vezes quiser)

Lê public/limezu/mf (o pacote, como veio) e gera:
  public/limezu/mf/pecas/fazenda_*.png   peças soltas juntas por tema (construções, árvores, cercas, plantações…)
  public/limezu/editor/animados_fz*.png  os animados da fazenda (árvores balançando, portas, poço, fumaça…)
  public/limezu/mf/bichos.json           os bichos (vaca, galinha, porco…): folha, tamanho do quadro e nome
e acrescenta tudo em public/limezu/editor/biblioteca.json (temas "fazenda_…" e animados "fz_…").
"""
import json
import re
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parent.parent
MF = root / 'public/limezu/mf'
S16 = MF / '16x16'
OUT_P = MF / 'pecas'
OUT_P.mkdir(exist_ok=True)
EDITOR = root / 'public/limezu/editor'
LIB = EDITOR / 'biblioteca.json'


def slug(text):
    text = re.sub(r'_?16x16', '', text)
    text = re.sub(r'^Icons_', '', text)
    return re.sub(r'[^A-Za-z0-9]+', '_', text).strip('_').lower()


def pack(images, width=1024):
    """junta imagens numa só (prateleiras); devolve a imagem e nome → [x, y, w, h]"""
    images = sorted(images, key=lambda it: (-it[1].height, it[0]))
    x = y = shelf = 0
    places = {}
    for name, img in images:
        if x + img.width > width:
            x, y, shelf = 0, y + shelf + 1, 0
        places[name] = [x, y, img.width, img.height]
        x += img.width + 1
        shelf = max(shelf, img.height)
    sheet = Image.new('RGBA', (width, y + shelf))
    for name, img in images:
        sheet.paste(img, tuple(places[name][:2]))
    return sheet, places


def trimmed(path):
    img = Image.open(path).convert('RGBA')
    box = img.getbbox()
    return img if box is None else img


THEMES = {
    'fazenda_construcoes': ['Single_Files_16x16/Props_and_Buildings_16x16'],
    'fazenda_arvores': ['Single_Files_16x16/Trees_16x16', 'Single_Files_16x16/Fruit_Trees_16x16'],
    'fazenda_cercas': ['Single_Files_16x16/Fences_16x16'],
    'fazenda_plantacoes': ['Single_Files_16x16/Crops_16x16'],
    'fazenda_coletaveis': ['Single_Files_16x16/Pickup_Items_16x16'],
}
library = json.loads(LIB.read_text())
library['pecas'] = {t: v for t, v in library['pecas'].items() if not t.startswith('fazenda_')}
for theme, folders in THEMES.items():
    imgs = []
    seen = set()
    for folder in folders:
        for f in sorted((S16 / folder).glob('*.png')):
            if f.stat().st_size == 0:
                continue
            name = slug(f.stem)
            if name in seen:
                continue
            seen.add(name)
            imgs.append((name, trimmed(f)))
    sheet, places = pack(imgs)
    sheet.save(OUT_P / f'{theme}.png', optimize=True)
    library['pecas'][theme] = dict(sorted(places.items()))
    print(theme, len(places), sheet.size)

# ícones (mochila, loja): 16x16, um por item
icons = [(slug(f.stem.replace('Icons_16x16_', '')), Image.open(f).convert('RGBA')) for f in sorted((MF / 'Icons/Icons_16x16/Icons_16x16_Singles').glob('*.png'))]
sheet, places = pack(icons, 256)
sheet.save(OUT_P / 'fazenda_icones.png', optimize=True)
library['pecas']['fazenda_icones'] = dict(sorted(places.items()))
print('fazenda_icones', len(places))

# os mesmos ícones em 24x24 e 32x32 (desenhados à mão, não ampliados): mesmos nomes do 16x16, para a
# interface escolher o tamanho que encaixa (fazenda_icones_24 / fazenda_icones_32)
ALIAS = {'whool': 'wool', 'crops_grape': 'crops_grapes', 'food_raw_chicken': 'food_chicken'}
names16 = set(places)
for size, folder in [(24, 'Icons_24x24/Icons_24x24_Singles'), (32, 'Icons_32x32/Icons_32x32')]:
    big = []
    for f in sorted((MF / 'Icons' / folder).glob('*.png')):
        name = slug(f.stem.replace(f'Singles_Icons_{size}x{size}_', ''))
        for a, b in ALIAS.items():
            name = name.replace(a, b) if a == 'whool' else (b if name == a else name)
        if name in names16:
            big.append((name, Image.open(f).convert('RGBA')))
    sheet, pl = pack(big, 512)
    sheet.save(OUT_P / f'fazenda_icones_{size}.png', optimize=True)
    library['pecas'][f'fazenda_icones_{size}'] = dict(sorted(pl.items()))
    print(f'fazenda_icones_{size}', len(pl), 'faltam', sorted(names16 - set(pl)))

# plantações crescendo: 7 quadros de 16 de largura; metade de cima é o desenho (a de baixo é a legenda 1-2-3)
growth = []
for f in sorted((S16 / 'Crops_Growth_16x16').glob('*.png')):
    img = Image.open(f).convert('RGBA')
    h = img.height // 2
    growth.append((slug(f.stem.replace('_Growth_Stages', '')), img.crop((0, 0, img.width, h))))
sheet, places = pack(growth, 512)
sheet.save(OUT_P / 'fazenda_crescimento.png', optimize=True)
library['pecas']['fazenda_crescimento'] = dict(sorted(places.items()))
print('fazenda_crescimento', len(places))

# animados: o tamanho do quadro vem do gif de cada um
gifs = {}
for g in (S16 / 'Animated_16x16/Animated_gifs_16x16').glob('*.gif'):
    im = Image.open(g)
    gifs[slug(g.stem)] = (im.width, im.height, getattr(im, 'n_frames', 1))
anims = []
for f in sorted((S16 / 'Animated_16x16/Animated_sheets_16x16').glob('*.png')):
    name = slug(f.stem)
    img = Image.open(f).convert('RGBA')
    fw, fh, n = gifs.get(name, (img.height, img.height, max(1, img.width // max(1, img.height))))
    if img.width % fw:
        fw = img.width // max(1, n)
    anims.append((name, img.crop((0, 0, fw * (img.width // fw), fh)), fw, img.width // fw))
for k in [k for k in library['anims'] if k.startswith('fz_')]:
    del library['anims'][k]
AW = 2048
atlases = []
x = y = shelf = 0
cur = None
for name, img, fw, n in sorted(anims, key=lambda a: -a[1].height):
    if cur is None or x + img.width > AW:
        x, y, shelf = 0, y + shelf + 1, 0
    if cur is None or y + img.height > AW:
        cur = Image.new('RGBA', (AW, AW))
        atlases.append(cur)
        x = y = shelf = 0
    cur.paste(img, (x, y))
    library['anims'][f'fz_{name}'] = [f'fz{len(atlases) - 1}', x, y, fw, img.height, n]
    x += img.width + 1
    shelf = max(shelf, img.height)
for i, atlas in enumerate(atlases):
    box = atlas.getbbox() or (0, 0, 1, 1)
    atlas.crop((0, 0, AW, box[3])).save(EDITOR / f'animados_fz{i}.png', optimize=True)
library['anims'] = dict(sorted(library['anims'].items()))
print('animados', len(anims), 'em', len(atlases), 'imagens')

# bichos: folhas de 24 colunas (4 direções x 6 quadros); linha 0 = parado, 1 = respirando, 2 = andando
NOMES = {'cow': 'Vaca', 'chicken': 'Galinha', 'chick': 'Pintinho', 'rooster': 'Galo', 'donkey': 'Burro', 'duck': 'Pato',
         'duckling': 'Patinho', 'goat': 'Cabra', 'pig': 'Porco', 'rabbit': 'Coelho', 'sheep': 'Ovelha'}
SONS = {'cow': 'Muuu!', 'chicken': 'Có-có-có!', 'chick': 'Piu piu!', 'rooster': 'Cocoricó!', 'donkey': 'Ióóó!', 'duck': 'Quá-quá!',
        'duckling': 'Quá!', 'goat': 'Méé!', 'pig': 'Óinc óinc!', 'rabbit': '…', 'sheep': 'Béé!'}
bichos = {}
for folder in ['Cows', 'Chickens_and_Roosters', 'Donkeys', 'Ducks', 'Goats', 'Pigs', 'Rabbits', 'Sheeps']:
    for f in sorted((S16 / 'Animals_16x16' / folder).glob('*.png')):
        img = Image.open(f)
        fw = img.width // 24
        if img.width % 24 or img.height % fw:
            continue
        sid = slug(f.stem)
        kind = sid.split('_')[0]
        kind = 'sheep' if kind == 'sheep' else kind
        bichos[sid] = {
            'nome': f"{NOMES.get(kind, kind)} ({' '.join(sid.split('_')[1:]) or 'comum'})",
            'som': SONS.get(kind, '…'),
            'file': '/' + str(f.relative_to(root / 'public')).replace('\\', '/'),
            'fw': fw,
            'fh': img.height // (8 if sid.startswith('sheep_2') else 4),  # 4 fileiras (galo: 16x32, cabra: 32x48); a ovelha 2 tem 8 (com e sem lã)
        }
(MF / 'bichos.json').write_text(json.dumps(bichos, ensure_ascii=False, indent=0))
print('bichos', len(bichos))

# autotiles: os do Exteriors (26 blocos) e, embaixo, os da fazenda (blocos 26 em diante)
me_sheet = Image.open(root / 'public/limezu/me/terrenos/godot_autotiles.png').convert('RGBA')
farm_sheet = Image.open(S16 / 'Autotiles_16x16/Autotiles_Godot_16x16.png').convert('RGBA')
both = Image.new('RGBA', (me_sheet.width, me_sheet.height + farm_sheet.height))
both.paste(me_sheet, (0, 0))
both.paste(farm_sheet, (0, me_sheet.height))
both.save(EDITOR / 'autotiles.png', optimize=True)
print('autotiles:', me_sheet.height // 64, '+', farm_sheet.height // 64, 'blocos')

LIB.write_text(json.dumps(library, separators=(',', ':')))
print('ok: biblioteca atualizada')
