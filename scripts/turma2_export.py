"""Turma 2.0: grava um lugar pronto (Centro, Orla, Acampamento) no formato do editor de mapas.

Os scripts dos lugares (turma2-centro.py, turma2-orla.py, turma2-acampamento.py) anotam aqui cada peça,
animado, chão pintado, água, trânsito, personagem e moeda. No fim, save() escreve o mapa em
src/lib/turma2/defaultMaps.json — o jogo e o editor leem dali (dá para abrir e editar no editor).

"Onde dá para andar" é conferido com o que o script calculou: onde o automático do editor (pé das peças,
água, cerca) der diferente, vira um ajuste manual (block) — assim o mapa anda igualzinho ao original.
"""
import json
import math
import os
from pathlib import Path

root = Path(__file__).resolve().parent.parent
LIB = json.loads((root / 'public/limezu/editor/biblioteca.json').read_text())
OUT = root / 'src/lib/turma2/defaultMaps.json'
T = 16
# terrenos do editor que ninguém atravessa (igual a TERRAINS em src/lib/turma2/autotile.js)
BLOCK_WALK = {'agua', 'piscina', 'cerca_viva', 'cerca'}
ORDER = ['centro', 'orla', 'acampamento']  # ordem no menu do jogo


class Map:
    def __init__(self, code, name, w, h, base='grama'):
        self.code, self.name, self.w, self.h, self.base = code, name, w, h, base
        self.terrain = {}
        self.objects, self.anims, self.patrols, self.traffic = [], [], [], []
        self.lights, self.water, self.doors, self.npcs, self.items = [], [], [], [], []
        self.spawn = [0, 0]
        self.n = 0

    def _id(self, p):
        self.n += 1
        return f'{p}{self.n}'

    def paint(self, tid, grid):
        """camada de chão: grid[y][x] verdadeiro = pintado"""
        rows = self.terrain.get(tid) or [['0'] * self.w for _ in range(self.h)]
        for y in range(self.h):
            for x in range(self.w):
                if grid[y][x]:
                    rows[y][x] = '1'
        self.terrain[tid] = rows

    def obj(self, theme, name, x, y, d, flip=False, light=None, chao=False, porta=False, size=None):
        """peça do pacote; light = [x, y, raio, cor] (posição de verdade no mapa)"""
        r = LIB['pecas'][theme][name]
        if size:
            assert tuple(size) == (r[2], r[3]), (theme, name, size, r)
        o = {'id': self._id('o'), 'src': 'pecas', 't': theme, 'n': name, 'x': int(x), 'y': int(y), 'd': int(d)}
        if flip:
            o['f'] = 1
        if chao:
            o['chao'], o['d'] = 1, 0
        if porta:
            o['porta'], o['d'] = 1, 0
        if light:
            o['l'] = [light[2], light[3], round(light[0] - (o['x'] + r[2] / 2), 1), round(light[1] - (o['y'] + r[3] / 2), 1)]
        self.objects.append(o)
        return o

    def anim(self, name, x, y, fw, frames, fps, d, when='', light=None):
        r = LIB['anims'][name]
        a = {'id': self._id('a'), 'n': name, 'x': int(x), 'y': int(y), 'fps': fps, 'd': d, 'w': when or ''}
        if fw != r[3]:
            a['fw'] = fw
        if frames != r[5]:
            a['fr'] = frames
        if light:
            a['l'] = [light[2], light[3], round(light[0] - (a['x'] + fw / 2), 1), round(light[1] - (a['y'] + r[4] / 2), 1)]
        self.anims.append(a)
        return a

    def anim_h(self, name):
        return LIB['anims'][name][4]

    def car(self, theme, name, foot, speed, x0):
        r = LIB['pecas'][theme][name]
        self.traffic.append({'id': self._id('t'), 'src': 'pecas', 't': theme, 'n': name, 'x': int(x0), 'y': int(foot - r[3]), 'speed': speed})

    def boat(self, name, foot, speed, x0, fw=None, frames=None):
        r = LIB['anims'][name]
        c = {'id': self._id('t'), 'a': name, 'x': int(x0), 'y': int(foot - r[4]), 'speed': speed}
        if fw and fw != r[3]:
            c['fw'] = fw
        if frames and frames != r[5]:
            c['fr'] = frames
        self.traffic.append(c)

    def patrol(self, right, left, x0, x1, foot, speed):
        self.patrols.append({'id': self._id('p'), 'r': right, 'l': left, 'x0': int(x0), 'x1': int(x1), 'y': int(foot), 'speed': speed})

    def light(self, x, y, r, c, giro=False):
        l = {'id': self._id('l'), 'x': int(x), 'y': int(y), 'r': r, 'c': c}
        if giro:
            l['giro'] = True
        self.lights.append(l)

    def lake(self, x, y, w, h, kind='lago'):
        self.water.append({'id': self._id('w'), 'x': x, 'y': y, 'w': w, 'h': h, 'kind': kind})

    def door(self, x, y, to, sx, sy):
        self.doors.append({'id': self._id('d'), 'x': x, 'y': y, 'to': to, 'sx': sx, 'sy': sy})

    # ------------------------------------------------------------------ onde dá para andar (igual a walkGrid em compile.js)
    def auto_walk(self):
        w, h = self.w, self.h
        grid = [['.'] * w for _ in range(h)]
        for tid, rows in self.terrain.items():
            if tid in BLOCK_WALK:
                for y in range(h):
                    for x in range(w):
                        if rows[y][x] == '1':
                            grid[y][x] = '#'
        for r in self.water:
            for y in range(r['y'], r['y'] + r['h']):
                for x in range(r['x'], r['x'] + r['w']):
                    if 0 <= y < h and 0 <= x < w:
                        grid[y][x] = '#'

        def footprint(x, y, ow, oh, rows):
            if not rows:
                return
            top = max(y, y + oh - rows * T)
            for ty in range(math.floor(top / T), math.floor((y + oh - 1) / T) + 1):
                for tx in range(math.floor((x + 3) / T), math.floor((x + ow - 4) / T) + 1):
                    cover = min(x + ow, (tx + 1) * T) - max(x, tx * T)
                    cover_y = min(y + oh, (ty + 1) * T) - max(top, ty * T)
                    if cover >= 6 and cover_y >= 6 and 0 <= ty < h and 0 <= tx < w:
                        grid[ty][tx] = '#'

        for o in self.objects:
            if o.get('chao') or o.get('porta'):
                continue
            r = LIB['pecas'][o['t']][o['n']]
            footprint(o['x'], o['y'], r[2], r[3], o['d'])
        for a in self.anims:
            r = LIB['anims'][a['n']]
            footprint(a['x'], a['y'], a.get('fw', r[3]), r[4], a['d'])
        for d in self.doors:
            grid[d['y']][d['x']] = '.'
        return grid

    def save(self, walk, sky='dia'):
        """walk: o "onde dá para andar" que o script calculou (lista de textos com . e #)"""
        auto = self.auto_walk()
        if os.environ.get('T2_WALK_DUMP'):  # só para conferir nos testes
            Path(os.environ['T2_WALK_DUMP'], f'{self.code}.json').write_text(json.dumps(walk))
        block = {}
        for y in range(self.h):
            for x in range(self.w):
                if auto[y][x] != walk[y][x]:
                    block[f'{x},{y}'] = 1 if walk[y][x] == '#' else 0
        for d in self.doors:  # porta sempre livre (o editor faz isso depois dos ajustes)
            block.pop(f"{d['x']},{d['y']}", None)
        data = {
            'v': 1, 'w': self.w, 'h': self.h, 'base': self.base,
            'terrain': {k: ''.join(''.join(r) for r in rows) for k, rows in self.terrain.items()},
            'water': self.water, 'objects': self.objects, 'anims': self.anims, 'patrols': self.patrols,
            'traffic': self.traffic, 'lights': self.lights, 'doors': self.doors, 'npcs': self.npcs,
            'items': self.items, 'block': block, 'spawn': self.spawn, 'sky': sky,
        }
        store = json.loads(OUT.read_text()) if OUT.exists() else {'maps': []}
        maps = [m for m in store['maps'] if m['code'] != self.code] + [{'code': self.code, 'name': self.name, 'published': True, 'data': data}]
        maps.sort(key=lambda m: ORDER.index(m['code']) if m['code'] in ORDER else 99)
        store['maps'] = maps
        OUT.write_text(json.dumps(store, ensure_ascii=False, separators=(',', ':')))
        print(f'{self.code}: {len(self.objects)} peças, {len(self.anims)} animados, {len(self.traffic)} no trânsito, '
              f'{len(self.lights)} luzes soltas, {len(block)} ajustes de onde andar')
