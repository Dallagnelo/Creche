#!/usr/bin/env python3
"""Turma 2.0: animações das ferramentas (Modern Farm, Body_2_16x16.png) para o boneco do jogador.

O pacote só traz as ferramentas desenhadas junto de um corpo pelado (Body_2). Como o boneco do
jogo é montado com o gerador do Modern Interiors (roupa, cabelo...), separamos daqui só:
  - a ferramenta (cores que não são do corpo): vai por cima do boneco;
  - o braço que sai da silhueta normal (ex.: braço esticado regando): vai na cor da pele do
    boneco (o jogo troca as cores da pele do Body_2 pelas do corpo escolhido);
  - quanto o corpo desce/anda em cada quadro (agachar na colheita, inclinar cavando).

As cores da pele vão em "pele" (sem o contorno), da mais usada para a menos usada: as peças de
corpo do gerador seguem a mesma ordem, então a troca é uma pela outra.

Saída: public/limezu/editor/ferramentas.png (ferramenta), ferramentas_braco.png (braço)
e ferramentas.json. Quadros de 48x64; o corpo 16x32 fica em (16, 32) dentro do quadro.
Direções na ordem do gerador: direita, costas, esquerda, frente.
"""
import json
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public/limezu/mf/16x16/Characters_16x16/Body_2_16x16.png')
OUT = os.path.join(ROOT, 'public/limezu/editor')
CW, CH = 48, 64
COLS = 32

# nome: (linha na folha do pacote, quadros por direção)
ANIMS = {
    'anda_enxada': (4, 6),
    'enxada': (5, 9),
    'anda_regador': (6, 6),
    'regador': (7, 14),
    'anda_machado': (8, 6),
    'machado': (9, 10),
    'anda_vara': (10, 6),
    'vara': (11, 32),
    'colher': (3, 9),
}
IDLE_ROW, WALK_ROW = 1, 2
CONTORNO = ['#3a3a50', '#46465e', '#6c5981']  # iguais em todos os corpos


def main():
    src = Image.open(SRC).convert('RGBA')
    cell = lambda r, c: src.crop((c * CW, r * CH, c * CW + CW, r * CH + CH))

    # cores do corpo (linhas parado e andando, sem ferramenta)
    count = {}
    for r in (IDLE_ROW, WALK_ROW):
        for c in range(24):
            im = cell(r, c)
            px = im.load()
            for y in range(CH):
                for x in range(CW):
                    if px[x, y][3]:
                        count[px[x, y]] = count.get(px[x, y], 0) + 1
    body = set(count)

    def body_mask(im):
        px = im.load()
        m = {(x, y) for y in range(CH) for x in range(CW) if px[x, y][3] and px[x, y] in body}
        # fica só o maior pedaço ligado (a linha da vara e respingos usam cores parecidas)
        best, seen = set(), set()
        for s0 in m:
            if s0 in seen:
                continue
            comp, st = set(), [s0]
            seen.add(s0)
            while st:
                x, y = st.pop()
                comp.add((x, y))
                for ex in (-1, 0, 1):
                    for ey in (-1, 0, 1):
                        q = (x + ex, y + ey)
                        if q in m and q not in seen:
                            seen.add(q)
                            st.append(q)
            if len(comp) > len(best):
                best = comp
        return best

    def box(mask):
        xs = [x for x, _ in mask]
        ys = [y for _, y in mask]
        return min(xs), min(ys), max(xs), max(ys)

    total = sum(-(-n * 4 // COLS) for _, n in ANIMS.values())
    tool = Image.new('RGBA', (COLS * CW, total * CH))
    arm = Image.new('RGBA', (COLS * CW, total * CH))
    meta = {'cw': CW, 'ch': CH, 'cols': COLS, 'bx': 16, 'by': 32, 'contorno': CONTORNO, 'pele': [c for c in ('#%02x%02x%02x' % p[:3] for p in sorted(body, key=lambda p: -count[p])) if c not in CONTORNO], 'anims': {}}
    start = 0
    for name, (row, n) in ANIMS.items():
        walk = name.startswith('anda_')
        offs = []
        for d in range(4):
            for i in range(n):
                im = cell(row, d * n + i)
                px = im.load()
                bm = body_mask(im)
                # silhueta de referência: o mesmo quadro andando (anda_*) ou o parado da direção
                ref = cell(WALK_ROW, d * 6 + i) if walk else cell(IDLE_ROW, d * 6)
                rm = body_mask(ref)
                # o pacote nem sempre põe o corpo no mesmo lugar do quadro: alinha pelos pés
                tx = ty = dx = dy = 0
                if bm:
                    a, b = box(bm), box(rm)
                    ty = b[3] - a[3]
                    legs = lambda m, bt: [x for x, y in m if y >= bt - 3]
                    la, lb = legs(bm, a[3]), legs(rm, b[3])
                    tx = round((min(lb) + max(lb)) / 2 - (min(la) + max(la)) / 2)
                    if not walk:
                        dy = max(0, min(3, a[1] + ty - b[1]))  # agachar (o braço levantado não conta)
                offs.append([dx, dy])
                # a silhueta do boneco do jogo, já deslocada, com 1 px de folga
                sil = set()
                for x, y in rm:
                    for ex in (-1, 0, 1):
                        sil.add((x + dx + ex, y + dy))
                head = box(rm)[1] + dy + 12  # a cabeça fica de fora (o cabelo do boneco cobre outra forma)
                k = start + d * n + i
                ox, oy = (k % COLS) * CW, (k // COLS) * CH
                for y in range(CH):
                    for x in range(CW):
                        p = px[x, y]
                        if not p[3]:
                            continue
                        qx, qy = x + tx, y + ty
                        if not (0 <= qx < CW and 0 <= qy < CH):
                            continue
                        if p not in body or (x, y) not in bm:
                            tool.putpixel((ox + qx, oy + qy), p)
                        elif (qx, qy) not in sil and qy >= head and name != 'colher':
                            arm.putpixel((ox + qx, oy + qy), p)
        meta['anims'][name] = {'start': start, 'n': n, 'off': offs}
        start += -(-n * 4 // COLS) * COLS
    tool.save(os.path.join(OUT, 'ferramentas.png'), optimize=True)
    arm.save(os.path.join(OUT, 'ferramentas_braco.png'), optimize=True)
    with open(os.path.join(OUT, 'ferramentas.json'), 'w') as f:
        json.dump(meta, f, separators=(',', ':'))
    print('ok', tool.size, start)


if __name__ == '__main__':
    main()
