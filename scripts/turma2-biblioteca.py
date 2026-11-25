"""Turma 2.0 · biblioteca do editor de mapas: junta tudo o que o editor oferece em poucos arquivos.

Uso: python scripts/turma2-biblioteca.py [pasta do modernexteriors-win descompactado]
(a pasta do pacote é opcional: ela só serve para saber o tamanho exato dos quadros dos animados;
sem ela, o script adivinha que cada quadro é quadrado)

Lê o que já está no projeto (public/limezu/me e public/limezu/mi) e gera em public/limezu/editor/:
  animados_N.png       todos os objetos animados do Exteriors, juntos em poucas imagens grandes
  biblioteca.json      tudo o que dá para pôr num mapa:
                         pecas:   tema → nome → [x, y, w, h]   (imagem: /limezu/me/pecas/<tema>.png)
                         moveis:  tema → número → [x, y, w, h] (imagem: /limezu/mi/moveis/<tema>.png)
                         anims:   nome → [atlas, x, y, largura do quadro, altura, quadros]
Poucos arquivos grandes em vez de centenas de pequenos: o git do navegador (StackBlitz) agradece.
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parent.parent
LZ = root / 'public/limezu'
out = LZ / 'editor'
out.mkdir(parents=True, exist_ok=True)
pack = Path(sys.argv[1]) if len(sys.argv) > 1 else None


def slug(text):
    return re.sub(r'[^A-Za-z0-9]+', '_', text).strip('_').lower()


# tamanho dos quadros: vem dos gifs do pacote (cada gif é a animação já separada em quadros)
frames_of = {}
if pack:
    for g in (pack / 'Modern_Exteriors_16x16/Animated_16x16/Animated_gifs_16x16').glob('*.gif'):
        im = Image.open(g)
        frames_of[slug(g.stem.replace('.png', '').replace('_16x16', ''))] = (im.width, im.height, getattr(im, 'n_frames', 1))

index = json.loads((LZ / 'me/index.json').read_text())
sheets = []
for name, info in index['animados'].items():
    img = Image.open(LZ / 'me' / info['file']).convert('RGBA')
    if 'fw' in info:
        fw, n = info['fw'], info['frames']
    elif name in frames_of and frames_of[name][2] > 1 and img.width % frames_of[name][0] == 0 and frames_of[name][0] < img.width:
        fw, n = frames_of[name][0], img.width // frames_of[name][0]
    else:
        # palpite: o quadro de largura (múltiplo de 16) mais perto da altura, entre metade e o dobro dela
        options = [w for w in range(16, img.width + 1, 16) if img.width % w == 0 and img.height / 2 <= w <= img.height * 2]
        fw = min(options, key=lambda w: abs(w - img.height)) if options else img.width
        n = img.width // fw
    sheets.append((name, img, fw, n))

# empacota em imagens de até 4096 x 4096
sheets.sort(key=lambda s: -s[1].height)
AW, AH = 4096, 4096
atlases, rects = [], {}
x = y = shelf = 0
cur = None
for name, img, fw, n in sheets:
    if cur is None or x + img.width > AW:
        x, y, shelf = 0, y + shelf + 1, 0
    if cur is None or y + img.height > AH:
        cur = Image.new('RGBA', (AW, AH))
        atlases.append(cur)
        x = y = shelf = 0
    cur.paste(img, (x, y))
    rects[name] = [len(atlases) - 1, x, y, fw, img.height, n]
    x += img.width + 1
    shelf = max(shelf, img.height)
for i, atlas in enumerate(atlases):
    box = atlas.getbbox() or (0, 0, 1, 1)
    atlas.crop((0, 0, AW, box[3])).save(out / f'animados_{i}.png', optimize=True)

pecas = json.loads((LZ / 'me/pecas/index.json').read_text())
moveis = json.loads((LZ / 'mi/moveis/index.json').read_text())['com_sombra']
library = {
    'pecas': {t: {n: r[:4] for n, r in v['sprites'].items()} for t, v in pecas.items()},
    'moveis': {t: {n: r[:4] for n, r in v['sprites'].items()} for t, v in moveis.items()},
    'anims': dict(sorted(rects.items())),
    'atlases': len(atlases),
}
(out / 'biblioteca.json').write_text(json.dumps(library, separators=(',', ':')))
print('ok', len(rects), 'animados em', len(atlases), 'imagens;', sum(len(v) for v in library['pecas'].values()), 'peças;', sum(len(v) for v in library['moveis'].values()), 'móveis')
