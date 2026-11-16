"""Monta o atlas dos móveis do pacote Modern Interiors (LimeZu) usados no site.

Uso (no computador, com Python + Pillow):
    python scripts/limezu-atlas.py "C:/caminho/Theme_Sorter_Shadowless_Singles"

Lê as chaves 'L:37', 'B:145'... que aparecem em src/lib/roomLimezu.js, recorta cada desenho
(tira a borda transparente) e gera:
    public/limezu/atlas.png      (todos os desenhos usados, numa imagem só)
    src/lib/limezuAtlas.json     (onde cada um ficou no atlas: x, y, largura, altura)
Só os desenhos usados vão para o projeto (a licença não deixa redistribuir o pacote inteiro).
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image

THEMES = {
    'L': '2_Living_Room', 'BA': '3_Bathroom', 'B': '4_Bedroom', 'C': '5_Classroom_and_Library', 'M': '6_Music_and_Sport',
    'A': '7_Art', 'G': '8_Gym', 'F': '9_Fishing', 'P': '10_Birthday_Party', 'H': '11_Halloween', 'K': '12_Kitchen',
    'CH': '13_Conference_Hall', 'BS': '14_Basement', 'X': '15_Christmas', 'GS': '16_Grocery_Store', 'J': '18_Jail',
    'HO': '19_Hospital', 'JP': '20_Japanese_Interiors', 'CS': '21_Clothing_Store', 'MU': '22_Museum', 'TV': '23_Television_and_Film_Studio',
    'IC': '24_Ice_Cream_Shop', 'SR': '25_Shooting_Range', 'CO': '26_Condominium',
}

root = Path(__file__).resolve().parent.parent
src = Path(sys.argv[1])
code = (root / 'src/lib/roomLimezu.js').read_text(encoding='utf-8')
ids = sorted(set(re.findall(r"'([A-Z]{1,2}):(\d+)'", code)), key=lambda t: (t[0], int(t[1])))


def find(theme, n):
    folder = next(p for p in src.iterdir() if p.is_dir() and p.name.startswith(THEMES[theme] + '_'))
    return next(folder.glob(f'*_{n}.png'))


sprites = []
for theme, n in ids:
    im = Image.open(find(theme, n)).convert('RGBA')
    box = im.getbbox()
    if box:
        im = im.crop(box)
    sprites.append((f'{theme}:{n}', im))

# empacota em prateleiras (do mais alto para o mais baixo)
sprites.sort(key=lambda s: -s[1].height)
W = 512
x = y = shelf = 0
rects = {}
for key, im in sprites:
    if x + im.width > W:
        x, y, shelf = 0, y + shelf + 1, 0
    rects[key] = [x, y, im.width, im.height]
    x += im.width + 1
    shelf = max(shelf, im.height)
H = y + shelf + 1
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for key, im in sprites:
    atlas.paste(im, tuple(rects[key][:2]))
(root / 'public/limezu').mkdir(parents=True, exist_ok=True)
atlas.save(root / 'public/limezu/atlas.png', optimize=True)
(root / 'src/lib/limezuAtlas.json').write_text(json.dumps(rects, separators=(',', ':'), sort_keys=True), encoding='utf-8')
print(f'{len(rects)} desenhos -> public/limezu/atlas.png ({W}x{H})')
