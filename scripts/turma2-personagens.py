"""Turma 2.0: junta as peças do gerador de personagens do Modern Interiors em poucas imagens.

Cada peça (corpo, olhos, roupa, cabelo, acessório, personagem pronto) é uma folha 896x656 com
todas as animações. Aqui ficam só 4 fileiras (32 px cada), nos primeiros 24 quadros (16 px):
  0 parado (24 quadros: direita, costas, esquerda, frente; 6 cada)
  1 andando (24 quadros, mesma ordem)
  2 sentado (12 quadros: direita 6, esquerda 6)
  3 celular (12 quadros, de frente; 4 a 9 repetem)
Saída: public/limezu/editor/pers_<categoria>.png (10 peças por linha, 384x128 cada)
       public/limezu/editor/personagens.json
Uso: python3 scripts/turma2-personagens.py
"""
import json, os, re
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'limezu')
SRC = os.path.join(ROOT, 'mi', 'personagens')
OUT = os.path.join(ROOT, 'editor')
ROWS = [1, 2, 4, 6]
PW, PH, COLS = 384, 32 * len(ROWS), 10
CATS = {'corpo': 'corpos', 'olhos': 'olhos', 'roupa': 'roupas', 'cabelo': 'cabelos', 'acessorio': 'acessorios', 'pronto': 'prontos'}

def key(name):
    return [int(n) if n.isdigit() else n for n in re.split(r'(\d+)', name)]

index = {'w': PW, 'h': PH, 'cols': COLS, 'cats': {}}
for cat, folder in CATS.items():
    files = sorted((f for f in os.listdir(os.path.join(SRC, folder)) if f.endswith('.png')), key=key)
    rows = (len(files) + COLS - 1) // COLS
    atlas = Image.new('RGBA', (PW * COLS, PH * rows))
    parts = []
    for i, f in enumerate(files):
        im = Image.open(os.path.join(SRC, folder, f)).convert('RGBA')
        for j, r in enumerate(ROWS):
            w = PW if j < 2 else PW // 2  # sentado e celular só têm 12 quadros (o resto da folha tem anotações)
            atlas.paste(im.crop((0, r * 32, w, r * 32 + 32)), ((i % COLS) * PW, (i // COLS) * PH + j * 32))
        parts.append(f[:-4])
    name = f'pers_{cat}.png'
    atlas.save(os.path.join(OUT, name), optimize=True)
    index['cats'][cat] = {'file': f'/limezu/editor/{name}', 'parts': parts}
    print(cat, len(parts), os.path.getsize(os.path.join(OUT, name)) // 1024, 'KB')
json.dump(index, open(os.path.join(OUT, 'personagens.json'), 'w'), separators=(',', ':'))
