"""Turma 2.0 · onde cada peça "encosta no chão" (o pé), para o jogo saber onde dá para andar.

Uso: python scripts/turma2-pes.py   (depois do turma2-biblioteca.py e do turma2-fazenda.py)
Gera public/limezu/editor/pes.json:  "pecas/tema/nome" → [[x0, x1], …]  (em px, da esquerda da peça)

Antes o jogo bloqueava a largura inteira do desenho: a copa da árvore, o braço do poste e o espantalho
viravam paredes invisíveis. Agora só bloqueia onde a peça toca o chão (tronco, pé do poste, parede da casa).
Só entram as peças em que o pé é mais estreito que o desenho; as outras continuam bloqueando a largura toda.
"""
import json
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parent.parent
LZ = root / 'public/limezu'
LIB = json.loads((LZ / 'editor/biblioteca.json').read_text())
BAND = 14  # px de baixo do desenho que contam como "pé"
GAP = 20  # buracos menores que isso (pés de mesa, barraca) continuam bloqueados
SOLID = 200  # sombra é meio transparente: não conta
# só peças soltas (árvores, postes, barracas, enfeites). Prédios e veículos continuam bloqueando o desenho
# todo: o vão embaixo deles (marquise, garagem) não é para atravessar
THEMES = {'fazenda_arvores', 'fazenda_construcoes', 'city_props', 'camping', 'garden', 'beach', 'graveyard', 'halloween'}


def atlas(src, theme):
    if src == 'moveis':
        return LZ / f'mi/moveis/{theme}.png'
    return LZ / ('mf' if theme.startswith('fazenda_') else 'me') / f'pecas/{theme}.png'


out = {}
for src in ('pecas',):
    for theme, pieces in LIB[src].items():
        if theme not in THEMES and theme != 'villas':
            continue
        path = atlas(src, theme)
        if not path.exists():
            continue
        img = Image.open(path).convert('RGBA')
        alpha = img.getchannel('A').load()
        for name, (x, y, w, h) in pieces.items():
            if h <= 16 or (theme == 'villas' and not name.startswith('tree')):
                continue  # peça baixinha: bloqueia como sempre
            # a fileira mais baixa que tem desenho (algumas peças têm uma faixa vazia embaixo)
            low = next((r for r in range(h - 1, -1, -1) if any(alpha[x + c, y + r] >= SOLID for c in range(w))), None)
            if low is None:
                continue
            cols = [any(alpha[x + c, y + r] >= SOLID for r in range(max(0, low + 1 - BAND), low + 1)) for c in range(w)]
            segs = []
            for c, on in enumerate(cols):
                if not on:
                    continue
                if segs and c - segs[-1][1] < GAP:
                    segs[-1][1] = c + 1
                else:
                    segs.append([c, c + 1])
            if not segs:
                continue
            if segs[0][0] <= 4 and segs[-1][1] >= w - 4 and len(segs) == 1:
                continue  # o pé ocupa a largura toda
            out[f'{src}/{theme}/{name}'] = segs

(LZ / 'editor/pes.json').write_text(json.dumps(out, separators=(',', ':')))
print(len(out), 'peças com pé mais estreito que o desenho')
