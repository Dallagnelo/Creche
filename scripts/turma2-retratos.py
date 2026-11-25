"""Turma 2.0: retratos (rosto que fala, concorda e nega) do Modern User Interface, combinando com os personagens.

As peças do gerador de retratos (public/limezu/ui/16x16/Portrait_Generator) têm 320x96:
quadros de 32x32, 10 por fileira; fileira 0 falando, 1 concordando, 2 negando.
Os nomes viram os mesmos do personagem (PG_Hairstyle_10_3 → hairstyle_10_03), para o rosto
seguir o visual que a pessoa montou. Saída: public/limezu/editor/retrato_<cat>.png e retratos.json.
Uso: python3 scripts/turma2-retratos.py
"""
import json, os, re
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'limezu')
SRC = os.path.join(ROOT, 'ui', '16x16', 'Portrait_Generator')
OUT = os.path.join(ROOT, 'editor')
PW, PH, COLS = 320, 96, 10
CATS = {'corpo': ('Skins', lambda n: 'body_%02d' % int(re.search(r'(\d+)$', n).group(1))),
        'olhos': ('Eyes', lambda n: n.replace('PG_Eyes', 'eyes')),
        'cabelo': ('Hairstyles', None), 'acessorio': ('Accessories', None)}

def to_char(name):
    s = name.replace('PG_', '').lower()
    return re.sub(r'_(\d+)$', lambda m: '_%02d' % int(m.group(1)), s)

def key(n):
    return [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', n)]

index = {'w': PW, 'h': PH, 'cols': COLS, 'frame': 32, 'cats': {}}
for cat, (folder, fn) in CATS.items():
    files = sorted((f[:-4] for f in os.listdir(os.path.join(SRC, folder)) if f.endswith('.png')), key=key)
    rows = (len(files) + COLS - 1) // COLS
    atlas = Image.new('RGBA', (PW * COLS, PH * rows))
    parts = []
    for i, f in enumerate(files):
        atlas.paste(Image.open(os.path.join(SRC, folder, f + '.png')).convert('RGBA'), ((i % COLS) * PW, (i // COLS) * PH))
        parts.append((fn or to_char)(f))
    name = f'retrato_{cat}.png'
    atlas.save(os.path.join(OUT, name), optimize=True)
    index['cats'][cat] = {'file': f'/limezu/editor/{name}', 'parts': parts}
    print(cat, len(parts), parts[:2], os.path.getsize(os.path.join(OUT, name)) // 1024, 'KB')
json.dump(index, open(os.path.join(OUT, 'retratos.json'), 'w'), separators=(',', ':'))
