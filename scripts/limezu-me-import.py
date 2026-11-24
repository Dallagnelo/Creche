"""Traz para o projeto TUDO do Modern Exteriors (LimeZu) que dá para usar no jogo, na versão 16x16.

Uso (Python 3 + Pillow), apontando para a pasta raiz do pacote descompactado:
    python scripts/limezu-me-import.py "C:/caminho/modernexteriors-win"

Resultado em public/limezu/me/ (licença: repositório privado, nunca redistribuir o pacote):
  pecas/<tema>.png    todas as peças soltas de um tema juntas numa imagem (prédios, chão, árvores, carros…)
  pecas/index.json    onde cada peça ficou: tema → nome → [x, y, largura, altura, dx, dy]
  folhas/             as folhas originais por tema e o tileset completo
  terrenos/           água e mar animados (folhas de autotile) e os autotiles de chão
  animados/           objetos animados (portas, placas, fontes, bichos…) em folhas de quadros
  veiculos/           carros, ônibus, caminhões, helicópteros e tanques animados
  personagens/        peças extras do gerador de bonecos (soldado, carteiro, fantasma…)
  index.json          lista de tudo acima
Ficam de fora: 32x32/48x48, as pastas "OLD"/"Old_Sorting" e os gifs que já existem como folha.
"""
import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parent.parent
pack = Path(sys.argv[1])
base = pack / 'Modern_Exteriors_16x16'
out = root / 'public/limezu/me'
if out.exists():
    shutil.rmtree(out)
out.mkdir(parents=True)
index = {}


def slug(text):
    return re.sub(r'[^A-Za-z0-9]+', '_', text).strip('_').lower()


def save(img, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)


def copy_png(src, dst):
    save(Image.open(src), dst)


def gif_frames(path):
    gif = Image.open(path)
    frames = []
    try:
        while True:
            frames.append(gif.convert('RGBA').copy())
            gif.seek(gif.tell() + 1)
    except EOFError:
        pass
    sheet = Image.new('RGBA', (frames[0].width * len(frames), frames[0].height))
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * fr.width, 0))
    return sheet, len(frames), frames[0].width, frames[0].height


def unique(name, taken):
    while name in taken:  # o pacote tem nomes quase iguais ("..._1" e "..._1_")
        name += '_b'
    return name


# ------------------------------------------------------------------ peças soltas → uma imagem por tema
sorter = base / 'ME_Theme_Sorter_16x16'
pieces = {}
for theme_dir in sorted([d for d in sorter.iterdir() if d.is_dir() and re.match(r'\d+_', d.name)], key=lambda p: int(p.name.split('_')[0])):
    code = slug(re.sub(r'(^\d+_|_Singles_16x16$)', '', theme_dir.name))
    sprites = []
    names = set()
    for f in sorted(theme_dir.glob('*.png')):
        # "ME_Singles_City_Props_16x16_ATM_1" / "21_Beach_16x16_Ball" → "atm_1" / "ball"
        name = slug(re.sub(r'^.*?_16x16_?', '', f.stem) or f.stem)
        name = unique(name, names)
        names.add(name)
        img = Image.open(f).convert('RGBA')
        box = img.getbbox()
        if box:
            sprites.append((name, img.crop(box), box))
    sprites.sort(key=lambda s: -s[1].height)
    W, x, y, shelf = 2048, 0, 0, 0
    place = {}
    for name, img, box in sprites:
        if x + img.width > W:
            x, y, shelf = 0, y + shelf + 1, 0
        place[name] = (x, y)
        x += img.width + 1
        shelf = max(shelf, img.height)
    atlas = Image.new('RGBA', (W, y + shelf + 1))
    rects = {}
    for name, img, box in sprites:
        px, py = place[name]
        atlas.paste(img, (px, py))
        rects[name] = [px, py, img.width, img.height, box[0], box[1]]
    save(atlas, out / 'pecas' / f'{code}.png')
    pieces[code] = {'file': f'pecas/{code}.png', 'count': len(rects), 'sprites': dict(sorted(rects.items()))}
    print('pecas', code, len(rects), atlas.size)
(out / 'pecas/index.json').write_text(json.dumps(pieces, separators=(',', ':')))
index['pecas'] = {k: {'file': v['file'], 'count': v['count']} for k, v in pieces.items()}

# ------------------------------------------------------------------ folhas originais
index['folhas'] = {}
for f in sorted(sorter.glob('*.png')):
    name = slug(f.stem.replace('_16x16', ''))
    copy_png(f, out / 'folhas' / f'{name}.png')
    index['folhas'][name] = f'folhas/{name}.png'
copy_png(base / 'Modern_Exteriors_Complete_Tileset.png', out / 'folhas/exteriors_completo.png')
index['folhas']['exteriors_completo'] = 'folhas/exteriors_completo.png'

# ------------------------------------------------------------------ terrenos (água animada e autotiles)
index['terrenos'] = {}
for f in sorted((base / 'Animated_16x16/Animated_Terrains_16x16').glob('*.png')):
    name = slug(f.stem.replace('_16x16', ''))
    copy_png(f, out / 'terrenos' / f'{name}.png')
    index['terrenos'][name] = f'terrenos/{name}.png'
for f in sorted((base / 'Autotiles_16x16').glob('*.png')):
    name = slug(f.stem.replace('_16x16', ''))
    copy_png(f, out / 'terrenos' / f'{name}.png')
    index['terrenos'][name] = f'terrenos/{name}.png'

# ------------------------------------------------------------------ objetos animados
index['animados'] = {}
sheets = base / 'Animated_16x16/Animated_sheets_16x16'
gifs = base / 'Animated_16x16/Animated_gifs_16x16'
have = set()
for f in sorted(sheets.glob('*.png')):
    stem = f.stem.replace('_16x16', '')
    have.add(slug(stem))
    name = unique(slug(stem), index['animados'])
    img = Image.open(f)
    copy_png(f, out / 'animados' / f'{name}.png')
    index['animados'][name] = {'file': f'animados/{name}.png', 'w': img.width, 'h': img.height}
for f in sorted(gifs.glob('*.gif')):
    stem = slug(f.stem.replace('.png', '').replace('_16x16', ''))
    if stem in have:
        continue  # já veio como folha
    sheet, frames, fw, fh = gif_frames(f)
    name = unique(stem, index['animados'])
    save(sheet, out / 'animados' / f'{name}.png')
    index['animados'][name] = {'file': f'animados/{name}.png', 'w': sheet.width, 'h': sheet.height, 'frames': frames, 'fw': fw}
print('animados', len(index['animados']))

# ------------------------------------------------------------------ veículos animados
index['veiculos'] = {}
for f in sorted((base / 'Animated_16x16/Vehicles_16x16').rglob('*.png')):
    group = slug(f.parent.name.replace('_16x16', '')) if f.parent.name != 'Vehicles_16x16' else 'outros'
    name = unique(slug(f.stem.replace('_16x16', '')), index['veiculos'].get(group, {}))
    img = Image.open(f)
    copy_png(f, out / 'veiculos' / group / f'{name}.png')
    index['veiculos'].setdefault(group, {})[name] = {'file': f'veiculos/{group}/{name}.png', 'w': img.width, 'h': img.height}
print('veiculos', sum(len(v) for v in index['veiculos'].values()))

# ------------------------------------------------------------------ peças extras do gerador de bonecos
index['personagens'] = []
for f in sorted((base / 'Character_Generator_Addons_16x16').rglob('*.png')):
    name = slug(f.stem.replace('_16x16', ''))
    copy_png(f, out / 'personagens' / f'{name}.png')
    index['personagens'].append(f'personagens/{name}.png')
print('personagens', len(index['personagens']))

(out / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=1))
print('ok')
